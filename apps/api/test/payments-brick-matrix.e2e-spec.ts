import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PaymentsController } from './../src/payments/payments.controller';
import { PaymentsService } from './../src/payments/payments.service';
import { PaymentsSyncService } from './../src/payments/payments-sync.service';
import { AuthGuard } from './../src/auth/guards/auth.guard';
import { AdminGuard } from './../src/auth/guards/admin.guard';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Payments Brick Matrix (e2e)', () => {
  let app: INestApplication;

  const basePayload = {
    selectedPaymentMethod: 'credit_card',
    formData: {
      token: 'tok_test_123',
      issuer_id: '1',
      payment_method_id: 'visa',
      transaction_amount: 15000,
      installments: 3,
      payer: {
        email: 'buyer@test.com',
      },
    },
    customerName: 'Juan Perez',
    customerPhone: '1122334455',
    deliveryType: 'shipping',
    shippingAddress: 'Calle Falsa 123',
    shippingCity: 'CABA',
    shippingProvinceCode: 'B',
    shippingZip: '1000',
    shippingCost: 1200,
    shippingProvider: 'correo_argentino',
    orderItems: [{ variantId: 'variant-1', quantity: 1 }],
  };

  const duplicateWebhookIds = new Set<string>();

  const paymentsServiceMock = {
    processBrickPayment: jest.fn(async (dto: any) => {
      if (dto.formData.transaction_amount === 99999) {
        throw new BadRequestException(
          'El monto del pago cambió. Reintentá para recalcular el total.',
        );
      }

      if (dto.couponCode === 'INVALID') {
        throw new BadRequestException('Cupón inválido');
      }

      if (dto.orderItems?.some((item: any) => item.quantity > 99)) {
        throw new BadRequestException(
          'Stock insuficiente para uno o más items',
        );
      }

      if (dto.selectedPaymentMethod === 'credit_card') {
        if (dto.formData.token === 'tok_rejected') {
          throw new BadRequestException(
            'Pago rechazado. Revisá los datos de tu tarjeta.',
          );
        }

        if (dto.formData.token === 'tok_in_process') {
          return {
            orderId: 'order-card-in-process',
            status: 'in_process',
            detail: 'pending_contingency',
            mpPaymentId: 'mp-card-789',
          };
        }

        return {
          orderId: 'order-card-approved',
          status: 'approved',
          detail: 'accredited',
          mpPaymentId: 'mp-card-123',
        };
      }

      if (dto.selectedPaymentMethod === 'ticket') {
        return {
          orderId: 'order-ticket-pending',
          status: 'pending',
          ticketUrl: 'https://ticket.test/123',
          mpPaymentId: 'mp-ticket-456',
        };
      }

      if (dto.selectedPaymentMethod === 'account_money') {
        if (dto.formData.transaction_amount === 17000) {
          return {
            orderId: 'order-wallet-pending',
            status: 'pending',
            detail: 'pending_review_manual',
            mpPaymentId: 'mp-wallet-999',
          };
        }

        return {
          orderId: 'order-wallet-approved',
          status: 'approved',
          detail: 'accredited',
          mpPaymentId: 'mp-wallet-888',
        };
      }

      return { orderId: 'order-default', status: 'pending' };
    }),
    handleWebhook: jest.fn(async (payload: any) => {
      if (!payload.signature || !payload.requestId) {
        throw new BadRequestException('Firma o metadatos inválidos');
      }

      const eventId = payload.dataIdUrl;
      if (duplicateWebhookIds.has(eventId)) {
        return { status: 'duplicate_ignored' };
      }

      duplicateWebhookIds.add(eventId);
      return { status: 'processed', dataId: eventId };
    }),
  };

  beforeEach(async () => {
    duplicateWebhookIds.clear();
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: paymentsServiceMock },
        {
          provide: PaymentsSyncService,
          useValue: {
            manuallyOverrideOrderStatus: jest.fn(),
            getOrderStateHistory: jest.fn(),
          },
        },
        {
          provide: AuthGuard,
          useValue: {
            canActivate: jest.fn(() => true),
          },
        },
        {
          provide: AdminGuard,
          useValue: {
            canActivate: jest.fn(() => true),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('procesa tarjeta aprobada', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send(basePayload)
      .expect(200);

    expect(response.body.data.status).toBe('approved');
    expect(response.body.data.mpPaymentId).toBe('mp-card-123');
  });

  it('rechaza tarjeta inválida', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        formData: { ...basePayload.formData, token: 'tok_rejected' },
      })
      .expect(400);

    expect(response.body.message).toContain('Pago rechazado');
  });

  it('devuelve in_process para tarjeta en revisión', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        formData: { ...basePayload.formData, token: 'tok_in_process' },
      })
      .expect(200);

    expect(response.body.data.status).toBe('in_process');
  });

  it('genera ticket pending con external_resource_url', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        selectedPaymentMethod: 'ticket',
        formData: {
          ...basePayload.formData,
          token: undefined,
          payment_method_id: 'rapipago',
        },
      })
      .expect(200);

    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.ticketUrl).toContain('https://ticket.test/');
  });

  it('procesa account_money aprobado', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        selectedPaymentMethod: 'account_money',
        formData: {
          ...basePayload.formData,
          payment_method_id: 'account_money',
          token: undefined,
        },
      })
      .expect(200);

    expect(response.body.data.status).toBe('approved');
  });

  it('procesa account_money pending', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        selectedPaymentMethod: 'account_money',
        formData: {
          ...basePayload.formData,
          transaction_amount: 17000,
          payment_method_id: 'account_money',
          token: undefined,
        },
      })
      .expect(200);

    expect(response.body.data.status).toBe('pending');
  });

  it('rechaza mismatch de monto frontend/backend', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        formData: {
          ...basePayload.formData,
          transaction_amount: 99999,
        },
      })
      .expect(400);

    expect(response.body.message).toContain('monto del pago cambió');
  });

  it('rechaza cupón inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        couponCode: 'INVALID',
      })
      .expect(400);

    expect(response.body.message).toContain('Cupón inválido');
  });

  it('rechaza por stock insuficiente', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/brick')
      .send({
        ...basePayload,
        orderItems: [{ variantId: 'variant-1', quantity: 120 }],
      })
      .expect(400);

    expect(response.body.message).toContain('Stock insuficiente');
  });

  it('ignora webhook duplicado', async () => {
    const webhookPayload = {
      action: 'payment.updated',
      data: { id: 'mp-data-dup-1' },
    };

    await request(app.getHttpServer())
      .post('/payments/webhook?type=payment&data.id=mp-data-dup-1')
      .set('x-signature', 'valid-signature')
      .set('x-request-id', 'req-1')
      .send(webhookPayload)
      .expect(200);

    const duplicateResponse = await request(app.getHttpServer())
      .post('/payments/webhook?type=payment&data.id=mp-data-dup-1')
      .set('x-signature', 'valid-signature')
      .set('x-request-id', 'req-2')
      .send(webhookPayload)
      .expect(200);

    expect(duplicateResponse.body.status).toBe('duplicate_ignored');
  });

  it('responde 200 cuando la firma webhook es inválida', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments/webhook?type=payment&data.id=mp-data-invalid-sign')
      .send({ action: 'payment.updated', data: { id: 'mp-data-invalid-sign' } })
      .expect(200);

    expect(response.body.status).toBe('ok');
  });
});
