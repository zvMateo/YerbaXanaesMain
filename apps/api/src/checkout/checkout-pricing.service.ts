import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { ShippingService } from '../shipping/shipping.service';
import { SettingsService } from '../settings/settings.service';

export interface PricedLine {
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productName: string;
}

export interface CheckoutQuote {
  lines: PricedLine[];
  itemsSubtotal: number;
  shippingCost: number;
  shippingProvider: 'correo_argentino' | 'pickup' | 'manual_quote_required';
  freeShippingApplied: boolean;
  couponCode: string | null;
  couponId: string | null;
  couponDiscount: number;
  couponError: string | null;
  total: number;
}

export interface ExistingOrderQuoteInput {
  /** Snapshot de items tal como quedo persistido en la orden. */
  items: { quantity: number; price: number }[];
  /** Envio ya cotizado y congelado cuando se creo la orden. */
  shippingCost: number;
  couponCode?: string;
}

export interface ExistingOrderQuote {
  itemsSubtotal: number;
  shippingCost: number;
  couponId: string | null;
  couponDiscount: number;
  couponError: string | null;
  total: number;
}

export interface QuoteInput {
  orderItems: { variantId: string; quantity: number }[];
  deliveryType: 'shipping' | 'pickup';
  shippingDeliveryType?: 'D' | 'S';
  shippingZip?: string;
  shippingProductName?: string;
  couponCode?: string;
}

interface ShippingSettings {
  shippingFlatRate: number;
  freeShippingThreshold: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Unica fuente de verdad de los precios del checkout.
 *
 * El frontend no calcula totales: pide una cotizacion y muestra lo que este
 * servicio devuelve. Los cuatro caminos de creacion de orden pasan por aca,
 * asi que un precio solo puede salir de un lugar.
 */
@Injectable()
export class CheckoutPricingService {
  private readonly logger = new Logger(CheckoutPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    private readonly shipping: ShippingService,
    private readonly settings: SettingsService,
  ) {}

  async quote(input: QuoteInput): Promise<CheckoutQuote> {
    const lines = await this.priceLines(input.orderItems);
    const itemsSubtotal = round2(
      lines.reduce((sum, line) => sum + line.lineTotal, 0),
    );

    const storeSettings = await this.settings.get();

    const { shippingCost, shippingProvider, freeShippingApplied } =
      await this.resolveShipping(input, itemsSubtotal, storeSettings);

    const { couponId, couponDiscount, couponError } = await this.resolveCoupon(
      input.couponCode,
      itemsSubtotal,
    );

    const total = round2(
      Math.max(0, itemsSubtotal + shippingCost - couponDiscount),
    );

    return {
      lines,
      itemsSubtotal,
      shippingCost,
      shippingProvider,
      freeShippingApplied,
      couponCode: input.couponCode ?? null,
      couponId,
      couponDiscount,
      couponError,
      total,
    };
  }

  /**
   * Cotizacion de una orden que ya existe.
   *
   * Los items y el envio no se recalculan: quedaron congelados cuando se creo
   * la orden y el comprador ya los confirmo. Lo unico que el paso de pago
   * todavia puede agregar es un cupon, que solo baja el precio y se valida
   * contra el subtotal real de productos.
   *
   * Existe para que ningun camino tenga que re-cotizar desde el body del
   * cliente una orden que ya esta persistida.
   */
  async quoteExistingOrder(
    input: ExistingOrderQuoteInput,
  ): Promise<ExistingOrderQuote> {
    const itemsSubtotal = round2(
      input.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      ),
    );
    const shippingCost = round2(Number(input.shippingCost) || 0);

    const { couponId, couponDiscount, couponError } = await this.resolveCoupon(
      input.couponCode,
      itemsSubtotal,
    );

    const total = round2(
      Math.max(0, itemsSubtotal + shippingCost - couponDiscount),
    );

    return {
      itemsSubtotal,
      shippingCost,
      couponId,
      couponDiscount,
      couponError,
      total,
    };
  }

