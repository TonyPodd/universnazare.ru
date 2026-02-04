import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GenerateSessionsDto } from './dto/generate-sessions.dto';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { SessionStatus } from '@prisma/client';
import {
  addDaysUTC,
  buildKrasnoyarskDateTimeForDay,
  getKrasnoyarskDayOfWeek,
  startOfDayKrasnoyarsk,
} from '../utils/krasnoyarsk-time';

@Injectable()
export class GroupSessionsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async generateSessions(dto: GenerateSessionsDto) {
    const group = await this.prisma.regularGroup.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException('Направление не найдено');
    }

    const schedule = group.schedule as any;
    if (!schedule || !schedule.daysOfWeek || !schedule.time) {
      throw new BadRequestException('Некорректное расписание направления');
    }

    const sessions = [];
    // Normalize iteration bounds to Krasnoyarsk days to avoid server-TZ dependent behavior.
    let currentDay = startOfDayKrasnoyarsk(new Date(dto.startDate));
    const endDay = startOfDayKrasnoyarsk(new Date(dto.endDate));

    while (currentDay <= endDay) {
      const dayOfWeek = getKrasnoyarskDayOfWeek(currentDay);

      if (schedule.daysOfWeek.includes(dayOfWeek)) {
        const sessionDate = buildKrasnoyarskDateTimeForDay(currentDay, schedule.time);

        // Проверяем, что занятие ещё не создано
        const existingSession = await this.prisma.groupSession.findFirst({
          where: {
            groupId: dto.groupId,
            date: sessionDate,
          },
        });

        if (!existingSession) {
          const session = await this.prisma.groupSession.create({
            data: {
              groupId: dto.groupId,
              date: sessionDate,
              duration: schedule.duration,
              status: SessionStatus.SCHEDULED,
            },
          });
          sessions.push(session);

          // Автоматически создаем bookings для всех активных enrollments
          await this.createBookingsForSession(session.id, dto.groupId);
        }
      }

      currentDay = addDaysUTC(currentDay, 1);
    }

    return sessions;
  }

  async getUpcomingSessions(groupId: string) {
    const sessions = await this.prisma.groupSession.findMany({
      where: {
        groupId,
        date: {
          gte: new Date(),
        },
        status: {
          not: SessionStatus.CANCELLED,
        },
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        group: {
          include: {
            master: true,
          },
        },
        bookings: true,
      },
    });

    // Получаем количество активных зачисленных участников для этого направления
    const activeEnrollmentsCount = await this.prisma.groupEnrollment.count({
      where: {
        groupId,
        status: 'ACTIVE',
      },
    });

    // Добавляем реальное количество участников к каждому занятию
    return sessions.map(session => ({
      ...session,
      currentParticipants: activeEnrollmentsCount,
    }));
  }

  async getSessionById(id: string) {
    const session = await this.prisma.groupSession.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            master: true,
          },
        },
        bookings: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Занятие не найдено');
    }

    return session;
  }

  async getAllSessions(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.groupSession.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
      include: {
        group: {
          include: {
            master: true,
          },
        },
        bookings: true,
      },
    });
  }

  async cancelSession(id: string, dto: CancelSessionDto) {
    const session = await this.prisma.groupSession.findUnique({
      where: { id },
      include: {
        group: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Занятие не найдено');
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Нельзя отменить завершённое занятие');
    }

    // Получаем всех активных зачисленных пользователей
    const enrollments = await this.prisma.groupEnrollment.findMany({
      where: {
        groupId: session.groupId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Обновляем статус занятия
    const updatedSession = await this.prisma.groupSession.update({
      where: { id },
      data: {
        status: SessionStatus.CANCELLED,
        notes: dto.notes,
      },
    });

    // Отправляем уведомления всем участникам
    for (const enrollment of enrollments) {
      try {
        await this.emailService.sendSessionCancellationEmail(
          enrollment.user.email,
          `${enrollment.user.firstName} ${enrollment.user.lastName}`,
          session.group.name,
          session.date,
          dto.notes,
        );
      } catch (error) {
        console.error(
          `Failed to send cancellation email to ${enrollment.user.email}:`,
          error,
        );
        // Продолжаем отправку остальным, даже если одно письмо не отправилось
      }
    }

    return updatedSession;
  }

  async getSessionParticipants(id: string) {
    const session = await this.prisma.groupSession.findUnique({
      where: { id },
      include: {
        group: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Занятие не найдено');
    }

    // Получаем всех активных зачисленных пользователей для этого направления
    const enrollments = await this.prisma.groupEnrollment.findMany({
      where: {
        groupId: session.groupId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        subscription: {
          select: {
            id: true,
            remainingBalance: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      session,
      participants: enrollments,
      totalParticipants: enrollments.length,
    };
  }

  async deleteSession(id: string) {
    const session = await this.prisma.groupSession.findUnique({
      where: { id },
      include: {
        bookings: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Занятие не найдено');
    }

    if (session.bookings.length > 0) {
      throw new BadRequestException(
        'Нельзя удалить занятие с существующими записями. Отмените занятие вместо удаления.',
      );
    }

    return this.prisma.groupSession.delete({
      where: { id },
    });
  }

  // Создать bookings для всех активных enrollments для конкретной сессии
  async createBookingsForSession(sessionId: string, groupId: string) {
    const session = await this.prisma.groupSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException('Занятие не найдено');
    }

    // Получаем все активные enrollments для этого направления
    const enrollments = await this.prisma.groupEnrollment.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
      },
      include: {
        subscription: true,
      },
    });

    // Создаем booking для каждого enrollment
    for (const enrollment of enrollments) {
      // Проверяем, что booking еще не создан
      const existingBooking = await this.prisma.booking.findFirst({
        where: {
          groupSessionId: sessionId,
          userId: enrollment.userId,
        },
      });

      if (!existingBooking) {
        // Рассчитываем цену со скидкой 10%
        const price = session.group.price * 0.9;

        await this.prisma.booking.create({
          data: {
            userId: enrollment.userId,
            groupSessionId: sessionId,
            groupEnrollmentId: enrollment.id,
            subscriptionId: enrollment.subscriptionId,
            status: 'CONFIRMED',
            participantsCount: (enrollment.participants as any).length || 1,
            totalPrice: price * ((enrollment.participants as any).length || 1),
            paymentMethod: 'SUBSCRIPTION',
            participants: enrollment.participants,
            contactEmail: enrollment.contactEmail,
          },
        });

        // Увеличиваем счетчик участников сессии
        await this.prisma.groupSession.update({
          where: { id: sessionId },
          data: {
            currentParticipants: {
              increment: (enrollment.participants as any).length || 1,
            },
          },
        });
      }
    }
  }
}
