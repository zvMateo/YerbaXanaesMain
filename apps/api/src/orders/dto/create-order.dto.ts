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
  variantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
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
  shippingAddress?: string; // Calle + número del cliente

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingProvinceCode?: string; // Código de provincia (Correo Argentino)

  @IsString()
  @IsOptional()
  shippingZip?: string; // Código postal

  @IsNumber()
  @IsOptional()
  shippingCost?: number; // Costo del envío en ARS (0 = retiro en local)

  @IsString()
  @IsOptional()
  shippingProvider?: string; // "correo_argentino" | "flat_rate" | "pickup"

  // Carrito de Compras
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  items: CreateOrderItemDto[];
}
