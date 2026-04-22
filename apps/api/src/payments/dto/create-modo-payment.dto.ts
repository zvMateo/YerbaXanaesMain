import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEmail,
  Min,
  IsInt,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class ModoOrderItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateModoPaymentDto {
  @IsString()
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  deliveryType!: string; // "shipping" | "pickup"

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
  shippingCost?: number;

  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Cuotas elegidas por el usuario: 1, 3, 6, 12 o 18 */
  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6, 12, 18])
  installments?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModoOrderItemDto)
  orderItems!: ModoOrderItemDto[];
}
