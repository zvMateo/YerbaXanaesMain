import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let configGet: jest.Mock;
  let prisma: { productVariant: { findMany: jest.Mock } };

  beforeEach(async () => {
    configGet = jest.fn();
    prisma = {
      productVariant: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'v1', weight: 500 },
          { id: 'v2', weight: null },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(ShippingService);
    // Evitar onModuleInit real
    jest.spyOn(service as any, 'initializeCorreoApi').mockResolvedValue(undefined);
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  function mockCreds() {
    configGet.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        CA_USER_TOKEN: 'user',
        CA_PASSWORD_TOKEN: 'pass',
        CA_CUSTOMER_ID: 'cust-1',
        CA_POSTAL_CODE_ORIGIN: '5963',
      };
      return map[key];
    });
  }

  describe('getRates', () => {
    it('lanza ServiceUnavailable si no hay credenciales', async () => {
      configGet.mockReturnValue(undefined);
      await expect(
        service.getRates({
          postalCodeDestination: '5000',
          items: [{ variantId: 'v1', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('devuelve rates mapeadas en happy path', async () => {
      mockCreds();
      // getMiCorreoToken usa fetch a /token
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'jwt-test',
            expires: new Date(Date.now() + 3600_000).toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rates: [
              {
                deliveredType: 'D',
                productType: 'CP',
                productName: 'Clásico',
                price: 2500,
                deliveryTimeMin: '2',
                deliveryTimeMax: '5',
              },
            ],
          }),
        });

      const result = await service.getRates({
        postalCodeDestination: '5000',
        items: [
          { variantId: 'v1', quantity: 2 },
          { variantId: 'v2', quantity: 1 },
        ],
      });

      expect(result.source).toBe('correo_argentino');
      // 2*500 + 1*600 default = 1600
      expect(result.packageWeightGrams).toBe(1600);
      expect(result.rates).toHaveLength(1);
      expect(result.rates[0].price).toBe(2500);
      expect(result.rates[0].deliveredType).toBe('D');
    });

    it('lanza ServiceUnavailable si MiCorreo rates falla', async () => {
      mockCreds();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'jwt',
            expires: new Date(Date.now() + 3600_000).toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'error', code: '500' }),
        });

      await expect(
        service.getRates({
          postalCodeDestination: '1000',
          items: [{ variantId: 'v1', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
