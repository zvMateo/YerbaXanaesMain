import {
  IsIn,
  IsString,
  IsNumber,
  IsEmail,
  ValidateNested,
  IsOptional,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class BrickPayerIdentification {
  @IsString()
  type!: string;

  @IsString()
  number!: string;
}

class BrickPayerDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrickPayerIdentification)
  identification?: BrickPayerIdentification;
}

class BrickOrderItemDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

/**
 * Payload que envía el Payment Brick de MP en su callback onSubmit.
 * La estructura varía según el método de pago seleccionado:
 * - Tarjetas: tiene token, issuer_id, installments
 * - Ticket (Rapipago, etc.): solo payment_method_id
 * - Account money (billetera): solo payment_method_id = 'account_money'
 */
export class BrickFormDataDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  issuer_id?: string;

  @IsString()
  payment_method_id!: string;

  @IsNumber()
  @Min(0.01)
  transaction_amount!: number;

  @IsOptional()
  @IsNumber()
  installments?: number;

  @ValidateNested()
  @Type(() => BrickPayerDto)
  payer!: BrickPayerDto;

  /**
   * Requerido para enrutar pagos de débito por redes específicas (ej: Maestro, Visa Electron).
   * El SDK del Brick lo incluye cuando corresponde.
   */
  @IsOptional()
  @IsString()
  payment_method_option_id?: string | null;

  /**
   * Modo de procesamiento sugerido por el Brick (ej: 'gateway', 'aggregator').
   * Se forwarded a MP para enrutamiento correcto de débito.
   */
  @IsOptional()
  @IsString()
  processing_mode?: string | null;

  /**
   * Campo adicional que MP Payment Brick incluye automáticamente
   * cuando enableReviewStep: true está activo. Contiene shipments e items para anti-fraude.
   */
  @IsOptional()
  additional_info?: unknown;
}

export class CreateBrickPaymentDto {
  /**
   * Tipo de pago seleccionado por el usuario en el brick.
   * Valores posibles según SDK: 'credit_card', 'debit_card', 'prepaid_card',
   * 'ticket', 'bank_transfer', 'wallet_purchase', 'atm', 'account_money'
   * Nota: 'prepaid_card' se emite cuando prepaidCard está habilitado en el Brick.
   */
  @IsIn([
    'credit_card',
    'debit_card',
    'prepaid_card',
    'ticket',
    'account_money',
    'wallet_purchase',
    'bank_transfer',
    'atm',
  ])
  selectedPaymentMethod!:
    | 'credit_card'
    | 'debit_card'
    | 'prepaid_card'
    | 'ticket'
    | 'account_money'
    | 'wallet_purchase'
    | 'bank_transfer'
    | 'atm';

  /**
   * Para wallet_purchase el SDK devuelve formData: null.
   * En los demás métodos es obligatorio.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => BrickFormDataDto)
  formData?: BrickFormDataDto;

  /**
   * ID de la orden pre-creada por /payments/brick-init.
   * Si está presente, se usa esa orden en lugar de crear una nueva.
   * Evita doble-creación de orden cuando el Brick ya tiene preferenceId.
   */
  @IsOptional()
  @IsString()
  existingOrderId?: string;

  // --- Datos del pedido (nuestra BD) ---

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingProvinceCode?: string;

  @IsOptional()
  @IsString()
  shippingZip?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrickOrderItemDto)
  orderItems!: BrickOrderItemDto[];
}
