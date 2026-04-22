import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { PaymentsSyncService } from './payments-sync.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { CreateBrickPaymentDto } from './dto/create-brick-payment.dto';
import { BrickInitDto } from './dto/brick-init.dto';
import { CreateModoPaymentDto } from './dto/create-modo-payment.dto';
import { OverrideOrderStatusDto } from './dto/override-order-status.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrderStatus } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentsSyncService: PaymentsSyncService,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Crear preferencia (Redirect/Billetera)' })
  async createCheckoutPreference(@Body() dto: CreatePreferenceDto) {
    return this.paymentsService.createCheckoutPreference(dto);
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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

  @Post('brick-init')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Inicializar Payment Brick con preferenceId',
    description:
      'Crea la orden PENDING y genera una preferencia MP. El preferenceId habilita las opciones "Mercado Pago Wallet" y "Cuotas sin Tarjeta" en el Brick. Llamar al entrar al paso de pago.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencia creada — { preferenceId, orderId, amount }',
  })
  async brickInit(@Body() dto: BrickInitDto) {
    const result = await this.paymentsService.brickInit(dto);
    return { data: result, message: 'Brick inicializado' };
  }

  @Post('brick')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Procesar pago vía Payment Brick',
    description:
      'Endpoint unificado para Payment Brick. Acepta tarjetas, billetera MP y pagos offline (Rapipago, Pago Fácil, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Pago procesado' })
  async processBrickPayment(@Body() dto: CreateBrickPaymentDto) {
    const result = await this.paymentsService.processBrickPayment(dto);
    return {
      data: result,
      message: 'Pago procesado',
    };
  }

  @Post('modo')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Crear intención de pago con MODO',
    description:
      'Crea una orden PENDING y genera el QR + deeplink de MODO para que el usuario pague desde su app bancaria. Soporta Ahora 3/6/12/18.',
  })
  @ApiResponse({ status: 200, description: 'Checkout MODO generado' })
  async createModoPayment(@Body() dto: CreateModoPaymentDto) {
    return this.paymentsService.createModoPayment(dto);
  }

  @Post('modo-webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de MODO' })
  async handleModoWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-modo-signature') signature: string | undefined,
  ) {
    return this.paymentsService.handleModoWebhook(body, signature);
  }

  @Get('order-status/:id')
  @ApiOperation({
    summary: 'Consultar estado canónico de orden/pago',
    description:
      'Devuelve el estado actual de la orden para sincronizar UX de checkout',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la orden obtenido',
  })
  getOrderPaymentStatus(@Param('id') id: string) {
    return this.paymentsService.getOrderPaymentStatus(id);
  }

  @Post('webhook')
  @SkipThrottle() // MP puede mandar múltiples notificaciones — no limitar
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de Mercado Pago',
    description:
      'Recibe notificaciones de Mercado Pago. Maneja tópico "payment" (Payments API — Brick: tarjetas, billetera, tickets) y "order" (Orders API — Checkout Pro).',
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

    try {
      return await this.paymentsService.handleWebhook({
        body,
        signature,
        requestId,
        dataIdUrl,
        typeUrl,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.warn(
          `Webhook MP descartado por validación de firma/metadatos: ${error.message}`,
        );
        // Respondemos 200 para evitar reintentos de notificaciones inválidas.
        return { status: 'ok' };
      }
      throw error;
    }
  }

  @Patch('orders/:id/override-status')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Override manual de estado de una orden (backoffice)',
    description:
      'Permite cambiar el estado de una orden manualmente. El webhook de MP no revertirá este cambio.',
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado con auditoría' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  async overrideOrderStatus(
    @Param('id') orderId: string,
    @Body() body: OverrideOrderStatusDto,
    @Req() req: any,
  ) {
    const changedByEmail: string =
      req.user?.email ?? req.user?.id ?? 'backoffice';
    const updated = await this.paymentsSyncService.manuallyOverrideOrderStatus(
      orderId,
      body.status,
      changedByEmail,
      body.reason,
    );
    return {
      data: { updated, orderId, newStatus: body.status },
      message: updated
        ? 'Estado actualizado con override manual'
        : 'Sin cambios (estado ya era el mismo o manualOverride activo)',
    };
  }

  @Get('orders/:id/state-history')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historial de cambios de estado de una orden',
    description:
      'Devuelve todos los cambios de estado auditados para trazabilidad completa.',
  })
  @ApiResponse({ status: 200, description: 'Historial de estados' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  async getOrderStateHistory(@Param('id') orderId: string) {
    const history =
      await this.paymentsSyncService.getOrderStateHistory(orderId);
    return { data: history, message: 'Historial de estados obtenido' };
  }

  @Post('cleanup-manual')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger manual de cleanup de órdenes PENDING expiradas',
    description:
      'Solo admin. Dispara manualmente la limpieza de órdenes PENDING. Overridea TTL si se especifica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup ejecutado con métricas',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes',
  })
  async manualCleanup(@Query('ttl_minutes') ttlMinutesParam?: string) {
    let ttlOverride: number | undefined;

    if (ttlMinutesParam) {
      const parsed = parseInt(ttlMinutesParam, 10);
      // parseInt retorna NaN si no es un número válido
      if (!isNaN(parsed)) {
        ttlOverride = parsed;
      }
    }

    return await this.paymentsService.cleanupExpiredPendingOrders(ttlOverride);
  }
}
