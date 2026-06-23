import { BadRequestException, Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('subscriptions/init')
  @ApiOperation({ summary: 'Создать платеж за абонемент' })
  @ApiResponse({ status: 200, description: 'Платеж создан' })
  async initSubscriptionPayment() {
    throw new BadRequestException('Онлайн-оплата на сайте отключена');
  }

  @Post('tinkoff/notification')
  @ApiOperation({ summary: 'Webhook уведомления Tinkoff' })
  async handleTinkoffNotification(@Body() payload: Record<string, any>) {
    await this.paymentsService.handleTinkoffNotification(payload);
    return 'OK';
  }
}
