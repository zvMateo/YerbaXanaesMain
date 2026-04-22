import { IsEnum, IsString, MinLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OverrideOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsString()
  @MinLength(3)
  reason!: string;
}
