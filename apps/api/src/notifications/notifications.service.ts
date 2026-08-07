import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notificaciones de pedido (email).
 * - Fail-open: un fallo de email NUNCA revierte el estado de la orden.
 * - Idempotente: usa Order.notifiedPaidAt para no spamear en retries de webhook.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Envía emails de "pedido pagado" a dueña y comprador si aún no se notificó.
   */
  async notifyOrderPaidIfNeeded(orderId: string): Promise<void> {
    try {
      // Claim atómico: solo un caller gana el derecho a notificar
      const claimed = await this.prisma.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PAID,
          notifiedPaidAt: null,
          deletedAt: null,
        },
        data: { notifiedPaidAt: new Date() },
      });

      if (claimed.count === 0) {
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { select: { name: true } } },
              },
            },
          },
        },
      });

      if (!order) {
        return;
      }

      const ownerEmail = await this.resolveOwnerEmail();
      const customerEmail = order.customerEmail?.trim();
      const subject = `Pedido pagado #${order.id.slice(0, 8)} — YerbaXanaes`;
      const bodyText = this.buildPaidEmailText(order);
      const bodyHtml = this.buildPaidEmailHtml(order);

      const sends: Promise<void>[] = [];

      if (ownerEmail) {
        sends.push(
          this.sendEmail({
            to: ownerEmail,
            subject: `[YerbaXanaes] ${subject}`,
            text: bodyText,
            html: bodyHtml,
          }),
        );
      } else {
        this.logger.warn(
          'ORDER_NOTIFY_EMAIL / notificationEmail no configurado — no se avisa a la dueña',
        );
      }

      if (customerEmail && customerEmail.includes('@')) {
        sends.push(
          this.sendEmail({
            to: customerEmail,
            subject: `¡Gracias por tu compra! #${order.id.slice(0, 8)} — YerbaXanaes`,
            text: this.buildCustomerPaidText(order),
            html: this.buildCustomerPaidHtml(order),
          }),
        );
      }

      await Promise.allSettled(sends);
      this.logger.log(`Notificaciones PAID enviadas para orden ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Error notificando orden ${orderId} (fail-open, orden sigue PAID)`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async resolveOwnerEmail(): Promise<string | null> {
    const fromEnv = this.config.get<string>('ORDER_NOTIFY_EMAIL')?.trim();
    if (fromEnv) return fromEnv;

    try {
      const settings = await this.prisma.storeSettings.findUnique({
        where: { id: 'singleton' },
        select: { notificationEmail: true, email: true },
      });
      const candidate =
        settings?.notificationEmail?.trim() || settings?.email?.trim();
      return candidate || null;
    } catch {
      return null;
    }
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from =
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      'YerbaXanaes <onboarding@resend.dev>';

    if (!resendKey) {
      // Dev / sin proveedor: log estructurado (no es error)
      this.logger.log({
        event: 'email_skipped_no_provider',
        to: params.to,
        subject: params.subject,
        hint: 'Configurá RESEND_API_KEY + EMAIL_FROM para envío real',
      });
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Resend HTTP ${response.status}: ${detail.slice(0, 300)}`,
      );
    }
  }

  private buildPaidEmailText(order: {
    id: string;
    total: unknown;
    customerName: string | null;
    customerEmail: string;
    customerPhone: string | null;
    deliveryType: string | null;
    shippingCity: string | null;
    shippingZip: string | null;
    items: Array<{
      quantity: number;
      price: unknown;
      variant: { name: string; product: { name: string } };
    }>;
  }): string {
    const lines = order.items.map(
      (i) =>
        `- ${i.quantity}x ${i.variant.product.name} (${i.variant.name}) — $${Number(i.price).toFixed(2)}`,
    );
    return [
      'Nuevo pedido PAGADO en YerbaXanaes',
      '',
      `Orden: ${order.id}`,
      `Cliente: ${order.customerName || '—'}`,
      `Email: ${order.customerEmail}`,
      `Tel: ${order.customerPhone || '—'}`,
      `Total: $${Number(order.total).toFixed(2)} ARS`,
      `Entrega: ${order.deliveryType || '—'} ${order.shippingCity || ''} ${order.shippingZip || ''}`,
      '',
      'Items:',
      ...lines,
      '',
      'Revisá el pedido en el backoffice → Órdenes.',
    ].join('\n');
  }

  private buildPaidEmailHtml(order: {
    id: string;
    total: unknown;
    customerName: string | null;
    customerEmail: string;
    customerPhone: string | null;
    deliveryType: string | null;
    shippingCity: string | null;
    shippingZip: string | null;
    items: Array<{
      quantity: number;
      price: unknown;
      variant: { name: string; product: { name: string } };
    }>;
  }): string {
    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:6px 0">${i.quantity}× ${escapeHtml(i.variant.product.name)} (${escapeHtml(i.variant.name)})</td><td style="text-align:right">$${Number(i.price).toFixed(2)}</td></tr>`,
      )
      .join('');
    return `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1c1917">
        <h1 style="color:#4a7c3d;font-size:20px">Pedido pagado</h1>
        <p><strong>Orden:</strong> ${escapeHtml(order.id)}</p>
        <p><strong>Cliente:</strong> ${escapeHtml(order.customerName || '—')}<br/>
        <strong>Email:</strong> ${escapeHtml(order.customerEmail)}<br/>
        <strong>Tel:</strong> ${escapeHtml(order.customerPhone || '—')}</p>
        <p><strong>Total:</strong> $${Number(order.total).toFixed(2)} ARS</p>
        <p><strong>Entrega:</strong> ${escapeHtml(order.deliveryType || '—')}
        ${escapeHtml(order.shippingCity || '')} ${escapeHtml(order.shippingZip || '')}</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <p style="margin-top:24px;color:#57534e;font-size:14px">Abrí el backoffice → Órdenes para despachar.</p>
      </div>`;
  }

  private buildCustomerPaidText(order: {
    id: string;
    total: unknown;
    customerName: string | null;
  }): string {
    return [
      `¡Hola${order.customerName ? ` ${order.customerName}` : ''}!`,
      '',
      'Recibimos el pago de tu pedido en YerbaXanaes.',
      `Número de orden: ${order.id}`,
      `Total: $${Number(order.total).toFixed(2)} ARS`,
      '',
      'Te vamos a avisar cuando despachemos. ¡Gracias por tu compra!',
      '',
      'YerbaXanaes — Villa del Rosario, Córdoba',
    ].join('\n');
  }

  private buildCustomerPaidHtml(order: {
    id: string;
    total: unknown;
    customerName: string | null;
  }): string {
    const name = order.customerName
      ? escapeHtml(order.customerName)
      : 'mate';
    return `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1c1917">
        <h1 style="color:#4a7c3d;font-size:22px">¡Gracias por tu compra!</h1>
        <p>Hola ${name},</p>
        <p>Confirmamos el pago de tu pedido <strong>#${escapeHtml(order.id.slice(0, 8))}</strong>.</p>
        <p><strong>Total:</strong> $${Number(order.total).toFixed(2)} ARS</p>
        <p>Te contactamos cuando despachemos. Cualquier duda escribinos por WhatsApp.</p>
        <p style="color:#57534e;font-size:14px">YerbaXanaes · Villa del Rosario, Córdoba</p>
      </div>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
