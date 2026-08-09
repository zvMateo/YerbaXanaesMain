import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    order: {
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
    storeSettings: { findUnique: jest.Mock };
  };
  let configGet: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn();
    prisma = {
      order: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      storeSettings: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(NotificationsService);
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('no envía si no puede claim (ya notificado o no PAID)', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });
    await service.notifyOrderPaidIfNeeded('order-1');
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  const paidOrder = {
    id: 'order-1',
    status: OrderStatus.PAID,
    total: 1000,
    customerName: 'Ana',
    customerEmail: 'ana@test.com',
    customerPhone: '111',
    deliveryType: 'shipping',
    shippingCity: 'Córdoba',
    shippingZip: '5000',
    items: [
      {
        quantity: 1,
        price: 1000,
        variant: { name: '1kg', product: { name: 'Yerba' } },
      },
    ],
  };

  it('envía a dueña y comprador cuando hay RESEND_API_KEY', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUnique.mockResolvedValue(paidOrder);
    configGet.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        ORDER_NOTIFY_EMAIL: 'duena@test.com',
        RESEND_API_KEY: 're_test',
        EMAIL_FROM: 'YerbaXanaes <hola@test.com>',
      };
      return map[key];
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => '',
    });

    await service.notifyOrderPaidIfNeeded('order-1');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const bodies = (global.fetch as jest.Mock).mock.calls.map((c) =>
      JSON.parse(c[1].body as string),
    );
    const tos = bodies.map((b: { to: string[] }) => b.to[0]).sort();
    expect(tos).toEqual(['ana@test.com', 'duena@test.com']);
  });

  it('usa SMTP cuando no hay Resend pero hay SMTP_*', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUnique.mockResolvedValue(paidOrder);
    configGet.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        ORDER_NOTIFY_EMAIL: 'duena@test.com',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '465',
        SMTP_USER: 'tienda@gmail.com',
        SMTP_PASS: 'app-password-16',
        EMAIL_FROM: 'YerbaXanaes <tienda@gmail.com>',
      };
      return map[key];
    });

    const sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
    // Inyectar transport mock
    (service as any).smtpTransport = { sendMail };

    await service.notifyOrderPaidIfNeeded('order-1');

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sin Resend ni SMTP no llama fetch (log only)', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUnique.mockResolvedValue({
      ...paidOrder,
      customerName: null,
      customerEmail: 'c@test.com',
      items: [],
    });
    configGet.mockImplementation((key: string) =>
      key === 'ORDER_NOTIFY_EMAIL' ? 'duena@test.com' : undefined,
    );

    await service.notifyOrderPaidIfNeeded('order-1');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
