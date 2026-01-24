import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { userId, items, totalAmount, paymentMethod } = createOrderDto;

    // Проверяем наличие товаров и их доступность
    for (const item of items) {
      const product = await this.productsService.findOne(item.productId);
      if (!product.isAvailable) {
        throw new BadRequestException(`Product ${product.name} is not available`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }
    }

    // Если оплата по абонементу, проверяем и списываем средства
    if (paymentMethod === 'SUBSCRIPTION') {
      const activeSubscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          remainingBalance: {
            gte: totalAmount,
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: {
          expiresAt: 'asc', // Сначала используем абонементы с ближайшим сроком
        },
      });

      if (!activeSubscription) {
        throw new BadRequestException(
          'У вас нет активного абонемента с достаточным балансом для оплаты этого заказа',
        );
      }

      // Списываем средства с абонемента
      const newBalance = activeSubscription.remainingBalance - totalAmount;
      await this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          remainingBalance: newBalance,
          status: newBalance <= 0 ? 'DEPLETED' : 'ACTIVE',
        },
      });
    }

    // Создаем заказ с товарами
    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: 'PENDING',
        paymentMethod: paymentMethod as any,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    // Уменьшаем количество товаров на складе
    for (const item of items) {
      await this.productsService.decreaseStock(item.productId, item.quantity);
    }

    let paymentUrl: string | null = null;
    let paymentId: string | null = null;
    let paymentStatus: string | null = null;

    if (paymentMethod === 'ONLINE') {
      const payment = await this.initTinkoffPayment(order.id, totalAmount, order.user?.email);
      paymentUrl = payment.paymentUrl;
      paymentId = payment.paymentId;
      paymentStatus = payment.paymentStatus;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId,
          paymentUrl,
          paymentStatus,
        },
      });
    }

    // Генерируем QR-код
    const qrCodeData = await this.generateQRCode(order.id);

    return {
      ...order,
      paymentUrl,
      paymentId,
      paymentStatus,
      qrCode: qrCodeData,
    };
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.findOne(id); // проверка существования

    // Если заказ отменяется, возвращаем товары на склад и средства на абонемент
    if (updateOrderStatusDto.status === 'CANCELLED' && order.status !== 'CANCELLED') {
      // Возвращаем товары на склад
      for (const item of order.items) {
        await this.productsService.increaseStock(item.productId, item.quantity);
      }

      // Если заказ был оплачен по абонементу, возвращаем средства
      if (order.paymentMethod === 'SUBSCRIPTION') {
        const activeSubscription = await this.prisma.subscription.findFirst({
          where: {
            userId: order.userId,
            OR: [
              { status: 'ACTIVE' },
              { status: 'DEPLETED' },
            ],
          },
          orderBy: {
            updatedAt: 'desc', // Берем последний обновленный абонемент
          },
        });

        if (activeSubscription) {
          const newBalance = activeSubscription.remainingBalance + order.totalAmount;
          await this.prisma.subscription.update({
            where: { id: activeSubscription.id },
            data: {
              remainingBalance: newBalance,
              status: newBalance > 0 ? 'ACTIVE' : activeSubscription.status,
            },
          });
        }
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderStatusDto.status as any,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
  }

  async getOrderByQRCode(orderId: string) {
    return this.findOne(orderId);
  }

  async generateQRCode(orderId: string): Promise<string> {
    try {
      // Генерируем QR-код с ID заказа
      const qrCodeDataUrl = await QRCode.toDataURL(orderId, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      });
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  private buildTinkoffToken(payload: Record<string, string | number | boolean | null | undefined>) {
    const secret = process.env.TINKOFF_PASSWORD;
    if (!secret) {
      throw new BadRequestException('Tinkoff password is not configured');
    }

    const entries = Object.entries(payload)
      .filter(([key, value]) => {
        if (['Token', 'Receipt', 'DATA', 'ReceiptData', 'EncryptedPaymentData'].includes(key)) {
          return false;
        }
        if (value === undefined || value === null) {
          return false;
        }
        if (typeof value === 'object') {
          return false;
        }
        return true;
      })
      .map(([key, value]) => [key, String(value)] as [string, string]);

    entries.push(['Password', secret]);
    entries.sort(([a], [b]) => a.localeCompare(b));

    const data = entries.map(([, value]) => value).join('');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async initTinkoffPayment(orderId: string, totalAmount: number, email?: string) {
    const terminalKey = process.env.TINKOFF_TERMINAL_KEY;
    if (!terminalKey) {
      throw new BadRequestException('Tinkoff terminal key is not configured');
    }

    const amount = Math.round(totalAmount * 100);
    const successUrl = process.env.TINKOFF_SUCCESS_URL || `${process.env.FRONTEND_URL || 'https://universnazare.ru'}/profile?payment=success`;
    const failUrl = process.env.TINKOFF_FAIL_URL || `${process.env.FRONTEND_URL || 'https://universnazare.ru'}/profile?payment=fail`;
    const notificationUrl = process.env.TINKOFF_NOTIFICATION_URL;

    if (!notificationUrl) {
      throw new BadRequestException('Tinkoff notification URL is not configured');
    }

    const payload: Record<string, string | number | boolean> = {
      TerminalKey: terminalKey,
      Amount: amount,
      OrderId: orderId,
      Description: `Заказ ${orderId}`,
      SuccessURL: successUrl,
      FailURL: failUrl,
      NotificationURL: notificationUrl,
      CustomerKey: email || orderId,
    };

    if (process.env.TINKOFF_TEST_MODE === 'true') {
      payload.TestMode = true;
    }

    const token = this.buildTinkoffToken(payload);
    const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        Token: token,
      }),
    });

    const data = await response.json();
    if (!data?.Success) {
      throw new BadRequestException(data?.Message || 'Не удалось создать платеж');
    }

    return {
      paymentUrl: data.PaymentURL as string,
      paymentId: String(data.PaymentId),
      paymentStatus: data.Status as string,
    };
  }

  async handleTinkoffNotification(payload: Record<string, any>) {
    const token = payload?.Token;
    if (!token) {
      throw new BadRequestException('Missing token');
    }

    const calculated = this.buildTinkoffToken(payload);
    if (token !== calculated) {
      throw new BadRequestException('Invalid token');
    }

    const orderId = payload?.OrderId;
    const status = payload?.Status;
    const paymentId = payload?.PaymentId ? String(payload.PaymentId) : null;

    if (!orderId) {
      throw new BadRequestException('Missing order id');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: Record<string, any> = {
      paymentStatus: status,
    };

    if (paymentId) {
      updateData.paymentId = paymentId;
    }

    const successStatuses = new Set(['AUTHORIZED', 'CONFIRMED']);
    const failureStatuses = new Set(['REJECTED', 'CANCELLED', 'DEADLINE_EXPIRED', 'REVERSED']);

    if (successStatuses.has(status) && order.status === 'PENDING') {
      updateData.status = 'CONFIRMED';
    }

    if (failureStatuses.has(status) && order.status !== 'CANCELLED') {
      updateData.status = 'CANCELLED';

      for (const item of order.items) {
        await this.productsService.increaseStock(item.productId, item.quantity);
      }
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return { ok: true };
  }
}
