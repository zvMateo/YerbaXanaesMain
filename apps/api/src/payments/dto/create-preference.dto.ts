import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PreferenceItemDto {
  @IsString() id: string;
  @IsString() title: string;
  @IsNumber() quantity: number;
  @IsNumber() unit_price: number;
  @IsOptional() @IsString() currency_id?: string;
}

class OrderItemForPreferenceDto {
  @IsString() variantId: string;
  @IsNumber() quantity: number;
}

export class CreatePreferenceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  items: PreferenceItemDto[];

  @IsEmail() payerEmail: string;

  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerPhone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemForPreferenceDto)
  orderItems?: OrderItemForPreferenceDto[];
}
