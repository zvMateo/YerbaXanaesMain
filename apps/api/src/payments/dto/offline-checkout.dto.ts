import { IsIn, IsOptional, IsString } from 'class-validator';
import { BrickInitDto } from './brick-init.dto';

/**
 * Checkout público offline (transferencia / efectivo).
 * Reusa el mismo body que brick-init + paymentProvider.
 * No marca la orden como PAID: queda PENDING para que Luz confirme.
 */
export class OfflineCheckoutDto extends BrickInitDto {
  @IsIn(['TRANSFER', 'CASH'])
  paymentProvider!: 'TRANSFER' | 'CASH';

  /**
   * Si el cliente ya pasó por brick-init (Mercado Pago) y cambió de método,
   * reutilizamos esa orden PENDING en lugar de crear otra (evita doble stock).
   */
  @IsOptional()
  @IsString()
  existingOrderId?: string;
}
