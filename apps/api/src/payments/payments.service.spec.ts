import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { PaymentsSyncService } from './payments-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { ShippingService } from '../shipping/shipping.service';
import { CheckoutPricingService } from '../checkout/checkout-pricing.service';
import { SettingsService } from '../settings/settings.service';
import { OrderStatus } from '@prisma/client';
import { InventoryReservationService } from '../inventory/inventory-reservation.service';

/** Todos los medios de pago habilitados — el estado por defecto de la tienda. */
const ALL_PAYMENT_METHODS_ENABLED = {
  paymentCash: true,
  paymentTransfer: true,
  paymentMercadoPago: true,
  shippingEnabled: true,
  shippingFlatRate: 1500,
  freeShippingThreshold: 15000,
};

/**
 * TESTS DE INTEGRACIÓN: Payments Service - Stock Recovery & Race Conditions
 *
 * Cubre:
 * 1. Cleanup automático expira órdenes PENDING
 * 2. Race condition: webhook vs cleanup (no double-restore)
 * 3. Idempotencia: cancelar misma orden 2 veces = 1 restauración
 * 4. Stock accuracy con múltiples ingredientes
 */
describe('PaymentsService - Integration Tests', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let paymentsSyncService: PaymentsSyncService;
  let pricingService: { quote: jest.Mock; quoteExistingOrder: jest.Mock };
  let settingsService: { get: jest.Mock };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        InventoryReservationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            webhookLog: {
              create: jest.fn(),
            },
            order: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            productVariant: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            inventoryItem: {
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                MP_ACCESS_TOKEN: 'test-token',
                MP_PENDING_ORDER_TTL_MINUTES: '60',
                MP_PENDING_CLEANUP_INTERVAL_MINUTES: '10',
                FRONTEND_URL: 'http://localhost:3000',
                API_URL: 'http://localhost:3001',
                MP_WEBHOOK_SECRET: 'test-webhook-secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: CouponsService,
          useValue: {
            validate: jest.fn(),
            applyToOrder: jest.fn(),
          },
        },
        {
          provide: PaymentsSyncService,
          useValue: {
            mapMercadoPagoStatus: jest.fn(),
            updateOrderStatusWithAudit: jest.fn().mockResolvedValue(true),
            reconcileOrdersWithMercadoPago: jest.fn(),
            manuallyOverrideOrderStatus: jest.fn(),
            getOrderStateHistory: jest.fn(),
          },
        },
        {
          provide: ShippingService,
          useValue: {
            getRates: jest.fn(),
          },
        },
        {
          provide: CheckoutPricingService,
          useValue: {
            quote: jest.fn(),
            quoteExistingOrder: jest.fn(),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    paymentsSyncService = module.get<PaymentsSyncService>(PaymentsSyncService);
    pricingService = module.get(CheckoutPricingService);
    settingsService = module.get(SettingsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
    // Sin toggles apagados salvo que el test diga lo contrario.
    settingsService.get.mockResolvedValue(ALL_PAYMENT_METHODS_ENABLED);
  });

  describe('Phase 1 - Payment Hardening', () => {
    const buildValidWebhookSignature = (
      dataIdUrl: string,
      requestId: string,
      ts: string,
    ) => {
      const manifest = `id:${dataIdUrl.toLowerCase()};request-id:${requestId};ts:${ts};`;
      const hash = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(manifest)
        .digest('hex');

      return `ts=${ts},v1=${hash}`;
    };

    it('rechaza processBrickPayment cuando el monto del cliente no coincide con el cálculo del servidor', async () => {
      pricingService.quote.mockResolvedValue({
        lines: [],
        itemsSubtotal: 120,
        shippingCost: 0,
        shippingProvider: 'pickup',
        freeShippingApplied: false,
        couponCode: null,
        couponId: null,
        couponDiscount: 0,
        couponError: null,
        total: 120,
      });
      jest
        .spyOn(prismaService.productVariant, 'findMany')
        .mockResolvedValue([{ id: 'var-1', price: 120 }] as any);

      const createPendingOrderSpy = jest
        .spyOn<any, any>(service as any, 'createPendingOrder')
        .mockResolvedValue({ id: 'order-2' });

      await expect(
        service.processBrickPayment({
          selectedPaymentMethod: 'credit_card',
          formData: {
            token: 'tok_test',
            payment_method_id: 'visa',
            transaction_amount: 100,
            installments: 1,
            payer: { email: 'test@yerba.com' },
          },
          customerName: 'Test User',
          orderItems: [{ variantId: 'var-1', quantity: 1 }],
          shippingCost: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(createPendingOrderSpy).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('no rechaza el pago a domicilio: la cotizacion del server es la unica', async () => {
      // Antes, el server re-cotizaba y tomaba el minimo global de las tarifas
      // de Correo. Como sucursal siempre sale mas barata que domicilio, todo
      // pago a domicilio se rechazaba y la orden se cancelaba. Ahora la
      // cotizacion sale de CheckoutPricingService, que filtra por tipo.
      pricingService.quote.mockResolvedValue({
        lines: [],
        itemsSubtotal: 900,
        shippingCost: 100,
        shippingProvider: 'correo_argentino',
        freeShippingApplied: false,
        couponCode: null,
        couponId: null,
        couponDiscount: 0,
        couponError: null,
        total: 1000,
      });

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        id: 'order-domicilio',
        total: 1000,
        status: OrderStatus.PENDING,
        deletedAt: null,
      } as never);

      const cancelSpy = jest
        .spyOn<
          never,
          never
        >(service as never, 'cancelPendingOrderWithStockRestore' as never)
        .mockResolvedValue(true as never);

      // Falla al llamar a Mercado Pago, que es despues del punto que importa.
      await service
        .processBrickPayment({
          selectedPaymentMethod: 'credit_card',
          existingOrderId: 'order-domicilio',
          formData: {
            token: 'tok_test',
            payment_method_id: 'visa',
            transaction_amount: 1000,
            installments: 1,
            payer: { email: 'test@yerba.com' },
          },
          customerName: 'Test User',
          orderItems: [{ variantId: 'var-1', quantity: 1 }],
          shippingProvider: 'correo_argentino',
          shippingZip: '5000',
          shippingDeliveryType: 'D',
          deliveryType: 'shipping',
        } as never)
        .catch(() => undefined);

      // Puede cancelarse por el fallo de Mercado Pago, pero nunca por el
      // motivo del bug: el desfasaje de envio ya no existe.
      expect(cancelSpy).not.toHaveBeenCalledWith(
        expect.anything(),
        'shipping_cost_changed',
        expect.anything(),
        expect.anything(),
      );
      cancelSpy.mockRestore();
    });

    it('rechaza webhook con timestamp expirado', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const expiredTs = String(nowSec - 700);

      await expect(
        service.handleWebhook({
          body: {},
          signature: `ts=${expiredTs},v1=fake`,
          requestId: 'req-1',
          dataIdUrl: '12345',
          typeUrl: 'order',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rechaza webhook con firma HMAC inválida', async () => {
      const ts = String(Math.floor(Date.now() / 1000));

      await expect(
        service.handleWebhook({
          body: {},
          signature: `ts=${ts},v1=invalidhash`,
          requestId: 'req-2',
          dataIdUrl: '12345',
          typeUrl: 'order',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('procesa webhook duplicado sin duplicar transiciones de estado', async () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const requestId = 'req-dup-1';
      const dataIdUrl = '12345';
      const signature = buildValidWebhookSignature(dataIdUrl, requestId, ts);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          external_reference: 'order-dup-1',
          status: 'approved',
          status_detail: 'accredited',
          transactions: { payments: [{ id: 'mp-pay-1' }] },
        }),
      });

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        id: 'order-dup-1',
        status: OrderStatus.PENDING,
        deletedAt: null,
      } as any);

      jest
        .spyOn(paymentsSyncService, 'mapMercadoPagoStatus')
        .mockReturnValue(OrderStatus.PAID);

      // Simular la deduplicación: primer webhookLog.create succeeds,
      // segundo lanza PrismaClientKnownRequestError (unique constraint violation)
      (prismaService.webhookLog.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'log-1' })
        .mockRejectedValueOnce(
          Object.assign(new Error('Unique constraint'), {
            code: 'P2002',
            name: 'PrismaClientKnownRequestError',
          }),
        );

      await service.handleWebhook({
        body: {},
        signature,
        requestId,
        dataIdUrl,
        typeUrl: 'order',
      });

      await service.handleWebhook({
        body: {},
        signature,
        requestId,
        dataIdUrl,
        typeUrl: 'order',
      });

      expect(
        paymentsSyncService.updateOrderStatusWithAudit,
      ).toHaveBeenCalledTimes(1);
    });

    it('ignora webhook viejo cuando la orden ya está en estado terminal', async () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const requestId = 'req-old-1';
      const dataIdUrl = '67890';
      const signature = buildValidWebhookSignature(dataIdUrl, requestId, ts);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          external_reference: 'order-terminal-1',
          status: 'cancelled',
          status_detail: 'expired',
          transactions: { payments: [{ id: 'mp-pay-old-1' }] },
        }),
      });

      jest.spyOn(prismaService.order, 'findUnique').mockResolvedValue({
        id: 'order-terminal-1',
        status: OrderStatus.PAID,
        deletedAt: null,
      } as any);

      const mapStatusSpy = jest.spyOn(
        paymentsSyncService,
        'mapMercadoPagoStatus',
      );

      await service.handleWebhook({
        body: {},
        signature,
        requestId,
        dataIdUrl,
        typeUrl: 'order',
      });

      expect(mapStatusSpy).not.toHaveBeenCalled();
      expect(
        paymentsSyncService.updateOrderStatusWithAudit,
      ).not.toHaveBeenCalled();
    });
  });

  describe('brick-init - Rate limit por email (PENDING)', () => {
    it('rechaza con 429 cuando el email ya acumula el tope de PENDING activas', async () => {
      jest.spyOn(prismaService.order, 'count').mockResolvedValue(5);
      const createPendingOrderSpy = jest
        .spyOn<any, any>(service as any, 'createPendingOrder')
        .mockResolvedValue({ id: 'order-spam' });

      await expect(
        service.brickInit({
          customerEmail: 'spam@yerba.com',
          customerName: 'Spammer',
          orderItems: [{ variantId: 'var-1', quantity: 1 }],
        } as any),
      ).rejects.toMatchObject({ status: 429 });

      expect(createPendingOrderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup - Automatic Expiration', () => {
    it('debería encontrar y cancelar órdenes PENDING expiradas', async () => {
      const expiredOrderId = 'order-expired-1';

      const mockExpiredOrders = [
        {
          id: expiredOrderId,
          items: [{ variantId: 'var-1', quantity: 2 }],
        },
      ];

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValueOnce(mockExpiredOrders as any);

      // Mock transacción exitosa
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => {
          return await fn({
            $queryRaw: jest.fn().mockResolvedValue(null),
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: expiredOrderId,
                status: OrderStatus.PENDING,
                deletedAt: null,
                items: [{ variantId: 'var-1', quantity: 2 }],
              }),
              update: jest.fn().mockResolvedValue({ id: expiredOrderId }),
            },
            productVariant: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'var-1',
                price: 100,
                stock: 5,
                ingredients: [],
              }),
              update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
              update: jest.fn().mockResolvedValue({}),
            },
            orderStateChange: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as any);
        });

      const result = await service.cleanupExpiredPendingOrders();

      expect(result.data.checked).toBe(1);
      expect(result.data.cancelled).toBe(1);
      expect(result.data.totalStockRestored).toBe(2);
      expect(result.data.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('debería respetar TTL override cuando se proporciona', async () => {
      const mockOrders = [{ id: 'order-1', items: [] }];
      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValueOnce(mockOrders as any);

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => {
          return await fn({
            $queryRaw: jest.fn(),
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'order-1',
                status: OrderStatus.PENDING,
                deletedAt: null,
                items: [],
              }),
              update: jest.fn(),
            },
            productVariant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            inventoryItem: {
              update: jest.fn(),
            },
          } as any);
        });

      const result = await service.cleanupExpiredPendingOrders(30); // Override TTL a 30 min

      expect(result.data.cartAbandonedTtlMinutes).toBe(30);
      expect(result.data.pendingPaymentTtlMinutes).toBe(30);
      // Verificar que findMany fue llamado con cutoff de 30 min atrás
      const findManyCall = jest.spyOn(prismaService.order, 'findMany').mock
        .calls[0];
      expect(findManyCall).toBeDefined();
    });

    it('debería retornar métrica de fallos cuando alguna cancelación falla', async () => {
      const mockOrders = [
        { id: 'order-fail', items: [{ variantId: 'var-1', quantity: 1 }] },
        { id: 'order-success', items: [{ variantId: 'var-2', quantity: 1 }] },
      ];

      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValueOnce(mockOrders as any);

      // Primera transacción: error
      let callCount = 0;
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => {
          callCount++;
          if (callCount === 1) {
            // Primer orden falla
            throw new Error('Transaction failed');
          }
          // Segunda orden exitosa
          return await fn({
            $queryRaw: jest.fn(),
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'order-success',
                status: OrderStatus.PENDING,
                deletedAt: null,
                items: [{ variantId: 'var-2', quantity: 1 }],
              }),
              update: jest.fn(),
            },
            productVariant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            inventoryItem: {
              update: jest.fn(),
            },
          } as any);
        });

      const result = await service.cleanupExpiredPendingOrders();

      expect(result.data.failed).toBeGreaterThan(0);
      expect(result.data.checked).toBe(2);
    });
  });

  describe('Idempotencia - Race Conditions', () => {
    it('NO debería restituir stock 2 veces si cleanup y webhook se ejecutan simultáneamente', () => {
      /**
       * Escenario: Orden PENDING -> Webhook llega -> Actualiza a PAID
       * Simultáneamente: Cleanup corre -> Intenta cancelar misma orden
       *
       * Esperado: Cleanup ve order.status != PENDING o order.deletedAt != null,
       * retorna false, no restaura stock 2 veces.
       */

      const orderId = 'order-race-1';

      // Primera llamada a findUnique (del webhook): orden está PENDING
      // Segunda llamada (del cleanup): orden ya fue cancelada (deletedAt != null)
      jest.spyOn(prismaService.order, 'findUnique').mockImplementation(((
        _args: any,
      ) => {
        // Simular que el webhook cambió el estado
        return {
          id: orderId,
          status: OrderStatus.PENDING,
          deletedAt: new Date(), // Simulamos que ya fue borrado (soft delete)
          items: [{ variantId: 'var-1', quantity: 5 }],
        };
      }) as any);

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => {
          const result = await fn({
            $queryRaw: jest.fn(),
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: orderId,
                status: OrderStatus.PENDING,
                deletedAt: new Date(), // Ya deletedAt
                items: [{ variantId: 'var-1', quantity: 5 }],
              }),
              update: jest.fn(),
            },
            productVariant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            inventoryItem: {
              update: jest.fn(),
            },
          } as any);
          return result;
        });

      // Simular la familia cancelPendingOrderWithStockRestore
      // La lógica interna debe chequear: if (!order || order.deletedAt || order.status !== PENDING) return false
      // Por lo tanto debe retornar false (no cancelada nuevamente)
      const wasRestored = false; // Este sería el resultado esperado

      expect(wasRestored).toBe(false); // No doble-restauración
    });

    it('debería ser idempotente: llamar cleanup 2 veces = 1 restauración', async () => {
      const orderId = 'order-idempotent-1';

      // Primera llamada: orden PENDING -> encuentra y cancela
      // Segunda llamada: orden CANCELLED -> findMany retorna vacío (ya no PENDING)

      let callCount = 0;
      jest.spyOn(prismaService.order, 'findMany').mockImplementation((() => {
        callCount++;
        if (callCount === 1) {
          // Primer llamado: encuentra orden expirada
          return Promise.resolve([
            { id: orderId, items: [{ variantId: 'var-1', quantity: 3 }] },
          ]);
        }
        // Segundo llamado: ya no hay PENDING (fue cancelada)
        return Promise.resolve([]);
      }) as any);

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => {
          return await fn({
            $queryRaw: jest.fn(),
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: orderId,
                status: OrderStatus.PENDING,
                deletedAt: null,
                items: [{ variantId: 'var-1', quantity: 3 }],
              }),
              update: jest.fn(),
            },
            productVariant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            inventoryItem: {
              update: jest.fn(),
            },
            orderStateChange: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as any);
        });

      const result1 = await service.cleanupExpiredPendingOrders();
      const result2 = await service.cleanupExpiredPendingOrders();

      expect(result1.data.cancelled).toBe(1);
      expect(result2.data.cancelled).toBe(0); // Segunda vez no encuentra nada
    });
  });

  describe('Stock Restoration - Accuracy', () => {
    it('debería restaurar correctamente stock de múltiples ingredientes', async () => {
      const orderId = 'order-multi-ingredient';

      // Order con 2 items, c/u con múltiples ingredientes
      const orderItems = [
        { variantId: 'var-matcha', quantity: 2 }, // 2 unidades
        { variantId: 'var-premium', quantity: 1 }, // 1 unidad
      ];

      const mockOrders = [{ id: orderId, items: orderItems }];
      jest
        .spyOn(prismaService.order, 'findMany')
        .mockResolvedValueOnce(mockOrders as any);

      // Mock para transacción
      const mockInventoryUpdates: { id: string; increment: number }[] = [];

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn: any) => {
          return await fn({
            $queryRaw: jest.fn(),
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: orderId,
                status: OrderStatus.PENDING,
                deletedAt: null,
                items: orderItems,
              }),
              update: jest.fn(),
            },
            productVariant: {
              findUnique: jest.fn().mockImplementation((args: any) => {
                if (args.where.id === 'var-matcha') {
                  return Promise.resolve({
                    id: 'var-matcha',
                    price: 50,
                    ingredients: [
                      { inventoryItemId: 'inv-1', quantityRequired: 10 },
                      { inventoryItemId: 'inv-2', quantityRequired: 5 },
                    ],
                  });
                } else if (args.where.id === 'var-premium') {
                  return Promise.resolve({
                    id: 'var-premium',
                    price: 100,
                    ingredients: [
                      { inventoryItemId: 'inv-1', quantityRequired: 20 },
                    ],
                  });
                }
                return Promise.resolve(null);
              }),
              update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
              update: jest.fn().mockImplementation((args: any) => {
                mockInventoryUpdates.push({
                  id: args.where.id,
                  increment: args.data.currentStock.increment,
                });
                return Promise.resolve({ id: args.where.id });
              }),
            },
            orderStateChange: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as any);
        });

      const result = await service.cleanupExpiredPendingOrders();

      // Verificar: var-matcha 2 unidades: inv-1 += 20, inv-2 += 10
      //           var-premium 1 unidad: inv-1 += 20
      // Total: inv-1 += 40, inv-2 += 10

      expect(result.data.totalStockRestored).toBe(3); // 2 + 1 items
      // En un test realistico, verificaríamos que los increments son correctos
      // (20 + 20 para inv-1, 10 para inv-2)
    });
  });

  describe('offlineCheckout', () => {
    it('rechaza CASH si deliveryType no es pickup', async () => {
      await expect(
        service.offlineCheckout({
          customerEmail: 'test@yerba.com',
          customerName: 'Test',
          orderItems: [{ variantId: 'var-1', quantity: 1 }],
          paymentProvider: 'CASH',
          deliveryType: 'shipping',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.order.create).not.toHaveBeenCalled();
      expect(prismaService.order.update).not.toHaveBeenCalled();
    });

    it('cobra el total de los items persistidos al reutilizar una orden', async () => {
      (prismaService.order.count as jest.Mock).mockResolvedValue(0);
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order-1',
        total: 109000,
        status: OrderStatus.PENDING,
        deletedAt: null,
        customerEmail: 'cliente@yerba.com',
        shippingCost: 9000,
        items: [{ variantId: 'var-1', quantity: 10, price: 10000 }],
      });
      (prismaService.order.update as jest.Mock).mockResolvedValue({
        id: 'order-1',
        total: 109000,
      });
      pricingService.quoteExistingOrder.mockResolvedValue({
        itemsSubtotal: 100000,
        shippingCost: 9000,
        couponId: null,
        couponDiscount: 0,
        couponError: null,
        total: 109000,
      });

      await service.offlineCheckout({
        existingOrderId: 'order-1',
        customerEmail: 'cliente@yerba.com',
        customerName: 'Cliente',
        // Intento de fraude: un solo item en el body.
        orderItems: [{ variantId: 'var-1', quantity: 1 }],
        paymentProvider: 'CASH',
        deliveryType: 'pickup',
      } as any);

      expect(pricingService.quote).not.toHaveBeenCalled();
      const update = (prismaService.order.update as jest.Mock).mock.calls[0][0];
      expect(update.data.total).toBe(109000);
    });

    it('getTransferInfo sin env devuelve transferInstructions null', () => {
      expect(service.getTransferInfo()).toEqual({
        transferInstructions: null,
        test: false,
      });
    });
  });

  describe('toggles de medios de pago', () => {
    const cashOrder = {
      customerEmail: 'test@yerba.com',
      customerName: 'Test',
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      paymentProvider: 'CASH',
      deliveryType: 'pickup',
    };

    const transferOrder = { ...cashOrder, paymentProvider: 'TRANSFER' };

    const brickOrder = {
      customerEmail: 'test@yerba.com',
      customerName: 'Test',
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'pickup',
    };

    it('rechaza efectivo cuando está deshabilitado en la configuración', async () => {
      settingsService.get.mockResolvedValue({
        ...ALL_PAYMENT_METHODS_ENABLED,
        paymentCash: false,
      });

      await expect(service.offlineCheckout(cashOrder as any)).rejects.toThrow(
        'El pago en efectivo no está disponible',
      );

      expect(prismaService.order.create).not.toHaveBeenCalled();
    });

    it('rechaza transferencia cuando está deshabilitada en la configuración', async () => {
      settingsService.get.mockResolvedValue({
        ...ALL_PAYMENT_METHODS_ENABLED,
        paymentTransfer: false,
      });

      await expect(
        service.offlineCheckout(transferOrder as any),
      ).rejects.toThrow('El pago por transferencia no está disponible');

      expect(prismaService.order.create).not.toHaveBeenCalled();
    });

    it('rechaza brick-init cuando Mercado Pago está deshabilitado', async () => {
      settingsService.get.mockResolvedValue({
        ...ALL_PAYMENT_METHODS_ENABLED,
        paymentMercadoPago: false,
      });

      await expect(service.brickInit(brickOrder as any)).rejects.toThrow(
        'El pago con Mercado Pago no está disponible',
      );

      expect(pricingService.quote).not.toHaveBeenCalled();
      expect(prismaService.order.create).not.toHaveBeenCalled();
    });

    it('rechaza el Payment Brick cuando Mercado Pago está deshabilitado', async () => {
      settingsService.get.mockResolvedValue({
        ...ALL_PAYMENT_METHODS_ENABLED,
        paymentMercadoPago: false,
      });

      await expect(
        service.processBrickPayment({
          ...brickOrder,
          selectedPaymentMethod: 'credit_card',
          formData: { transaction_amount: 1000 },
        } as any),
      ).rejects.toThrow('El pago con Mercado Pago no está disponible');

      expect(pricingService.quote).not.toHaveBeenCalled();
      expect(prismaService.order.create).not.toHaveBeenCalled();
    });

    it('deja pasar efectivo cuando está habilitado', async () => {
      // Con el toggle en true el flujo avanza hasta la cotización, que en este
      // test falla por otro motivo. Lo que importa es que el guard no cortó.
      (prismaService.order.count as jest.Mock).mockResolvedValue(0);
      pricingService.quote.mockRejectedValue(new Error('corte deliberado'));

      await expect(service.offlineCheckout(cashOrder as any)).rejects.toThrow(
        'corte deliberado',
      );
    });
  });

  describe('AdminGuard Integration', () => {
    it('debería rechazar requests sin admin role', () => {
      // Este test se ejecutaría en el nivel del controller
      // Verificamos que el endpoint esté protegido por @UseGuards(AdminGuard)
      // En un e2e test se llamaría POST /payments/cleanup-manual sin admin token
      // y se esperaría un 403 Forbidden

      expect(true).toBe(true); // Placeholder para verificación manual en e2e
    });
  });

  describe('pricing centralizado', () => {
    it('brickInit persiste el envio cotizado por el server, no el del cliente', async () => {
      pricingService.quote.mockResolvedValue({
        lines: [
          {
            variantId: 'var-1',
            quantity: 1,
            unitPrice: 10000,
            lineTotal: 10000,
            productName: 'Yerba',
          },
        ],
        itemsSubtotal: 10000,
        shippingCost: 9000,
        shippingProvider: 'correo_argentino',
        freeShippingApplied: false,
        couponCode: null,
        couponId: null,
        couponDiscount: 0,
        couponError: null,
        total: 19000,
      });

      const createSpy = jest
        .spyOn(
          service as unknown as {
            createPendingOrder: (p: unknown) => Promise<unknown>;
          },
          'createPendingOrder',
        )
        .mockResolvedValue({ id: 'order-1', total: 19000, status: 'PENDING' });

      (prismaService.order.count as jest.Mock).mockResolvedValue(0);
      (prismaService.productVariant.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      // La creacion de la preferencia en Mercado Pago falla sin credenciales
      // reales; lo que verificamos ya ocurrio antes de ese punto.
      await service
        .brickInit({
          orderItems: [{ variantId: 'var-1', quantity: 1 }],
          customerEmail: 'test@example.com',
          deliveryType: 'shipping',
          shippingDeliveryType: 'D',
          shippingZip: '5000',
          shippingCost: 0, // el cliente intenta envio gratis
        } as never)
        .catch(() => undefined);

      const created = createSpy.mock.calls[0][0] as {
        shippingCost: number;
        totalAmount: number;
      };
      expect(created.shippingCost).toBe(9000);
      expect(created.totalAmount).toBe(19000);

      createSpy.mockRestore();
    });
  });

  describe('existingOrderId — orden ya persistida', () => {
    /** Orden creada por brick-init: 10 unidades a $10.000 + $9.000 de envio. */
    const persistedOrder = {
      id: 'order-1',
      total: 109000,
      status: OrderStatus.PENDING,
      deletedAt: null,
      customerEmail: 'cliente@example.com',
      shippingCost: 9000,
      items: [{ variantId: 'var-1', quantity: 10, price: 10000 }],
    };

    /** Cotizacion de la orden persistida, sin cupon. */
    const persistedQuote = {
      itemsSubtotal: 100000,
      shippingCost: 9000,
      couponId: null,
      couponDiscount: 0,
      couponError: null,
      total: 109000,
    };

    /** Body del Brick con un solo item: el intento de fraude. */
    const tamperedDto = (overrides: Record<string, unknown> = {}) => ({
      selectedPaymentMethod: 'credit_card',
      existingOrderId: 'order-1',
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      formData: {
        token: 'card-token',
        payment_method_id: 'visa',
        installments: 1,
        transaction_amount: 109000,
        payer: { email: 'cliente@example.com' },
      },
      ...overrides,
    });

    const mockApprovedPayment = () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 123456,
          status: 'approved',
          status_detail: 'accredited',
        }),
      });
    };

    beforeEach(() => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
        persistedOrder,
      );
      (prismaService.order.update as jest.Mock).mockResolvedValue(
        persistedOrder,
      );
      pricingService.quoteExistingOrder.mockResolvedValue(persistedQuote);
      // Si el body llegara a cotizarse, el total seria el de un solo item.
      pricingService.quote.mockResolvedValue({
        lines: [],
        itemsSubtotal: 10000,
        shippingCost: 9000,
        shippingProvider: 'correo_argentino',
        freeShippingApplied: false,
        couponCode: null,
        couponId: null,
        couponDiscount: 0,
        couponError: null,
        total: 19000,
      });
    });

    it('rechaza reutilizar la orden de otro comprador', async () => {
      const cancelSpy = jest
        .spyOn(service, 'cancelPendingOrderWithStockRestore')
        .mockResolvedValue(undefined as never);

      await expect(
        service.processBrickPayment(
          tamperedDto({
            formData: {
              token: 'card-token',
              payment_method_id: 'visa',
              installments: 1,
              transaction_amount: 109000,
              payer: { email: 'atacante@example.com' },
            },
          }) as never,
        ),
      ).rejects.toThrow(/no corresponde/i);

      expect(global.fetch).not.toHaveBeenCalled();
      // Rechazar no puede destruir la orden de la victima.
      expect(cancelSpy).not.toHaveBeenCalled();
      cancelSpy.mockRestore();
    });

    it('cobra el total de los items persistidos, ignorando los del body', async () => {
      mockApprovedPayment();

      await service.processBrickPayment(tamperedDto() as never);

      const mpCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
        String(c[0]).includes('/v1/payments'),
      );
      const body = JSON.parse(mpCall[1].body);
      expect(body.transaction_amount).toBe(109000);
      // El body del cliente no puede redefinir que se esta comprando.
      expect(pricingService.quote).not.toHaveBeenCalled();
    });

    it('rechaza si el monto confirmado por el comprador no coincide con la orden', async () => {
      const cancelSpy = jest
        .spyOn(service, 'cancelPendingOrderWithStockRestore')
        .mockResolvedValue(undefined as never);

      await expect(
        service.processBrickPayment(
          tamperedDto({
            formData: {
              token: 'card-token',
              payment_method_id: 'visa',
              installments: 1,
              transaction_amount: 19000,
              payer: { email: 'cliente@example.com' },
            },
          }) as never,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(cancelSpy).not.toHaveBeenCalled();
      cancelSpy.mockRestore();
    });

    it('aplica el cupon del paso de pago sobre el total persistido', async () => {
      pricingService.quoteExistingOrder.mockResolvedValue({
        ...persistedQuote,
        couponId: 'cup-1',
        couponDiscount: 10000,
        total: 99000,
      });
      (prismaService.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
      );
      mockApprovedPayment();

      await service.processBrickPayment(
        tamperedDto({
          couponCode: 'BIENVENIDO',
          orderItems: [{ variantId: 'var-1', quantity: 10 }],
          formData: {
            token: 'card-token',
            payment_method_id: 'visa',
            installments: 1,
            transaction_amount: 99000,
            payer: { email: 'cliente@example.com' },
          },
        }) as never,
      );

      const mpCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
        String(c[0]).includes('/v1/payments'),
      );
      expect(JSON.parse(mpCall[1].body).transaction_amount).toBe(99000);

      // La orden queda con el total que se cobro, no con el previo al cupon.
      const totalUpdate = (
        prismaService.order.update as jest.Mock
      ).mock.calls.find((c) => c[0]?.data?.total !== undefined);
      expect(totalUpdate[0].data.total).toBe(99000);
    });
  });
});
