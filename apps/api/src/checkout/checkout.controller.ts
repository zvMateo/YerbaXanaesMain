import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckoutPricingService } from './checkout-pricing.service';
import { QuoteDto } from './dto/quote.dto';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly pricing: CheckoutPricingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Cotizar un carrito',
    description:
      'Devuelve el total autoritativo: productos, envío y cupón. El frontend muestra estos valores, no los calcula.',
  })
  @ApiResponse({ status: 200, description: 'Cotización calculada' })
  async quote(@Body() dto: QuoteDto) {
    const quote = await this.pricing.quote(dto);
    return { data: quote, message: 'Cotización calculada' };
  }
}
