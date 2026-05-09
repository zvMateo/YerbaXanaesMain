import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
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
  source: 'correo_argentino';
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

// URLs de la API MiCorreo según ambiente
const MICORREO_BASE_URLS = {
  TEST: 'https://apitest.correoargentino.com.ar/micorreo/v1',
  PROD: 'https://api.correoargentino.com.ar/micorreo/v1',
} as const;

@Injectable()
export class ShippingService implements OnModuleInit {
  private readonly logger = new Logger(ShippingService.name);
  private correoApi: CorreoArgentinoApi | null = null;
  private isInitialized = false;

  // Token JWT de MiCorreo (obtenido via HTTP Basic Auth)
  private miCorreoToken: string | null = null;
  private miCorreoTokenExpires: Date | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // HELPER: Obtener token JWT de MiCorreo (con cache)
  // ============================================================

  private async getMiCorreoToken(): Promise<string> {
    // Devolver token en cache si aún es válido (con margen de 60s)
    if (
      this.miCorreoToken &&
      this.miCorreoTokenExpires &&
      Date.now() < this.miCorreoTokenExpires.getTime() - 60_000
    ) {
      return this.miCorreoToken;
    }

    const userToken = this.config.get<string>('CA_USER_TOKEN');
    const passwordToken = this.config.get<string>('CA_PASSWORD_TOKEN');
    const envStr = this.config.get<string>('CA_ENVIRONMENT') || 'PROD';
    const baseUrl = MICORREO_BASE_URLS[envStr === 'TEST' ? 'TEST' : 'PROD'];

    if (!userToken || !passwordToken) {
      throw new BadRequestException('Credenciales MiCorreo no configuradas');
    }

    // HTTP Basic Auth: user:password en base64
    const credentials = Buffer.from(`${userToken}:${passwordToken}`).toString(
      'base64',
    );

    const response = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Error obteniendo token MiCorreo: ${body}`);
      throw new ServiceUnavailableException(
        'No se pudo autenticar con MiCorreo. Verificá las credenciales.',
      );
    }

    const data = (await response.json()) as { token: string; expires: string };
    this.miCorreoToken = data.token;
    // Parsear expires "2022-04-26 21:16:20" → Date
    this.miCorreoTokenExpires = new Date(data.expires.replace(' ', 'T'));

    this.logger.log('Token MiCorreo obtenido/renovado');
    return this.miCorreoToken;
  }

  /**
   * Helper para hacer requests autenticadas a la API MiCorreo.
   * Obtiene/renueva el JWT automáticamente.
   */
  private async miCorreoFetch(
    path: string,
    options: RequestInit = {},
  ): Promise<Record<string, unknown>> {
    const envStr = this.config.get<string>('CA_ENVIRONMENT') || 'PROD';
    const baseUrl = MICORREO_BASE_URLS[envStr === 'TEST' ? 'TEST' : 'PROD'];
    const token = await this.getMiCorreoToken();

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
    });

    return { ok: response.ok, status: response.status, data: await response.json() };
  }

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

    // 2. Si no hay API inicializada → no autocotizamos
    if (!this.isInitialized || !this.correoApi) {
      throw new ServiceUnavailableException(
        'No pudimos cotizar automáticamente el envío con Correo Argentino. Coordiná la cotización manual por WhatsApp.',
      );
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
      throw new ServiceUnavailableException(
        'No pudimos cotizar automáticamente el envío con Correo Argentino. Coordiná la cotización manual por WhatsApp.',
      );
    }
  }

  // ============================================================
  // IMPORTAR ENVÍO A MICORREO (Admin — ejecuta el admin desde backoffice)
  // Usa HTTP directo a la API porque la librería no soporta shipping/import
  // ============================================================

  async importShipping(
    orderId: string,
  ): Promise<{ correoImportedAt: Date; message: string }> {
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
        'La orden no tiene dirección de envío. No se puede importar a MiCorreo.',
      );
    }

    if (order.correoImportedAt) {
      throw new BadRequestException(
        `Esta orden ya fue importada a MiCorreo el ${order.correoImportedAt.toISOString()}`,
      );
    }

    // Calcular peso total para el envío
    const packageWeightGrams = await this.calculatePackageWeight(
      order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    );

    const customerId = this.correoApi.getVarCustomerId();

    // Parsear dirección: "Calle 1234, Ciudad" → streetName, streetNumber
    const addressParts = (order.shippingAddress || '').split(',');
    const streetName = addressParts[0]?.trim() || 'Sin dirección';
    const streetNumber = addressParts[1]?.trim() || 's/n';

    try {
      const result = await this.miCorreoFetch('/shipping/import', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          extOrderId: order.id,
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          // Sender opcional: si no hay env vars CA_SENDER_*, viaja todo en null
          // y MiCorreo usa la dirección registrada del customerId como remitente.
          sender: this.buildSenderPayload(),
          recipient: {
            name: order.customerName || order.customerEmail || 'Cliente',
            phone: order.customerPhone || '',
            cellPhone: order.customerPhone || '',
            email: order.customerEmail || '',
          },
          shipping: {
            deliveryType: 'D', // Siempre domicilio por ahora
            productType: 'CP',
            agency: null,
            address: {
              streetName,
              streetNumber,
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
        }),
      });

      // La respuesta exitosa es { createdAt: "..." } — no devuelve tracking number.
      // El trackingNumber real lo asigna Correo internamente y aparece en el dashboard
      // de MiCorreo. La hermana lo va a copiar manualmente desde ahí (ver bug #2).
      if (!result['ok']) {
        const errData = result['data'] as { message?: string; code?: string };
        const apiMessage = errData?.message ?? 'Unknown';
        const apiCode = errData?.code ?? result['status'];
        throw new Error(`MiCorreo error ${apiCode}: ${apiMessage}`);
      }

      // Marcamos la orden como "importada" pero sin trackingNumber real.
      // El admin cargará el trackingNumber manualmente cuando lo tenga visible
      // en el dashboard de MiCorreo (ver POST /shipping/orders/:id/tracking-number).
      const importedAt = new Date();
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          correoImportedAt: importedAt,
        },
      });

      this.logger.log(
        `Envío importado a MiCorreo: order=${orderId} (tracking pendiente de carga manual)`,
      );

      return {
        correoImportedAt: importedAt,
        message:
          'Envío creado en MiCorreo. Imprimí la doblea desde el dashboard y cargá el número de seguimiento cuando lo tengas.',
      };
    } catch (error) {
      this.logger.error('No se pudo importar el envío a MiCorreo', error);

      // Mapear errores específicos de MiCorreo a mensajes accionables
      const rawMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      const lowercased = rawMessage.toLowerCase();

      if (lowercased.includes('ya fue importada')) {
        throw new BadRequestException(
          'Esta orden ya fue importada a MiCorreo anteriormente.',
        );
      }
      if (
        lowercased.includes('remitente') ||
        lowercased.includes('emisor')
      ) {
        throw new BadRequestException(
          'Faltan datos del remitente. Completá la dirección de tu cuenta en el dashboard de MiCorreo o configurá las variables CA_SENDER_* en el .env.',
        );
      }
      if (lowercased.includes('sucursal') || lowercased.includes('agency')) {
        throw new BadRequestException(
          'Verificá el código de sucursal. El envío no pudo ser importado.',
        );
      }
      if (lowercased.includes('peso')) {
        throw new BadRequestException(
          'Peso del envío inválido. Revisá las dimensiones de los productos.',
        );
      }
      if (lowercased.includes('provincia')) {
        throw new BadRequestException(
          'Provincia inválida o faltante. Verificá el código de provincia del destino.',
        );
      }
      if (lowercased.includes('codigo postal') || lowercased.includes('cp')) {
        throw new BadRequestException(
          'Código postal inválido. Verificá el CP del destino.',
        );
      }

      // Fallback: incluir el mensaje real de MiCorreo en la respuesta para el admin
      throw new ServiceUnavailableException(
        `No se pudo crear el envío en Correo Argentino: ${rawMessage}. Intentá nuevamente o coordiná manualmente.`,
      );
    }
  }

  /**
   * Construye el objeto sender para /shipping/import.
   * Si las variables CA_SENDER_* están configuradas, las usa; si no, devuelve
   * todo en null para que MiCorreo use la dirección registrada del customerId.
   */
  private buildSenderPayload(): {
    name: string | null;
    phone: string | null;
    cellPhone: string | null;
    email: string | null;
    originAddress: {
      streetName: string | null;
      streetNumber: string | null;
      floor: string | null;
      apartment: string | null;
      city: string | null;
      provinceCode: string | null;
      postalCode: string | null;
    };
  } {
    const get = (key: string) =>
      this.config.get<string>(key)?.trim() || null;

    return {
      name: get('CA_SENDER_NAME'),
      phone: get('CA_SENDER_PHONE'),
      cellPhone: get('CA_SENDER_CELL_PHONE'),
      email: get('CA_SENDER_EMAIL'),
      originAddress: {
        streetName: get('CA_SENDER_STREET'),
        streetNumber: get('CA_SENDER_NUMBER'),
        floor: get('CA_SENDER_FLOOR'),
        apartment: get('CA_SENDER_APARTMENT'),
        city: get('CA_SENDER_CITY'),
        provinceCode: get('CA_SENDER_PROVINCE_CODE'),
        postalCode: get('CA_SENDER_POSTAL_CODE'),
      },
    };
  }

  // ============================================================
  // TRACKING — Consulta el estado de un envío importado
  // Usa HTTP directo a /shipping/tracking/{shippingId}
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

    const trackingUrl = `https://www.correoargentino.com.ar/formularios/oas?id=${order.trackingNumber}`;

    // Sin credenciales: devolver solo el link público
    if (!this.isInitialized || !this.correoApi) {
      return {
        trackingNumber: order.trackingNumber,
        events: [],
        message: 'Consultá el seguimiento en el link oficial',
        trackingUrl,
      };
    }

    // Usar el shippingId real (correoShippingId si existe, sino el trackingNumber)
    const shippingId = order.correoShippingId || order.trackingNumber;

    try {
      const result = await this.miCorreoFetch(
        `/shipping/tracking?shippingId=${encodeURIComponent(shippingId)}`,
        { method: 'GET' },
      );

      const data = result['data'] as Record<string, unknown>;

      // La API devuelve un array de eventos o { error, code }
      if (Array.isArray(data)) {
        return {
          trackingNumber: order.trackingNumber,
          events: (data as Array<{ event: string; date: string; branch: string; status: string }>),
          trackingUrl,
        };
      }

      // Error struktur dari API
      if (data['error'] || data['code']) {
        this.logger.warn(
          `Tracking MiCorreo error: ${JSON.stringify(data)}`,
        );
        return {
          trackingNumber: order.trackingNumber,
          events: [],
          message: (data['error'] as string) || (data['message'] as string) || 'No se pudo obtener tracking',
          trackingUrl,
        };
      }

      return {
        trackingNumber: order.trackingNumber,
        events: [],
        trackingUrl,
      };
    } catch (error) {
      this.logger.error('Error obteniendo tracking', error);
      return {
        trackingNumber: order.trackingNumber,
        events: [],
        message: 'Error consultando tracking. Usá el link oficial.',
        trackingUrl,
      };
    }
  }

