import {
  IsString,
  IsNumber,
  IsEmail,
  ValidateNested,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PayerIdentification {
  @IsString()
  type!: string;

  @IsString()
  number!: string;
}

export class PayerDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PayerIdentification)
  identification?: PayerIdentification;
}

class OrderItemDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateOrderPaymentDto {
  @IsNumber()
  transaction_amount!: number;

  @IsString()
  token!: string;

  @IsString()
  description!: string;

  @IsNumber()
  installments!: number;

  @IsString()
  payment_method_id!: string;

  @IsOptional()
  @IsString()
  issuer_id?: string;

  @ValidateNested()
  @Type(() => PayerDto)
  payer!: PayerDto;

  // --- Datos de nuestra BD (no van a MP) ---
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  // Datos de entrega (opcionales, para persistir en la orden)
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems?: OrderItemDto[];
}