  /** El precio sale siempre de la base. El cliente solo aporta ids y cantidades. */
  private async priceLines(
    orderItems: { variantId: string; quantity: number }[],
  ): Promise<PricedLine[]> {
    if (orderItems.length === 0) return [];

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: orderItems.map((i) => i.variantId) } },
      select: {
        id: true,
        price: true,
        product: { select: { name: true } },
      },
    });

    return orderItems.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new NotFoundException(`Variante ${item.variantId} no encontrada`);
      }
      const unitPrice = Number(variant.price);
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        lineTotal: round2(unitPrice * item.quantity),
        productName: variant.product.name,
      };
    });
  }

  private async resolveShipping(
    input: QuoteInput,
    itemsSubtotal: number,
    storeSettings: ShippingSettings,
  ): Promise<{
    shippingCost: number;
    shippingProvider: CheckoutQuote['shippingProvider'];
    freeShippingApplied: boolean;
  }> {
    if (input.deliveryType === 'pickup') {
      return {
        shippingCost: 0,
        shippingProvider: 'pickup',
        freeShippingApplied: false,
      };
    }

    // Se evalua antes de cotizar: si el envio es gratis no hace falta molestar
    // a Correo. El pedido igual se despacha por Correo, solo que no se cobra.
    if (
      storeSettings.freeShippingThreshold > 0 &&
      itemsSubtotal >= storeSettings.freeShippingThreshold
    ) {
      return {
        shippingCost: 0,
        shippingProvider: 'correo_argentino',
        freeShippingApplied: true,
      };
    }

    if (!input.shippingZip || !input.shippingDeliveryType) {
      return {
        shippingCost: storeSettings.shippingFlatRate,
        shippingProvider: 'manual_quote_required',
        freeShippingApplied: false,
      };
    }

    try {
      const response = await this.shipping.getRates({
        items: input.orderItems,
        postalCodeDestination: input.shippingZip,
      });

      // Solo las tarifas del tipo que eligio el cliente. Comparar contra el
      // minimo global mezcla domicilio con sucursal, y como sucursal siempre
      // sale mas barata, todo pago a domicilio terminaba rechazado.
      const candidates = response.rates.filter(
        (rate) => rate.deliveredType === input.shippingDeliveryType,
      );

      if (candidates.length === 0) {
        return {
          shippingCost: storeSettings.shippingFlatRate,
          shippingProvider: 'manual_quote_required',
          freeShippingApplied: false,
        };
      }

      const chosen =
        candidates.find(
          (rate) => rate.productName === input.shippingProductName,
        ) ?? candidates.reduce((a, b) => (a.price <= b.price ? a : b));

      return {
        shippingCost: round2(chosen.price),
        shippingProvider: 'correo_argentino',
        freeShippingApplied: false,
      };
    } catch (error) {
      this.logger.warn(
        `Correo Argentino no cotizo, se usa tarifa plana: ${String(error)}`,
      );
      return {
        shippingCost: storeSettings.shippingFlatRate,
        shippingProvider: 'manual_quote_required',
        freeShippingApplied: false,
      };
    }
  }

  /** El cupon se valida contra los productos, nunca contra el envio. */
  private async resolveCoupon(
    couponCode: string | undefined,
    itemsSubtotal: number,
  ): Promise<{
    couponId: string | null;
    couponDiscount: number;
    couponError: string | null;
  }> {
    if (!couponCode) {
      return { couponId: null, couponDiscount: 0, couponError: null };
    }

    try {
      const validation = await this.coupons.validate(couponCode, itemsSubtotal);
      return {
        couponId: validation.couponId,
        couponDiscount: round2(validation.discountAmount),
        couponError: null,
      };
    } catch (error) {
      // No se silencia: el llamador decide si corta el pago o solo lo muestra.
      const message = error instanceof Error ? error.message : 'Cupon invalido';
      return { couponId: null, couponDiscount: 0, couponError: message };
    }
  }
}
