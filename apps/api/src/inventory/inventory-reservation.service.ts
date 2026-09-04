import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Línea de orden con el precio congelado al momento de reservar. */
export interface ReservedLine {
  variantId: string;
  quantity: number;
  price: number;
}

/**
 * Único lugar donde el inventario se reserva y se libera.
 *
 * El stock de una variante puede venir de dos lados: de su propia columna
 * `stock`, o de los `InventoryItem` que consume su receta. Antes cada camino
 * que cancelaba una orden reimplementaba esa distinción, y algunos ni
 * devolvían el stock. Acá vive una sola vez, en las dos direcciones.
 *
 * Ambos métodos reciben el `TransactionClient`: quien llama abre la
 * transacción, porque reservar o liberar siempre acompaña otra escritura
 * (crear la orden, cambiarle el estado) que tiene que ser atómica con esto.
 */
@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  /**
   * Descuenta el inventario de cada línea y devuelve el snapshot de precios
   * para persistir en la orden.
   *
   * No recibe `orderId` porque la reserva ocurre antes de que la orden exista:
   * si el stock no alcanza, no hay orden que crear.
   */
  async reserve(
    tx: Prisma.TransactionClient,
    items: { variantId: string; quantity: number }[],
  ): Promise<ReservedLine[]> {
    const lines: ReservedLine[] = [];

    for (const item of items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: {
          ingredients: { include: { inventoryItem: true } },
          product: { select: { name: true } },
        },
      });

      if (!variant) {
        throw new BadRequestException(
          `Variante ${item.variantId} no encontrada`,
        );
      }

      lines.push({
        variantId: item.variantId,
        quantity: item.quantity,
        price: Number(variant.price),
      });

      if (variant.ingredients.length > 0) {
        for (const ingredient of variant.ingredients) {
          const needed = ingredient.quantityRequired * item.quantity;

          // FOR UPDATE: bloquea la fila hasta que termine la transacción, para
          // que dos checkouts simultáneos no lean el mismo stock disponible.
          await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${ingredient.inventoryItemId} FOR UPDATE`;
          const locked = await tx.inventoryItem.findUnique({
            where: { id: ingredient.inventoryItemId },
          });

          if (!locked || locked.currentStock < needed) {
            throw new BadRequestException(
              `Stock insuficiente de '${ingredient.inventoryItem.name}'.`,
            );
          }

          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: { currentStock: { decrement: needed } },
          });
        }
        continue;
      }

      await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variant.id} FOR UPDATE`;
      const lockedVariant = await tx.productVariant.findUnique({
        where: { id: variant.id },
      });

      if ((lockedVariant?.stock ?? 0) < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente de '${variant.product.name}'.`,
        );
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return lines;
  }

  /**
   * Devuelve al inventario el stock que la orden tenía reservado.
   *
   * Es idempotente: `stockReleasedAt` marca que ya se devolvió, así que
   * cancelar dos veces (webhook y cleanup pisándose, o un reintento) no
   * duplica la devolución. Devuelve `false` cuando no hizo nada.
   *
   * No escribe `OrderStateChange`: el cambio de estado lo hace y lo audita
   * quien llama, y duplicar la fila de auditoría ensucia el historial.
   */
  async release(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
  ): Promise<boolean> {
    // El lock va antes de la lectura: sin él, dos liberaciones concurrentes
    // leen ambas stockReleasedAt en null y devuelven el stock dos veces.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        stockReleasedAt: true,
        items: { select: { variantId: true, quantity: true } },
      },
    });

    if (!order) {
      this.logger.warn(`release: orden ${orderId} no encontrada`);
      return false;
    }

    if (order.stockReleasedAt) {
      this.logger.log(
        `release: orden ${orderId} ya había devuelto stock, se ignora (${reason})`,
      );
      return false;
    }

    for (const item of order.items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { ingredients: true },
      });

      // Variante borrada después de la venta: no hay a dónde devolver.
      if (!variant) {
        this.logger.warn(
          `release: variante ${item.variantId} de la orden ${orderId} ya no existe`,
        );
        continue;
      }

      if (variant.ingredients.length > 0) {
        for (const ingredient of variant.ingredients) {
          await tx.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: {
              currentStock: {
                increment: ingredient.quantityRequired * item.quantity,
              },
            },
          });
        }
        continue;
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { increment: item.quantity } },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { stockReleasedAt: new Date() },
    });

    this.logger.log(
      `release: stock devuelto de la orden ${orderId} (${reason})`,
    );
    return true;
  }
}
