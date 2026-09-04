import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryReservationService } from './inventory-reservation.service';

/**
 * Mock del TransactionClient de Prisma. Reserva y liberación siempre corren
 * dentro de una transacción abierta por el llamador.
 */
const buildTx = () => ({
  $queryRaw: jest.fn().mockResolvedValue([]),
  order: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  productVariant: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  inventoryItem: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
});

/** Variante fabricada: cada unidad consume 500g de yerba a granel. */
const variantWithRecipe = {
  id: 'var-500g',
  price: 10000,
  stock: null,
  ingredients: [
    {
      inventoryItemId: 'inv-yerba',
      quantityRequired: 500,
      inventoryItem: {
        id: 'inv-yerba',
        name: 'Yerba Granel',
        currentStock: 10000,
      },
    },
  ],
  product: { name: 'Yerba Xanaes' },
};

/** Variante de reventa: stock propio, sin receta. */
const variantWithOwnStock = {
  id: 'var-mate',
  price: 25000,
  stock: 8,
  ingredients: [],
  product: { name: 'Mate de calabaza' },
};

describe('InventoryReservationService', () => {
  let service: InventoryReservationService;
  let tx: ReturnType<typeof buildTx>;

  beforeEach(async () => {
    tx = buildTx();
    const moduleRef = await Test.createTestingModule({
      providers: [InventoryReservationService],
    }).compile();
    service = moduleRef.get(InventoryReservationService);
  });

  describe('release', () => {
    it('libera el stock de una orden con receta devolviendo la cantidad exacta', async () => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-1',
        stockReleasedAt: null,
        items: [{ variantId: 'var-500g', quantity: 3 }],
      });
      tx.productVariant.findUnique.mockResolvedValue(variantWithRecipe);

      const released = await service.release(
        tx as never,
        'order-1',
        'CANCELLED',
      );

      expect(released).toBe(true);
      expect(tx.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-yerba' },
          data: { currentStock: { increment: 1500 } },
        }),
      );
    });

    it('no libera dos veces la misma orden', async () => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-1',
        stockReleasedAt: new Date(),
        items: [{ variantId: 'var-500g', quantity: 3 }],
      });

      const released = await service.release(
        tx as never,
        'order-1',
        'CANCELLED',
      );

      expect(released).toBe(false);
      expect(tx.inventoryItem.update).not.toHaveBeenCalled();
      expect(tx.productVariant.update).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('libera variantes sin receta devolviendo a variant.stock', async () => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-2',
        stockReleasedAt: null,
        items: [{ variantId: 'var-mate', quantity: 2 }],
      });
      tx.productVariant.findUnique.mockResolvedValue(variantWithOwnStock);

      const released = await service.release(
        tx as never,
        'order-2',
        'REFUNDED',
      );

      expect(released).toBe(true);
      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock: { increment: 2 } } }),
      );
    });

    it('marca stockReleasedAt para que la proxima liberacion sea un no-op', async () => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-3',
        stockReleasedAt: null,
        items: [],
      });

      await service.release(tx as never, 'order-3', 'CANCELLED');

      const patch = tx.order.update.mock.calls[0][0];
      expect(patch.where).toEqual({ id: 'order-3' });
      expect(patch.data.stockReleasedAt).toBeInstanceOf(Date);
    });

    it('bloquea la fila de la orden antes de leerla', async () => {
      tx.order.findUnique.mockResolvedValue({
        id: 'order-4',
        stockReleasedAt: null,
        items: [],
      });

      await service.release(tx as never, 'order-4', 'CANCELLED');

      // Sin el FOR UPDATE, dos cancelaciones concurrentes duplican la devolucion.
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.order.findUnique.mock.invocationCallOrder[0],
      );
    });

    it('devuelve false si la orden no existe', async () => {
      tx.order.findUnique.mockResolvedValue(null);

      const released = await service.release(
        tx as never,
        'fantasma',
        'CANCELLED',
      );

      expect(released).toBe(false);
      expect(tx.order.update).not.toHaveBeenCalled();
    });
  });

  describe('reserve', () => {
    it('descuenta del inventario por cada ingrediente de la receta', async () => {
      tx.productVariant.findUnique.mockResolvedValue(variantWithRecipe);
      tx.inventoryItem.findUnique.mockResolvedValue({
        id: 'inv-yerba',
        currentStock: 10000,
      });

      await service.reserve(tx as never, [
        { variantId: 'var-500g', quantity: 3 },
      ]);

      expect(tx.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-yerba' },
          data: { currentStock: { decrement: 1500 } },
        }),
      );
    });

    it('descuenta de variant.stock cuando no hay receta', async () => {
      tx.productVariant.findUnique.mockResolvedValue(variantWithOwnStock);

      await service.reserve(tx as never, [
        { variantId: 'var-mate', quantity: 2 },
      ]);

      expect(tx.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock: { decrement: 2 } } }),
      );
    });

    it('devuelve el snapshot de precios para persistir en la orden', async () => {
      tx.productVariant.findUnique.mockResolvedValue(variantWithOwnStock);

      const lines = await service.reserve(tx as never, [
        { variantId: 'var-mate', quantity: 2 },
      ]);

      expect(lines).toEqual([
        { variantId: 'var-mate', quantity: 2, price: 25000 },
      ]);
    });

    it('rechaza cuando el inventario no alcanza', async () => {
      tx.productVariant.findUnique.mockResolvedValue(variantWithRecipe);
      tx.inventoryItem.findUnique.mockResolvedValue({
        id: 'inv-yerba',
        currentStock: 400,
      });

      await expect(
        service.reserve(tx as never, [{ variantId: 'var-500g', quantity: 3 }]),
      ).rejects.toThrow(BadRequestException);

      expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    });

    it('rechaza cuando la variante sin receta no tiene stock suficiente', async () => {
      tx.productVariant.findUnique.mockResolvedValue({
        ...variantWithOwnStock,
        stock: 1,
      });

      await expect(
        service.reserve(tx as never, [{ variantId: 'var-mate', quantity: 2 }]),
      ).rejects.toThrow(BadRequestException);

      expect(tx.productVariant.update).not.toHaveBeenCalled();
    });
  });
});
