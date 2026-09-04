import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryReservationService } from '../inventory/inventory-reservation.service';

/**
 * TESTS UNITARIOS: OrdersService - liberacion de stock en transiciones manuales
 *
 * El backoffice puede llevar una orden ya pagada a CANCELLED, REFUNDED o
 * REJECTED, y puede borrarla. Todos esos caminos tienen que devolver la
 * mercaderia al inventario; el resto de las transiciones no.
 */
describe('OrdersService - liberacion de stock', () => {
  let service: OrdersService;
  let prismaService: any;
  let reservation: { reserve: jest.Mock; release: jest.Mock };

  /** El cliente de transaccion que ve el callback de `$transaction`. */
  const buildMockTx = (order: Record<string, any> | null) => ({
    $queryRaw: jest.fn().mockResolvedValue(null),
    order: {
      findUnique: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue({ id: order?.id }),
    },
    orderStateChange: {
      create: jest.fn().mockResolvedValue({}),
    },
  });

  /** Deja lista la orden que el service va a encontrar dentro y fuera de la tx. */
  const givenOrder = (order: Record<string, any>) => {
    const tx = buildMockTx(order);
    prismaService.order.findUnique.mockResolvedValue(order);
    prismaService.$transaction.mockImplementation(async (fn: any) => fn(tx));
    return tx;
  };

  const paidOrder = (id: string) => ({
    id,
    status: OrderStatus.PAID,
    deletedAt: null,
    manualOverrideAt: null,
    stockReleasedAt: null,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            order: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CouponsService,
          useValue: { validate: jest.fn(), applyToOrder: jest.fn() },
        },
        {
          provide: PaymentsService,
          useValue: {
            cancelPendingOrderWithStockRestore: jest
              .fn()
              .mockResolvedValue(true),
          },
        },
        {
          provide: NotificationsService,
          useValue: { notifyOrderPaidIfNeeded: jest.fn() },
        },
        {
          provide: InventoryReservationService,
          useValue: {
            reserve: jest.fn(),
            release: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get(PrismaService);
    reservation = module.get(InventoryReservationService);
  });

  describe('update', () => {
    it('devuelve el stock al cancelar una orden ya pagada', async () => {
      givenOrder(paidOrder('order-1'));

      await service.update('order-1', { status: 'CANCELLED' });

      expect(reservation.release).toHaveBeenCalledWith(
        expect.anything(),
        'order-1',
        'CANCELLED',
      );
    });

    it('devuelve el stock al reembolsar', async () => {
      givenOrder(paidOrder('order-2'));

      await service.update('order-2', { status: 'REFUNDED' });

      expect(reservation.release).toHaveBeenCalledWith(
        expect.anything(),
        'order-2',
        'REFUNDED',
      );
    });

    it('devuelve el stock al marcar la orden como rechazada', async () => {
      givenOrder(paidOrder('order-3'));

      await service.update('order-3', { status: 'REJECTED' });

      expect(reservation.release).toHaveBeenCalled();
    });

    it('no devuelve stock al pasar de pagada a enviada', async () => {
      givenOrder(paidOrder('order-4'));

      await service.update('order-4', { status: 'SHIPPED' });

      expect(reservation.release).not.toHaveBeenCalled();
    });

    it('no devuelve stock cuando solo se edita la nota', async () => {
      givenOrder(paidOrder('order-5'));

      await service.update('order-5', { note: 'Llamar antes de entregar' });

      expect(reservation.release).not.toHaveBeenCalled();
    });

    it('audita el cambio de estado en OrderStateChange', async () => {
      const tx = givenOrder(paidOrder('order-6'));

      await service.update('order-6', { status: 'REFUNDED' });

      expect(tx.orderStateChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-6',
          fromStatus: OrderStatus.PAID,
          toStatus: OrderStatus.REFUNDED,
          source: 'MANUAL_OVERRIDE',
        }),
      });
    });

    it('sigue delegando en payments la cancelacion de una orden pendiente', async () => {
      givenOrder({
        id: 'order-7',
        status: OrderStatus.PENDING,
        deletedAt: null,
        manualOverrideAt: null,
        stockReleasedAt: null,
      });
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);

      await service.update('order-7', { status: 'CANCELLED' });

      // Ese camino ya libera stock adentro de payments; no debe hacerlo dos veces.
      expect(reservation.release).not.toHaveBeenCalled();
    });

    it('falla si la orden desaparece entre la lectura y la transaccion', async () => {
      prismaService.order.findUnique.mockResolvedValue(paidOrder('order-8'));
      const tx = buildMockTx(null);
      prismaService.$transaction.mockImplementation(async (fn: any) => fn(tx));

      await expect(
        service.update('order-8', { status: 'REFUNDED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('devuelve el stock antes de marcar la orden como eliminada', async () => {
      const tx = givenOrder(paidOrder('order-9'));

      await service.remove('order-9');

      expect(reservation.release).toHaveBeenCalledWith(
        expect.anything(),
        'order-9',
        'ORDER_DELETED',
      );
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-9' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('no vuelve a devolver stock si la orden ya estaba eliminada', async () => {
      givenOrder({
        id: 'order-10',
        status: OrderStatus.CANCELLED,
        deletedAt: new Date(),
        stockReleasedAt: new Date(),
      });

      await service.remove('order-10');

      expect(reservation.release).not.toHaveBeenCalled();
    });
  });
});
