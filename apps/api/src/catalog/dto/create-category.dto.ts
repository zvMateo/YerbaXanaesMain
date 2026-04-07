import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string; // Ej: "Yerbas"

  @IsString()
  @IsOptional()
  slug?: string; // Ej: "yerbas" (Opcional, lo generamos si falta)
}
