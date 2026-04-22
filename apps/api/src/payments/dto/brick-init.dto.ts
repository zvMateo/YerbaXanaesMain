import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BrickInitOrderItemDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

/**
 * Payload para inicializar el Payment Brick con preferenceId.
 * Se llama al entrar al paso de pago para:
 *  1. Crear la orden PENDING (decrementa stock)
 *  2. Crear preferencia MP con external_reference = orderId
 *  3. Devolver preferenceId → habilita "Mercado Pago Wallet" y "Cuotas sin Tarjeta"
 */
export class BrickInitDto {
  @IsEmail()
  customerEmail!: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrickInitOrderItemDto)
  orderItems!: BrickInitOrderItemDto[];

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingProvinceCode?: string;

  @IsOptional()
  @IsString()
  shippingZip?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
