import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { GetShippingRatesDto } from './dto/get-rates.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // -------------------------------------------------------
  // POST /shipping/rates — Público (lo usa el checkout del ecommerce)
  // Cotiza el envío a partir del CP destino y los items del carrito
  // -------------------------------------------------------
  @Post('rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cotizar envío con Correo Argentino' })
  async getRates(@Body() dto: GetShippingRatesDto) {
    return this.shippingService.getRates(dto);
  }

  // -------------------------------------------------------
  // POST /shipping/import/:orderId — Solo admin
  // Importa el envío a MiCorreo y guarda el número de tracking
  // -------------------------------------------------------
  @Post('import/:orderId')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Importar envío a MiCorreo Argentino (admin)' })
  async importShipping(@Param('orderId') orderId: string) {
    return this.shippingService.importShipping(orderId);
  }

  // -------------------------------------------------------
  // GET /shipping/tracking/:orderId — Solo admin
  // Devuelve el tracking de una orden importada
  // -------------------------------------------------------
  @Get('tracking/:orderId')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver seguimiento de envío (admin)' })
  async getTracking(@Param('orderId') orderId: string) {
    return this.shippingService.getTracking(orderId);
  }
}
