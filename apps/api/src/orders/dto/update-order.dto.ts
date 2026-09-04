import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';

// Estados que el backoffice puede setear manualmente desde la UI.
// Alineado con OrderStatus de Prisma (incluye el flujo Preparar / Enviar / Entregar).
export const UPDATABLE_ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
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
