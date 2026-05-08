import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsEmail,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  // ── Negocio ──────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // ── Envíos ───────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  shippingEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingFlatRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeShippingThreshold?: number;

  // ── Pagos ────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  paymentMercadoPago?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentCash?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentTransfer?: boolean;

  // ── Notificaciones ────────────────────────────────────────────
  @IsOptional()
  @IsEmail()
  notificationEmail?: string;

  @IsOptional()
  @IsBoolean()
  lowStockAlert?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
