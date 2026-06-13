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
import { Environment } from 'ylazzari-correoargentino/enums';

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
  // HELPER: Validar credenciales mínimas para HTTP directo a MiCorreo
  // (independiente de la librería ylazzari-correoargentino)
  // ============================================================

  /**
   * Devuelve customerId si hay credenciales suficientes para HTTP directo,
   * o `null` si falta alguna. No requiere que la librería esté inicializada
   * — alcanza con CA_USER_TOKEN + CA_PASSWORD_TOKEN + (CA_CUSTOMER_ID env o
   * customerId ya cargado en la librería).
   */
  private getMiCorreoCredentials(): { customerId: string } | null {
    const userToken = this.config.get<string>('CA_USER_TOKEN');
    const passwordToken = this.config.get<string>('CA_PASSWORD_TOKEN');
    if (!userToken || !passwordToken) return null;

    const customerId =
      this.correoApi?.getVarCustomerId() ??
      this.config.get<string>('CA_CUSTOMER_ID');
    if (!customerId) return null;

    return { customerId };
  }

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

    // MiCorreo a veces devuelve HTTP 200 con error en body
    // ({ code, message } en vez de { token, expires }).
    // Parseamos defensivamente para detectar ambos casos.
    const data = (await response.json()) as {
      token?: string;
      expires?: string;
      code?: string;
      message?: string;
    };

    if (!data.token) {
      this.logger.error(
        `MiCorreo /token sin token en la respuesta: ${JSON.stringify(data)}`,
      );
      throw new ServiceUnavailableException(
        `Error autenticando con MiCorreo${
          data.message ? `: ${data.message}` : ''
        }. Verificá CA_USER_TOKEN, CA_PASSWORD_TOKEN y CA_ENVIRONMENT.`,
      );
    }

    this.miCorreoToken = data.token;

    // `expires` puede venir como "2022-04-26 21:16:20" o no venir en absoluto.
    // Si no viene o es inválido, asumimos 30 minutos como cache conservadora.
    const FALLBACK_TTL_MS = 30 * 60_000;
    if (data.expires) {
      const parsed = new Date(data.expires.replace(' ', 'T'));
      if (Number.isNaN(parsed.getTime())) {
        this.logger.warn(
          `MiCorreo /token devolvió expires no parseable: "${data.expires}" — asumiendo cache de 30 minutos`,
        );
        this.miCorreoTokenExpires = new Date(Date.now() + FALLBACK_TTL_MS);
      } else {
        this.miCorreoTokenExpires = parsed;
      }
    } else {
      this.logger.warn(
        'MiCorreo /token no devolvió campo "expires" — asumiendo cache de 30 minutos',
      );
      this.miCorreoTokenExpires = new Date(Date.now() + FALLBACK_TTL_MS);
    }

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

    return {
      ok: response.ok,
      status: response.status,
      data: await response.json(),
    };
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
  // COTIZAR ENVÍO — HTTP directo a /rates
  // Sin deliveredType → MiCorreo devuelve ambas tarifas (domicilio + sucursal)
  // ============================================================

  async getRates(dto: GetShippingRatesDto): Promise<ShippingRatesResponse> {
    // 1. Obtener el peso total del paquete desde las variantes del carrito
    const packageWeightGrams = await this.calculatePackageWeight(dto.items);

    const postalCodeOrigin =
      this.config.get<string>('CA_POSTAL_CODE_ORIGIN') ||
      DEFAULT_POSTAL_CODE_ORIGIN;

    // 2. Validar credenciales mínimas (no requiere lib inicializada)
    const creds = this.getMiCorreoCredentials();
    if (!creds) {
      throw new ServiceUnavailableException(
        'No pudimos cotizar automáticamente el envío con Correo Argentino. Coordiná la cotización manual por WhatsApp.',
      );
    }

    try {
      // 3. Llamar a /rates SIN deliveredType para obtener domicilio (D) + sucursal (S)
      const result = await this.miCorreoFetch('/rates', {
        method: 'POST',
        body: JSON.stringify({
          customerId: creds.customerId,
          postalCodeOrigin,
          postalCodeDestination: dto.postalCodeDestination,
          dimensions: {
            weight: packageWeightGrams,
            height: DEFAULT_DIMENSIONS.height,
            width: DEFAULT_DIMENSIONS.width,
            length: DEFAULT_DIMENSIONS.length,
          },
        }),
      });

      if (!result['ok']) {
        const errData = result['data'] as { message?: string; code?: string };
        this.logger.warn(
          `MiCorreo /rates error ${errData?.code ?? result['status']}: ${errData?.message ?? 'Unknown'}`,
        );
        throw new ServiceUnavailableException(
          'No pudimos cotizar automáticamente el envío con Correo Argentino. Coordiná la cotización manual por WhatsApp.',
        );
      }

      const data = result['data'] as {
        rates?: Array<{
          deliveredType: string;
          productType: string;
          productName: string;
          price: number;
          deliveryTimeMin: string;
          deliveryTimeMax: string;
        }>;
      };

      const rawRates = data.rates ?? [];
      const rates: ShippingRate[] = rawRates.map((rate) => ({
        deliveredType: rate.deliveredType as 'D' | 'S',
        productName: rate.productName,
        price: rate.price,
        deliveryTimeMin: rate.deliveryTimeMin,
        deliveryTimeMax: rate.deliveryTimeMax,
        label: this.buildRateLabel(rate),
      }));

      return { rates, source: 'correo_argentino', packageWeightGrams };
    } catch (error) {
      // Si ya tiramos ServiceUnavailableException arriba, dejá que se propague tal cual
      if (error instanceof ServiceUnavailableException) throw error;
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
    // Validar credenciales mínimas para HTTP directo (no requiere lib inicializada)
    const creds = this.getMiCorreoCredentials();
    if (!creds) {
      throw new BadRequestException(
        'Correo Argentino no está configurado. Configurá CA_USER_TOKEN, CA_PASSWORD_TOKEN y CA_CUSTOMER_ID en el entorno.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
    });

    if (!order) throw new NotFoundException(`Orden #${orderId} no encontrada`);

    if (order.correoImportedAt) {
      throw new BadRequestException(
        `Esta orden ya fue importada a MiCorreo el ${order.correoImportedAt.toISOString()}`,
      );
    }

    if (!order.shippingZip) {
      throw new BadRequestException(
        'La orden no tiene código postal de destino. No se puede importar a MiCorreo.',
      );
    }

    // Determinar tipo de envío Correo (D = domicilio, S = sucursal).
    // Por defecto D si no se especificó (compat con órdenes legacy).
    const deliveryType: 'D' | 'S' =
      order.shippingDeliveryType === 'S' ? 'S' : 'D';

    // Validar requisitos según tipo
    if (deliveryType === 'S' && !order.shippingAgencyCode) {
      throw new BadRequestException(
        'Esta orden es de retiro en sucursal pero no tiene el código de sucursal cargado. Asigná uno antes de importar.',
      );
    }

    if (deliveryType === 'D' && !order.shippingProvinceCode) {
      throw new BadRequestException(
        'La orden no tiene código de provincia. Es obligatorio para envíos a domicilio.',
      );
    }

    // Resolver dirección: preferir campos estructurados, fallback al string legacy
    const legacyParts = (order.shippingAddress || '').split(',');
    const streetName =
      order.shippingStreetName?.trim() ||
      legacyParts[0]?.trim() ||
      'Sin dirección';
    const streetNumber =
      order.shippingStreetNumber?.trim() || legacyParts[1]?.trim() || 's/n';
    const floor = order.shippingFloor?.trim() || '';
    const apartment = order.shippingApartment?.trim() || '';

    // Para domicilio, exigir calle + número explícitos (no aceptar defaults)
    if (
      deliveryType === 'D' &&
      (streetName === 'Sin dirección' || streetNumber === 's/n')
    ) {
      throw new BadRequestException(
        'La orden no tiene calle/altura cargadas. Completá la dirección antes de importar.',
      );
    }

    // Calcular peso total para el envío
    const packageWeightGrams = await this.calculatePackageWeight(
      order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    );

    const customerId = creds.customerId;

    // Valor declarado en ARS — usar toFixed(2) para evitar drift de Prisma.Decimal
    const declaredValue = parseFloat(Number(order.total).toFixed(2));

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
            deliveryType, // 'D' o 'S' según lo elegido por el cliente
            productType: 'CP',
            agency: order.shippingAgencyCode ?? null,
            address: {
              streetName,
              streetNumber,
              floor,
              apartment,
              city: order.shippingCity || '',
              provinceCode: order.shippingProvinceCode ?? '',
              postalCode: order.shippingZip,
            },
            weight: packageWeightGrams,
            declaredValue,
            height: DEFAULT_DIMENSIONS.height,
            length: DEFAULT_DIMENSIONS.length,
            width: DEFAULT_DIMENSIONS.width,
          },
        }),
      });

      // La respuesta exitosa es { createdAt: "..." } — no devuelve tracking number.
      // El trackingNumber real lo asigna Correo internamente y aparece en el dashboard
      // de MiCorreo. El admin lo va a copiar manualmente desde ahí.
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
          'Envío creado en MiCorreo. Imprimí la oblea desde el dashboard y cargá el número de seguimiento cuando lo tengas.',
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
      if (lowercased.includes('remitente') || lowercased.includes('emisor')) {
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
    const get = (key: string) => this.config.get<string>(key)?.trim() || null;

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

    // Sin credenciales mínimas: degradar a solo el link público
    const creds = this.getMiCorreoCredentials();
    if (!creds) {
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
          events: data as Array<{
            event: string;
            date: string;
            branch: string;
            status: string;
          }>,
          trackingUrl,
        };
      }

      // Error struktur dari API
      if (data['error'] || data['code']) {
        this.logger.warn(`Tracking MiCorreo error: ${JSON.stringify(data)}`);
        return {
          trackingNumber: order.trackingNumber,
          events: [],
          message:
            (data['error'] as string) ||
            (data['message'] as string) ||
            'No se pudo obtener tracking',
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
  // SUCURSALES — GET /agencies?provinceCode=X
  // Público (lo usa el checkout cuando el cliente elige retiro en sucursal)
  // ============================================================

  async getAgencies(provinceCode: string): Promise<
    Array<{
      code: string;
      name: string;
      address: string;
      city: string;
      postalCode: string;
      hours: Record<string, { start: string; end: string } | null>;
    }>
  > {
    if (!provinceCode || provinceCode.length !== 1) {
      throw new BadRequestException(
        'provinceCode requerido (1 letra: A, B, C, ..., X = Córdoba, etc.)',
      );
    }

    const creds = this.getMiCorreoCredentials();
    if (!creds) {
      throw new ServiceUnavailableException(
        'Correo Argentino no está configurado. No se pueden listar sucursales.',
      );
    }

    try {
      const url =
        `/agencies?customerId=${encodeURIComponent(creds.customerId)}` +
        `&provinceCode=${encodeURIComponent(provinceCode)}`;
      const result = await this.miCorreoFetch(url, { method: 'GET' });

      if (!result['ok']) {
        const errData = result['data'] as { message?: string; code?: string };
        this.logger.warn(
          `MiCorreo /agencies error ${errData?.code ?? result['status']}: ${errData?.message ?? 'Unknown'}`,
        );
        throw new ServiceUnavailableException(
          'No pudimos listar sucursales de Correo Argentino. Intentá nuevamente.',
        );
      }

      const data = result['data'] as Array<{
        code: string;
        name: string;
        services?: { packageReception?: boolean };
        location?: {
          address?: {
            streetName?: string;
            streetNumber?: string;
            city?: string;
            postalCode?: string;
          };
        };
        hours?: Record<string, { start: string; end: string } | null>;
        status?: string;
      }>;

      if (!Array.isArray(data)) {
        return [];
      }

      // Filtrar sucursales activas con recepción de paquetes habilitada
      // y mapear a una forma simple para el frontend
      return data
        .filter(
          (a) =>
            a.status === 'ACTIVE' && a.services?.packageReception !== false,
        )
        .map((a) => ({
          code: a.code,
          name: a.name,
          address:
            [a.location?.address?.streetName, a.location?.address?.streetNumber]
              .filter(Boolean)
              .join(' ') || '',
          city: a.location?.address?.city || '',
          postalCode: a.location?.address?.postalCode || '',
          hours: a.hours || {},
        }));
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('Error listando sucursales de Correo Argentino', error);
      throw new ServiceUnavailableException(
        'No pudimos listar sucursales de Correo Argentino. Intentá nuevamente.',
      );
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

    // La API de MiCorreo exige integers en weight/height/length/width.
    // Redondeamos y forzamos un mínimo de 1g.
    return Math.max(Math.round(totalWeight), 1);
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
