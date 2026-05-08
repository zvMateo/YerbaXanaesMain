import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PaymentsSyncService } from './payments-sync.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TESTS UNITARIOS: PaymentsSyncService
 *
 * Cubre:
 * 1. mapMercadoPagoStatus() — 9 estados MP + estado desconocido
 * 2. updateOrderStatusWithAudit() — idempotencia, override protection, audit trail
 * 3. manuallyOverrideOrderStatus() — delega correctamente a updateOrderStatusWithAudit
 * 4. reconcileOrdersWithMercadoPago() — skip override manual, sincroniza diferencias, métricas
 * 5. getOrderStateHistory() — retorna historial ordenado
 */
describe('PaymentsSyncService - Unit Tests', () => {
  let service: PaymentsSyncService;
  let prismaService: jest.Mocked<PrismaService>;

  const buildMockTx = (orderOverrides: Record<string, any> = {}) => ({
    $queryRaw: jest.fn().mockResolvedValue(null),
    order: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
        manualOverrideAt: null,
        deletedAt: null,
        ...orderOverrides,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    orderStateChange: {
      create: jest.fn().mockResolvedValue({}),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsSyncService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            order: { findMany: jest.fn(), findUnique: jest.fn() },
            orderStateChange: { findMany: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                MP_ACCESS_TOKEN: 'test-token',
                MP_RECONCILIATION_INTERVAL_MINUTES: '5',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsSyncService>(PaymentsSyncService);
    prismaService = module.get(PrismaService);

    // Evitar que onModuleInit arrange intervals en los tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // mapMercadoPagoStatus()
  // ─────────────────────────────────────────────────────────────
  describe('mapMercadoPagoStatus()', () => {
    it.each([
      ['processed', OrderStatus.PAID],
      ['pending', OrderStatus.PENDING],
      ['in_process', OrderStatus.PENDING],
      ['authorized', OrderStatus.PENDING],
      ['rejected', OrderStatus.CANCELLED],
      ['cancelled', OrderStatus.CANCELLED],
      ['closed', OrderStatus.CANCELLED],
      ['expired', OrderStatus.CANCELLED],
      ['refunded', OrderStatus.REFUNDED],
    ])('"%s" → %s', (mpStatus, expected) => {
      expect(service.mapMercadoPagoStatus(mpStatus)).toBe(expected);
    });

    it('estado desconocido → null (no crashea)', () => {
      expect(service.mapMercadoPagoStatus('unknown_state')).toBeNull();
    });

    it('es case-insensitive', () => {
      expect(service.mapMercadoPagoStatus('PROCESSED')).toBe(OrderStatus.PAID);
      expect(service.mapMercadoPagoStatus('Rejected')).toBe(
        OrderStatus.CANCELLED,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateOrderStatusWithAudit()
  // ─────────────────────────────────────────────────────────────
  describe('updateOrderStatusWithAudit()', () => {
    it('retorna false si la orden no existe', async () => {
      const mockTx = buildMockTx();
      mockTx.order.findUnique.mockResolvedValue(null);

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.updateOrderStatusWithAudit({
        orderId: 'nonexistent',
        newStatus: OrderStatus.PAID,
        source: 'WEBHOOK_MERCADOPAGO',
      });

      expect(result).toBe(false);
      expect(mockTx.order.update).not.toHaveBeenCalled();
      expect(mockTx.orderStateChange.create).not.toHaveBeenCalled();
    });

    it('retorna false si la orden tiene deletedAt (soft delete)', async () => {
      const mockTx = buildMockTx({ deletedAt: new Date() });

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.updateOrderStatusWithAudit({
        orderId: 'order-1',
        newStatus: OrderStatus.PAID,
        source: 'WEBHOOK_MERCADOPAGO',
      });

      expect(result).toBe(false);
    });

    it('IDEMPOTENCIA: retorna false si la orden ya tiene el estado target', async () => {
      const mockTx = buildMockTx({ status: OrderStatus.PAID });

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.updateOrderStatusWithAudit({
        orderId: 'order-1',
        newStatus: OrderStatus.PAID, // Mismo estado
        source: 'WEBHOOK_MERCADOPAGO',
      });

      expect(result).toBe(false);
      expect(mockTx.order.update).not.toHaveBeenCalled();
    });

    it('MANUAL OVERRIDE PROTECTION: webhook ignorado si existe manualOverrideAt', async () => {
      const mockTx = buildMockTx({
        status: OrderStatus.CANCELLED,
        manualOverrideAt: new Date(),
      });

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.updateOrderStatusWithAudit({
        orderId: 'order-1',
        newStatus: OrderStatus.PAID, // Webhook quiere cambiar a PAID
        source: 'WEBHOOK_MERCADOPAGO',
      });

      expect(result).toBe(false);
      expect(mockTx.order.update).not.toHaveBeenCalled();
    });

    it('actualización exitosa: actualiza estado y crea registro de auditoría', async () => {
      const mockTx = buildMockTx({ status: OrderStatus.PENDING });

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.updateOrderStatusWithAudit({
        orderId: 'order-1',
        newStatus: OrderStatus.PAID,
        source: 'WEBHOOK_MERCADOPAGO',
        mpPaymentId: 'mp-payment-123',
        mpRawStatus: 'processed',
      });

      expect(result).toBe(true);
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: OrderStatus.PAID }),
        }),
      );
      expect(mockTx.orderStateChange.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PAID,
            source: 'WEBHOOK_MERCADOPAGO',
            mpPaymentId: 'mp-payment-123',
          }),
        }),
      );
    });

    it('MANUAL_OVERRIDE: setea manualOverrideAt y manualOverrideReason', async () => {
      const mockTx = buildMockTx({ status: OrderStatus.PENDING });

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => fn(mockTx));

      await service.updateOrderStatusWithAudit({
        orderId: 'order-1',
        newStatus: OrderStatus.REJECTED,
        source: 'MANUAL_OVERRIDE',
        changedByEmail: 'admin@yerba.com',
        reason: 'Cliente canceló por teléfono',
      });

      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            manualOverrideAt: expect.any(Date),
            manualOverrideReason: 'Cliente canceló por teléfono',
          }),
        }),
      );
      expect(mockTx.orderStateChange.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'MANUAL_OVERRIDE',
            changedByEmail: 'admin@yerba.com',
            reason: 'Cliente canceló por teléfono',
          }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // manuallyOverrideOrderStatus()
  // ─────────────────────────────────────────────────────────────
  describe('manuallyOverrideOrderStatus()', () => {
    it('delega a updateOrderStatusWithAudit con source=MANUAL_OVERRIDE', async () => {
      const spy = jest
        .spyOn(service, 'updateOrderStatusWithAudit')
        .mockResolvedValue(true);

      const result = await service.manuallyOverrideOrderStatus(
        'order-1',
        OrderStatus.REJECTED,
        'admin@yerba.com',
        'Fraude detectado',
      );

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith({
        orderId: 'order-1',
        newStatus: OrderStatus.REJECTED,
        source: 'MANUAL_OVERRIDE',
        reason: 'Fraude detectado',
        changedByEmail: 'admin@yerba.com',
        notes: 'Manual override desde backoffice por admin@yerba.com',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // reconcileOrdersWithMercadoPago()
  // ─────────────────────────────────────────────────────────────
  describe('reconcileOrdersWithMercadoPago()', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('aborta y retorna 0s si MP_ACCESS_TOKEN no está configurado', async () => {
      // Reemplazar el ConfigService para este test
      const configGet = jest
        .spyOn((service as any).config, 'get')
        .mockReturnValue(undefined);

      const result = await service.reconcileOrdersWithMercadoPago();

      expect(result).toEqual({ reconciled: 0, updated: 0, errors: 0 });
      expect(global.fetch).not.toHaveBeenCalled();

      configGet.mockRestore();
    });

    it('omite órdenes con manualOverrideAt (respeta backoffice)', async () => {
      const manualOverrideOrder = {
        id: 'order-manual',
        status: OrderStatus.PENDING,
        mpPaymentId: 'mp-1',
        manualOverrideAt: new Date(), // ← tiene override
      };

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValue([manualOverrideOrder] as any);

      const result = await service.reconcileOrdersWithMercadoPago();

      expect(global.fetch).not.toHaveBeenCalled(); // Nunca consulta MP para esa orden
      expect(result).toEqual({ reconciled: 0, updated: 0, errors: 0 });
    });

    it('actualiza órdenes donde el estado de MP difiere del local', async () => {
      const pendingOrder = {
        id: 'order-pending',
        status: OrderStatus.PENDING,
        mpPaymentId: 'mp-456',
        manualOverrideAt: null,
      };

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValue([pendingOrder] as any);

      // MP dice que el pago está PAID (processed)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'processed',
          status_detail: 'accredited',
        }),
      });

      const updateSpy = jest
        .spyOn(service, 'updateOrderStatusWithAudit')
        .mockResolvedValue(true);

      const result = await service.reconcileOrdersWithMercadoPago();

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-pending',
          newStatus: OrderStatus.PAID,
          source: 'RECONCILIATION',
          mpPaymentId: 'mp-456',
        }),
      );
      expect(result).toEqual({ reconciled: 1, updated: 1, errors: 0 });
    });

    it('no actualiza si el estado de MP coincide con el local', async () => {
      const paidOrder = {
        id: 'order-already-paid',
        status: OrderStatus.PENDING,
        mpPaymentId: 'mp-789',
        manualOverrideAt: null,
      };

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValue([paidOrder] as any);

      // MP también dice pending
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          status: 'pending',
          status_detail: 'waiting_transfer',
        }),
      });

      const updateSpy = jest
        .spyOn(service, 'updateOrderStatusWithAudit')
        .mockResolvedValue(true);

      const result = await service.reconcileOrdersWithMercadoPago();

      expect(updateSpy).not.toHaveBeenCalled(); // Mismo estado, no actualiza
      expect(result).toEqual({ reconciled: 1, updated: 0, errors: 0 });
    });

    it('cuenta errors si fetch de MP falla', async () => {
      const pendingOrder = {
        id: 'order-error',
        status: OrderStatus.PENDING,
        mpPaymentId: 'mp-err',
        manualOverrideAt: null,
      };

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValue([pendingOrder] as any);

      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await service.reconcileOrdersWithMercadoPago();

      expect(result).toEqual({ reconciled: 0, updated: 0, errors: 1 });
    });

    it('cuenta errors si MP responde con status no-ok', async () => {
      const pendingOrder = {
        id: 'order-404',
        status: OrderStatus.PENDING,
        mpPaymentId: 'mp-notfound',
        manualOverrideAt: null,
      };

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValue([pendingOrder] as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false, // 404 o 500 de MP
      });

      const result = await service.reconcileOrdersWithMercadoPago();

      expect(result).toEqual({ reconciled: 0, updated: 0, errors: 1 });
    });

    it('mezcla correctamente reconciled/updated/errors con múltiples órdenes', async () => {
      const orders = [
        {
          id: 'order-a',
          status: OrderStatus.PENDING,
          mpPaymentId: 'mp-a',
          manualOverrideAt: null,
        },
        {
          id: 'order-b',
          status: OrderStatus.PENDING,
          mpPaymentId: 'mp-b',
          manualOverrideAt: null,
        },
        {
          id: 'order-c',
          status: OrderStatus.PENDING,
          mpPaymentId: 'mp-c',
          manualOverrideAt: new Date(), // Skip por override
        },
      ];

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValue(orders as any);

      let fetchCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        fetchCount++;
        if (fetchCount === 1) {
          // order-a: MP dice PAID → actualiza
          return Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ status: 'processed' }),
          });
        }
        // order-b: fetch error
        return Promise.reject(new Error('Timeout'));
      });

      jest.spyOn(service, 'updateOrderStatusWithAudit').mockResolvedValue(true);

      const result = await service.reconcileOrdersWithMercadoPago();

      // order-c skipped (manualOverride), order-a reconciled+updated, order-b error
      expect(result).toEqual({ reconciled: 1, updated: 1, errors: 1 });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getOrderStateHistory()
  // ─────────────────────────────────────────────────────────────
  describe('getOrderStateHistory()', () => {
    it('retorna historial ordenado por createdAt asc', async () => {
      const mockHistory = [
        {
          id: 'change-1',
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PAID,
          source: 'WEBHOOK_MERCADOPAGO',
          reason: null,
          changedByEmail: null,
          createdAt: new Date('2026-04-10T10:00:00Z'),
        },
        {
          id: 'change-2',
          fromStatus: OrderStatus.PAID,
          toStatus: OrderStatus.REJECTED,
          source: 'MANUAL_OVERRIDE',
          reason: 'Fraude',
          changedByEmail: 'admin@yerba.com',
          createdAt: new Date('2026-04-10T11:00:00Z'),
        },
      ];

      jest
        .spyOn(prismaService.orderStateChange, 'findMany')
        .mockResolvedValue(mockHistory as any);

      const result = await service.getOrderStateHistory('order-1');

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('WEBHOOK_MERCADOPAGO');
      expect(result[1].source).toBe('MANUAL_OVERRIDE');
      expect(result[1].changedByEmail).toBe('admin@yerba.com');
      expect(prismaService.orderStateChange.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1' },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('retorna array vacío si no hay historial', async () => {
      jest
        .spyOn(prismaService.orderStateChange, 'findMany')
        .mockResolvedValue([]);

      const result = await service.getOrderStateHistory('order-sin-historial');

      expect(result).toEqual([]);
    });
  });
});
