import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}
