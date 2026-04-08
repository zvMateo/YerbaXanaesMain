import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrderStatus, PaymentProvider } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
  ) {}

  async create(dto: CreateOrderDto) {
    // Validar cupón ANTES de la transacción (lectura externa segura)
    // La validación final se hace dentro de la tx para evitar race conditions
    let couponValidation: Awaited<
      ReturnType<CouponsService['validate']>
    > | null = null;
    if (dto.couponCode) {
      // We'll get the amount after calculating; use a placeholder — re-validate inside tx
      // For now just check the coupon exists & is active
      await this.coupons.validate(dto.couponCode, 0).catch((e) => {
        // If it fails due to amount, ignore (we check again inside tx with real amount)
        if (!e.message?.includes('Monto mínimo')) throw e;
      });
    }

    // -------------------------------------------------------------
    // TRANSACCIÓN: Asegura consistencia de Stock
    // -------------------------------------------------------------
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: any[] = [];

      // 1. Validar Stock y Calcular Precios
      for (const item of dto.items) {
        // Buscamos la variante con sus ingredientes
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
            product: true, // Para obtener el nombre del producto si falla
          },
        });

        if (!variant) {
          throw new NotFoundException(
            `Variante ID ${item.variantId} no encontrada`,
          );
        }

        const lineTotal = Number(variant.price) * item.quantity;
        totalAmount += lineTotal;

        // Preparamos el item para guardar (Snapshot de precio)
        orderItemsData.push({
          variantId: item.variantId,
          quantity: item.quantity,
          price: variant.price, // Guardamos el precio al momento de la compra
        });

        // 2. DESCONTAR STOCK (La Lógica de Receta)
        if (variant.ingredients && variant.ingredients.length > 0) {
          for (const ingredient of variant.ingredients) {
            // Cuánto necesitamos en total (ej: 2 paquetes * 500g = 1000g)
            const totalQuantityNeeded =
              ingredient.quantityRequired * item.quantity;

            // SELECT FOR UPDATE: bloquea la fila hasta que la transacción termine
            // Previene race conditions cuando dos pedidos compiten por el mismo stock
            await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${ingredient.inventoryItemId} FOR UPDATE`;
            const lockedItem = await tx.inventoryItem.findUnique({
              where: { id: ingredient.inventoryItemId },
            });
            const currentStock = lockedItem!.currentStock;

            if (currentStock < totalQuantityNeeded) {
              throw new BadRequestException(
                `Stock insuficiente de insumo '${ingredient.inventoryItem.name}' para el producto '${variant.product.name} - ${variant.name}'. Necesitas ${totalQuantityNeeded}, hay ${currentStock}.`,
              );
            }

            // Restamos del inventario
            await tx.inventoryItem.update({
              where: { id: ingredient.inventoryItemId },
              data: {
                currentStock: { decrement: totalQuantityNeeded },
              },
            });
          }
        } else {
          // Si es un producto simple (sin receta), descontamos su stock directo
          // SELECT FOR UPDATE: bloquea la fila de la variante
          await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variant.id} FOR UPDATE`;
          const lockedVariant = await tx.productVariant.findUnique({
            where: { id: variant.id },
          });
          const currentVariantStock = lockedVariant!.stock || 0;

          if (currentVariantStock < item.quantity) {
            throw new BadRequestException(
              `Stock insuficiente de variante '${variant.product.name} - ${variant.name}'`,
            );
          }

          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // 3. Crear la Orden Final
      // Mapeamos el payment method del DTO (si existe) al Provider de DB
      const paymentMethodStr = (dto.paymentMethod as any)?.toString();
      const paymentProvider =
        paymentMethodStr === 'CASH'
          ? PaymentProvider.CASH
          : paymentMethodStr === 'TRANSFER'
            ? PaymentProvider.TRANSFER
            : PaymentProvider.MERCADOPAGO;

      // El type de channel puede venir como enum o string, validamos si existe
      // Prisma lo acepta casteado a cualquier tipo dentro del enum
      const salesChannel = dto.channel as any;

      // Total con envío incluido
      const shippingCost = dto.shippingCost ? Number(dto.shippingCost) : 0;
      const subtotalWithShipping = totalAmount + shippingCost;

      // Aplicar cupón si viene en el DTO
      if (dto.couponCode) {
        couponValidation = await this.coupons.validate(
          dto.couponCode,
          subtotalWithShipping,
        );
      }

      const discount = couponValidation?.discountAmount ?? 0;
      const totalWithShipping = Math.max(0, subtotalWithShipping - discount);

      const order = await tx.order.create({
        data: {
          userId: dto.userId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail || dto.customerPhone || 'anonimo',
          customerPhone: dto.customerPhone,
          channel: salesChannel ?? 'ONLINE',
          notes: dto.notes,
          paymentProvider: paymentProvider,
          status: OrderStatus.PENDING,
          total: totalWithShipping,
          // Datos de entrega
          deliveryType: dto.deliveryType || 'pickup',
          shippingAddress: dto.shippingAddress,
          shippingCity: dto.shippingCity,
          shippingProvinceCode: dto.shippingProvinceCode,
          shippingZip: dto.shippingZip,
          shippingCost: shippingCost > 0 ? shippingCost : null,
          shippingProvider: dto.shippingProvider,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      // Registrar descuento e incrementar usos del cupón
      if (couponValidation) {
        await this.coupons.applyToOrder(
          tx,
          order.id,
          couponValidation.couponId,
          couponValidation.discountAmount,
        );
      }

      return order;
    });
  }

  findAll() {
    return this.prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        user: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        user: true,
      },
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    // Extraemos campos que NO queremos actualizar directamente o que requieren lógica especial
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { items, userId, ...data } = updateOrderDto;

    return this.prisma.order.update({
      where: { id },
      data: data,
    });
  }

  remove(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // -------------------------------------------------------------
  // VALIDACIÓN: Verifica stock disponible SIN crear la orden
  // Usado antes del checkout para mostrar errores al usuario
  // -------------------------------------------------------------
  async validateStock(items: { variantId: string; quantity: number }[]) {
    const results = await Promise.all(
      items.map(async (item) => {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            product: { select: { name: true } },
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        });

        if (!variant) {
          return {
            variantId: item.variantId,
            valid: false,
            productName: 'Producto no encontrado',
            requested: item.quantity,
            available: 0,
            error: 'Producto no encontrado',
          };
        }

        // Si tiene receta (ingredientes), calculamos stock máximo posible
        if (variant.ingredients && variant.ingredients.length > 0) {
          // Stock máximo = cuántas unidades podemos hacer con el inventario actual
          let maxUnitsPossible = Infinity;

          for (const ingredient of variant.ingredients) {
            const unitsFromThisIngredient = Math.floor(
              ingredient.inventoryItem.currentStock /
                ingredient.quantityRequired,
            );
            maxUnitsPossible = Math.min(
              maxUnitsPossible,
              unitsFromThisIngredient,
            );
          }

          const hasStock = maxUnitsPossible >= item.quantity;

          return {
            variantId: item.variantId,
            productName: variant.product.name,
            variantName: variant.name,
            valid: hasStock,
            requested: item.quantity,
            available: maxUnitsPossible,
            error: hasStock
              ? null
              : `Solo podemos elaborar ${maxUnitsPossible} unidades`,
            isVirtualStock: true,
          };
        } else {
          // Stock directo
          const hasStock = (variant.stock || 0) >= item.quantity;

          return {
            variantId: item.variantId,
            productName: variant.product.name,
            variantName: variant.name,
            valid: hasStock,
            requested: item.quantity,
            available: variant.stock || 0,
            error: hasStock ? null : `Stock insuficiente`,
            isVirtualStock: false,
          };
        }
      }),
    );

    const allValid = results.every((r) => r.valid);
    const invalidItems = results.filter((r) => !r.valid);

    return {
      valid: allValid,
      items: results,
      errors: invalidItems.map((item) => ({
        product: item.productName,
        variant: item.variantName,
        requested: item.requested,
        available: item.available,
        message: item.error,
      })),
      canProceed: allValid,
    };
  }
}
