import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый заказ' })
  @ApiResponse({ status: 201, description: 'Заказ успешно создан' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех заказов' })
  @ApiQuery({ name: 'userId', required: false, description: 'Фильтр по пользователю' })
  findAll(@Query('userId') userId?: string) {
    if (userId) {
      return this.ordersService.findByUser(userId);
    }
    return this.ordersService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Получить заказы пользователя' })
  findByUser(@Param('userId') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Get('qr/:orderId')
  @ApiOperation({ summary: 'Получить заказ по QR-коду' })
  @ApiResponse({ status: 200, description: 'Заказ найден' })
  @ApiResponse({ status: 404, description: 'Заказ не найден' })
  getOrderByQRCode(@Param('orderId') orderId: string) {
    return this.ordersService.getOrderByQRCode(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заказ по ID' })
  @ApiResponse({ status: 200, description: 'Заказ найден' })
  @ApiResponse({ status: 404, description: 'Заказ не найден' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/qrcode')
  @ApiOperation({ summary: 'Получить QR-код заказа' })
  @ApiResponse({ status: 200, description: 'QR-код сгенерирован' })
  async getQRCode(@Param('id') id: string) {
    await this.ordersService.findOne(id); // проверка существования
    const qrCode = await this.ordersService.generateQRCode(id);
    return { qrCode };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Обновить статус заказа' })
  @ApiResponse({ status: 200, description: 'Статус обновлен' })
  @ApiResponse({ status: 404, description: 'Заказ не найден' })
  updateStatus(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @Post('tinkoff/notification')
  @ApiOperation({ summary: 'Webhook уведомления Tinkoff' })
  async handleTinkoffNotification(@Body() payload: Record<string, any>) {
    await this.ordersService.handleTinkoffNotification(payload);
    return 'OK';
  }
}
