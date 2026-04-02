import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MeasurementUnit } from '@prisma/client';

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsInt()
  @Min(0)
  currentStock: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  minStockAlert?: number;

  @IsEnum(MeasurementUnit)
  unit: MeasurementUnit;

  @IsNumber()
  @IsOptional()
  costPrice?: number;
}
