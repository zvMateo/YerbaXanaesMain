import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';

// Estados que el backoffice puede setear manualmente desde la UI.
// Mantener alineado con OrderStatus de Prisma.
export const UPDATABLE_ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'REJECTED',
  'CANCELLED',
  'REFUNDED',
] as const;

export type UpdatableOrderStatus = (typeof UPDATABLE_ORDER_STATUSES)[number];

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsString()
  @IsIn(UPDATABLE_ORDER_STATUSES as unknown as string[])
  status?: UpdatableOrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
