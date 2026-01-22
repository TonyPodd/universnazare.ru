import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Injectable()
export class GroupEnrollmentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateEnrollmentDto) {
    // Проверяем существование группы
    const group = await this.prisma.regularGroup.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException('Направление не найдено');
    }

    if (!group.isActive) {
      throw new BadRequestException('Направление неактивно');
    }

    // Проверяем, что пользователь уже не записан в эту группу
    const existingEnrollment = await this.prisma.groupEnrollment.findFirst({
      where: {
        userId,
        groupId: dto.groupId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Вы уже записаны в это направление');
    }

    // Проверяем наличие активного абонемента у пользователя
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        remainingBalance: {
          gt: 0,
        },
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException('Для записи на направление требуется активный абонемент с положительным балансом');
    }

    // Создаем зачисление (деньги не списываем, они будут списываться за каждое занятие)
    const enrollment = await this.prisma.groupEnrollment.create({
      data: {
        userId,
        groupId: dto.groupId,
        subscriptionId: activeSubscription.id,
        participants: dto.participants as any,
        contactEmail: dto.contactEmail,
        notes: dto.notes,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        user: true,
        subscription: true,
        group: true,
      },
    });

    // Автоматически создаем bookings для всех будущих запланированных занятий
    await this.createBookingsForEnrollment(enrollment.id, userId, dto.groupId);

    const nextSession = await this.prisma.groupSession.findFirst({
      where: {
        groupId: dto.groupId,
        date: {
          gte: new Date(),
        },
        status: 'SCHEDULED',
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (nextSession) {
      const participants = enrollment.participants as any[];
      const participantsCount = participants.length || 1;
      const price = group.price * 0.9;
      const totalPrice = price * participantsCount;
      const startDate = new Date(nextSession.date);
      const endDate = new Date(startDate.getTime() + nextSession.duration * 60 * 1000);

      try {
        await this.emailService.sendGroupSessionBookingEmail(dto.contactEmail, {
          groupName: group.name,
          startDate,
          endDate,
          price: group.price,
          participants,
          totalPrice,
          paymentMethod: 'SUBSCRIPTION',
          notes: dto.notes,
        });
      } catch (error) {
        console.error('Failed to send group enrollment email:', error);
      }
    }

    return enrollment;
  }

  async getUserEnrollments(userId: string) {
    return this.prisma.groupEnrollment.findMany({
      where: {
        userId,
      },
      include: {
        subscription: true,
        group: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getEnrollmentById(id: string) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id },
      include: {
        user: true,
        subscription: true,
        bookings: {
          include: {
            groupSession: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Запись не найдена');
    }

    return enrollment;
  }

  async cancelEnrollment(id: string, userId: string) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (enrollment.userId !== userId) {
      throw new BadRequestException('Вы не можете отменить чужую запись');
    }

    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new BadRequestException('Запись уже отменена');
    }

    return this.prisma.groupEnrollment.update({
      where: { id },
      data: {
        status: EnrollmentStatus.CANCELLED,
      },
    });
  }

  async pauseEnrollment(id: string, userId: string) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (enrollment.userId !== userId) {
      throw new BadRequestException('Вы не можете приостановить чужую запись');
    }

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Можно приостановить только активную запись');
    }

    return this.prisma.groupEnrollment.update({
      where: { id },
      data: {
        status: EnrollmentStatus.PAUSED,
      },
    });
  }

  async resumeEnrollment(id: string, userId: string) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (enrollment.userId !== userId) {
      throw new BadRequestException('Вы не можете возобновить чужую запись');
    }

    if (enrollment.status !== EnrollmentStatus.PAUSED) {
      throw new BadRequestException('Можно возобновить только приостановленную запись');
    }

    return this.prisma.groupEnrollment.update({
      where: { id },
      data: {
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }

  // Проверка, записан ли пользователь в группу
  async isUserEnrolled(userId: string, groupId: string): Promise<boolean> {
    const enrollment = await this.prisma.groupEnrollment.findFirst({
      where: {
        userId,
        groupId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    return !!enrollment;
  }

  // Получить активное зачисление пользователя в группу
  async getActiveEnrollment(userId: string, groupId: string) {
    return this.prisma.groupEnrollment.findFirst({
      where: {
        userId,
        groupId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        subscription: true,
      },
    });
  }

  // Получить предстоящие занятия для зачисления
  async getUpcomingSessions(enrollmentId: string, userId: string) {
    // Проверяем что зачисление принадлежит пользователю
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        group: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Запись не найдена');
    }

    if (enrollment.userId !== userId) {
      throw new BadRequestException('Вы не можете просматривать чужие записи');
    }

    const now = new Date();

    // Получаем все предстоящие занятия для этого направления
    const sessions = await this.prisma.groupSession.findMany({
      where: {
        groupId: enrollment.groupId,
        date: {
          gte: now,
        },
        status: {
          in: ['SCHEDULED'],
        },
      },
      include: {
        group: true,
        bookings: {
          where: {
            userId: userId,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 20, // Ограничиваем количество занятий
    });

    // Преобразуем данные в удобный формат
    return sessions.map((session) => ({
      id: session.id,
      date: session.date,
      duration: session.duration,
      status: session.status,
      currentParticipants: session.currentParticipants,
      maxParticipants: session.group.maxParticipants,
      booking: session.bookings.length > 0 ? session.bookings[0] : null,
    }));
  }

  // Создать bookings для enrollment на все будущие занятия
  async createBookingsForEnrollment(enrollmentId: string, userId: string, groupId: string) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { group: true, subscription: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Запись не найдена');
    }

    const now = new Date();

    // Получаем все будущие запланированные занятия для этого направления
    const futureSessions = await this.prisma.groupSession.findMany({
      where: {
        groupId,
        date: {
          gte: now,
        },
        status: 'SCHEDULED',
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Рассчитываем цену со скидкой 10%
    const price = enrollment.group.price * 0.9;
    const participantsCount = (enrollment.participants as any).length || 1;

    // Создаем booking для каждого будущего занятия
    for (const session of futureSessions) {
      // Проверяем, что booking еще не создан
      const existingBooking = await this.prisma.booking.findFirst({
        where: {
          groupSessionId: session.id,
          userId,
        },
      });

      if (!existingBooking) {
        await this.prisma.booking.create({
          data: {
            userId,
            groupSessionId: session.id,
            groupEnrollmentId: enrollmentId,
            subscriptionId: enrollment.subscriptionId,
            status: 'CONFIRMED',
            participantsCount,
            totalPrice: price * participantsCount,
            paymentMethod: 'SUBSCRIPTION',
            participants: enrollment.participants,
            contactEmail: enrollment.contactEmail,
          },
        });

        // Увеличиваем счетчик участников сессии
        await this.prisma.groupSession.update({
          where: { id: session.id },
          data: {
            currentParticipants: {
              increment: participantsCount,
            },
          },
        });
      }
    }
  }

}
