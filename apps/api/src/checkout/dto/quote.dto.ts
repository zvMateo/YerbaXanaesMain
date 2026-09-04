import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuoteItemDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}

export class QuoteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  orderItems!: QuoteItemDto[];

  @IsIn(['shipping', 'pickup'])
  deliveryType!: 'shipping' | 'pickup';

  @IsOptional()
  @IsIn(['D', 'S'])
  shippingDeliveryType?: 'D' | 'S';

  @IsOptional()
  @Matches(/^\d{4,8}$/, { message: 'Código postal inválido' })
  shippingZip?: string;

  @IsOptional()
  @IsString()
  shippingProductName?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
