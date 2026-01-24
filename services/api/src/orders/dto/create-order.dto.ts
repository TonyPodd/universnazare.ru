import { IsString, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ON_SITE = 'ON_SITE',
}

class OrderItemDto {
  @ApiProperty({ description: 'ID товара' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Количество' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Цена на момент заказа' })
  @IsNumber()
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Товары в заказе', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ description: 'Общая сумма заказа' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'Способ оплаты', enum: PaymentMethod, default: PaymentMethod.ON_SITE })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
