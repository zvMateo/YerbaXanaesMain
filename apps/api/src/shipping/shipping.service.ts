import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GetShippingRatesDto } from './dto/get-rates.dto';

// Importación para NestJS/CommonJS según doc de la librería
import CorreoArgentinoApi from 'ylazzari-correoargentino';
import { Environment, DeliveredType } from 'ylazzari-correoargentino/enums';

// ============================================================
// TIPOS DE RESPUESTA
// ============================================================

export interface ShippingRate {
  deliveredType: 'D' | 'S'; // D = domicilio, S = sucursal
  productName: string;
  price: number;
  deliveryTimeMin: string;
  deliveryTimeMax: string;
  label: string; // Label amigable para el frontend
}

export interface ShippingRatesResponse {
  rates: ShippingRate[];
  source: 'correo_argentino' | 'flat_rate'; // Si usó la API real o el fallback
  packageWeightGrams: number;
}

// ============================================================
// CONSTANTES
// ============================================================

// Peso por defecto si la variante no tiene peso configurado (en gramos)
const DEFAULT_WEIGHT_PER_UNIT_GRAMS = 600;

// Dimensiones del paquete estándar de yerba (en cm)
const DEFAULT_DIMENSIONS = {
  height: 20,
  width: 15,
  length: 10,
};

// CP de origen por defecto si no está configurado en env
const DEFAULT_POSTAL_CODE_ORIGIN = '1000';

