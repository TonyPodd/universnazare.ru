import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        age: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        vkId: true,
        telegramId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Проверка уникальности email если он обновляется
    if (updateProfileDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        age: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getSubscriptions(userId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'EXPIRED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return subscriptions;
  }

  async getSubscriptionById(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    return subscription;
  }

  async getBookingHistory(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            type: true,
            imageUrl: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings;
  }

  async getActiveSubscription(userId: string) {
    // Получить активный абонемент с наибольшим оставшимся балансом
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        remainingBalance: {
          gt: 0,
        },
      },
      orderBy: {
        remainingBalance: 'desc',
      },
      include: {
        subscriptionType: true,
        bookings: {
          where: {
            status: {
              not: 'CANCELLED',
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            event: {
              select: {
                title: true,
                startDate: true,
              },
            },
            groupSession: {
              select: {
                date: true,
                group: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return subscription;
  }

  async getTotalBalance(userId: string) {
    // Получить общий баланс по всем активным абонементам
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        remainingBalance: {
          gt: 0,
        },
      },
    });

    const totalBalance = subscriptions.reduce(
      (sum, sub) => sum + sub.remainingBalance,
      0,
    );

    return {
      totalBalance,
      subscriptionsCount: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        name: sub.name,
        remainingBalance: sub.remainingBalance,
        expiresAt: sub.expiresAt,
      })),
    };
  }

  async purchaseSubscription(
    userId: string,
    typeId: string,
    options?: { bypassPayment?: boolean },
  ) {
    const allowDirectPurchase = options?.bypassPayment || !process.env.TINKOFF_TERMINAL_KEY;
    if (!allowDirectPurchase) {
      throw new BadRequestException('Оплата абонемента доступна только онлайн');
    }

    // Получить тип абонемента
    const subscriptionType = await this.prisma.subscriptionType.findUnique({
      where: { id: typeId },
    });

    if (!subscriptionType) {
      throw new NotFoundException('Тип абонемента не найден');
    }

    if (!subscriptionType.isActive) {
      throw new ConflictException('Этот тип абонемента недоступен для покупки');
    }

    // Проверить, есть ли у пользователя активный абонемент
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        remainingBalance: 'desc',
      },
    });

    // Если есть активный абонемент, добавляем к нему баланс
    if (activeSubscription) {
      // Обновляем существующий абонемент
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          totalBalance: {
            increment: subscriptionType.amount,
          },
          remainingBalance: {
            increment: subscriptionType.amount,
          },
          // Обновляем название, чтобы отразить пополнение
          name: activeSubscription.name.includes('Объединённый')
            ? activeSubscription.name
            : 'Объединённый абонемент',
          // Продлеваем срок действия, если у нового типа есть срок
          expiresAt:
            subscriptionType.durationDays && activeSubscription.expiresAt
              ? new Date(
                  Math.max(
                    activeSubscription.expiresAt.getTime(),
                    Date.now(),
                  ) +
                    subscriptionType.durationDays * 24 * 60 * 60 * 1000,
                )
              : subscriptionType.durationDays
                ? new Date(
                    Date.now() +
                      subscriptionType.durationDays * 24 * 60 * 60 * 1000,
                  )
                : activeSubscription.expiresAt,
          // Если абонемент был исчерпан, возвращаем статус ACTIVE
          status: 'ACTIVE',
        },
        include: {
          subscriptionType: true,
        },
      });

      return updatedSubscription;
    }

    // Если нет активного абонемента, создаем новый
    // Вычислить дату истечения срока действия
    let expiresAt: Date | null = null;
    if (subscriptionType.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + subscriptionType.durationDays);
    }

    // Создать абонемент для пользователя
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        typeId: subscriptionType.id,
        name: subscriptionType.name,
        totalBalance: subscriptionType.amount,
        remainingBalance: subscriptionType.amount,
        price: subscriptionType.price,
        status: 'ACTIVE',
        expiresAt,
      },
      include: {
        subscriptionType: true,
      },
    });

    return subscription;
  }

  async rollbackSubscriptionPurchase(
    userId: string,
    subscriptionId: string | null | undefined,
    amount: number,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Сумма отката должна быть больше 0');
    }

    const subscription = subscriptionId
      ? await this.prisma.subscription.findFirst({
          where: { id: subscriptionId, userId },
        })
      : await this.prisma.subscription.findFirst({
          where: {
            userId,
            status: {
              in: ['ACTIVE', 'DEPLETED'],
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

    if (!subscription) {
      throw new NotFoundException('Абонемент для отката не найден');
    }

    const nextTotalBalance = Math.max(0, subscription.totalBalance - amount);
    const nextRemainingBalance = Math.max(0, subscription.remainingBalance - amount);
    const shouldRemove = nextTotalBalance <= 0 && nextRemainingBalance <= 0;

    if (shouldRemove) {
      const [bookingsCount, enrollmentsCount] = await Promise.all([
        this.prisma.booking.count({ where: { subscriptionId: subscription.id } }),
        this.prisma.groupEnrollment.count({ where: { subscriptionId: subscription.id } }),
      ]);

      if (bookingsCount === 0 && enrollmentsCount === 0) {
        await this.prisma.subscription.delete({
          where: { id: subscription.id },
        });
        return { deleted: true };
      }

      return this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          totalBalance: 0,
          remainingBalance: 0,
          status: 'CANCELLED',
          expiresAt: new Date(),
        },
        include: {
          subscriptionType: true,
        },
      });
    }

    const nextStatus = nextRemainingBalance <= 0 ? 'DEPLETED' : 'ACTIVE';

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        totalBalance: nextTotalBalance,
        remainingBalance: nextRemainingBalance,
        status: nextStatus,
      },
      include: {
        subscriptionType: true,
      },
    });
  }

  // ADMIN METHODS
  async getAllUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          age: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          subscriptions: {
            where: {
              status: 'ACTIVE',
            },
            select: {
              id: true,
              name: true,
              remainingBalance: true,
              totalBalance: true,
              expiresAt: true,
            },
          },
          _count: {
            select: {
              bookings: true,
              orders: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        age: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            subscriptionType: true,
          },
        },
        bookings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            event: {
              select: {
                title: true,
                startDate: true,
              },
            },
          },
        },
        orders: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        groupEnrollments: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            group: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async addBalanceToUser(userId: string, amount: number) {
    // Проверить пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Получить активный абонемент пользователя
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        remainingBalance: 'desc',
      },
    });

    const previousBalance = activeSubscription?.remainingBalance || 0;

    // Если есть активный абонемент, пополняем его
    if (activeSubscription) {
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          // Увеличиваем оба значения, чтобы формула "использовано = totalBalance - remainingBalance" работала
          totalBalance: {
            increment: amount,
          },
          remainingBalance: {
            increment: amount,
          },
          // Если абонемент был исчерпан, возвращаем статус ACTIVE
          status: 'ACTIVE',
        },
      });

      // Отправить email уведомление
      await this.emailService.sendBalanceTopUpEmail(
        user.email,
        {
          firstName: user.firstName,
          lastName: user.lastName,
        },
        {
          amount,
          newBalance: updatedSubscription.remainingBalance,
          previousBalance,
        },
      );

      return updatedSubscription;
    }

    // Если нет активного абонемента, создаем новый
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        typeId: (
          await this.prisma.subscriptionType.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          })
        )?.id,
        name: `Пополнение администратором на ${amount}₽`,
        totalBalance: amount,
        remainingBalance: amount,
        price: 0, // Ручное пополнение без оплаты
        status: 'ACTIVE',
        expiresAt: null,
      },
    });

    // Отправить email уведомление
    await this.emailService.sendBalanceTopUpEmail(
      user.email,
      {
        firstName: user.firstName,
        lastName: user.lastName,
      },
      {
        amount,
        newBalance: subscription.remainingBalance,
        previousBalance: 0,
      },
    );

    return subscription;
  }

  async removeUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Нельзя удалить администратора');
    }

    await this.prisma.$transaction([
      this.prisma.booking.deleteMany({ where: { userId } }),
      this.prisma.groupEnrollment.deleteMany({ where: { userId } }),
      this.prisma.subscriptionPayment.deleteMany({ where: { userId } }),
      this.prisma.subscription.deleteMany({ where: { userId } }),
      this.prisma.order.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { deleted: true };
  }
}
