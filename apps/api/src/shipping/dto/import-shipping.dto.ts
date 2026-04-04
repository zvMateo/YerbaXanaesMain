import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ImportShippingDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;
}

export class TrackShippingDto {
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}
