import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrickPaymentDto } from './dto/create-brick-payment.dto';
import { BrickInitDto } from './dto/brick-init.dto';
import { OfflineCheckoutDto } from './dto/offline-checkout.dto';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import {
  OrderStatus,
  PaymentProvider,
  Prisma,
  SalesChannel,
} from '@prisma/client';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { CouponsService } from '../coupons/coupons.service';
import { PaymentsSyncService } from './payments-sync.service';
import { ShippingService } from '../shipping/shipping.service';
import { CheckoutPricingService } from '../checkout/checkout-pricing.service';
import { SettingsService } from '../settings/settings.service';
import { InventoryReservationService } from '../inventory/inventory-reservation.service';

// MP corta el statement_descriptor a 13 caracteres (límite documentado
// en Checkout Pro /checkout/preferences). Valores más largos pueden
// rechazarse o truncarse de forma impredecible según la red de tarjeta.
const STATEMENT_DESCRIPTOR_MAX_LENGTH = 13;
const DEFAULT_STATEMENT_DESCRIPTOR = 'YERBAXANAES';

// Tope de órdenes PENDING activas por email. El throttle por IP del controller
// no frena a quien rota IP/proxy; este límite evita que un mismo comprador
// acumule PENDING que reservan stock. Las expiradas las libera el cleanup.
const MAX_PENDING_ORDERS_PER_EMAIL = 5;

/**
 * Métricas devueltas por el cleanup de órdenes PENDING
 */
export type TransferInstructions = {
  alias: string | null;
  cbu: string | null;
  holder: string | null;
  bank: string | null;
  test?: boolean;
};

const PAYMENT_LINK_NOTES = 'Link de pago';
const DEFAULT_PAYMENT_LINK_TITLE = 'Pago YerbaXanaes';

