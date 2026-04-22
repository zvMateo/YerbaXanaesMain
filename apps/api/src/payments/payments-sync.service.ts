import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PAYMENTS SYNC SERVICE
 *
 * Maneja toda la lógica de auditoría, mapeo de estados y reconciliación
 * con Mercado Pago. Garantiza que Mercado Pago es la fuente de verdad
 * pero respeta manual overrides desde backoffice.
 */
@Injectable()
export class PaymentsSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsSyncService.name);
  private reconciliationInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMinutes = Math.max(
      1,
      Number(this.config.get('MP_RECONCILIATION_INTERVAL_MINUTES') ?? 5),
    );

    this.reconciliationInterval = setInterval(() => {
      void this.reconcileOrdersWithMercadoPago();
    }, intervalMinutes * 60_000);

    this.reconciliationInterval.unref?.();
    this.logger.log(
      `Reconciliación automática con MP iniciada (cada ${intervalMinutes} min)`,
    );
  }

  onModuleDestroy() {
    if (this.reconciliationInterval) {
      clearInterval(this.reconciliationInterval);
      this.reconciliationInterval = null;
    }
  }

  /**
   * Mapea TODOS los estados posibles de Mercado Pago a nuestros OrderStatus
   *
   * MP puede devolver:
   * - approved       → PAID  (Payments API /v1/payments — tarjeta, billetera, ticket confirmado)
   * - processed      → PAID  (Orders API /v1/orders — Checkout Pro)
   * - pending        → PENDING (offline payment, ancora no confirmado)
   * - in_process     → PENDING (en procesamiento, no completado)
   * - authorized     → PENDING (tarjeta autorizada, no capturada)
   * - rejected       → CANCELLED (rechazado)
   * - cancelled      → CANCELLED (cancelado)
   * - refunded       → REFUNDED (reembolsado)
   * - closed         → CANCELLED (cerrado sin completar)
   * - expired        → CANCELLED (expirado)
   */
  mapMercadoPagoStatus(
    mpStatus: string,
    mpStatusDetail?: string,
  ): OrderStatus | null {
    const status = mpStatus?.toLowerCase();

    switch (status) {
      // ✅ COMPLETADO
      // 'approved'  → Payments API (/v1/payments) — tarjetas, billetera MP, tickets confirmados
      // 'processed' → Orders API  (/v1/orders)  — Checkout Pro con preferenceId
      case 'approved':
      case 'processed':
        return OrderStatus.PAID;

      // ⏳ PENDIENTE (múltiples razones)
      case 'pending':
        // Offline payment (Rapipago, OXXO, etc.) - esperando confirmación física
        return OrderStatus.PENDING;
      case 'in_process':
        // Procesándose pero no completado
        return OrderStatus.PENDING;
      case 'authorized':
        // Autorizado pero no capturado
        return OrderStatus.PENDING;

      // ❌ RECHAZADO / CANCELADO
      case 'rejected':
        return OrderStatus.CANCELLED;
      case 'cancelled':
        return OrderStatus.CANCELLED;
      case 'closed':
        return OrderStatus.CANCELLED;
      case 'expired':
        return OrderStatus.CANCELLED;

      // 🔄 REEMBOLSADO
      case 'refunded':
        return OrderStatus.REFUNDED;

      default:
        this.logger.warn(
          `Estado desconocido de MP: '${mpStatus}' (detail: '${mpStatusDetail}')`,
        );
        return null;
    }
  }

  /**
   * Actualiza estado CON AUDITORÍA completa
   *
   * PROTECCIONES:
   * 1. Row-level lock (FOR UPDATE) para evitar race conditions
   * 2. Idempotencia: no actualiza si ya está en ese estado
   * 3. Manual override protection: webhook no revierte cambios manuales
   * 4. Atomicidad: estado + auditoría en misma transacción
   *
   * @returns true si se actualizó, false si no
   */
  async updateOrderStatusWithAudit(params: {
    orderId: string;
    newStatus: OrderStatus;
    source:
      | 'WEBHOOK_MERCADOPAGO'
      | 'WEBHOOK_MODO'
      | 'CARD_PAYMENT_API'
      | 'MANUAL_OVERRIDE'
      | 'CLEANUP_TIMEOUT'
      | 'PAYMENT_REJECTED'
      | 'RECONCILIATION'
      | 'SYSTEM_ERROR';
    mpPaymentId?: string;
    mpRawStatus?: string;
    reason?: string;
    changedByEmail?: string;
    notes?: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // 1. LOCK: Bloquea la fila para evitar race conditions
      await tx.$queryRaw`
        SELECT id
        FROM "Order"
        WHERE id = ${params.orderId}
        FOR UPDATE
      `;

      // 2. FETCH: Lee estado actual
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        select: {
          id: true,
          status: true,
          manualOverrideAt: true,
          deletedAt: true,
        },
      });

      if (!order || order.deletedAt) {
        this.logger.warn(`Order ${params.orderId} no existe o está eliminada`);
        return false;
      }

      // 3. IDEMPOTENCIA: No cambiar si ya está en ese estado
      if (order.status === params.newStatus) {
        this.logger.log(
          `Order ${params.orderId} ya tiene status ${params.newStatus}`,
        );
        return false;
      }

      // 4. MANUAL OVERRIDE PROTECTION: Si webhook intenta revertir override manual, IGNORAR
      if (
        (params.source === 'WEBHOOK_MERCADOPAGO' ||
          params.source === 'WEBHOOK_MODO') &&
        order.manualOverrideAt !== null
      ) {
        this.logger.warn(
          `Webhook IGNORADO para ${params.orderId}: existe manualOverride anterior`,
        );
        return false;
      }

      // 5. UPDATE: Actualiza estado + metadata
      await tx.order.update({
        where: { id: params.orderId },
        data: {
          status: params.newStatus,
          ...(params.mpPaymentId ? { mpPaymentId: params.mpPaymentId } : {}),
          ...(params.mpRawStatus ? { mpStatus: params.mpRawStatus } : {}),
          // Mark manual override si viene de backoffice
          ...(params.source === 'MANUAL_OVERRIDE'
            ? {
                manualOverrideAt: new Date(),
                manualOverrideReason: params.reason,
              }
            : {}),
        },
      });

      // 6. AUDIT: Registra en tabla OrderStateChange
      await tx.orderStateChange.create({
        data: {
          orderId: params.orderId,
          fromStatus: order.status,
          toStatus: params.newStatus,
          source: params.source,
          mpPaymentId: params.mpPaymentId,
          mpRawStatus: params.mpRawStatus,
          reason: params.reason,
          changedByEmail: params.changedByEmail,
          notes: params.notes,
        },
      });

      this.logger.log(
        {
          event: 'order_status_updated_with_audit',
          orderId: params.orderId,
          from: order.status,
          to: params.newStatus,
          source: params.source,
          changedBy: params.changedByEmail,
        },
        'OrderStateAudit',
      );

      return true;
    });
  }

  /**
   * RECONCILIACIÓN AUTOMÁTICA: Sincroniza BD con MP
   *
   * Busca órdenes PENDING/PROCESSING que tienen mpPaymentId,
   * consulta estado actual en MP, y actualiza si diferente.
   *
   * EXCLUYE órdenes con manual override (respeta backoffice).
   *
   * Ejecuta cada 5 minutos (configurable)
   */
  async reconcileOrdersWithMercadoPago(): Promise<{
    reconciled: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log('Iniciando reconciliación automática con Mercado Pago...');

    const accessToken = this.config.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      this.logger.error(
        'MP_ACCESS_TOKEN no configurado - reconciliación abortada',
      );
      return { reconciled: 0, updated: 0, errors: 0 };
    }

    // Buscar órdenes que necesitan reconciliar
    const ordersToReconcile = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        deletedAt: null,
        mpPaymentId: { not: null },
      },
      select: {
        id: true,
        status: true,
        mpPaymentId: true,
        manualOverrideAt: true,
      },
      take: 100, // Procesar en batches para no sobrecargar
    });

    let reconciled = 0,
      updated = 0,
      errors = 0;

    for (const order of ordersToReconcile) {
      // Skip si backoffice hizo override manual
      if (order.manualOverrideAt !== null) {
        continue;
      }

      try {
        // Fetch payment status desde Mercado Pago
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let response: Response;
        try {
          response = await fetch(
            `https://api.mercadopago.com/v1/payments/${order.mpPaymentId}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: controller.signal,
            },
          );
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          this.logger.warn(
            `No se pudo fetch payment ${order.mpPaymentId} desde MP`,
          );
          errors++;
          continue;
        }

        const mpPayment = await response.json();
        const newStatus = this.mapMercadoPagoStatus(
          mpPayment.status,
          mpPayment.status_detail,
        );

        reconciled++;

        // Si estado en MP difiere del local, actualizar
        if (newStatus && newStatus !== order.status) {
          const success = await this.updateOrderStatusWithAudit({
            orderId: order.id,
            newStatus,
            source: 'RECONCILIATION',
            mpPaymentId: order.mpPaymentId ?? undefined,
            mpRawStatus: mpPayment.status_detail,
            reason: `Reconciliation: MP tiene ${mpPayment.status} pero BD tenía ${order.status}`,
          });

          if (success) {
            updated++;
          }
        }
      } catch (error) {
        errors++;
        this.logger.error(
          `Error reconciliando orden ${order.id}: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    this.logger.log(
      {
        event: 'mercadopago_reconciliation_completed',
        reconciled,
        updated,
        errors,
        summary: `Reconciled ${reconciled} orders, updated ${updated}, errors ${errors}`,
      },
      'Reconciliation',
    );

    return { reconciled, updated, errors };
  }

  /**
   * MANUAL OVERRIDE desde backoffice
   *
   * Permite que tu clienta cambie estado manualmente y PREVIENE que webhook lo revert.
   * Auditable: queda registrado quién cambió y por qué.
   */
  async manuallyOverrideOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedByEmail: string,
    reason: string,
  ): Promise<boolean> {
    return this.updateOrderStatusWithAudit({
      orderId,
      newStatus,
      source: 'MANUAL_OVERRIDE',
      reason,
      changedByEmail,
      notes: `Manual override desde backoffice por ${changedByEmail}`,
    });
  }

  /**
   * GET: Historial de cambios de estado para una orden
   * Útil para debugging y auditoría
   */
  async getOrderStateHistory(orderId: string) {
    return this.prisma.orderStateChange.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        source: true,
        reason: true,
        changedByEmail: true,
        createdAt: true,
      },
    });
  }
}
