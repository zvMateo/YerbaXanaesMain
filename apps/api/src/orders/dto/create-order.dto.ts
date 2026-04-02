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
  // Datos del Cliente (Opcionales si es usuario registrado, pero obligatorios si es Guest)
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

  // Carrito de Compras
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  items: CreateOrderItemDto[];
}
