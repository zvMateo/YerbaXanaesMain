import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class RateItemDto {
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class GetShippingRatesDto {
  @IsString()
  @IsNotEmpty()
  postalCodeDestination: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RateItemDto)
  items: RateItemDto[];
}
