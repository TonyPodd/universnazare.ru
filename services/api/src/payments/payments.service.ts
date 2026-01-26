import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async initSubscriptionPayment(userId: string, typeId: string) {
    const subscriptionType = await this.prisma.subscriptionType.findUnique({
      where: { id: typeId },
    });

    if (!subscriptionType) {
      throw new NotFoundException('Тип абонемента не найден');
    }

    if (!subscriptionType.isActive) {
      throw new BadRequestException('Этот тип абонемента недоступен для покупки');
    }

    if (!Number.isFinite(subscriptionType.price) || subscriptionType.price <= 0) {
      throw new BadRequestException('Цена абонемента должна быть больше 0');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const paymentRecord = await this.prisma.subscriptionPayment.create({
      data: {
        userId,
        typeId,
        amount: subscriptionType.amount,
        price: subscriptionType.price,
        status: 'PENDING',
      },
    });

    const orderId = paymentRecord.id.replace(/-/g, '').slice(0, 20);
    const payment = await this.initTinkoffPayment({
      orderId,
      amount: subscriptionType.price,
      description: `Абонемент: ${subscriptionType.name}`,
      customerKey: user?.email || userId,
    });

    await this.prisma.subscriptionPayment.update({
      where: { id: paymentRecord.id },
      data: {
        status: payment.paymentStatus,
        paymentId: payment.paymentId,
        paymentUrl: payment.paymentUrl,
      },
    });

    return {
      paymentUrl: payment.paymentUrl,
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

    const paymentId = payload?.PaymentId ? String(payload.PaymentId) : null;
    const status = payload?.Status as string | undefined;
    const orderId = payload?.OrderId as string | undefined;
    let payment = null;

    if (paymentId) {
      payment = await this.prisma.subscriptionPayment.findFirst({
        where: { paymentId },
      });
    }

    if (!payment && orderId) {
      payment = await this.prisma.subscriptionPayment.findUnique({
        where: { id: orderId },
      });
    }

    if (!payment) {
      throw new NotFoundException('Платеж не найден');
    }

    const updateData: Record<string, any> = {
      status: status || payment.status,
    };

    if (paymentId) {
      updateData.paymentId = paymentId;
    }

    // Не считаем AUTHORIZED финальным успехом: платеж может быть
    // авторизован, а затем отменён/реверсирован.
    const successStatuses = new Set(['CONFIRMED']);
    const failureStatuses = new Set([
      'REJECTED',
      'CANCELLED',
      'CANCELED',
      'DEADLINE_EXPIRED',
      'REVERSING',
      'REVERSED',
      'REFUNDING',
      'REFUNDED',
      'PARTIAL_REVERSED',
      'PARTIAL_REFUNDED',
    ]);

    if (status && successStatuses.has(status) && !payment.processedAt) {
      const subscription = await this.usersService.purchaseSubscription(payment.userId, payment.typeId, {
        bypassPayment: true,
      });

      updateData.processedAt = new Date();
      updateData.subscriptionId = subscription.id;
    }

    // Откатываем, если платёж перешёл в неуспешный статус и у него уже
    // есть привязанный абонемент, даже если processedAt по какой-то
    // причине не был выставлен.
    if (
      status &&
      failureStatuses.has(status) &&
      payment.subscriptionId &&
      !payment.rolledBackAt
    ) {
      await this.usersService.rollbackSubscriptionPurchase(
        payment.userId,
        payment.subscriptionId,
        payment.amount,
      );
      updateData.rolledBackAt = new Date();
    }

    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: updateData,
    });

    return { ok: true };
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

  private async initTinkoffPayment(params: {
    orderId: string;
    amount: number;
    description: string;
    customerKey: string;
  }) {
    const terminalKey = process.env.TINKOFF_TERMINAL_KEY;
    if (!terminalKey) {
      throw new BadRequestException('Tinkoff terminal key is not configured');
    }

    const amount = Math.round(params.amount * 100);
    const successUrl = process.env.TINKOFF_SUCCESS_URL
      || `${process.env.FRONTEND_URL || 'https://universnazare.ru'}/profile?payment=success`;
    const failUrl = process.env.TINKOFF_FAIL_URL
      || `${process.env.FRONTEND_URL || 'https://universnazare.ru'}/profile?payment=fail`;
    const notificationUrl = process.env.TINKOFF_NOTIFICATION_URL;

    if (!notificationUrl) {
      throw new BadRequestException('Tinkoff notification URL is not configured');
    }

    const payload: Record<string, string | number | boolean> = {
      TerminalKey: terminalKey,
      Amount: amount,
      OrderId: params.orderId,
      Description: params.description,
      SuccessURL: successUrl,
      FailURL: failUrl,
      NotificationURL: notificationUrl,
      CustomerKey: params.customerKey,
    };

    const token = this.buildTinkoffToken(payload);
    const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        Token: token,
      }),
    });

    const data = (await response.json()) as {
      Success?: boolean;
      Message?: string;
      Details?: string;
      ErrorCode?: string;
      PaymentURL?: string;
      PaymentId?: string | number;
      Status?: string;
    };
    if (!data?.Success) {
      console.error('Tinkoff Init failed', data);
      const details = data?.Details ? `: ${data.Details}` : '';
      const code = data?.ErrorCode ? ` (${data.ErrorCode})` : '';
      throw new BadRequestException(`${data?.Message || 'Не удалось создать платеж'}${details}${code}`);
    }

    return {
      paymentUrl: data.PaymentURL as string,
      paymentId: String(data.PaymentId),
      paymentStatus: data.Status as string,
    };
  }
}
