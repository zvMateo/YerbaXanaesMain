import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { CreatePreferenceDto } from './dto/create-preference.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear preferencia (Redirect/Billetera)' })
  async createCheckoutPreference(@Body() dto: CreatePreferenceDto) {
    return this.paymentsService.createCheckoutPreference(dto);
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Procesar pago vía Checkout API',
    description:
      'Crea una orden PENDING y dispara POST /v1/orders en MercadoPago',
  })
  @ApiResponse({
    status: 200,
    description: 'Pago procesado',
  })
  async processCardPayment(@Body() dto: CreateOrderPaymentDto) {
    return this.paymentsService.processCardPayment(dto);
  }

  @Post('webhook')
  @SkipThrottle() // MP puede mandar múltiples notificaciones — no limitar
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de Mercado Pago',
    description: 'Recibe notificaciones de Mercado Pago (tópico: order)',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook procesado',
  })
  async handleWebhook(
    @Body() body: Record<string, any>,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Query('data.id') dataId: string,
    @Query('type') type: string,
  ) {
    // Si es un ping de prueba de Mercado Pago
    if (body['action'] === 'test.created') {
      return { status: 'ok' };
    }

    // MercadoPago puede enviar type o topic
    const typeUrl = type || String(body['type'] || body['topic'] || '');
    const dataIdUrl = dataId || String(body['data']?.id || '');

    return this.paymentsService.handleWebhook({
      body,
      signature,
      requestId,
      dataIdUrl,
      typeUrl,
    });
  }
}