  // ============================================================
  // CARGA MANUAL DE TRACKING NUMBER (Admin)
  // El admin lo copia desde el dashboard de MiCorreo y lo pega acá.
  // ============================================================

  async setTrackingNumber(
    orderId: string,
    trackingNumber: string,
    correoShippingId?: string,
  ): Promise<{ trackingNumber: string; correoShippingId: string }> {
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      throw new BadRequestException(
        'El número de seguimiento no puede estar vacío.',
      );
    }

    // Validación básica de formato. Los IDs reales de Correo son alfanuméricos
    // de longitud variable (~16-25 chars). No restringimos demasiado por si
    // Correo cambia el formato, pero rechazamos valores claramente inválidos.
    if (trimmed.length < 8 || trimmed.length > 40) {
      throw new BadRequestException(
        'Número de seguimiento inválido. Debe tener entre 8 y 40 caracteres.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, correoImportedAt: true, trackingNumber: true },
    });

    if (!order) throw new NotFoundException(`Orden #${orderId} no encontrada`);

    if (!order.correoImportedAt) {
      throw new BadRequestException(
        'La orden no fue importada a MiCorreo. Importá primero el envío antes de cargar el tracking.',
      );
    }

    // Si correoShippingId no se pasa explícitamente, usamos el mismo trackingNumber
    // (en MiCorreo suelen coincidir — son el mismo identificador para tracking)
    const shippingId = correoShippingId?.trim() || trimmed;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: trimmed,
        correoShippingId: shippingId,
      },
    });

    this.logger.log(
      `Tracking number cargado manualmente: order=${orderId} tracking=${trimmed}`,
    );

    return { trackingNumber: trimmed, correoShippingId: shippingId };
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
