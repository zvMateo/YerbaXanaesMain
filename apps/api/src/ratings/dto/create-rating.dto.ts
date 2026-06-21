import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Payload de POST /ratings (público — el userId se infiere de la sesión si existe).
 * Reemplaza el `Record<string, any>` previo para que el ValidationPipe global
 * (whitelist + forbidNonWhitelisted) rechace campos extra y acote el comment,
 * evitando XSS almacenado al renderizar reseñas.
 */
export class CreateRatingDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
