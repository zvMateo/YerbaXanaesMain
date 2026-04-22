import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsSyncService } from './payments-sync.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            handleWebhook: jest.fn(),
          },
        },
        {
          provide: PaymentsSyncService,
          useValue: {
            manuallyOverrideOrderStatus: jest.fn(),
            getOrderStateHistory: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  it('retorna ok en ping de test.created sin llamar al service', async () => {
    const result = await controller.handleWebhook(
      { action: 'test.created' },
      'sig',
      'req-1',
      '123',
      'order',
    );

    expect(result).toEqual({ status: 'ok' });
    expect(paymentsService.handleWebhook).not.toHaveBeenCalled();
  });

  it('ignora firma inválida y responde 200 ok', async () => {
    paymentsService.handleWebhook.mockRejectedValue(
      new BadRequestException('Invalid webhook signature'),
    );

    const result = await controller.handleWebhook(
      { data: { id: '123' } },
      'invalid',
      'req-2',
      '123',
      'order',
    );

    expect(result).toEqual({ status: 'ok' });
    expect(paymentsService.handleWebhook).toHaveBeenCalledTimes(1);
  });

  it('propaga errores no controlados', async () => {
    paymentsService.handleWebhook.mockRejectedValue(new Error('boom'));

    await expect(
      controller.handleWebhook(
        { data: { id: '123' } },
        'sig',
        'req-3',
        '123',
        'order',
      ),
    ).rejects.toThrow('boom');
  });
});
