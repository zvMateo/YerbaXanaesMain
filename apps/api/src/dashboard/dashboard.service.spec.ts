import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService.getAlerts', () => {
  let service: DashboardService;
  let prisma: {
    inventoryItem: { findMany: jest.Mock };
    order: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      inventoryItem: { findMany: jest.fn() },
      order: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('alerta stock con link a /inventario', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      { currentStock: 1, minStockAlert: 5 },
    ]);
    prisma.order.count
      .mockResolvedValueOnce(0) // pending
      .mockResolvedValueOnce(0); // paid today

    const alerts = await service.getAlerts();
    const stock = alerts.find((a) => a.title === 'Stock bajo');
    expect(stock).toBeDefined();
    expect(stock?.link).toBe('/inventario');
  });

  it('alerta pedidos pagados sin tracking', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    prisma.order.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);

    const alerts = await service.getAlerts();
    const ship = alerts.find((a) =>
      a.title.includes('pagados para despachar'),
    );
    expect(ship?.message).toContain('3');
    expect(ship?.link).toBe('/ordenes');
  });

  it('alerta pendientes de pago', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    prisma.order.count
      .mockImplementation(async (args: { where?: { status?: OrderStatus } }) => {
        if (args?.where?.status === OrderStatus.PENDING) return 2;
        return 0;
      });

    const alerts = await service.getAlerts();
    expect(alerts.some((a) => a.title.includes('pendientes de pago'))).toBe(
      true,
    );
  });
});
