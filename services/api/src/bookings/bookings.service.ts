import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private async cancelInternal(
    booking: Awaited<ReturnType<BookingsService['findOne']>>,
    opts: { enforceTimeWindow: boolean },
  ) {
    // If already cancelled, do nothing (idempotent).
    if (booking.status === 'CANCELLED') {
      return booking;
    }

    // If cancellation is requested by a user flow, enforce 24h window.
    if (opts.enforceTimeWindow) {
      const now = new Date();
      const hoursBeforeEvent = 24;
      const minCancellationTime = hoursBeforeEvent * 60 * 60 * 1000;

      let eventDate: Date | null = null;
      if (booking.eventId && booking.event?.startDate) {
        eventDate = new Date(booking.event.startDate);
      } else if (booking.groupSessionId && booking.groupSession?.date) {
        eventDate = new Date(booking.groupSession.date);
      }

      if (eventDate) {
        const timeUntilEvent = eventDate.getTime() - now.getTime();
        if (timeUntilEvent < minCancellationTime) {
          throw new BadRequestException(
            `Отменить запись можно только за ${hoursBeforeEvent} часов до начала занятия. До занятия осталось ${Math.floor(timeUntilEvent / (60 * 60 * 1000))} часов.`,
          );
        }
      }
    }

    // Free seats in event/session.
    if (booking.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: booking.eventId },
        select: { currentParticipants: true },
      });

      if (event && event.currentParticipants >= booking.participantsCount) {
        await this.prisma.event.update({
          where: { id: booking.eventId },
          data: {
            currentParticipants: {
              decrement: booking.participantsCount,
            },
          },
        });
      }
    } else if (booking.groupSessionId) {
      const session = await this.prisma.groupSession.findUnique({
        where: { id: booking.groupSessionId },
        select: { currentParticipants: true },
      });

      if (session && session.currentParticipants >= booking.participantsCount) {
        await this.prisma.groupSession.update({
          where: { id: booking.groupSessionId },
          data: {
            currentParticipants: {
              decrement: booking.participantsCount,
            },
          },
        });
      }
    }

    // Refund subscription balance (if paid via subscription).
    if (booking.paymentMethod === 'SUBSCRIPTION' && booking.subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: booking.subscriptionId },
        data: {
          remainingBalance: {
            increment: booking.totalPrice,
          },
        },
      });

      const subscription = await this.prisma.subscription.findUnique({
        where: { id: booking.subscriptionId },
      });

      if (subscription && subscription.status === 'DEPLETED' && subscription.remainingBalance > 0) {
        await this.prisma.subscription.update({
          where: { id: booking.subscriptionId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });
  }

  async create(createBookingDto: {
    eventId?: string;
    groupSessionId?: string;
    participants: Array<{ fullName: string; phone: string; age?: number }>;
    contactEmail: string;
    paymentMethod: 'SUBSCRIPTION' | 'ON_SITE';
    notes?: string;
    userId?: string;
    subscriptionId?: string;
  }) {
    if (!createBookingDto.eventId && !createBookingDto.groupSessionId) {
      throw new BadRequestException('Необходимо указать либо eventId, либо groupSessionId');
    }

    if (createBookingDto.eventId && createBookingDto.groupSessionId) {
      throw new BadRequestException('Нельзя указывать одновременно eventId и groupSessionId');
    }

    // Проверяем количество участников
    const participantsCount = createBookingDto.participants.length;
    if (participantsCount === 0) {
      throw new BadRequestException('Необходимо указать хотя бы одного участника');
    }

    let maxParticipants: number;
    let currentParticipants: number;
    let price: number;
    let isAvailable: boolean;

    // Если это запись на мастер-класс
    if (createBookingDto.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: createBookingDto.eventId },
      });

      if (!event) {
        throw new NotFoundException('Событие не найдено');
      }

      if (event.status !== 'PUBLISHED') {
        throw new BadRequestException('Событие недоступно для записи');
      }

      maxParticipants = event.maxParticipants;
      currentParticipants = event.currentParticipants;
      price = event.price;
      isAvailable = true;
    }
    // Если это запись на занятие направления
    else if (createBookingDto.groupSessionId) {
      const groupSession = await this.prisma.groupSession.findUnique({
        where: { id: createBookingDto.groupSessionId },
        include: { group: true },
      });

      if (!groupSession) {
        throw new NotFoundException('Занятие не найдено');
      }

      if (groupSession.status === 'CANCELLED') {
        throw new BadRequestException('Занятие отменено');
      }

      // Для направлений обязательна оплата через абонемент
      if (createBookingDto.paymentMethod !== 'SUBSCRIPTION') {
        throw new BadRequestException('Для занятий направлений требуется оплата через абонемент');
      }

      maxParticipants = groupSession.group.maxParticipants;
      currentParticipants = groupSession.currentParticipants;
      price = groupSession.group.price;
      isAvailable = groupSession.group.isActive;
    }

    if (!isAvailable) {
      throw new BadRequestException('Запись недоступна');
    }

    // Проверяем доступность мест
    const availableSeats = maxParticipants - currentParticipants;

    if (availableSeats < participantsCount) {
      throw new BadRequestException(
        `Недостаточно мест. Доступно: ${availableSeats}`,
      );
    }

    // Вычисляем общую стоимость
    let totalPrice = price * participantsCount;

    let subscriptionId = createBookingDto.subscriptionId;

    // Если оплата через абонемент, применяем скидку 10% и списываем баланс
    if (createBookingDto.paymentMethod === 'SUBSCRIPTION') {
      if (!createBookingDto.userId) {
        throw new BadRequestException(
          'Для оплаты через абонемент необходимо войти в аккаунт',
        );
      }

      // Применяем скидку 10% при оплате через абонемент
      const discountedPrice = totalPrice * 0.9;

      // Получаем активный абонемент пользователя
      let subscription;
      if (subscriptionId) {
        subscription = await this.prisma.subscription.findFirst({
          where: {
            id: subscriptionId,
            userId: createBookingDto.userId,
            status: 'ACTIVE',
            remainingBalance: {
              gte: discountedPrice,
            },
          },
        });
      } else {
        subscription = await this.prisma.subscription.findFirst({
          where: {
            userId: createBookingDto.userId,
            status: 'ACTIVE',
            remainingBalance: {
              gte: discountedPrice,
            },
          },
          orderBy: {
            remainingBalance: 'desc',
          },
        });
      }

      if (!subscription) {
        // Получаем общий баланс пользователя для более информативного сообщения
        const allSubscriptions = await this.prisma.subscription.findMany({
          where: {
            userId: createBookingDto.userId,
            status: 'ACTIVE',
          },
        });

        const totalUserBalance = allSubscriptions.reduce(
          (sum, sub) => sum + sub.remainingBalance,
          0,
        );

        if (totalUserBalance > 0) {
          throw new BadRequestException(
            `Недостаточно средств на выбранном абонементе. Требуется: ${discountedPrice.toFixed(2)}₽ (со скидкой 10%). У вас есть: ${totalUserBalance.toFixed(2)}₽ на ${allSubscriptions.length} абонементе(ах). Попробуйте выбрать другой абонемент или пополнить баланс.`,
          );
        } else {
          throw new BadRequestException(
            `Недостаточно средств на абонементе. Требуется: ${discountedPrice.toFixed(2)}₽ (со скидкой 10%). Пожалуйста, пополните баланс абонемента.`,
          );
        }
      }

      subscriptionId = subscription.id;

      // Списываем средства с абонемента
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          remainingBalance: {
            decrement: discountedPrice,
          },
        },
      });

      // Обновляем totalPrice с учетом скидки
      totalPrice = discountedPrice;

      // Проверяем, нужно ли обновить статус абонемента
      const updatedSubscription = await this.prisma.subscription.findUnique({
        where: { id: subscription.id },
      });

      if (updatedSubscription && updatedSubscription.remainingBalance <= 0) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'DEPLETED' },
        });
      }
    }

    // Создаем запись
    const booking = await this.prisma.booking.create({
      data: {
        eventId: createBookingDto.eventId,
        groupSessionId: createBookingDto.groupSessionId,
        userId: createBookingDto.userId,
        subscriptionId,
        participantsCount,
        totalPrice,
        paymentMethod: createBookingDto.paymentMethod,
        participants: createBookingDto.participants,
        contactEmail: createBookingDto.contactEmail,
        notes: createBookingDto.notes,
        status: 'PENDING',
      },
      include: {
        event: {
          select: {
            title: true,
            startDate: true,
            endDate: true,
            price: true,
            type: true,
          },
        },
        groupSession: {
          select: {
            date: true,
            duration: true,
            group: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    // Обновляем количество участников
    if (createBookingDto.eventId) {
      await this.prisma.event.update({
        where: { id: createBookingDto.eventId },
        data: {
          currentParticipants: {
            increment: participantsCount,
          },
        },
      });
    } else if (createBookingDto.groupSessionId) {
      await this.prisma.groupSession.update({
        where: { id: createBookingDto.groupSessionId },
        data: {
          currentParticipants: {
            increment: participantsCount,
          },
        },
      });
    }

    // Отправляем email подтверждение
    try {
      if (booking.event) {
        // Для мастер-классов отправляем письмо о мастер-классе
        await this.emailService.sendMasterClassBookingEmail(
          createBookingDto.contactEmail,
          {
            eventTitle: booking.event.title,
            startDate: booking.event.startDate,
            endDate: booking.event.endDate,
            price: booking.event.price,
            participants: createBookingDto.participants,
            totalPrice,
            paymentMethod: createBookingDto.paymentMethod,
            notes: createBookingDto.notes,
          },
        );
      } else if (booking.groupSession) {
        // Для занятий направлений вычисляем endDate из date + duration
        const startDate = new Date(booking.groupSession.date);
        const endDate = new Date(startDate.getTime() + booking.groupSession.duration * 60 * 1000);

        // Отправляем письмо о занятии направления
        await this.emailService.sendGroupSessionBookingEmail(
          createBookingDto.contactEmail,
          {
            groupName: booking.groupSession.group.name,
            startDate,
            endDate,
            price: booking.groupSession.group.price,
            participants: createBookingDto.participants,
            totalPrice,
            paymentMethod: createBookingDto.paymentMethod,
            notes: createBookingDto.notes,
          },
        );
      }
    } catch (emailError) {
      // Логируем ошибку, но не прерываем процесс создания записи
      console.error('Failed to send booking confirmation email:', emailError);
    }

    return booking;
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        event: {
          select: {
            title: true,
            startDate: true,
            type: true,
          },
        },
        groupSession: {
          include: {
            group: {
              select: {
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPaginated(options: {
    page: number;
    limit: number;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';
    eventOnly?: boolean;
  }) {
    const { page, limit, status, eventOnly } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (eventOnly) where.eventId = { not: null };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          event: {
            select: {
              title: true,
              startDate: true,
              type: true,
            },
          },
          groupSession: {
            include: {
              group: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        groupSession: {
          include: {
            group: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Запись не найдена');
    }

    return booking;
  }

  async updateStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED',
  ) {
    const booking = await this.findOne(id);

    // Если отменяем бронирование, проверяем временное ограничение
    if (status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      return this.cancelInternal(booking, { enforceTimeWindow: true });
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  async cancel(id: string) {
    return this.updateStatus(id, 'CANCELLED');
  }

  async adminCancel(id: string) {
    const booking = await this.findOne(id);
    return this.cancelInternal(booking, { enforceTimeWindow: false });
  }

  async getUpcomingUserBookings(userId: string) {
    const now = new Date();

    // Возвращаем только bookings на мастер-классы, не на направления
    return this.prisma.booking.findMany({
      where: {
        userId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        eventId: {
          not: null,
        },
        event: {
          startDate: {
            gte: now,
          },
        },
      },
      include: {
        event: {
          select: {
            title: true,
            startDate: true,
            type: true,
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.booking.findMany({
      where: {
        eventId,
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
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
