import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// ---------------------------------------------------------
// NOTA: Definimos estos enums acá para validación
// (Aunque ya existen en Prisma, DTO no los importa directo)
// ---------------------------------------------------------

enum SalesChannel {
  ONLINE = 'ONLINE',
  STORE = 'STORE',
  INSTAGRAM = 'INSTAGRAM',
  WHATSAPP = 'WHATSAPP',
  FAIR = 'FAIR',
}

enum PaymentMethod {
  MERCADOPAGO = 'MERCADOPAGO',
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class CreateOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  // Datos del Cliente
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  // Detalles de la Venta
  @IsEnum(SalesChannel)
  @IsOptional()
  channel?: SalesChannel = SalesChannel.ONLINE;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.MERCADOPAGO;

  // Datos de Entrega
  @IsString()
  @IsOptional()
  deliveryType?: string; // "shipping" | "pickup"

  @IsString()
  @IsOptional()
  shippingAddress?: string; // Display legacy: se compone si vienen campos estructurados

  @IsString()
  @IsOptional()
  shippingStreetName?: string;

  @IsString()
  @IsOptional()
  shippingStreetNumber?: string;

  @IsString()
  @IsOptional()
  shippingFloor?: string;

  @IsString()
  @IsOptional()
  shippingApartment?: string;

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingProvinceCode?: string; // Código de provincia (Correo Argentino)

  @IsString()
  @IsOptional()
  shippingDeliveryType?: string; // "D" | "S"

  @IsString()
  @IsOptional()
  shippingAgencyCode?: string;

  @IsString()
  @IsOptional()
  shippingZip?: string; // Código postal

  @IsNumber()
  @IsOptional()
  shippingCost?: number; // Costo del envío en ARS (0 = retiro en local)

  @IsString()
  @IsOptional()
  shippingProvider?: string; // "correo_argentino" | "manual_quote_required" | "pickup"

  // Notas internas (para ventas manuales)
  @IsString()
  @IsOptional()
  notes?: string;

  // Descuento con Cupón
  @IsString()
  @IsOptional()
  couponCode?: string;

  // Carrito de Compras
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  items!: CreateOrderItemDto[];
}
