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

  // Dirección estructurada (preferida — separa cada campo para MiCorreo)
  @IsOptional()
  @IsString()
  shippingStreetName?: string;

  @IsOptional()
  @IsString()
  shippingStreetNumber?: string;

  @IsOptional()
  @IsString()
  shippingFloor?: string;

  @IsOptional()
  @IsString()
  shippingApartment?: string;

  // Legacy: si el cliente todavía manda dirección en un solo string (DEPRECATED)
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

  // Tipo de envío Correo Argentino: "D" (domicilio) o "S" (sucursal)
  @IsOptional()
  @IsString()
  shippingDeliveryType?: string;

  // Código de sucursal de Correo (requerido si shippingDeliveryType=S)
  @IsOptional()
  @IsString()
  shippingAgencyCode?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
