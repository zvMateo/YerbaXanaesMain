import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { OrderStatus, PaymentProvider } from '@prisma/client';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly preferenceClient: Preference;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly coupons: CouponsService,
  ) {
    const client = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MP_ACCESS_TOKEN')!,
      options: { timeout: 10000 },
    });
    this.preferenceClient = new Preference(client);
  }

  // -------------------------------------------------------
  // CHECKOUT PRO (Billetera - Redirect)
  // -------------------------------------------------------
  async createCheckoutPreference(dto: CreatePreferenceDto) {
    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const apiUrl = (
      this.config.get<string>('API_URL') || 'http://localhost:3001'
    ).replace(/\/$/, '');

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    const shippingCost = Number(dto.shippingCost ?? 0);
    const subtotalWithShipping = totalAmount + shippingCost;

    let couponValidation: Awaited<
      ReturnType<CouponsService['validate']>
    > | null = null;

    if (dto.couponCode) {
      couponValidation = await this.coupons.validate(
        dto.couponCode,
        subtotalWithShipping,
      );
    }

    const discount = couponValidation?.discountAmount ?? 0;
    const finalAmount = Math.max(0, subtotalWithShipping - discount);

    const order = await this.createPendingOrder({
      customerEmail: dto.payerEmail,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      orderItems: dto.orderItems || [],
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

    const successUrl = `${frontendUrl}/checkout/success?orderId=${order.id}`;

    try {
      const preference = await this.preferenceClient.create({
        body: {
          items: dto.items,
          payer: { email: dto.payerEmail },
          back_urls: {
            success: successUrl,
            failure: `${frontendUrl}/checkout/failure`,
            pending: `${frontendUrl}/checkout/pending`,
          },
          ...(frontendUrl.startsWith('https')
            ? { auto_return: 'approved' as const }
            : {}),
          external_reference: order.id,
          notification_url: `${apiUrl}/payments/webhook`,
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        requestOptions: { idempotencyKey: order.id },
      });

      return {
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        orderId: order.id,
      };
    } catch (error) {
      this.logger.error('Error creando preferencia MP', error);
      // Rollback de stock si falla MP
      await this.restoreOrderStock(order.id);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED, deletedAt: new Date() },
      });
      throw new InternalServerErrorException('Error creando preferencia MP');
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
      // 1. Crear la Order en nuestra base de datos en estado PENDING y descontar stock
      const order = await this.createPendingOrder({
        customerEmail: dto.payer.email,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        orderItems: dto.orderItems || [],
        totalAmount: dto.transaction_amount,
      });

      this.logger.log(`Orden local creada: ${order.id}`);

      // 2. Construir el payload exacto para la API de MP
      // IMPORTANTE: En API v1/orders, total_amount y amount DEBEN ser strings con formato "00.00"
      const amountStr = dto.transaction_amount.toFixed(2);

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

      // 3. Ejecutar POST a Mercado Pago vía fetch nativo
      this.logger.log(`Enviando POST a /v1/orders con token ${dto.token}`);
      const response = await fetch('https://api.mercadopago.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Idempotency-Key': crypto.randomUUID(), // UUID V4 único por request
        },
        body: JSON.stringify(mpPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Error de MP al procesar Order', data);
        // Hacer rollback de la orden local y restaurar stock
        await this.restoreOrderStock(order.id);
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, deletedAt: new Date() },
        });

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
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentProvider: PaymentProvider.MERCADOPAGO,
            mpPaymentId: data.transactions.payments[0].id,
            mpStatus: paymentStatusDetail,
          },
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
      return { status: 'ignored_no_signature' };
    }

    // 1. Validar HMAC según doc
    if (webhookSecret && signature) {
      const parts = signature.split(',');
      let ts: string | undefined;
      let hash: string | undefined;

      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') ts = value?.trim();
        else if (key?.trim() === 'v1') hash = value?.trim();
      }

      // Asegurar que el dataIdUrl esté en minúsculas (requisito de la doc)
      const dataIdLower = dataIdUrl?.toLowerCase() || '';

      const manifest = `id:${dataIdLower};request-id:${requestId};ts:${ts};`;
      const hmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(manifest)
        .digest('hex');

      if (hmac !== hash) {
        this.logger.warn('Firma HMAC inválida - ignorando webhook');
        return { status: 'ignored_invalid_signature' };
      }
    }

    // 2. Procesar tópico "order" (ya no "payment")
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

        // Determinar status (ejemplo simplificado)
        let newStatus: OrderStatus | undefined;
        const mpStatus = mpOrder.status;

        if (mpStatus === 'processed') newStatus = OrderStatus.PAID;
        else if (['rejected', 'cancelled', 'refunded'].includes(mpStatus)) {
          newStatus = OrderStatus.CANCELLED;
        }

        if (newStatus) {
          if (newStatus === OrderStatus.CANCELLED) {
            await this.restoreOrderStock(extRef);
          }
          await this.prisma.order.update({
            where: { id: extRef },
            data: {
              status: newStatus,
              mpPaymentId: mpOrder.transactions?.payments?.[0]?.id,
              mpStatus: mpOrder.status_detail,
            },
          });
          this.logger.log(`Order ${extRef} actualizada a ${newStatus}`);
        }
      } catch (error) {
        this.logger.error(`Error procesando webhook order ${dataIdUrl}`, error);
      }
    }

    return { status: 'ok' };
  }

  // -------------------------------------------------------
  // HELPER INTERNO: Restaurar Stock de Orden Cancelada
  // -------------------------------------------------------
  private async restoreOrderStock(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return;

      for (const item of order.items) {
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
    });
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
