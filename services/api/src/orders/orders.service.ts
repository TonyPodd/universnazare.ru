import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import * as QRCode from 'qrcode';

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

    if (paymentMethod === 'ONLINE') {
      throw new BadRequestException('Онлайн-оплата доступна только для абонементов');
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

    // Генерируем QR-код
    const qrCodeData = await this.generateQRCode(order.id);

    return {
      ...order,
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

}
