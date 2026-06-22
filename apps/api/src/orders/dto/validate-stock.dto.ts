import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';

/**
 * Valida el body de POST /orders/validate (chequeo de stock pre-checkout).
 * Reusa CreateOrderItemDto para mantener una sola fuente de verdad de la forma del item
 * y que el ValidationPipe global rechace payloads malformados (antes era un tipo inline sin validar).
 */
export class ValidateStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
