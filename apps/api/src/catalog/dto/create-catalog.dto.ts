import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateProductIngredientDto {
  @IsUUID()
  @IsNotEmpty()
  inventoryItemId: string;

  @IsNumber()
  @Min(0)
  quantityRequired: number;
}

class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Ej: "1kg", "Kit Matero"

  @IsNumber()
  @Min(0)
  price: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductIngredientDto)
  @IsOptional()
  ingredients?: CreateProductIngredientDto[];

  @IsNumber()
  @IsOptional()
  stock?: number; // Para productos simples sin receta
}

export class CreateCatalogDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  @IsOptional() // Puede crear el producto sin variantes al inicio
  variants?: CreateProductVariantDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
