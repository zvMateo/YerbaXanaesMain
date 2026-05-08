import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { CreateBrickPaymentDto } from './dto/create-brick-payment.dto';
import { BrickInitDto } from './dto/brick-init.dto';
import { OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { CouponsService } from '../coupons/coupons.service';
import { PaymentsSyncService } from './payments-sync.service';
import { ShippingService } from '../shipping/shipping.service';

/**
 * Métricas devueltas por el cleanup de órdenes PENDING
 */
export interface CleanupMetrics {
  checked: number; // Órdenes PENDING encontradas
  cancelled: number; // Órdenes canceladas exitosamente
  failed: number; // Intentos fallidos
  totalStockRestored: number; // Unidades totales de stock restauradas
  ttlMinutes: number; // TTL usado en esta ejecución
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
  async brickInit(dto: BrickInitDto): Promise<{
    preferenceId: string;
    orderId: string;
    amount: number;
  }> {
    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const apiUrl = (
      this.config.get<string>('API_URL') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    // 1. Calcular monto
    const itemsSubtotal = await this.calculateOrderItemsSubtotal(
      dto.orderItems,
    );
    const shippingCost = Math.max(0, Number(dto.shippingCost ?? 0));
    const grossAmount = itemsSubtotal + shippingCost;

    let couponValidation: Awaited<
      ReturnType<CouponsService['validate']>
    > | null = null;

    if (dto.couponCode) {
      try {
        couponValidation = await this.coupons.validate(
          dto.couponCode,
          grossAmount,
        );
      } catch {
        this.logger.warn(
          `Cupón ${dto.couponCode} inválido en brick-init — ignorado`,
        );
      }
    }

    const couponDiscount = couponValidation?.discountAmount ?? 0;
    const finalAmount = Math.max(0, grossAmount - couponDiscount);

    // 2. Crear orden PENDING (decrementa stock con row locks)
    const order = await this.createPendingOrder({
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      orderItems: dto.orderItems,
      totalAmount: finalAmount,
      deliveryType: dto.deliveryType,
      shippingAddress: dto.shippingAddress,
      shippingCity: dto.shippingCity,
      shippingProvinceCode: dto.shippingProvinceCode,
      shippingZip: dto.shippingZip,
      shippingCost,
      shippingProvider: dto.shippingProvider,
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
          statement_descriptor:
            this.config.get<string>('MP_STATEMENT_DESCRIPTOR') ||
            'YERBAXANAES',
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

  // -------------------------------------------------------
  // PAGO DIRECTO CON TARJETA (Checkout API - /v1/orders)
  // -------------------------------------------------------
  async processCardPayment(dto: CreateOrderPaymentDto) {
    this.logger.log(
      `Iniciando pago para ${dto.payer.email} - $${dto.transaction_amount}`,
    );

    const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new InternalServerErrorException('Falta MP_ACCESS_TOKEN');
    }

    try {
      const orderItems = dto.orderItems || [];
      const shippingCost = Math.max(0, Number(dto.shippingCost ?? 0));

      let finalAmount = dto.transaction_amount;
      let couponValidation: Awaited<
        ReturnType<CouponsService['validate']>
      > | null = null;

      // Si llega contexto de carrito, recalculamos monto en backend.
      if (orderItems.length > 0) {
        const itemsSubtotal =
          await this.calculateOrderItemsSubtotal(orderItems);
        const grossAmount = itemsSubtotal + shippingCost;

        if (dto.couponCode) {
          try {
            couponValidation = await this.coupons.validate(
              dto.couponCode,
              grossAmount,
            );
          } catch {
            this.logger.warn(
              `Cupón ${dto.couponCode} inválido en processCardPayment — ignorado`,
            );
          }
        }

        const discount = couponValidation?.discountAmount ?? 0;
        finalAmount = Math.max(0, grossAmount - discount);

        if (Math.abs(dto.transaction_amount - finalAmount) > 0.01) {
          this.logger.warn(
            `Monto inconsistente en processCardPayment: client=${dto.transaction_amount.toFixed(2)} server=${finalAmount.toFixed(2)}`,
          );
          throw new BadRequestException(
            'El monto del pago cambió. Reintentá para recalcular el total.',
          );
        }
      }

      // 1. Crear la Order en nuestra base de datos en estado PENDING y descontar stock
      const order = await this.createPendingOrder({
        customerEmail: dto.payer.email,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        orderItems,
        totalAmount: finalAmount,
        deliveryType: dto.deliveryType,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingProvinceCode: dto.shippingProvinceCode,
        shippingZip: dto.shippingZip,
        shippingCost,
        shippingProvider: dto.shippingProvider,
      });

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

      this.logger.log(`Orden local creada: ${order.id}`);

      // 2. Construir el payload exacto para la API de MP
      // IMPORTANTE: En API v1/orders, total_amount y amount DEBEN ser strings con formato "00.00"
      const amountStr = finalAmount.toFixed(2);

      const mpPayload = {
        type: 'online',
        processing_mode: 'automatic',
        total_amount: amountStr,
        external_reference: order.id,
        payer: {
          email: dto.payer.email,
        },
        transactions: {
          payments: [
            {
              amount: amountStr,
              payment_method: {
                id: dto.payment_method_id,
                // Si la tarjeta de test falla por falta de tipo, asumimos credit_card
                type: 'credit_card',
                token: dto.token,
                installments: dto.installments || 1,
                ...(dto.issuer_id && dto.issuer_id !== '0'
                  ? { issuer_id: dto.issuer_id }
                  : {}),
              },
            },
          ],
        },
      };

      const idempotencyKey = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            orderId: order.id,
            amount: amountStr,
            paymentMethodId: dto.payment_method_id,
            installments: dto.installments || 1,
            payerEmail: dto.payer.email,
          }),
        )
        .digest('hex');

      // 3. Ejecutar POST a Mercado Pago vía fetch nativo
      this.logger.log(`Enviando POST a /v1/orders para order ${order.id}`);
      const response = await fetch('https://api.mercadopago.com/v1/orders', {
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
        this.logger.error('Error de MP al procesar Order', data);
        // Hacer rollback de la orden local y restaurar stock
        await this.cancelPendingOrderWithStockRestore(
          order.id,
          'direct_payment_error',
          undefined,
          'PAYMENT_REJECTED',
        );

        throw new BadRequestException({
          message: 'Error de MercadoPago al procesar el pago',
          cause: data.cause || data,
        });
      }

      // 4. Analizar respuesta de la transacción
      // En "automatic", el pago se procesa asíncronamente o retorna el status final
      const mpStatus = data.status; // ej: "processed", "action_required"
      const paymentStatus = data.transactions?.payments?.[0]?.status; // "processed", "rejected", "pending"
      const paymentStatusDetail =
        data.transactions?.payments?.[0]?.status_detail; // "accredited"

      this.logger.log(
        `MP Order ${data.id} - Status: ${mpStatus} - Payment: ${paymentStatus}`,
      );

      // Si se acreditó inmediatamente, actualizamos la orden
      if (mpStatus === 'processed' && paymentStatusDetail === 'accredited') {
        const cardMpPaymentId = data.transactions.payments[0].id;
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentProvider: PaymentProvider.MERCADOPAGO,
            mpPaymentId: cardMpPaymentId,
          },
        });
        await this.paymentsSync.updateOrderStatusWithAudit({
          orderId: order.id,
          newStatus: OrderStatus.PAID,
          source: 'CARD_PAYMENT_API',
          mpPaymentId: cardMpPaymentId,
          mpRawStatus: paymentStatusDetail,
        });

        return {
          id: data.transactions.payments[0].id,
          status: 'approved',
          detail: paymentStatusDetail,
          orderId: order.id,
        };
      }

      // Si quedó en pendiente (o rechazado), devolvemos el estado correspondiente
      return {
        id: data.id,
        status: mpStatus,
        detail: paymentStatusDetail || data.status_detail,
        orderId: order.id,
      };
    } catch (error: any) {
      this.logger.error('Excepción en processCardPayment', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error interno al procesar pago');
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

    // 1. Calcular monto real en backend (nunca confiar en transaction_amount del cliente)
    const itemsSubtotal = await this.calculateOrderItemsSubtotal(
      dto.orderItems,
    );
    const shippingCost = Math.max(0, Number(dto.shippingCost ?? 0));
    const grossAmount = itemsSubtotal + shippingCost;

    let couponValidation: Awaited<
      ReturnType<CouponsService['validate']>
    > | null = null;

    if (dto.couponCode) {
      try {
        couponValidation = await this.coupons.validate(
          dto.couponCode,
          grossAmount,
        );
      } catch {
        this.logger.warn(
          `Cupón ${dto.couponCode} inválido en brick — ignorado`,
        );
      }
    }

    const couponDiscount = couponValidation?.discountAmount ?? 0;
    const finalAmount = Math.max(0, grossAmount - couponDiscount);

    // Validar monto solo si el Brick envía formData (wallet_purchase no lo hace)
    const clientAmount = dto.formData
      ? Number(dto.formData.transaction_amount)
      : null;
    if (clientAmount !== null && Math.abs(clientAmount - finalAmount) > 0.01) {
      this.logger.warn(
        `Monto inconsistente en Brick: client=${clientAmount.toFixed(2)} server=${finalAmount.toFixed(2)}`,
      );
      throw new BadRequestException(
        'El monto del pago cambió. Reintentá para recalcular el total.',
      );
    }

    const amountStr = finalAmount.toFixed(2);

    // 2. Obtener o crear orden PENDING
    // Si el frontend ya llamó a brick-init (con preferenceId), reutilizamos esa orden.
    // Si no, creamos una nueva (backward compat con métodos sin preferenceId).
    let order: { id: string; total: number | Prisma.Decimal; status: string };

    if (dto.existingOrderId) {
      // Reutilizar orden pre-creada por brick-init
      const existing = await this.prisma.order.findUnique({
        where: { id: dto.existingOrderId },
        select: { id: true, total: true, status: true, deletedAt: true },
      });

      if (
        !existing ||
        existing.deletedAt ||
        existing.status !== OrderStatus.PENDING
      ) {
        this.logger.warn(
          `brick-init order ${dto.existingOrderId} no disponible — creando nueva orden`,
        );
        // Fallback: crear nueva orden si la pre-creada ya no está disponible
        order = await this.createPendingOrder({
          customerEmail: dto.formData?.payer?.email ?? '',
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          orderItems: dto.orderItems,
          totalAmount: finalAmount,
          deliveryType: dto.deliveryType,
          shippingAddress: dto.shippingAddress,
          shippingCity: dto.shippingCity,
          shippingProvinceCode: dto.shippingProvinceCode,
          shippingZip: dto.shippingZip,
          shippingCost,
          shippingProvider: dto.shippingProvider,
        });
      } else {
        /**
         * RE-COTIZAR ENVÍO EN EL SERVER — Protege contra:
         * a) CP modificado por el usuario entre delivery-step y brick-init
         * b) Tarifas de Correo Argentino actualizadas desde la cotización original
         * Solo aplica para método "correo_argentino". Otros providers se ignoran.
         */
        let serverShippingCost = shippingCost;

        if (
          dto.shippingProvider === 'correo_argentino' &&
          dto.shippingZip
        ) {
          try {
            const rateResponse = await this.shipping.getRates({
              items: dto.orderItems,
              postalCodeDestination: dto.shippingZip,
            });

            if (rateResponse.rates.length > 0) {
              const cheapestRate = rateResponse.rates.reduce((a, b) =>
                a.price <= b.price ? a : b,
              );

              serverShippingCost = cheapestRate.price;

              if (
                Math.abs(serverShippingCost - shippingCost) > 0.5
              ) {
                this.logger.warn(
                  `Shipping cost mismatch para orden ${existing.id}: ` +
                    `client=${shippingCost} server=${serverShippingCost} — actualizando total`,
                );
                // Recalcular total con el costo de envío verificado
                const grossAmount = itemsSubtotal + serverShippingCost;
                const newFinalAmount = Math.max(
                  0,
                  grossAmount - couponDiscount,
                );

                await this.prisma.order.update({
                  where: { id: existing.id },
                  data: { total: newFinalAmount },
                });
                this.logger.log(
                  `Orden ${existing.id} total actualizado a ${newFinalAmount} tras re-cotizar envío`,
                );
              }
            }
          } catch {
            // Correo falló — usar el shippingCost del cliente (no blockeamos el pago)
            this.logger.warn(
              `No se pudo re-cotizar envío para orden ${existing.id} — usando costo original`,
            );
          }
        }

        // Actualizar total si el monto cambió (ej: cupón aplicado después de brick-init)
        // Nota: si recién recalculamos por diff de shipping, el total ya se actualizó arriba
        if (Math.abs(Number(existing.total) - finalAmount) > 0.01) {
          await this.prisma.order.update({
            where: { id: existing.id },
            data: { total: finalAmount },
          });
        }
        // Aplicar cupón si viene en el submit y no fue aplicado en brick-init
        if (couponValidation) {
          try {
            await this.prisma.$transaction(async (tx) => {
              await this.coupons.applyToOrder(
                tx,
                existing.id,
                couponValidation.couponId,
                couponValidation.discountAmount,
              );
            });
          } catch {
            // El cupón ya puede estar aplicado desde brick-init — ignorar si falla
          }
        }
        order = existing;
        this.logger.log(
          `Reutilizando orden brick-init: ${order.id} — método: ${dto.selectedPaymentMethod}`,
        );
      }
    } else {
      // Crear orden nueva (flujo sin brick-init / backward compat)
      order = await this.createPendingOrder({
        customerEmail: dto.formData?.payer?.email ?? '',
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        orderItems: dto.orderItems,
        totalAmount: finalAmount,
        deliveryType: dto.deliveryType,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingProvinceCode: dto.shippingProvinceCode,
        shippingZip: dto.shippingZip,
        shippingCost,
        shippingProvider: dto.shippingProvider,
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
        `selectedPaymentMethod desconocido: ${dto.selectedPaymentMethod}`,
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
      statement_descriptor: 'YERBAXANAES',
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
      statement_descriptor: 'YERBAXANAES',
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

    const ttlMinutes = Math.max(
      1,
      ttlMinuteOverride ??
        Number(this.config.get('MP_PENDING_ORDER_TTL_MINUTES') ?? 60),
    );

    const cutoff = new Date(Date.now() - ttlMinutes * 60_000);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        deletedAt: null,
        createdAt: { lte: cutoff },
      },
      select: { id: true, items: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    let cancelled = 0;
    let failed = 0;
    let totalStockRestored = 0;

    // Procesar cada orden expirada
    for (const order of expiredOrders) {
      try {
        const wasCancelled = await this.cancelPendingOrderWithStockRestore(
          order.id,
          'expired_pending_timeout',
          undefined,
          'CLEANUP_TIMEOUT',
        );
        if (wasCancelled) {
          cancelled += 1;
          // Contar stock restaurado
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
      failed,
      totalStockRestored,
      ttlMinutes,
      durationMs,
      timestamp: new Date(),
    };

    // Log estructurado para observabilidad
    if (expiredOrders.length > 0) {
      this.logger.log(
        {
          event: 'cleanup_pending_orders_executed',
          metrics,
          summary: `Cleanup completado: encontradas=${expiredOrders.length}, canceladas=${cancelled}, fallidas=${failed}, stock_restaurado=${totalStockRestored}`,
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

        // Bloquear la fila para evitar race condition con cleanup/webhook concurrente
        await this.prisma.$queryRaw`
          SELECT id FROM "Order" WHERE id = ${extRef} FOR UPDATE
        `;

        const existing = await this.prisma.order.findUnique({
          where: { id: extRef },
        });

        if (!existing) {
          this.logger.warn(`Order local ${extRef} no encontrada`);
          return { status: 'ok' };
        }

        const isTerminal =
          existing.status === OrderStatus.PAID ||
          existing.status === OrderStatus.CANCELLED;

        if (isTerminal) {
          this.logger.log(`Order ${extRef} ya terminal (${existing.status})`);
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

        // Bloquear la fila para evitar race condition con cleanup/webhook concurrente
        await this.prisma.$queryRaw`
          SELECT id FROM "Order" WHERE id = ${extRef} FOR UPDATE
        `;

        const existing = await this.prisma.order.findUnique({
          where: { id: extRef },
        });

        if (!existing) {
          this.logger.warn(`Order local ${extRef} no encontrada`);
          return { status: 'ok' };
        }

        const isTerminal =
          existing.status === OrderStatus.PAID ||
          existing.status === OrderStatus.CANCELLED;

        if (isTerminal) {
          this.logger.log(`Order ${extRef} ya terminal (${existing.status})`);
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
  private async cancelPendingOrderWithStockRestore(
    orderId: string,
    reason: string,
    mpPaymentId?: string,
    auditSource?:
      | 'WEBHOOK_MERCADOPAGO'
      | 'CLEANUP_TIMEOUT'
      | 'PAYMENT_REJECTED',
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

      await this.restoreOrderStockInTransaction(tx, order.items);

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

  private async restoreOrderStockInTransaction(
    tx: Prisma.TransactionClient,
    orderItems: { variantId: string; quantity: number }[],
  ) {
    for (const item of orderItems) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { ingredients: true },
      });

      if (!variant) continue;

      if (variant.ingredients && variant.ingredients.length > 0) {
        for (const ingredient of variant.ingredients) {
          const totalQuantityToRestore =
            ingredient.quantityRequired * item.quantity;
          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: { currentStock: { increment: totalQuantityToRestore } },
          });
        }
      } else {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }

  private async calculateOrderItemsSubtotal(
    orderItems: { variantId: string; quantity: number }[],
  ): Promise<number> {
    if (orderItems.length === 0) {
      throw new BadRequestException('La orden no tiene items para cobrar');
    }

    const variantIds = [...new Set(orderItems.map((item) => item.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, price: true },
    });

    const priceByVariant = new Map<string, number>();
    for (const variant of variants) {
      priceByVariant.set(variant.id, Number(variant.price));
    }

    let subtotal = 0;
    for (const item of orderItems) {
      const unitPrice = priceByVariant.get(item.variantId);
      if (unitPrice == null) {
        throw new NotFoundException(`Variante ${item.variantId} no encontrada`);
      }
      subtotal += unitPrice * item.quantity;
    }

    return subtotal;
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
  // HELPER INTERNO: Crear Orden y Descontar Stock
  // -------------------------------------------------------
  private async createPendingOrder(params: {
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    orderItems: { variantId: string; quantity: number }[];
    totalAmount: number;
    deliveryType?: string;
    shippingAddress?: string;
    shippingCity?: string;
    shippingProvinceCode?: string;
    shippingZip?: string;
    shippingCost?: number;
    shippingProvider?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const orderItemsData: {
        variantId: string;
        quantity: number;
        price: number;
      }[] = [];

      for (const item of params.orderItems) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            ingredients: { include: { inventoryItem: true } },
            product: { select: { name: true } },
          },
        });

        if (!variant) {
          throw new NotFoundException(
            `Variante ${item.variantId} no encontrada`,
          );
        }

        orderItemsData.push({
          variantId: item.variantId,
          quantity: item.quantity,
          price: Number(variant.price),
        });

        // Descontar stock
        if (variant.ingredients && variant.ingredients.length > 0) {
          for (const ingredient of variant.ingredients) {
            const totalNeeded = ingredient.quantityRequired * item.quantity;

            // SELECT FOR UPDATE: bloquea la fila hasta que la transacción termine
            await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${ingredient.inventoryItemId} FOR UPDATE`;
            const lockedItem = await tx.inventoryItem.findUnique({
              where: { id: ingredient.inventoryItemId },
            });
            const currentStock = lockedItem!.currentStock;

            if (currentStock < totalNeeded) {
              throw new BadRequestException(
                `Stock insuficiente de '${ingredient.inventoryItem.name}'.`,
              );
            }
            await tx.inventoryItem.update({
              where: { id: ingredient.inventoryItemId },
              data: { currentStock: { decrement: totalNeeded } },
            });
          }
        } else {
          // SELECT FOR UPDATE: bloquea la fila de la variante
          await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variant.id} FOR UPDATE`;
          const lockedVariant = await tx.productVariant.findUnique({
            where: { id: variant.id },
          });
          const available = lockedVariant!.stock || 0;

          if (available < item.quantity) {
            throw new BadRequestException(
              `Stock insuficiente de '${variant.product.name}'.`,
            );
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return tx.order.create({
        data: {
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          customerPhone: params.customerPhone,
          total: params.totalAmount,
          status: OrderStatus.PENDING,
          paymentProvider: PaymentProvider.MERCADOPAGO,
          deliveryType: params.deliveryType || 'pickup',
          shippingAddress: params.shippingAddress,
          shippingCity: params.shippingCity,
          shippingProvinceCode: params.shippingProvinceCode,
          shippingZip: params.shippingZip,
          shippingCost:
            params.shippingCost && params.shippingCost > 0
              ? params.shippingCost
              : null,
          shippingProvider: params.shippingProvider,
          items: { create: orderItemsData },
        },
      });
    });
  }
}
