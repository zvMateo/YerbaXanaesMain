import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CheckoutPricingService } from './checkout-pricing.service';
import { CouponsService } from '../coupons/coupons.service';
import { ShippingService } from '../shipping/shipping.service';
import { SettingsService } from '../settings/settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CheckoutPricingService', () => {
  let service: CheckoutPricingService;
  let shipping: { getRates: jest.Mock };
  let coupons: { validate: jest.Mock };
  let settings: { get: jest.Mock };
  let prisma: { productVariant: { findMany: jest.Mock } };

  beforeEach(async () => {
    shipping = { getRates: jest.fn() };
    coupons = { validate: jest.fn() };
    settings = {
      get: jest.fn().mockResolvedValue({
        shippingFlatRate: 1500,
        freeShippingThreshold: 15000,
      }),
    };
    prisma = {
      productVariant: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'var-1',
            price: 10000,
            product: { name: 'Yerba Xanaes 500g' },
          },
        ]),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckoutPricingService,
        { provide: ShippingService, useValue: shipping },
        { provide: CouponsService, useValue: coupons },
        { provide: SettingsService, useValue: settings },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CheckoutPricingService);
  });

  it('elige la tarifa del tipo de envio pedido, no la mas barata global', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [
        { deliveredType: 'S', productName: 'Clasico Sucursal', price: 6500 },
        { deliveredType: 'D', productName: 'Clasico Domicilio', price: 9000 },
      ],
    });

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
    });

    expect(quote.shippingCost).toBe(9000);
  });

  it('aplica el descuento porcentual solo sobre los productos, nunca sobre el envio', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clasico', price: 8500 }],
    });
    coupons.validate.mockImplementation((_code: string, amount: number) =>
      Promise.resolve({
        valid: true,
        couponId: 'c-1',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        discountAmount: Math.round(amount * 0.1 * 100) / 100,
      }),
    );

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
      couponCode: 'BIENVENIDO10',
    });

    expect(coupons.validate).toHaveBeenCalledWith('BIENVENIDO10', 10000);
    expect(quote.couponDiscount).toBe(1000);
    expect(quote.total).toBe(17500);
  });

  it('aplica envio gratis al superar el umbral de la configuracion', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      { id: 'var-1', price: 20000, product: { name: 'Combo' } },
    ]);
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clasico', price: 8500 }],
    });

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
    });

    expect(quote.freeShippingApplied).toBe(true);
    expect(quote.shippingCost).toBe(0);
    expect(quote.total).toBe(20000);
  });

  it('cae a la tarifa plana cuando Correo falla, sin bloquear la venta', async () => {
    shipping.getRates.mockRejectedValue(new Error('MiCorreo caido'));

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
    });

    expect(quote.shippingProvider).toBe('manual_quote_required');
    expect(quote.shippingCost).toBe(1500);
  });

  it('retiro en local no cotiza envio', async () => {
    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'pickup',
    });

    expect(shipping.getRates).not.toHaveBeenCalled();
    expect(quote.shippingCost).toBe(0);
    expect(quote.shippingProvider).toBe('pickup');
  });

  it('reporta el cupon invalido en vez de silenciarlo', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clasico', price: 8500 }],
    });
    coupons.validate.mockRejectedValue(
      new BadRequestException('Cupon vencido'),
    );

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
      couponCode: 'VENCIDO',
    });

    expect(quote.couponDiscount).toBe(0);
    expect(quote.couponError).toBe('Cupon vencido');
  });

  it('ignora el precio que mande el cliente y usa el de la base', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clasico', price: 8500 }],
    });

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 2 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
    });

    expect(quote.itemsSubtotal).toBe(20000);
    expect(quote.lines[0].unitPrice).toBe(10000);
  });
});
