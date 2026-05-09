import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class SetTrackingNumberDto {
  /**
   * Número de seguimiento real asignado por Correo Argentino,
   * visible en el dashboard de MiCorreo después de importar el envío.
   * Ej: "000500076393019A3G0C701"
   */
  @IsString()
  @IsNotEmpty()
  @Length(8, 40, {
    message: 'El tracking debe tener entre 8 y 40 caracteres',
  })
  trackingNumber!: string;

  /**
   * ID interno de MiCorreo si difiere del trackingNumber (raro).
   * Si se omite, se usa el mismo trackingNumber.
   */
  @IsOptional()
  @IsString()
  correoShippingId?: string;
}
