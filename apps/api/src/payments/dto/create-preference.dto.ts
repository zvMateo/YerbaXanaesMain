import {
  IsArray,
  IsEmail,
  Min,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PreferenceItemDto {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsNumber() quantity!: number;
  @IsNumber() unit_price!: number;
  @IsOptional() @IsString() currency_id?: string;
}

class OrderItemForPreferenceDto {
  @IsString() variantId!: string;
  @IsNumber() quantity!: number;
}

export class CreatePreferenceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  items!: PreferenceItemDto[];

  @IsEmail() payerEmail!: string;

  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerPhone?: string;

  // Datos de entrega (opcionales, para persistir en la orden)
  @IsOptional()
  @IsString()
  deliveryType?: string; // "shipping" | "pickup"

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
  @Type(() => OrderItemForPreferenceDto)
  orderItems?: OrderItemForPreferenceDto[];
}