export interface CleanupMetrics {
  checked: number; // Órdenes PENDING encontradas
  cancelled: number; // Órdenes canceladas exitosamente
  cancelledCart: number; // Carritos abandonados (sin mpPaymentId) cancelados
  cancelledPayment: number; // Esperando pago (con mpPaymentId) cancelados
  failed: number; // Intentos fallidos
  totalStockRestored: number; // Unidades totales de stock restauradas
  cartAbandonedTtlMinutes: number; // TTL aplicado a carritos abandonados
  pendingPaymentTtlMinutes: number; // TTL aplicado a órdenes esperando pago
  durationMs: number; // Tiempo total en milisegundos
  timestamp: Date;
}

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly preferenceClient: Preference;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly coupons: CouponsService,
    private readonly paymentsSync: PaymentsSyncService,
    private readonly shipping: ShippingService,
    private readonly pricing: CheckoutPricingService,
    private readonly settings: SettingsService,
    private readonly reservation: InventoryReservationService,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MP_ACCESS_TOKEN')!,
      options: { timeout: 10000 },
    });
    this.preferenceClient = new Preference(client);
  }

  onModuleInit() {
    const intervalMinutes = Math.max(
      1,
      Number(this.config.get('MP_PENDING_CLEANUP_INTERVAL_MINUTES') ?? 10),
    );

    this.cleanupInterval = setInterval(() => {
      void this.cleanupExpiredPendingOrders();
    }, intervalMinutes * 60_000);

    this.cleanupInterval.unref?.();
    this.logger.log(
      `Cleanup automático de ordenes PENDING iniciado (cada ${intervalMinutes} min)`,
    );
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Descriptor que ve el comprador en el resumen de su tarjeta.
   * Toma MP_STATEMENT_DESCRIPTOR del env y lo recorta al límite de MP;
   * si está vacío o solo espacios, cae al default.
   */
  private getStatementDescriptor(): string {
    const raw = (
      this.config.get<string>('MP_STATEMENT_DESCRIPTOR') ||
      DEFAULT_STATEMENT_DESCRIPTOR
    ).trim();

    if (!raw) return DEFAULT_STATEMENT_DESCRIPTOR;

    if (raw.length > STATEMENT_DESCRIPTOR_MAX_LENGTH) {
      this.logger.warn(
        `MP_STATEMENT_DESCRIPTOR excede ${STATEMENT_DESCRIPTOR_MAX_LENGTH} caracteres ("${raw}"); se trunca`,
      );
    }

    return raw.slice(0, STATEMENT_DESCRIPTOR_MAX_LENGTH);
  }

  // -------------------------------------------------------
  // BRICK INIT — Crea orden + preferencia para Wallet y Cuotas
  // -------------------------------------------------------
  /**
   * Inicializa el Payment Brick con un preferenceId.
   * Esto habilita las opciones "Mercado Pago Wallet" y "Cuotas sin Tarjeta"
   * que el SDK oculta si no hay preferenceId en la inicialización.
   *
   * Flujo:
   * 1. Calcula monto real (items + envío - cupón)
   * 2. Crea la orden PENDING y decrementa stock
   * 3. Crea preferencia MP con external_reference = orderId y back_urls configurados
   * 4. Devuelve { preferenceId, orderId, amount }
   */
  /**
   * Los toggles de medios de pago del panel tienen que valer server-side.
   * Apagar "Efectivo" en el backoffice bloquea el cobro, no solo la UI de la
   * tienda: sin esto, un POST directo al API seguía creando la orden.
   *
   * Se llama desde los tres puntos de entrada públicos de cobro:
   * `offlineCheckout`, `brickInit` y `processBrickPayment`.
   */
  private async assertPaymentMethodEnabled(
    provider: PaymentProvider,
  ): Promise<void> {
    const storeSettings = await this.settings.get();

    if (provider === PaymentProvider.CASH && !storeSettings.paymentCash) {
      throw new BadRequestException(
        'El pago en efectivo no está disponible en este momento.',
      );
    }

    if (
      provider === PaymentProvider.TRANSFER &&
      !storeSettings.paymentTransfer
    ) {
      throw new BadRequestException(
        'El pago por transferencia no está disponible en este momento.',
      );
    }

    if (
      provider === PaymentProvider.MERCADOPAGO &&
      !storeSettings.paymentMercadoPago
    ) {
      throw new BadRequestException(
        'El pago con Mercado Pago no está disponible en este momento.',
      );
    }
  }

  async brickInit(dto: BrickInitDto): Promise<{
    preferenceId: string;
    orderId: string;
    amount: number;
  }> {
    await this.assertPaymentMethodEnabled(PaymentProvider.MERCADOPAGO);

    // Rate-limit por email (complementa el throttle por IP del controller):
    // rechaza si el comprador ya tiene demasiadas órdenes PENDING activas.
    await this.assertPendingEmailRateLimit(dto.customerEmail);

    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const apiUrl = (
      this.config.get<string>('API_URL') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    // 1. Cotizar en el server. dto.shippingCost no se lee: el precio del envio
    //    lo decide CheckoutPricingService, nunca el cliente.
    const quote = await this.pricing.quote({
      orderItems: dto.orderItems,
      deliveryType: dto.deliveryType === 'pickup' ? 'pickup' : 'shipping',
      shippingDeliveryType: dto.shippingDeliveryType as 'D' | 'S' | undefined,
      shippingZip: dto.shippingZip,
      shippingProductName: dto.shippingProductName,
      couponCode: dto.couponCode,
    });

    if (quote.couponError) {
      throw new BadRequestException(quote.couponError);
    }

    const finalAmount = quote.total;
    const shippingCost = quote.shippingCost;

    // 2. Crear orden PENDING (decrementa stock con row locks)
    const order = await this.createPendingOrder({
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      orderItems: dto.orderItems,
      totalAmount: finalAmount,
      deliveryType: dto.deliveryType,
      shippingStreetName: dto.shippingStreetName,
      shippingStreetNumber: dto.shippingStreetNumber,
      shippingFloor: dto.shippingFloor,
      shippingApartment: dto.shippingApartment,
      shippingAddress: dto.shippingAddress,
      shippingCity: dto.shippingCity,
      shippingProvinceCode: dto.shippingProvinceCode,
      shippingZip: dto.shippingZip,
      shippingCost,
      shippingProvider: dto.shippingProvider,
      shippingDeliveryType: dto.shippingDeliveryType,
      shippingAgencyCode: dto.shippingAgencyCode,
      notes: dto.notes,
      paymentProvider: PaymentProvider.MERCADOPAGO,
    });

    // Aplicar cupon a la orden si corresponde
    if (quote.couponId) {
      const { couponId, couponDiscount } = quote;
      await this.prisma.$transaction(async (tx) => {
        await this.coupons.applyToOrder(tx, order.id, couponId, couponDiscount);
      });
    }

    // 3. Obtener info de los productos para los items de la preferencia
    const variantIds = dto.orderItems.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true } } },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const preferenceItems = dto.orderItems.map((item) => {
      const variant = variantMap.get(item.variantId);
      return {
        id: item.variantId,
        title: variant
          ? `${variant.product.name} — ${variant.name}`
          : 'Producto',
        quantity: item.quantity,
        unit_price: variant ? Number(variant.price) : 0,
        currency_id: 'ARS',
      };
    });

    // 4. Crear preferencia MP
    try {
      const preference = await this.preferenceClient.create({
        body: {
          items: preferenceItems,
          payer: { email: dto.customerEmail },
          back_urls: {
            success: `${frontendUrl}/checkout/success?orderId=${order.id}`,
            failure: `${frontendUrl}/checkout/failure?orderId=${order.id}`,
            pending: `${frontendUrl}/checkout/success?orderId=${order.id}&status=pending`,
          },
          ...(frontendUrl.startsWith('https')
            ? { auto_return: 'approved' as const }
            : {}),
          external_reference: order.id,
          notification_url: `${apiUrl}/payments/webhook`,
          statement_descriptor: this.getStatementDescriptor(),
          // binary_mode: false para permitir wallet y cuotas sin tarjeta (pueden quedar in_process)
          binary_mode: false,
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        requestOptions: { idempotencyKey: `brick-init-${order.id}` },
      });

      this.logger.log(
        `Brick init OK: orden=${order.id} preferenceId=${preference.id} amount=${finalAmount}`,
      );

      return {
        preferenceId: preference.id!,
        orderId: order.id,
        amount: finalAmount,
      };
    } catch (error) {
      this.logger.error('Error creando preferencia en brick-init', error);
      await this.cancelPendingOrderWithStockRestore(
        order.id,
        'brick_init_preference_error',
        undefined,
        'PAYMENT_REJECTED',
      );
      throw new InternalServerErrorException(
        'Error al inicializar el pago con Mercado Pago',
      );
    }
  }

  async getOrderPaymentStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        mpStatus: true,
        mpPaymentId: true,
        paymentProvider: true,
        deliveryType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden #${orderId} no encontrada`);
    }

    return {
      data: order,
      message: 'Estado de orden obtenido',
    };
  }

  // -------------------------------------------------------
  // PAYMENT BRICK (Unificado: tarjetas + ticket + billetera)
  // -------------------------------------------------------
  async processBrickPayment(dto: CreateBrickPaymentDto): Promise<{
    orderId: string;
    status: string;
    detail?: string;
    ticketUrl?: string;
    mpPaymentId?: string;
  }> {
    this.logger.log(
      `Iniciando Payment Brick para ${dto.formData?.payer?.email ?? 'wallet_purchase'} — método: ${dto.selectedPaymentMethod}`,
    );

    // El Brick es otra puerta de entrada a Mercado Pago, independiente de
    // brick-init: si el toggle está apagado, tampoco cobra por acá.
    await this.assertPaymentMethodEnabled(PaymentProvider.MERCADOPAGO);

    const supportedMethods = new Set([
      'credit_card',
      'debit_card',
      'prepaid_card',
      'ticket',
      'account_money',
      'wallet_purchase',
    ]);

    if (!supportedMethods.has(dto.selectedPaymentMethod)) {
      throw new BadRequestException(
        `Método de pago no soportado: ${dto.selectedPaymentMethod}`,
      );
    }

    // wallet_purchase no envía formData — la validación se omite para ese flujo
    if (dto.selectedPaymentMethod !== 'wallet_purchase') {
      this.validateBrickFormDataByMethod(dto);
    }

    const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new InternalServerErrorException('Falta MP_ACCESS_TOKEN');
    }

    // 1. Resolver primero que orden se esta pagando. Si brick-init ya la creo,
    //    esa orden manda: sus items y su envio quedaron congelados y el body
    //    del cliente no puede redefinir que se esta comprando.
    const existing = dto.existingOrderId
      ? await this.prisma.order.findUnique({
          where: { id: dto.existingOrderId },
          select: {
            id: true,
            total: true,
            status: true,
            deletedAt: true,
            customerEmail: true,
            shippingCost: true,
            items: {
              select: { variantId: true, quantity: true, price: true },
            },
          },
        })
      : null;

    const reusable =
      existing && !existing.deletedAt && existing.status === OrderStatus.PENDING
        ? existing
        : null;

    if (dto.existingOrderId && !reusable) {
      this.logger.warn(
        `brick-init order ${dto.existingOrderId} no disponible — creando nueva orden`,
      );
    }

    // El que paga tiene que ser el que creo la orden. Sin este chequeo,
    // conociendo un id ajeno se podia pagar la orden de otro comprador.
    // Va antes del try que cancela la orden: un rechazo no puede destruirla.
    const submittedEmail = dto.formData?.payer?.email?.trim().toLowerCase();
    if (
      reusable &&
      submittedEmail &&
      reusable.customerEmail.trim().toLowerCase() !== submittedEmail
    ) {
      this.logger.warn(
        `Intento de reutilizar la orden ${reusable.id} con otro email`,
      );
      throw new BadRequestException(
        'La orden no corresponde a este comprador.',
      );
    }

    // 2. Cotizar en el server. Ni el transaction_amount ni el shippingCost del
    //    cliente entran en el calculo: solo se usan para detectar desfasajes.
    //    Para una orden ya persistida, los items y el envio salen de la base;
    //    lo unico que el paso de pago todavia puede agregar es el cupon.
    const quote = reusable
      ? await this.pricing.quoteExistingOrder({
          items: reusable.items.map((item) => ({
            quantity: item.quantity,
            price: Number(item.price),
          })),
          shippingCost: Number(reusable.shippingCost ?? 0),
          couponCode: dto.couponCode,
        })
      : await this.pricing.quote({
          orderItems: dto.orderItems,
          deliveryType: dto.deliveryType === 'pickup' ? 'pickup' : 'shipping',
          shippingDeliveryType: dto.shippingDeliveryType as
            | 'D'
            | 'S'
            | undefined,
          shippingZip: dto.shippingZip,
          shippingProductName: dto.shippingProductName,
          couponCode: dto.couponCode,
        });

    if (quote.couponError) {
      throw new BadRequestException(quote.couponError);
    }

    const shippingCost = quote.shippingCost;
    const couponValidation = quote.couponId
      ? { couponId: quote.couponId, discountAmount: quote.couponDiscount }
      : null;
    const finalAmount = quote.total;

    // Validar monto solo si el Brick envía formData (wallet_purchase no lo hace)
    const clientAmount = dto.formData
      ? Number(dto.formData.transaction_amount)
      : null;
    if (clientAmount !== null && Math.abs(clientAmount - finalAmount) > 0.01) {
      this.logger.warn(
        `Monto inconsistente en Brick: client=${clientAmount.toFixed(2)} server=${finalAmount.toFixed(2)}`,
      );
      throw new BadRequestException(
        reusable
          ? 'El total de tu pedido cambió. Recargá la página para volver a cotizarlo.'
          : 'El monto del pago cambió. Reintentá para recalcular el total.',
      );
    }

    const amountStr = finalAmount.toFixed(2);

    // 3. Reutilizar la orden de brick-init o crear una nueva
    //    (backward compat con métodos sin preferenceId).
    let order: { id: string; total: number | Prisma.Decimal; status: string };

    if (reusable) {
      // Aplicar cupón si viene en el submit y no fue aplicado en brick-init.
      // Es el caso normal: el input de cupón vive en el paso de pago, o sea
      // después de que brick-init ya creó la orden.
      if (couponValidation) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await this.coupons.applyToOrder(
              tx,
              reusable.id,
              couponValidation.couponId,
              couponValidation.discountAmount,
            );
          });
        } catch (error) {
          // El cupón ya puede estar aplicado desde brick-init — loggear pero no fallar
          this.logger.warn(
            `Cupón ya aplicado o falla aplicándolo en orden ${reusable.id}`,
            error,
          );
        }
      }

      // El total se recalcula desde los items y el envio persistidos, asi que
      // solo puede moverse por el cupón. Notas y proveedor cambian porque el
      // cliente pudo pasar por transferencia o efectivo y volver a Mercado Pago.
      await this.prisma.order.update({
        where: { id: reusable.id },
        data: {
          total: finalAmount,
          ...(dto.notes ? { notes: dto.notes } : {}),
          paymentProvider: PaymentProvider.MERCADOPAGO,
        },
      });

      order = reusable;
      this.logger.log(
        `Reutilizando orden brick-init: ${order.id} — método: ${dto.selectedPaymentMethod}`,
      );
    } else {
      // Crear orden nueva (flujo sin brick-init / backward compat)
      order = await this.createPendingOrder({
        customerEmail: dto.formData?.payer?.email ?? '',
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        orderItems: dto.orderItems,
        totalAmount: finalAmount,
        deliveryType: dto.deliveryType,
        shippingStreetName: dto.shippingStreetName,
        shippingStreetNumber: dto.shippingStreetNumber,
        shippingFloor: dto.shippingFloor,
        shippingApartment: dto.shippingApartment,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingProvinceCode: dto.shippingProvinceCode,
        shippingZip: dto.shippingZip,
        shippingCost,
        shippingProvider: dto.shippingProvider,
        shippingDeliveryType: dto.shippingDeliveryType,
        shippingAgencyCode: dto.shippingAgencyCode,
        notes: dto.notes,
      });

      // Aplicar cupón a la orden si corresponde
      if (couponValidation) {
        await this.prisma.$transaction(async (tx) => {
          await this.coupons.applyToOrder(
            tx,
            order.id,
            couponValidation.couponId,
            couponValidation.discountAmount,
          );
        });
      }

      this.logger.log(
        `Orden local creada: ${order.id} — método: ${dto.selectedPaymentMethod}`,
      );
    }

    try {
      // 3. Dispatch según el método de pago del brick
      if (
        dto.selectedPaymentMethod === 'credit_card' ||
        dto.selectedPaymentMethod === 'debit_card' ||
        dto.selectedPaymentMethod === 'prepaid_card'
      ) {
        return await this._processBrickCard(
          dto,
          order.id,
          amountStr,
          accessToken,
        );
      }

      if (dto.selectedPaymentMethod === 'ticket') {
        return await this._processBrickTicket(
          dto,
          order.id,
          amountStr,
          accessToken,
        );
      }

      if (dto.selectedPaymentMethod === 'account_money') {
        return await this._processBrickAccountMoney(
          dto,
          order.id,
          amountStr,
          accessToken,
        );
      }

      if (dto.selectedPaymentMethod === 'wallet_purchase') {
        // El pago fue procesado por MP internamente (wallet_purchase flow).
        // La orden queda PENDING hasta que el webhook de MP confirme.
        this.logger.log(
          `Wallet purchase iniciado para orden ${order.id} — esperando webhook`,
        );
        return {
          orderId: order.id,
          status: 'pending' as const,
          detail: 'wallet_purchase_pending',
          mpPaymentId: undefined,
        };
      }

      // Método desconocido: dejamos la orden PENDING para reconciliación
      this.logger.warn(
        `selectedPaymentMethod desconocido: ${String(dto.selectedPaymentMethod)}`,
      );
      return { orderId: order.id, status: 'pending' };
    } catch (error) {
      // Si algo falla después de crear la orden, revertimos
      await this.cancelPendingOrderWithStockRestore(
        order.id,
        'brick_payment_error',
        undefined,
        'PAYMENT_REJECTED',
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error interno al procesar pago');
    }
  }

  private async _processBrickCard(
    dto: CreateBrickPaymentDto,
    orderId: string,
    amountStr: string,
    accessToken: string,
  ) {
    // formData siempre está presente para credit_card / debit_card (validado antes de llamar)
    const formData = dto.formData!;

    // Usamos /v1/payments (Payments API clásica) en lugar de /v1/orders porque:
    // la Orders API no acepta credenciales de test ("TEST-...").
    const mpPayload: Record<string, unknown> = {
      transaction_amount: parseFloat(amountStr),
      token: formData.token,
      payment_method_id: formData.payment_method_id,
      installments: formData.installments || 1,
      external_reference: orderId,
      description: 'Compra en YerbaXanaes',
      statement_descriptor: this.getStatementDescriptor(),
      binary_mode: true,
      payer: {
        email: formData.payer.email,
        ...(formData.payer.identification
          ? { identification: formData.payer.identification }
          : {}),
      },
    };

    if (formData.issuer_id && String(formData.issuer_id) !== '0') {
      mpPayload.issuer_id = parseInt(String(formData.issuer_id), 10);
    }

    // Forwarding de campos opcionales para enrutamiento de débito y anti-fraude
    if (formData.payment_method_option_id) {
      mpPayload.payment_method_option_id = formData.payment_method_option_id;
    }
    if (formData.processing_mode) {
      mpPayload.processing_mode = formData.processing_mode;
    }
    if (formData.additional_info) {
      mpPayload.additional_info = formData.additional_info;
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          orderId,
          amountStr,
          paymentMethodId: formData.payment_method_id,
        }),
      )
      .digest('hex');

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Error MP /v1/payments (brick card)', data);
      await this.cancelPendingOrderWithStockRestore(
        orderId,
        'brick_card_rejected',
        undefined,
        'PAYMENT_REJECTED',
      );
      throw new BadRequestException({
        message: 'Error de MercadoPago al procesar la tarjeta',
        cause: data.cause || data,
      });
    }

    const mpStatus: string = data.status;
    const paymentDetail: string = data.status_detail;
    const cardMpPaymentId: string = String(data.id);

    if (mpStatus === 'approved') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { mpPaymentId: cardMpPaymentId },
      });
      await this.paymentsSync.updateOrderStatusWithAudit({
        orderId,
        newStatus: OrderStatus.PAID,
        source: 'CARD_PAYMENT_API',
        mpPaymentId: cardMpPaymentId,
        mpRawStatus: paymentDetail,
      });
      return {
        orderId,
        status: 'approved',
        detail: paymentDetail,
        mpPaymentId: cardMpPaymentId,
      };
    }

    if (mpStatus === 'rejected') {
      await this.cancelPendingOrderWithStockRestore(
        orderId,
        `brick_card_rejected_${paymentDetail}`,
        cardMpPaymentId,
        'PAYMENT_REJECTED',
      );
      throw new BadRequestException({
        message: 'Pago rechazado. Revisá los datos de tu tarjeta.',
        detail: paymentDetail,
      });
    }

    // in_process / pending (ej. revisión antifraude)
    await this.prisma.order.update({
      where: { id: orderId },
      data: { mpPaymentId: cardMpPaymentId },
    });
    return {
      orderId,
      status: mpStatus ?? 'pending',
      detail: paymentDetail,
      mpPaymentId: cardMpPaymentId,
    };
  }

  private async _processBrickTicket(
    dto: CreateBrickPaymentDto,
    orderId: string,
    amountStr: string,
    accessToken: string,
  ) {
    // formData siempre está presente para ticket (validado antes de llamar)
    const formData = dto.formData!;

    const ticketExpiration = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const mpPayload: Record<string, unknown> = {
      payment_method_id: formData.payment_method_id,
      transaction_amount: parseFloat(amountStr),
      description: 'Compra en YerbaXanaes',
      statement_descriptor: this.getStatementDescriptor(),
      date_of_expiration: ticketExpiration,
      external_reference: orderId,
      payer: {
        email: formData.payer.email,
        ...(formData.payer.identification
          ? { identification: formData.payer.identification }
          : {}),
      },
    };

    // Forwarding de additional_info para anti-fraude (incluido por el Brick con enableReviewStep)
    if (formData.additional_info) {
      mpPayload.additional_info = formData.additional_info;
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          orderId,
          amountStr,
          method: formData.payment_method_id,
        }),
      )
      .digest('hex');

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Error MP /v1/payments (ticket)', data);
      throw new BadRequestException({
        message: 'Error al generar el comprobante de pago',
        cause: data.cause || data,
      });
    }

    // Ticket queda PENDING — el webhook confirmará cuando el usuario pague en Rapipago
    const ticketUrl = data.transaction_details?.external_resource_url;
    const mpPaymentId = String(data.id);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { mpPaymentId },
    });

    this.logger.log(`Ticket generado para orden ${orderId}: ${ticketUrl}`);
    return { orderId, status: 'pending', ticketUrl, mpPaymentId };
  }

  private async _processBrickAccountMoney(
    dto: CreateBrickPaymentDto,
    orderId: string,
    amountStr: string,
    accessToken: string,
  ) {
    // formData siempre está presente para account_money (validado antes de llamar)
    const formData = dto.formData!;

    const mpPayload = {
      payment_method_id: 'account_money',
      transaction_amount: parseFloat(amountStr),
      description: 'Compra en YerbaXanaes',
      external_reference: orderId,
      payer: { email: formData.payer.email },
    };

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(JSON.stringify({ orderId, amountStr, method: 'account_money' }))
      .digest('hex');

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Error MP /v1/payments (account_money)', data);
      await this.cancelPendingOrderWithStockRestore(
        orderId,
        'brick_wallet_rejected',
        undefined,
        'PAYMENT_REJECTED',
      );
      throw new BadRequestException({
        message: 'Error al procesar el pago con billetera',
        cause: data.cause || data,
      });
    }

    const mpPaymentId = String(data.id);

    if (data.status === 'approved') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { mpPaymentId },
      });
      await this.paymentsSync.updateOrderStatusWithAudit({
        orderId,
        newStatus: OrderStatus.PAID,
        source: 'CARD_PAYMENT_API',
        mpPaymentId,
        mpRawStatus: data.status_detail,
      });
      return {
        orderId,
        status: 'approved',
        detail: data.status_detail,
        mpPaymentId,
      };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { mpPaymentId },
    });
    return {
      orderId,
      status: data.status ?? 'pending',
      detail: data.status_detail,
      mpPaymentId,
    };
  }

  async cleanupExpiredPendingOrders(ttlMinuteOverride?: number): Promise<{
    data: CleanupMetrics;
    message: string;
  }> {
    const startTime = Date.now();

    // Smart TTL:
    //  - Carritos abandonados (sin mpPaymentId todavía) → TTL corto (15 min default).
    //    El cliente cargó el carrito + brick-init pero nunca llegó a ingresar pago.
    //  - Esperando pago (con mpPaymentId asignado, ej. ticket/wallet) → TTL largo
    //    (24h default). El usuario tiene cupón Rapipago/Pago Fácil o desvió a MP wallet.
    //
    // Fallback retro-compat: si pasan override o existe MP_PENDING_ORDER_TTL_MINUTES,
    // se usa ese único valor para ambos buckets.
    const legacyTtl =
      ttlMinuteOverride ??
      (this.config.get('MP_PENDING_ORDER_TTL_MINUTES') != null
        ? Number(this.config.get('MP_PENDING_ORDER_TTL_MINUTES'))
        : undefined);

    const cartAbandonedTtl = Math.max(
      1,
      legacyTtl ??
        Number(this.config.get('MP_CART_ABANDONED_TTL_MINUTES') ?? 15),
    );
    const pendingPaymentTtl = Math.max(
      1,
      legacyTtl ??
        Number(this.config.get('MP_PENDING_PAYMENT_TTL_MINUTES') ?? 1440),
    );

    const now = Date.now();
    const cartCutoff = new Date(now - cartAbandonedTtl * 60_000);
    const paymentCutoff = new Date(now - pendingPaymentTtl * 60_000);

    // Transferencia / efectivo online: Luz confirma a mano. No usar el TTL
    // corto de carritos MP abandonados (sin mpPaymentId).
    const offlinePendingTtl = Math.max(
      1,
      Number(this.config.get('OFFLINE_PENDING_TTL_MINUTES') ?? 10080),
    );
    const offlineCutoff = new Date(now - offlinePendingTtl * 60_000);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        deletedAt: null,
        OR: [
          {
            paymentProvider: PaymentProvider.MERCADOPAGO,
            mpPaymentId: null,
            createdAt: { lte: cartCutoff },
            // notes es nullable y el carrito abandonado normal no trae nota.
            // Un NOT pelado se traduce a NOT (notes LIKE 'Link de pago%'),
            // que en Postgres da NULL cuando notes es NULL y descarta la fila.
            // Hay que admitir el NULL explicitamente.
            OR: [
              { notes: null },
              { NOT: { notes: { startsWith: PAYMENT_LINK_NOTES } } },
            ],
          },
          {
            paymentProvider: PaymentProvider.MERCADOPAGO,
            mpPaymentId: { not: null },
            createdAt: { lte: paymentCutoff },
          },
          {
            paymentProvider: PaymentProvider.MERCADOPAGO,
            mpPaymentId: null,
            notes: { startsWith: PAYMENT_LINK_NOTES },
            createdAt: { lte: paymentCutoff },
          },
          {
            paymentProvider: {
              in: [PaymentProvider.TRANSFER, PaymentProvider.CASH],
            },
            createdAt: { lte: offlineCutoff },
          },
        ],
      },
      select: { id: true, items: true, mpPaymentId: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    let cancelled = 0;
    let cancelledCart = 0;
    let cancelledPayment = 0;
    let failed = 0;
    let totalStockRestored = 0;

    // Procesar cada orden expirada
    for (const order of expiredOrders) {
      const isCart = order.mpPaymentId == null;
      const reason = isCart
        ? 'expired_cart_abandoned'
        : 'expired_pending_payment_timeout';
      try {
        const wasCancelled = await this.cancelPendingOrderWithStockRestore(
          order.id,
          reason,
          undefined,
          'CLEANUP_TIMEOUT',
        );
        if (wasCancelled) {
          cancelled += 1;
          if (isCart) cancelledCart += 1;
          else cancelledPayment += 1;
          totalStockRestored += order.items.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Error cancelando orden expirada ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CleanupExpiredPending',
        );
      }
    }

    const durationMs = Date.now() - startTime;
    const metrics: CleanupMetrics = {
      checked: expiredOrders.length,
      cancelled,
      cancelledCart,
      cancelledPayment,
      failed,
      totalStockRestored,
      cartAbandonedTtlMinutes: cartAbandonedTtl,
      pendingPaymentTtlMinutes: pendingPaymentTtl,
      durationMs,
      timestamp: new Date(),
    };

    // Log estructurado para observabilidad
    if (expiredOrders.length > 0) {
      this.logger.log(
        {
          event: 'cleanup_pending_orders_executed',
          metrics,
          summary: `Cleanup completado: encontradas=${expiredOrders.length}, canceladas=${cancelled} (cart=${cancelledCart}, payment=${cancelledPayment}), fallidas=${failed}, stock_restaurado=${totalStockRestored}`,
        },
        'CleanupExpiredPending',
      );
    }

    return {
      data: metrics,
      message: 'Cleanup de ordenes pendientes ejecutado',
    };
  }

  // -------------------------------------------------------
  // WEBHOOK (Validación estricta de firma HMAC)
  // -------------------------------------------------------
  async handleWebhook(params: {
    body: any;
    signature: string;
    requestId: string;
    dataIdUrl: string;
    typeUrl: string;
  }) {
    const { signature, requestId, dataIdUrl, typeUrl } = params;
    this.logger.log(`Webhook recibido: type=${typeUrl}, id=${dataIdUrl}`);

    const webhookSecret = this.config.get<string>('MP_WEBHOOK_SECRET');

    // Rechazar si el secret no está configurado — lanzar error para que MP reintente
    if (!webhookSecret) {
      this.logger.error(
        'MP_WEBHOOK_SECRET no configurado — rechazando webhook',
      );
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    // Rechazar si no viene firma
    if (!signature) {
      this.logger.warn('Webhook sin firma — rechazando');
      throw new BadRequestException('Missing webhook signature');
    }

    // 1. Validar HMAC según doc
    const parts = signature.split(',');
    let ts: string | undefined;
    let hash: string | undefined;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') ts = value?.trim();
      else if (key?.trim() === 'v1') hash = value?.trim();
    }

    if (!ts || !hash || !requestId || !dataIdUrl) {
      this.logger.warn('Webhook con metadatos de firma incompletos');
      throw new BadRequestException('Invalid webhook signature metadata');
    }

    // Assuramos que ts y hash son string — ya se validó arriba con el throw
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) {
      throw new BadRequestException('Invalid webhook signature timestamp');
    }

    // Ventana anti-replay: 5 minutos
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > 5 * 60) {
      this.logger.warn('Webhook rechazado por timestamp fuera de ventana');
      throw new BadRequestException('Expired webhook signature');
    }

    // Asegurar que el dataIdUrl esté en minúsculas (requisito de la doc)
    const dataIdLower = dataIdUrl.toLowerCase();

    const manifest = `id:${dataIdLower};request-id:${requestId};ts:${ts};`;
    const hmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex');

    // Comparación en tiempo constante para evitar leaks
    if (
      hmac.length !== hash.length ||
      !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash))
    ) {
      this.logger.warn('Firma HMAC inválida - rechazando webhook');
      throw new BadRequestException('Invalid webhook signature');
    }

    // 2. Deduplicación: evitar re-procesar retries duplicados del mismo webhook
    try {
      await this.prisma.webhookLog.create({
        data: { requestId, dataId: dataIdUrl, type: typeUrl },
      });
    } catch {
      // @@unique([requestId, type]) lanza error si ya existe → webhook ya procesado
      this.logger.log(
        `Webhook duplicado ignorado: requestId=${requestId}, type=${typeUrl}, dataId=${dataIdUrl}`,
      );
      return { status: 'already_processed' };
    }

    // 3a. Tópico "payment" — Payments API (/v1/payments)
    //     Usado por: Payment Brick con tarjeta, billetera MP, tickets (Rapipago/Pago Fácil)
    if (typeUrl === 'payment' && dataIdUrl) {
      try {
        const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');
        const response = await fetch(
          `https://api.mercadopago.com/v1/payments/${dataIdUrl}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!response.ok) {
          this.logger.error(`No se pudo fetchear el payment MP ${dataIdUrl}`);
          return { status: 'ok' };
        }

        const mpPayment = await response.json();
        const extRef: string | undefined = mpPayment.external_reference;

        if (!extRef) return { status: 'ok' };

        // Lectura para rutear (cancelar vs actualizar). NO bloqueamos acá: un
        // FOR UPDATE fuera de $transaction no sostiene el lock. La atomicidad
        // real (lock + re-verificación de estado + idempotencia + protección de
        // manualOverride) la garantizan cancelPendingOrderWithStockRestore y
        // updateOrderStatusWithAudit, cada una dentro de su propia transacción.
        const existing = await this.prisma.order.findUnique({
          where: { id: extRef },
        });

        if (!existing) {
          this.logger.warn(`Order local ${extRef} no encontrada`);
          return { status: 'ok' };
        }

        const newStatus = this.paymentsSync.mapMercadoPagoStatus(
          mpPayment.status,
          mpPayment.status_detail,
        );

        if (!newStatus) {
          this.logger.warn(
            `Webhook payment: estado MP desconocido '${mpPayment.status}' para orden ${extRef} — ignorado`,
          );
          return { status: 'ok' };
        }

        // Un reembolso sobre una orden ya pagada SÍ tiene que procesarse: es
        // plata que vuelve al comprador y mercadería que vuelve al inventario.
        // Antes el guard cortaba antes de mapear el estado y los descartaba a
        // todos. Una cancelación no entra: un pago aprobado en MP no se
        // cancela, así que un 'cancelled' sobre algo ya cobrado es un evento
        // viejo o de otro intento de pago.
        const isReversal = newStatus === OrderStatus.REFUNDED;
        const alreadySettled =
          existing.status === OrderStatus.CANCELLED ||
          existing.status === OrderStatus.REFUNDED ||
          (existing.status === OrderStatus.PAID && !isReversal);

        if (alreadySettled) {
          this.logger.log(`Order ${extRef} sin cambios (${existing.status})`);
          return { status: 'ok' };
        }

        const mpPaymentId = String(mpPayment.id);

        if (
          (newStatus === OrderStatus.CANCELLED ||
            newStatus === OrderStatus.REFUNDED) &&
          existing.status === OrderStatus.PENDING
        ) {
          // Rechazo / cancelación desde PENDING: restaurar stock + auditoría
          await this.cancelPendingOrderWithStockRestore(
            extRef,
            `webhook_payment_${mpPayment.status}`,
            mpPaymentId,
            'WEBHOOK_MERCADOPAGO',
          );
        } else {
          await this.paymentsSync.updateOrderStatusWithAudit({
            orderId: extRef,
            newStatus,
            source: 'WEBHOOK_MERCADOPAGO',
            mpPaymentId,
            mpRawStatus: mpPayment.status_detail,
          });
        }

        this.logger.log(
          `Webhook payment procesado: Order ${extRef} → ${newStatus} (MP status: ${mpPayment.status})`,
        );
      } catch (error) {
        this.logger.error(
          `Error procesando webhook payment ${dataIdUrl}`,
          error,
        );
      }
    }

    // 3b. Tópico "order" — Orders API (/v1/orders)
    //     Usado por: wallet/preference del Payment Brick (wallet_purchase)
    if (typeUrl === 'order' && dataIdUrl) {
      try {
        const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');
        // Ir a buscar el recurso Order a MercadoPago
        const response = await fetch(
          `https://api.mercadopago.com/v1/orders/${dataIdUrl}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!response.ok) {
          this.logger.error(`No se pudo fetchear la order MP ${dataIdUrl}`);
          return { status: 'ok' }; // Devuelve 200 para que MP no reintente
        }

        const mpOrder = await response.json();
        const extRef = mpOrder.external_reference;

        if (!extRef) return { status: 'ok' };

        // Lectura para rutear. NO bloqueamos acá: el lock real lo toman las
        // funciones de mutación dentro de su propia transacción (ver la nota
        // en el handler del tópico "payment").
        const existing = await this.prisma.order.findUnique({
          where: { id: extRef },
        });

        if (!existing) {
          this.logger.warn(`Order local ${extRef} no encontrada`);
          return { status: 'ok' };
        }

        // Mapear estado MP → nuestro OrderStatus
        const webhookMpPaymentId = mpOrder.transactions?.payments?.[0]?.id;
        const newStatus = this.paymentsSync.mapMercadoPagoStatus(
          mpOrder.status,
          mpOrder.status_detail,
        );

        if (!newStatus) {
          this.logger.warn(
            `Webhook: estado MP desconocido '${mpOrder.status}' para orden ${extRef} — ignorado`,
          );
          return { status: 'ok' };
        }

        // Un reembolso sobre una orden ya pagada SÍ tiene que procesarse: es
        // plata que vuelve al comprador y mercadería que vuelve al inventario.
        // Antes el guard cortaba antes de mapear el estado y los descartaba a
        // todos. Una cancelación no entra: un pago aprobado en MP no se
        // cancela, así que un 'cancelled' sobre algo ya cobrado es un evento
        // viejo o de otro intento de pago.
        const isReversal = newStatus === OrderStatus.REFUNDED;
        const alreadySettled =
          existing.status === OrderStatus.CANCELLED ||
          existing.status === OrderStatus.REFUNDED ||
          (existing.status === OrderStatus.PAID && !isReversal);

        if (alreadySettled) {
          this.logger.log(`Order ${extRef} sin cambios (${existing.status})`);
          return { status: 'ok' };
        }

        if (
          (newStatus === OrderStatus.CANCELLED ||
            newStatus === OrderStatus.REFUNDED) &&
          existing.status === OrderStatus.PENDING
        ) {
          // Cancelación desde PENDING: requiere restaurar stock + auditoría
          await this.cancelPendingOrderWithStockRestore(
            extRef,
            `webhook_${mpOrder.status}`,
            webhookMpPaymentId,
            'WEBHOOK_MERCADOPAGO',
          );
        } else {
          // Cualquier otra transición: auditoría completa con protección de manual override
          await this.paymentsSync.updateOrderStatusWithAudit({
            orderId: extRef,
            newStatus,
            source: 'WEBHOOK_MERCADOPAGO',
            mpPaymentId: webhookMpPaymentId,
            mpRawStatus: mpOrder.status_detail,
          });
        }
        this.logger.log(`Webhook procesado: Order ${extRef} → ${newStatus}`);
      } catch (error) {
        this.logger.error(`Error procesando webhook order ${dataIdUrl}`, error);
      }
    }

    return { status: 'ok' };
  }

  // -------------------------------------------------------
  // HELPER INTERNO: Cancela orden PENDING y restaura stock
  // -------------------------------------------------------
  async cancelPendingOrderWithStockRestore(
    orderId: string,
    reason: string,
    mpPaymentId?: string,
    auditSource?:
      | 'WEBHOOK_MERCADOPAGO'
      | 'CLEANUP_TIMEOUT'
      | 'PAYMENT_REJECTED'
      | 'MANUAL_OVERRIDE',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "Order"
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.deletedAt || order.status !== OrderStatus.PENDING) {
        return false;
      }

      // Respetar manual override: si backoffice ya cambió esta orden, no tocarla
      if (auditSource === 'WEBHOOK_MERCADOPAGO' && order.manualOverrideAt) {
        this.logger.warn(
          `cancelPendingOrder: webhook ignorado para ${orderId} (tiene manualOverride)`,
        );
        return false;
      }

      await this.reservation.release(tx, orderId, reason);

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          deletedAt: new Date(),
          mpStatus: reason,
          ...(mpPaymentId ? { mpPaymentId } : {}),
        },
      });

      // Auditoría atómica en la misma transacción
      if (auditSource) {
        await tx.orderStateChange.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: OrderStatus.CANCELLED,
            source: auditSource,
            mpPaymentId: mpPaymentId ?? null,
            reason,
          },
        });
      }

      return true;
    });
  }

  private validateBrickFormDataByMethod(dto: CreateBrickPaymentDto) {
    const method = dto.selectedPaymentMethod;

    // Este método solo se llama cuando formData no es undefined
    const formData = dto.formData!;
    const paymentMethodId = formData.payment_method_id;
    const token = formData.token?.trim();

    if (!formData.payer?.email) {
      throw new BadRequestException('El email del pagador es obligatorio');
    }

    if (
      (method === 'credit_card' ||
        method === 'debit_card' ||
        method === 'prepaid_card') &&
      !token
    ) {
      throw new BadRequestException(
        'Falta token de tarjeta para procesar el pago',
      );
    }

    if (method === 'account_money' && paymentMethodId !== 'account_money') {
      throw new BadRequestException(
        `payment_method_id inválido para account_money: ${paymentMethodId}`,
      );
    }

    if (method === 'ticket' && paymentMethodId === 'account_money') {
      throw new BadRequestException('payment_method_id inválido para ticket');
    }

    if (
      method !== 'ticket' &&
      method !== 'account_money' &&
      formData.installments != null &&
      formData.installments < 1
    ) {
      throw new BadRequestException('La cantidad de cuotas debe ser mayor a 0');
    }
  }

  // -------------------------------------------------------
  // CHECKOUT OFFLINE (transferencia / efectivo en retiro)
  // -------------------------------------------------------
  getTransferInfo(): {
    transferInstructions: TransferInstructions | null;
    test: boolean;
  } {
    const transferInstructions = this.getTransferInstructions();
    const test = Boolean(transferInstructions?.test);
    return {
      transferInstructions: test ? null : transferInstructions,
      test,
    };
  }

  async createPaymentLink(dto: CreatePaymentLinkDto): Promise<{
    initPoint: string;
    sandboxInitPoint: string | null;
    preferenceId: string;
    amount: number;
    title: string;
  }> {
    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('NEXT_PUBLIC_SITE_URL') ||
      ''
    ).replace(/\/$/, '');
    const apiUrl = (
      this.config.get<string>('API_URL') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    let orderId: string;
    let amount: number;
    let title: string;
    let payerEmail = dto.payerEmail?.trim() || undefined;
    let createdStandalone = false;

    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: {
          items: {
            include: {
              variant: { include: { product: { select: { name: true } } } },
            },
          },
        },
      });
      if (!order || order.deletedAt) {
        throw new NotFoundException(`Orden #${dto.orderId} no encontrada`);
      }
      if (order.status === OrderStatus.PAID) {
        throw new BadRequestException('La orden ya está pagada');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'Solo se puede generar un link para órdenes pendientes',
        );
      }
      amount = Number(order.total);
      if (!Number.isFinite(amount) || amount < 1) {
        throw new BadRequestException('El monto de la orden no es válido');
      }
      orderId = order.id;
      title =
        dto.title?.trim() ||
        order.items[0]?.variant?.product?.name ||
        DEFAULT_PAYMENT_LINK_TITLE;
      payerEmail = payerEmail || order.customerEmail || undefined;
    } else {
      amount = Number(dto.amount);
      if (!Number.isFinite(amount) || amount < 1) {
        throw new BadRequestException(
          'Indicá un monto en ARS o una orden pendiente',
        );
      }
      title = dto.title?.trim() || DEFAULT_PAYMENT_LINK_TITLE;
      const order = await this.prisma.order.create({
        data: {
          customerEmail: payerEmail || 'pago@yerbaxanaes.local',
          customerName: title,
          total: amount,
          status: OrderStatus.PENDING,
          paymentProvider: PaymentProvider.MERCADOPAGO,
          channel: SalesChannel.STORE,
          notes: PAYMENT_LINK_NOTES,
          deliveryType: 'pickup',
        },
      });
      orderId = order.id;
      createdStandalone = true;
    }

    try {
      const preference = await this.preferenceClient.create({
        body: {
          items: [
            {
              id: orderId,
              title,
              quantity: 1,
              unit_price: amount,
              currency_id: 'ARS',
            },
          ],
          ...(payerEmail ? { payer: { email: payerEmail } } : {}),
          ...(frontendUrl
            ? {
                back_urls: {
                  success: `${frontendUrl}/checkout/success?orderId=${orderId}`,
                  failure: `${frontendUrl}/checkout/failure?orderId=${orderId}`,
                  pending: `${frontendUrl}/checkout/success?orderId=${orderId}&status=pending`,
                },
                ...(frontendUrl.startsWith('https')
                  ? { auto_return: 'approved' as const }
                  : {}),
              }
            : {}),
          external_reference: orderId,
          notification_url: `${apiUrl}/payments/webhook`,
          statement_descriptor: this.getStatementDescriptor(),
          binary_mode: false,
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        requestOptions: { idempotencyKey: `payment-link-${orderId}` },
      });

      const initPoint = preference.init_point ?? null;
      const sandboxInitPoint = preference.sandbox_init_point ?? null;
      const link = initPoint || sandboxInitPoint;
      if (!preference.id || !link) {
        throw new InternalServerErrorException(
          'Mercado Pago no devolvió un link de pago',
        );
      }

      this.logger.log(
        `Payment link OK: orden=${orderId} preferenceId=${preference.id} amount=${amount}`,
      );

      return {
        initPoint: link,
        sandboxInitPoint,
        preferenceId: preference.id,
        amount,
        title,
      };
    } catch (error) {
      this.logger.error('Error creando link de pago MP', error);
      if (createdStandalone) {
        await this.cancelPendingOrderWithStockRestore(
          orderId,
          'payment_link_preference_error',
          undefined,
          'PAYMENT_REJECTED',
        );
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        'Error al generar el link de Mercado Pago',
      );
    }
  }

  async offlineCheckout(dto: OfflineCheckoutDto): Promise<{
    orderId: string;
    total: number;
    paymentProvider: PaymentProvider;
    transferInstructions: TransferInstructions | null;
  }> {
    if (
      dto.paymentProvider !== PaymentProvider.CASH &&
      dto.paymentProvider !== PaymentProvider.TRANSFER
    ) {
      throw new BadRequestException('Método de pago offline inválido');
    }

    await this.assertPaymentMethodEnabled(dto.paymentProvider);

    if (
      dto.paymentProvider === PaymentProvider.CASH &&
      dto.deliveryType !== 'pickup'
    ) {
      throw new BadRequestException(
        'El pago en efectivo solo está disponible para retiro en el local',
      );
    }

    if (dto.paymentProvider === PaymentProvider.TRANSFER) {
      const transfer = this.getTransferInstructions();
      if (!transfer || transfer.test) {
        throw new BadRequestException(
          'La transferencia no está disponible por ahora. Pagá con Mercado Pago o efectivo en el local.',
        );
      }
    }

    await this.assertPendingEmailRateLimit(dto.customerEmail);

    // Igual que el camino de Mercado Pago: si la orden ya existe, sus items y
    // su envio mandan sobre el body. El email tiene que coincidir.
    const existing = dto.existingOrderId
      ? await this.prisma.order.findUnique({
          where: { id: dto.existingOrderId },
          select: {
            id: true,
            total: true,
            status: true,
            deletedAt: true,
            customerEmail: true,
            shippingCost: true,
            items: {
              select: { variantId: true, quantity: true, price: true },
            },
          },
        })
      : null;

    const reusable =
      existing &&
      !existing.deletedAt &&
      existing.status === OrderStatus.PENDING &&
      existing.customerEmail === dto.customerEmail
        ? existing
        : null;

    // Cotizacion server-side, igual que los caminos de Mercado Pago.
    const quote = reusable
      ? await this.pricing.quoteExistingOrder({
          items: reusable.items.map((item) => ({
            quantity: item.quantity,
            price: Number(item.price),
          })),
          shippingCost: Number(reusable.shippingCost ?? 0),
          couponCode: dto.couponCode,
        })
      : await this.pricing.quote({
          orderItems: dto.orderItems,
          deliveryType: dto.deliveryType === 'pickup' ? 'pickup' : 'shipping',
          shippingDeliveryType: dto.shippingDeliveryType as
            | 'D'
            | 'S'
            | undefined,
          shippingZip: dto.shippingZip,
          shippingProductName: dto.shippingProductName,
          couponCode: dto.couponCode,
        });

    if (quote.couponError) {
      throw new BadRequestException(quote.couponError);
    }

    const finalAmount = quote.total;
    const shippingCost = quote.shippingCost;
    const couponValidation = quote.couponId
      ? { couponId: quote.couponId, discountAmount: quote.couponDiscount }
      : null;

    let order: { id: string; total: number | Prisma.Decimal } | null = null;

    if (reusable) {
      order = await this.prisma.order.update({
        where: { id: reusable.id },
        data: {
          paymentProvider: dto.paymentProvider,
          total: finalAmount,
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
      });

      if (couponValidation) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await this.coupons.applyToOrder(
              tx,
              reusable.id,
              couponValidation.couponId,
              couponValidation.discountAmount,
            );
          });
        } catch (error) {
          this.logger.warn(
            `Cupón ya aplicado o falla aplicándolo en orden ${reusable.id}`,
            error,
          );
        }
      }

      this.logger.log(
        `Offline checkout reutiliza orden ${order.id} → ${dto.paymentProvider}`,
      );
    }

    if (!order) {
      order = await this.createPendingOrder({
        customerEmail: dto.customerEmail,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        orderItems: dto.orderItems,
        totalAmount: finalAmount,
        deliveryType: dto.deliveryType,
        shippingStreetName: dto.shippingStreetName,
        shippingStreetNumber: dto.shippingStreetNumber,
        shippingFloor: dto.shippingFloor,
        shippingApartment: dto.shippingApartment,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingProvinceCode: dto.shippingProvinceCode,
        shippingZip: dto.shippingZip,
        shippingCost,
        shippingProvider: dto.shippingProvider,
        shippingDeliveryType: dto.shippingDeliveryType,
        shippingAgencyCode: dto.shippingAgencyCode,
        notes: dto.notes,
        paymentProvider: dto.paymentProvider,
      });

      if (couponValidation) {
        await this.prisma.$transaction(async (tx) => {
          await this.coupons.applyToOrder(
            tx,
            order!.id,
            couponValidation.couponId,
            couponValidation.discountAmount,
          );
        });
      }

      this.logger.log(
        `Offline checkout creó orden ${order.id} → ${dto.paymentProvider} PENDING`,
      );
    }

    return {
      orderId: order.id,
      total: Number(order.total),
      paymentProvider: dto.paymentProvider,
      transferInstructions:
        dto.paymentProvider === PaymentProvider.TRANSFER
          ? this.getTransferInstructions()
          : null,
    };
  }

  private getTransferInstructions(): TransferInstructions | null {
    const alias = this.config.get<string>('TRANSFER_ALIAS')?.trim() || null;
    const cbu = this.config.get<string>('TRANSFER_CBU')?.trim() || null;
    const holder = this.config.get<string>('TRANSFER_HOLDER')?.trim() || null;
    const bank = this.config.get<string>('TRANSFER_BANK')?.trim() || null;
    if (!alias && !cbu && !holder && !bank) return null;
    const blob = `${holder ?? ''} ${alias ?? ''}`.toLowerCase();
    return {
      alias,
      cbu,
      holder,
      bank,
      test: blob.includes('prueba'),
    };
  }

  private async assertPendingEmailRateLimit(customerEmail: string) {
    const activePending = await this.prisma.order.count({
      where: {
        customerEmail,
        status: OrderStatus.PENDING,
        deletedAt: null,
      },
    });
    if (activePending >= MAX_PENDING_ORDERS_PER_EMAIL) {
      throw new HttpException(
        'Demasiadas órdenes pendientes de pago para este email. ' +
          'Completá el pago de una o esperá a que expiren.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // -------------------------------------------------------
  // HELPER INTERNO: Crear Orden y Descontar Stock
  // -------------------------------------------------------
  private async createPendingOrder(params: {
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    orderItems: { variantId: string; quantity: number }[];
    totalAmount: number;
    deliveryType?: string;
    // Dirección estructurada (preferida)
    shippingStreetName?: string;
    shippingStreetNumber?: string;
    shippingFloor?: string;
    shippingApartment?: string;
    // Legacy single-string
    shippingAddress?: string;
    shippingCity?: string;
    shippingProvinceCode?: string;
    shippingZip?: string;
    shippingCost?: number;
    shippingProvider?: string;
    // Correo Argentino: D (domicilio) | S (sucursal)
    shippingDeliveryType?: string;
    shippingAgencyCode?: string;
    notes?: string;
    paymentProvider?: PaymentProvider;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // La reserva vive en InventoryReservationService, junto a su liberacion:
      // decrementar y devolver stock son la misma logica en dos direcciones y
      // antes estaban escritas por separado en dos lugares de este archivo.
      const orderItemsData = await this.reservation.reserve(
        tx,
        params.orderItems,
      );

      return tx.order.create({
        data: {
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          customerPhone: params.customerPhone,
          total: params.totalAmount,
          status: OrderStatus.PENDING,
          paymentProvider:
            params.paymentProvider ?? PaymentProvider.MERCADOPAGO,
          deliveryType: params.deliveryType || 'pickup',
          // Dirección estructurada
          shippingStreetName: params.shippingStreetName,
          shippingStreetNumber: params.shippingStreetNumber,
          shippingFloor: params.shippingFloor,
          shippingApartment: params.shippingApartment,
          // Legacy (mantener por compat con clientes viejos)
          shippingAddress: params.shippingAddress,
          shippingCity: params.shippingCity,
          shippingProvinceCode: params.shippingProvinceCode,
          shippingZip: params.shippingZip,
          shippingCost:
            params.shippingCost && params.shippingCost > 0
              ? params.shippingCost
              : null,
          shippingProvider: params.shippingProvider,
          // Correo: D/S + sucursal
          shippingDeliveryType: params.shippingDeliveryType,
          shippingAgencyCode: params.shippingAgencyCode,
          notes: params.notes,
          items: { create: orderItemsData },
        },
      });
    });
  }
}
