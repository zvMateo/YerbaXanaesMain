import { Test, TestingModule } from '@nestjs/testing';
import { StoreSettings } from '@prisma/client';
import { SettingsPublicController } from './settings-public.controller';
import { SettingsService } from './settings.service';

/**
 * Fila completa tal como la devuelve Prisma, con los campos internos poblados
 * para poder afirmar que el endpoint público no los filtra.
 */
const fullSettings: StoreSettings = {
  id: 'singleton',
  businessName: 'YerbaXanaes',
  email: 'interno@yerbaxanaes.com',
  phone: '+54 9 3573 50-0348',
  address: 'Villa del Rosario',
  city: 'Córdoba, Argentina',
  shippingEnabled: true,
  shippingFlatRate: 1500,
  freeShippingThreshold: 15000,
  paymentMercadoPago: true,
  paymentCash: false,
  paymentTransfer: true,
  notificationEmail: 'alertas@yerbaxanaes.com',
  lowStockAlert: true,
  lowStockThreshold: 10,
  updatedAt: new Date('2026-09-04T00:00:00.000Z'),
};

describe('SettingsPublicController', () => {
  let controller: SettingsPublicController;
  const settingsMock = { get: jest.fn() };

  beforeEach(async () => {
    settingsMock.get.mockReset();
    settingsMock.get.mockResolvedValue(fullSettings);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsPublicController],
      providers: [{ provide: SettingsService, useValue: settingsMock }],
    }).compile();

    controller = module.get(SettingsPublicController);
  });

  it('devuelve los toggles de pago y las reglas de envío tal como están guardados', async () => {
    const res = await controller.getPublic();

    expect(res.data).toEqual({
      businessName: 'YerbaXanaes',
      phone: '+54 9 3573 50-0348',
      address: 'Villa del Rosario',
      city: 'Córdoba, Argentina',
      shippingEnabled: true,
      shippingFlatRate: 1500,
      freeShippingThreshold: 15000,
      paymentMercadoPago: true,
      paymentCash: false,
      paymentTransfer: true,
    });
  });

  it('no filtra campos internos de la configuración', async () => {
    const res = await controller.getPublic();
    const keys = Object.keys(res.data);

    expect(keys).not.toContain('email');
    expect(keys).not.toContain('notificationEmail');
    expect(keys).not.toContain('lowStockAlert');
    expect(keys).not.toContain('lowStockThreshold');
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('updatedAt');
  });
});