@Injectable()
export class ShippingService implements OnModuleInit {
  private readonly logger = new Logger(ShippingService.name);
  private correoApi: CorreoArgentinoApi | null = null;
  private isInitialized = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.initializeCorreoApi();
  }

  // ============================================================
  // INICIALIZACIÓN — Con fallback graceful si no hay credenciales
  // ============================================================

  private async initializeCorreoApi(): Promise<void> {
    const userToken = this.config.get<string>('CA_USER_TOKEN');
    const passwordToken = this.config.get<string>('CA_PASSWORD_TOKEN');
    const email = this.config.get<string>('CA_EMAIL');
    const password = this.config.get<string>('CA_PASSWORD');

    if (!userToken || !passwordToken || !email || !password) {
      this.logger.warn(
        'Correo Argentino: credenciales no configuradas — usando tarifa plana como fallback. ' +
          'Para activar la integración, configurá las variables CA_USER_TOKEN, CA_PASSWORD_TOKEN, CA_EMAIL, CA_PASSWORD.',
      );
      return;
    }

    try {
      const api = new CorreoArgentinoApi();
      const customerId = this.config.get<string>('CA_CUSTOMER_ID');
      const envStr = this.config.get<string>('CA_ENVIRONMENT') || 'PROD';
      const environment =
        envStr === 'TEST' ? Environment.TEST : Environment.PROD;

      if (customerId) {
        // Inicialización rápida si ya tenemos el customerId
        await api.initializeWithCustomerId({
          userToken,
          passwordToken,
          customerId,
          environment,
        });
      } else {
        // Primera vez: obtiene el customerId automáticamente
        await api.initializeAll({
          userToken,
          passwordToken,
          email,
          password,
          environment,
        });
        this.logger.log(
          `Correo Argentino inicializado. CustomerId: ${api.getVarCustomerId()}. ` +
            `Guardalo en CA_CUSTOMER_ID para acelerar futuros starts.`,
        );
      }

      this.correoApi = api;
      this.isInitialized = true;
      this.logger.log('Correo Argentino API inicializada correctamente.');
    } catch (error) {
      this.logger.error(
        'No se pudo inicializar Correo Argentino API — usando tarifa plana como fallback.',
        error,
      );
    }
  }

  // ============================================================
  // COTIZAR ENVÍO
  // ============================================================

  async getRates(dto: GetShippingRatesDto): Promise<ShippingRatesResponse> {
    // 1. Obtener el peso total del paquete desde las variantes del carrito
    const packageWeightGrams = await this.calculatePackageWeight(dto.items);

    const postalCodeOrigin =
      this.config.get<string>('CA_POSTAL_CODE_ORIGIN') ||
      DEFAULT_POSTAL_CODE_ORIGIN;

    // 2. Si no hay API inicializada → tarifa plana
    if (!this.isInitialized || !this.correoApi) {
      return this.buildFlatRateResponse(packageWeightGrams);
    }

    try {
      // 3. Llamar a la API de Correo Argentino
      // Usamos DeliveredType.D (domicilio) como opción principal
      const response = await this.correoApi.getRates({
        customerId: this.correoApi.getVarCustomerId(),
        postalCodeOrigin,
        postalCodeDestination: dto.postalCodeDestination,
        deliveredType: DeliveredType.D,
        dimensions: [
          {
            weight: packageWeightGrams,
            height: DEFAULT_DIMENSIONS.height,
            width: DEFAULT_DIMENSIONS.width,
            length: DEFAULT_DIMENSIONS.length,
            quantity: 1,
          },
        ],
      });

      const rates: ShippingRate[] = response.rates.map((rate) => ({
        deliveredType: rate.deliveredType as 'D' | 'S',
        productName: rate.productName,
        price: rate.price,
        deliveryTimeMin: rate.deliveryTimeMin,
        deliveryTimeMax: rate.deliveryTimeMax,
        label: this.buildRateLabel(rate),
      }));

      return { rates, source: 'correo_argentino', packageWeightGrams };
    } catch (error) {
      this.logger.error('Error cotizando con Correo Argentino', error);
      // Fallback a tarifa plana si la API falla
      return this.buildFlatRateResponse(packageWeightGrams);
    }
  }

  // ============================================================
  // IMPORTAR ENVÍO A MICORREO (Admin — ejecuta el admin desde backoffice)
  // ============================================================

  async importShipping(orderId: string): Promise<{ trackingNumber: string }> {
    if (!this.isInitialized || !this.correoApi) {
      throw new BadRequestException(
        'Correo Argentino no está configurado. Configurá las variables CA_* en el entorno.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
    });

    if (!order) throw new NotFoundException(`Orden #${orderId} no encontrada`);

    if (!order.shippingAddress || !order.shippingZip) {
      throw new BadRequestException(
        'La orden no tiene dirección de envío. No se puede importar a Correo Argentino.',
      );
    }

    if (order.correoShippingId) {
      throw new BadRequestException(
        `Esta orden ya fue importada a Correo Argentino con ID: ${order.correoShippingId}`,
      );
    }

    // Calcular peso total para el envío
    const packageWeightGrams = await this.calculatePackageWeight(
      order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    );

    try {
      // @ts-expect-error — shipping/import está pendiente en la librería (🟨)
      const result = await this.correoApi.importShipping({
        customerId: this.correoApi.getVarCustomerId(),
        extOrderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        recipient: {
          name: order.customerName || order.customerEmail || 'Cliente',
          email: order.customerEmail || '',
          phone: order.customerPhone || '',
          cellPhone: order.customerPhone || '',
        },
        shipping: {
          deliveryType: 'D' as DeliveredType,
          productType: 'CP',
          address: {
            streetName:
              order.shippingAddress.split(',')[0] || order.shippingAddress,
            streetNumber: order.shippingAddress.split(',')[1]?.trim() || 's/n',
            floor: '',
            apartment: '',
            city: order.shippingCity || '',
            provinceCode: order.shippingProvinceCode || 'B',
            postalCode: order.shippingZip || '',
          },
          weight: packageWeightGrams,
          declaredValue: Number(order.total),
          height: DEFAULT_DIMENSIONS.height,
          length: DEFAULT_DIMENSIONS.length,
          width: DEFAULT_DIMENSIONS.width,
        },
      });

      // Actualizar la orden con el tracking
      const trackingNumber =
        (result as { trackingNumber?: string })?.trackingNumber ||
        `CA-${order.id.slice(0, 8).toUpperCase()}`;

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          correoShippingId: trackingNumber,
          trackingNumber,
          correoImportedAt: new Date(),
        },
      });

      return { trackingNumber };
    } catch (error) {
      // Si shipping/import no está implementado aún en la lib, creamos un tracking provisional
      this.logger.warn(
        'shipping/import pendiente en la librería — guardando tracking provisional',
        error,
      );
      const trackingNumber = `CA-PROV-${order.id.slice(0, 8).toUpperCase()}`;
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          correoImportedAt: new Date(),
          trackingNumber,
        },
      });
      return { trackingNumber };
    }
  }

  // ============================================================
  // TRACKING
  // ============================================================

  async getTracking(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { trackingNumber: true, correoShippingId: true },
    });

    if (!order) throw new NotFoundException(`Orden #${orderId} no encontrada`);
    if (!order.trackingNumber) {
      throw new NotFoundException(
        'Esta orden aún no tiene número de seguimiento',
      );
    }

    if (!this.isInitialized || !this.correoApi) {
      return {
        trackingNumber: order.trackingNumber,
        events: [],
        message:
          'Correo Argentino no configurado. Usá el tracking en correoargentino.com.ar',
        trackingUrl: `https://www.correoargentino.com.ar/formularios/oas?id=${order.trackingNumber}`,
      };
    }

    try {
      // @ts-expect-error — shipping/tracking puede no estar en todos los entornos
      const tracking = await this.correoApi.getTracking({
        shippingId: order.correoShippingId || order.trackingNumber,
      });

      return {
        ...tracking,
        trackingUrl: `https://www.correoargentino.com.ar/formularios/oas?id=${order.trackingNumber}`,
      };
    } catch (error) {
      this.logger.error('Error obteniendo tracking', error);
      return {
        trackingNumber: order.trackingNumber,
        events: [],
        trackingUrl: `https://www.correoargentino.com.ar/formularios/oas?id=${order.trackingNumber}`,
      };
    }
  }

  // ============================================================
  // HELPERS PRIVADOS
  // ============================================================

  private async calculatePackageWeight(
    items: { variantId: string; quantity: number }[],
  ): Promise<number> {
    const variantIds = items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, weight: true },
    });

    const weightMap = new Map(variants.map((v) => [v.id, v.weight]));

    const totalWeight = items.reduce((sum, item) => {
      const weight =
        weightMap.get(item.variantId) ?? DEFAULT_WEIGHT_PER_UNIT_GRAMS;
      return sum + weight * item.quantity;
    }, 0);

    // Mínimo 1g para la API
    return Math.max(totalWeight, 1);
  }

  private buildFlatRateResponse(
    packageWeightGrams: number,
  ): ShippingRatesResponse {
    // Tarifa escalonada simple por peso
    let price: number;
    if (packageWeightGrams <= 1000) price = 1200;
    else if (packageWeightGrams <= 2000) price = 1800;
    else if (packageWeightGrams <= 5000) price = 2500;
    else price = 3500;

    return {
      rates: [
        {
          deliveredType: 'D',
          productName: 'Envío estándar',
          price,
          deliveryTimeMin: '3',
          deliveryTimeMax: '7',
          label: `Envío a domicilio — $${price.toLocaleString('es-AR')} (3 a 7 días hábiles)`,
        },
      ],
      source: 'flat_rate',
      packageWeightGrams,
    };
  }

  private buildRateLabel(rate: {
    deliveredType: string;
    productName: string;
    price: number;
    deliveryTimeMin: string;
    deliveryTimeMax: string;
  }): string {
    const type = rate.deliveredType === 'D' ? 'A domicilio' : 'En sucursal';
    const days =
      rate.deliveryTimeMin === rate.deliveryTimeMax
        ? `${rate.deliveryTimeMin} días`
        : `${rate.deliveryTimeMin} a ${rate.deliveryTimeMax} días`;

    return `${type} — $${rate.price.toLocaleString('es-AR')} (${days} hábiles) — ${rate.productName}`;
  }
}
