import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('subscriptions/init')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Создать платеж за абонемент' })
  @ApiResponse({ status: 200, description: 'Платеж создан' })
  async initSubscriptionPayment(@Request() req, @Body('typeId') typeId: string) {
    return this.paymentsService.initSubscriptionPayment(req.user.id, typeId);
  }

  @Post('tinkoff/notification')
  @ApiOperation({ summary: 'Webhook уведомления Tinkoff' })
  async handleTinkoffNotification(@Body() payload: Record<string, any>) {
    await this.paymentsService.handleTinkoffNotification(payload);
    return 'OK';
  }
}
