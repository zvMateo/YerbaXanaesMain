import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

/**
 * Subconjunto de `StoreSettings` que la tienda puede ver.
 *
 * Deja fuera a propósito `email`, `notificationEmail`, `lowStockAlert` y
 * `lowStockThreshold`: son datos internos del negocio.
 */
export interface PublicStoreSettings {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  shippingEnabled: boolean;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  paymentMercadoPago: boolean;
  paymentCash: boolean;
  paymentTransfer: boolean;
}

@ApiTags('settings')
@Controller('settings')
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  /**
   * GET /settings/public — Sin guard. Lo consume el ecommerce para saber qué
   * medios de pago y qué reglas de envío están activos, en vez de hardcodearlos.
   */
  @Get('public')
  @ApiOperation({
    summary: 'Configuración pública de la tienda',
    description:
      'Subconjunto sin datos internos, consumido por el ecommerce para saber qué medios de pago y qué reglas de envío están activos.',
  })
  @ApiResponse({ status: 200, description: 'Configuración pública obtenida' })
  async getPublic(): Promise<{
    data: PublicStoreSettings;
    message: string;
  }> {
    const s = await this.settings.get();

    return {
      data: {
        businessName: s.businessName,
        phone: s.phone,
        address: s.address,
        city: s.city,
        shippingEnabled: s.shippingEnabled,
        shippingFlatRate: s.shippingFlatRate,
        freeShippingThreshold: s.freeShippingThreshold,
        paymentMercadoPago: s.paymentMercadoPago,
        paymentCash: s.paymentCash,
        paymentTransfer: s.paymentTransfer,
      },
      message: 'Configuración pública obtenida',
    };
  }
}
