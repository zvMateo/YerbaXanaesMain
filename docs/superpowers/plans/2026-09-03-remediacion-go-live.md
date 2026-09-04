# Remediación go-live YerbaXanaes — Plan de Implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar tarea por tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Goal:** Dejar la tienda en condiciones de vender: eliminar los 3 bloqueantes de cobro, cerrar los 3 agujeros de dinero y frenar la corrupción de inventario, con piezas centralizadas en vez de parches puntuales.

**Architecture:** El eje del plan es mover el cálculo de precios a **una sola fuente de verdad server-side** (`CheckoutPricingService`) que el frontend consulta en vez de recalcular. Eso mata de raíz cuatro defectos que hoy serían cuatro parches. El segundo eje es hacer **explícita la reserva y liberación de stock** (`InventoryReservationService`), de modo que toda transición que libere inventario pase por un único lugar idempotente. El resto son piezas transversales: un helper de fetch con timeout, un filtro global de errores de Prisma y un endpoint público de configuración.

**Tech Stack:** NestJS 11 · Prisma 6 · PostgreSQL · Next.js 16 (App Router) · React 19 · TanStack Query v5 · Zustand · Tailwind v4 · Jest · Bun 1.3.8 · Turborepo

**Spec:** Auditoría del 2026-09-03. Artifact: https://claude.ai/code/artifact/2e9a1a05-ea06-406c-b5a2-defd21c0cb43 — cada tarea cita el archivo:línea del hallazgo que resuelve.

---

## Global Constraints

- **Package manager: Bun.** Nunca `npm` ni `yarn`. Comandos desde la raíz del monorepo salvo indicación.
- **API:** DTOs con `class-validator` (nunca Zod en DTOs de Nest). Excepciones tipadas de Nest (`NotFoundException`, `BadRequestException`), nunca `throw new Error`.
- **Prisma:** siempre `select`/`include` explícito. Toda mutación multi-paso dentro de `$transaction`. Órdenes con soft delete (`deletedAt`), nunca hard delete.
- **Envelope de respuesta:** `{ data: T, meta?: object, message?: string }`.
- **Front:** Zod + React Hook Form. Errores siempre visibles vía `toast.error` de Sonner, nunca silenciados.
- **Estilo:** API en kebab-case con comillas simples (Prettier). Next/TSX con comillas dobles.
- **Commits:** conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- **Git:** trabajar en la rama `fix/go-live-remediacion`. **Nunca** hacer `push`, `merge` ni `rebase` sin autorización explícita de Mateo.
- **Precios:** todos los montos en ARS con 2 decimales. `Decimal(10,2)` en Prisma. Redondear con `Math.round(x * 100) / 100` antes de persistir.
- **Regla de oro:** el frontend nunca decide un precio. Muestra lo que el server le dice.

---

## Estado inicial verificado (2026-09-03)

Corrido en el working tree de `feat/design-system-v2`:

| Comando | Resultado |
|---|---|
| `bun run check-types` | Pasa, 5/5 paquetes |
| `bun run build` | Pasa |
| `bun run test` (API) | 1 de 72 falla (`getTransferInfo`, spec desactualizado) |
| `bun run lint` | Roto: `@repo/ui` aborta por `semver` corrupto + 29 errores en API |

Hay **80 archivos modificados sin commitear**. La Tarea 0.1 los resuelve antes de tocar nada.

---

## File Structure

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `apps/api/src/checkout/checkout-pricing.service.ts` | Única fuente de verdad de subtotal, envío, cupón y total. Sin efectos secundarios. |
| `apps/api/src/checkout/checkout-pricing.service.spec.ts` | Tests unitarios del pricing. |
| `apps/api/src/checkout/checkout.controller.ts` | `POST /checkout/quote` público. |
| `apps/api/src/checkout/checkout.module.ts` | Wiring del módulo. |
| `apps/api/src/checkout/dto/quote.dto.ts` | DTO de entrada de la cotización. |
| `apps/api/src/inventory/inventory-reservation.service.ts` | `reserve()` / `release()` idempotentes sobre stock. |
| `apps/api/src/inventory/inventory-reservation.service.spec.ts` | Tests de reserva y liberación. |
| `apps/api/src/common/fetch-with-timeout.ts` | Helper único de fetch con `AbortSignal.timeout`. |
| `apps/api/src/common/prisma-exception.filter.ts` | Mapeo P2025→404, P2002→409, P2003→400. |
| `apps/api/src/common/prisma-exception.filter.spec.ts` | Tests del filtro. |
| `apps/api/src/settings/settings-public.controller.ts` | `GET /settings/public` sin guard. |
| `apps/backoffice/lib/throw-api-error.ts` | Helper que propaga el mensaje real del backend. |
| `apps/ecommerce/hooks/use-store-settings.ts` | Hook que consume la config pública. |
| `apps/ecommerce/hooks/use-checkout-quote.ts` | Hook que consume `POST /checkout/quote`. |

### Archivos modificados principales

| Archivo | Qué cambia |
|---|---|
| `apps/api/src/payments/payments.service.ts` | Los 4 caminos de creación de orden delegan en `CheckoutPricingService`. `existingOrderId` blindado. Webhook re-lanza errores. |
| `apps/api/src/payments/payments.controller.ts` | Se elimina `POST /payments/process`. |
| `apps/api/src/orders/orders.service.ts` | Transiciones de estado liberan stock vía `InventoryReservationService`. |
| `apps/api/src/payments/payments-sync.service.ts` | Ídem, y deja pasar webhooks de reembolso. |
| `apps/api/src/shipping/shipping.service.ts` | Timeouts y advertencia sobre `getRates`. |
| `apps/ecommerce/lib/api.ts` | Guarda del fallback corregida. |
| `apps/ecommerce/components/checkout-form.tsx` | Deja de calcular totales; consume la cotización del server. |
| `apps/backoffice/providers/query-provider.tsx` | Se saca `placeholderData` global. |

---

## Fases

| Fase | Tareas | Qué desbloquea |
|---|---|---|
| 0 | 0.1 – 0.3 | Red de seguridad: CI verde antes de tocar lógica |
| 1 | 1.1 – 1.4 | `CheckoutPricingService` — mata 4 defectos de precio |
| 2 | 2.1 – 2.3 | Config pública y front sin cálculos propios |
| 3 | 3.1 – 3.2 | Cierre de los agujeros de dinero |
| 4 | 4.1 – 4.5 | Integridad de inventario |
| 5 | 5.1 – 5.4 | Robustez: timeouts, errores HTTP, 404 |
| 6 | 6.1 – 6.3 | Panel de la clienta |
| 7 | 7.1 – 7.2 | Responsive |
| 8 | 8.1 | Verificación final |

**Fases 1 a 4 son secuenciales.** Las fases 5, 6 y 7 son independientes entre sí.

---

# FASE 0 — Red de seguridad

Sin CI verde no hay forma de saber si un cambio rompió algo. Esta fase va primera y no se saltea.

### Task 0.1: Commitear el working tree y abrir la rama

**Files:**
- Modify: ninguno (operación de git)

**Interfaces:**
- Produces: rama `fix/go-live-remediacion` con base limpia.

- [ ] **Step 1: Revisar qué hay sin commitear**

```bash
cd /c/Users/Usuario/Documents/Proyectos-propios/YerbaXanaesMain
git status --short
git diff --stat
```

Esperado: ~80 archivos, mayormente del design-system v2, más cambios en `payments.service.ts`, `orders.service.ts` y `shipping.service.ts`.

- [ ] **Step 2: Preguntarle a Mateo antes de commitear**

Ese working tree es trabajo suyo sin revisar. **No commitear sin su OK explícito.** Mostrale el `git status` y preguntá si va todo en un commit o quiere separarlo.

- [ ] **Step 3: Commitear con su autorización**

```bash
git add -A
git commit -m "chore: consolidar working tree de design-system v2 antes de remediación"
```

- [ ] **Step 4: Crear la rama de trabajo**

```bash
git checkout -b fix/go-live-remediacion
```

---

### Task 0.2: Arreglar el test que falla

**Files:**
- Modify: `apps/api/src/payments/payments.service.spec.ts`

El test espera `{ transferInstructions: null }` pero `getTransferInfo()` devuelve `{ transferInstructions, test }`. El código es correcto; el spec quedó viejo.

- [ ] **Step 1: Reproducir el fallo**

```bash
cd apps/api && bun run test 2>&1 | grep -A 15 "getTransferInfo"
```

Esperado: FAIL por diferencia de forma del objeto.

- [ ] **Step 2: Leer qué devuelve realmente el método**

```bash
grep -n "getTransferInfo" -A 25 apps/api/src/payments/payments.service.ts
```

- [ ] **Step 3: Actualizar la aserción del spec**

Cambiar la igualdad estricta por una que contemple el campo real:

```ts
expect(result).toEqual(
  expect.objectContaining({ transferInstructions: null }),
);
```

- [ ] **Step 4: Verificar verde**

```bash
cd apps/api && bun run test
```

Esperado: 72 de 72 pasan.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/payments.service.spec.ts
git commit -m "test: alinear spec de getTransferInfo con el shape actual"
```

---

### Task 0.3: Dejar el lint en verde

**Files:**
- Modify: `apps/api/package.json` (script `lint`)
- Modify: archivos de la API con errores de ESLint
- Modify: `packages/ui` (reinstalar dependencias)

**Interfaces:**
- Produces: `bun run lint` con exit 0 en los 7 paquetes.

- [ ] **Step 1: Arreglar la dependencia corrupta de `@repo/ui`**

```bash
cd /c/Users/Usuario/Documents/Proyectos-propios/YerbaXanaesMain
rm -rf node_modules packages/ui/node_modules
bun install
bun run lint 2>&1 | tail -30
```

Si `@repo/ui` sigue fallando con `Cannot find module './functions/coerce'`, el paquete `semver` quedó mal escrito en el store de Bun:

```bash
rm -rf ~/.bun/install/cache
bun install --force
```

- [ ] **Step 2: Sacar el `--fix` del script de lint de la API**

Un lint que modifica archivos no sirve como verificación. En `apps/api/package.json`:

```json
"lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
"lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
```

- [ ] **Step 3: Aplicar el autofix una vez y ver qué queda**

```bash
cd apps/api && bun run lint:fix; bun run lint 2>&1 | tail -40
```

- [ ] **Step 4: Resolver los errores restantes**

Los 29 errores son de tres familias:

1. `@typescript-eslint/restrict-template-expressions` en `payments.service.ts:818` y `shipping.service.ts:355,528,804` — interpolación de `unknown`/`never` en template strings. Fix: `${String(x)}` o narrowing previo.
2. `@typescript-eslint/require-await` en specs — métodos `async` sin `await`. Fix: sacar el `async`.
3. `@typescript-eslint/unbound-method` en mocks de spec. Fix: usar arrow functions en los mocks.

- [ ] **Step 5: Verificar**

```bash
cd /c/Users/Usuario/Documents/Proyectos-propios/YerbaXanaesMain
bun run lint && bun run check-types && bun run build
```

Esperado: los tres en verde.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: dejar lint del monorepo en verde y separar lint:fix"
```

---

# FASE 1 — CheckoutPricingService

La pieza central. Hoy el precio se calcula en cinco lugares distintos (cuatro en el server, uno en el cliente) y ninguno coincide del todo.

**Defectos que elimina:**
- Envío a domicilio rechazado al pagar (`payments.service.ts:656`)
- Cupón porcentual + envío = rechazo (`payments.service.ts:2065` vs `checkout-form.tsx:62`)
- `shippingCost` manipulable en 2 de 3 caminos (`payments.service.ts:613,725`)
- Envío gratis prometido y no aplicado (`cart-store.ts:46`)

### Task 1.1: Crear `CheckoutPricingService` con el cálculo puro

**Files:**
- Create: `apps/api/src/checkout/checkout-pricing.service.ts`
- Create: `apps/api/src/checkout/checkout-pricing.service.spec.ts`
- Create: `apps/api/src/checkout/checkout.module.ts`

**Interfaces:**
- Consumes: `CouponsService.validate(code: string, orderAmount: number)`, `ShippingService.getRates(dto)`, `SettingsService.get()`, `PrismaService`.
- Produces:

```ts
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

export interface QuoteInput {
  orderItems: { variantId: string; quantity: number }[];
  deliveryType: 'shipping' | 'pickup';
  shippingDeliveryType?: 'D' | 'S';
  shippingZip?: string;
  shippingProductName?: string;
  couponCode?: string;
}
```

**Reglas del cálculo, en este orden exacto:**

1. `itemsSubtotal` = suma de `unitPrice × quantity` leyendo el precio **de la base**, nunca del input.
2. `shippingCost`:
   - `deliveryType === 'pickup'` → `0`, provider `pickup`.
   - si no → cotizar con Correo y **filtrar por `shippingDeliveryType`**. Si viene `shippingProductName`, elegir esa tarifa; si no, la más barata **dentro del tipo elegido**.
   - si Correo falla → `settings.shippingFlatRate`, provider `manual_quote_required`.
3. **Envío gratis:** si `itemsSubtotal >= settings.freeShippingThreshold` y es envío → `shippingCost = 0`, `freeShippingApplied = true`.
4. **Cupón:** validar contra `itemsSubtotal` **solo**, nunca contra el envío. Si es inválido, `couponDiscount = 0` y `couponError` con el mensaje: no se silencia.
5. `total = max(0, itemsSubtotal + shippingCost - couponDiscount)`, redondeado a 2 decimales.

> Los puntos 2 y 4 son las correcciones de fondo. El 2 arregla el bloqueante de domicilio; el 4 arregla el bloqueante del cupón y de paso deja de regalar descuento sobre el flete.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `apps/api/src/checkout/checkout-pricing.service.spec.ts`:

```ts
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
          { id: 'var-1', price: 10000, product: { name: 'Yerba Xanaes 500g' } },
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

  it('elige la tarifa del tipo de envío pedido, no la más barata global', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [
        { deliveredType: 'S', productName: 'Clásico Sucursal', price: 6500 },
        { deliveredType: 'D', productName: 'Clásico Domicilio', price: 9000 },
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

  it('aplica el descuento porcentual solo sobre los productos, nunca sobre el envío', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clásico', price: 8500 }],
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
    expect(quote.total).toBe(17500); // 10000 + 8500 - 1000
  });

  it('aplica envío gratis al superar el umbral de la configuración', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      { id: 'var-1', price: 20000, product: { name: 'Combo' } },
    ]);
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clásico', price: 8500 }],
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
    shipping.getRates.mockRejectedValue(new Error('MiCorreo caído'));

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
    });

    expect(quote.shippingProvider).toBe('manual_quote_required');
    expect(quote.shippingCost).toBe(1500);
  });

  it('retiro en local no cotiza envío', async () => {
    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'pickup',
    });

    expect(shipping.getRates).not.toHaveBeenCalled();
    expect(quote.shippingCost).toBe(0);
    expect(quote.shippingProvider).toBe('pickup');
  });

  it('reporta el cupón inválido en vez de silenciarlo', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clásico', price: 8500 }],
    });
    coupons.validate.mockRejectedValue(new BadRequestException('Cupón vencido'));

    const quote = await service.quote({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
      couponCode: 'VENCIDO',
    });

    expect(quote.couponDiscount).toBe(0);
    expect(quote.couponError).toBe('Cupón vencido');
  });

  it('ignora el precio que mande el cliente y usa el de la base', async () => {
    shipping.getRates.mockResolvedValue({
      rates: [{ deliveredType: 'D', productName: 'Clásico', price: 8500 }],
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
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd apps/api && bun run test -- checkout-pricing
```

Esperado: FAIL, `Cannot find module './checkout-pricing.service'`.

- [ ] **Step 3: Implementar el servicio**

Crear `apps/api/src/checkout/checkout-pricing.service.ts`:

```ts
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

export interface QuoteInput {
  orderItems: { variantId: string; quantity: number }[];
  deliveryType: 'shipping' | 'pickup';
  shippingDeliveryType?: 'D' | 'S';
  shippingZip?: string;
  shippingProductName?: string;
  couponCode?: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

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

  /** Precio siempre desde la base. El input del cliente solo aporta ids y cantidades. */
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
    storeSettings: { shippingFlatRate: number; freeShippingThreshold: number },
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

      // Solo tarifas del tipo elegido por el cliente. Comparar contra el
      // mínimo global mezclaba domicilio con sucursal y rechazaba todo pago
      // a domicilio.
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
        `Correo Argentino no cotizó, se usa tarifa plana: ${String(error)}`,
      );
      return {
        shippingCost: storeSettings.shippingFlatRate,
        shippingProvider: 'manual_quote_required',
        freeShippingApplied: false,
      };
    }
  }

  /** El cupón se valida contra los productos, nunca contra el envío. */
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
      const message = error instanceof Error ? error.message : 'Cupón inválido';
      return { couponId: null, couponDiscount: 0, couponError: message };
    }
  }
}
```

- [ ] **Step 4: Crear el módulo**

Crear `apps/api/src/checkout/checkout.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CheckoutPricingService } from './checkout-pricing.service';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CouponsModule, ShippingModule, SettingsModule],
  providers: [CheckoutPricingService],
  exports: [CheckoutPricingService],
})
export class CheckoutModule {}
```

Verificar que `CouponsModule`, `ShippingModule` y `SettingsModule` exporten sus servicios. Si alguno no lo hace, agregarle el `exports`.

- [ ] **Step 5: Correr los tests**

```bash
cd apps/api && bun run test -- checkout-pricing
```

Esperado: los 7 tests pasan.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/checkout/
git commit -m "feat(checkout): CheckoutPricingService como unica fuente de verdad de precios"
```

---

### Task 1.2: Exponer `POST /checkout/quote`

**Files:**
- Create: `apps/api/src/checkout/dto/quote.dto.ts`
- Create: `apps/api/src/checkout/checkout.controller.ts`
- Modify: `apps/api/src/checkout/checkout.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `CheckoutPricingService.quote(input: QuoteInput): Promise<CheckoutQuote>`
- Produces: `POST /checkout/quote` → `{ data: CheckoutQuote }`, público, throttle 30/min.

- [ ] **Step 1: Crear el DTO**

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuoteItemDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}

export class QuoteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  orderItems!: QuoteItemDto[];

  @IsIn(['shipping', 'pickup'])
  deliveryType!: 'shipping' | 'pickup';

  @IsOptional()
  @IsIn(['D', 'S'])
  shippingDeliveryType?: 'D' | 'S';

  @IsOptional()
  @Matches(/^\d{4,8}$/, { message: 'Código postal inválido' })
  shippingZip?: string;

  @IsOptional()
  @IsString()
  shippingProductName?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
```

> `ArrayMaxSize(100)` y el `Matches` sobre el CP cierran de paso el hueco de amplificación de `/shipping/rates` señalado en la auditoría.

- [ ] **Step 2: Crear el controller**

```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckoutPricingService } from './checkout-pricing.service';
import { QuoteDto } from './dto/quote.dto';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly pricing: CheckoutPricingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Cotizar un carrito',
    description:
      'Devuelve el total autoritativo: productos, envío y cupón. El frontend muestra estos valores, no los calcula.',
  })
  @ApiResponse({ status: 200, description: 'Cotización calculada' })
  async quote(@Body() dto: QuoteDto) {
    const quote = await this.pricing.quote(dto);
    return { data: quote, message: 'Cotización calculada' };
  }
}
```

- [ ] **Step 3: Registrar el controller y el módulo**

En `checkout.module.ts` agregar `controllers: [CheckoutController]`. En `apps/api/src/app.module.ts`, importar `CheckoutModule` y sumarlo al array `imports`.

- [ ] **Step 4: Verificar a mano contra la API levantada**

```bash
cd /c/Users/Usuario/Documents/Proyectos-propios/YerbaXanaesMain
docker compose up -d
bun run dev
```

En otra terminal, con un `variantId` real de la base:

```bash
curl -s -X POST http://localhost:3001/checkout/quote \
  -H 'Content-Type: application/json' \
  -d '{"orderItems":[{"variantId":"<UUID_REAL>","quantity":1}],"deliveryType":"pickup"}' | jq
```

Esperado: `data.shippingCost === 0` y `data.total === data.itemsSubtotal`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/checkout/ apps/api/src/app.module.ts
git commit -m "feat(checkout): endpoint publico POST /checkout/quote"
```

---

### Task 1.3: Migrar los cuatro caminos de pago al pricing centralizado

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts`
- Modify: `apps/api/src/payments/payments.module.ts`
- Modify: `apps/api/src/payments/payments.service.spec.ts`

**Interfaces:**
- Consumes: `CheckoutPricingService.quote()`
- Produces: `computeCheckoutTotals` eliminado; los cuatro caminos usan una sola cotización.

- [ ] **Step 1: Escribir el test que falla**

Agregar a `payments.service.spec.ts`:

```ts
describe('pricing centralizado', () => {
  it('brickInit persiste el envío cotizado por el server, no el del cliente', async () => {
    pricingMock.quote.mockResolvedValue({
      lines: [
        {
          variantId: 'var-1',
          quantity: 1,
          unitPrice: 10000,
          lineTotal: 10000,
          productName: 'Yerba',
        },
      ],
      itemsSubtotal: 10000,
      shippingCost: 9000,
      shippingProvider: 'correo_argentino',
      freeShippingApplied: false,
      couponCode: null,
      couponId: null,
      couponDiscount: 0,
      couponError: null,
      total: 19000,
    });

    await service.brickInit({
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
      customerEmail: 'test@example.com',
      deliveryType: 'shipping',
      shippingDeliveryType: 'D',
      shippingZip: '5000',
      shippingCost: 0, // el cliente intenta envío gratis
    } as any);

    const created = createPendingOrderSpy.mock.calls[0][0];
    expect(created.shippingCost).toBe(9000);
    expect(created.totalAmount).toBe(19000);
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
cd apps/api && bun run test -- payments.service
```

Esperado: FAIL, hoy persiste el `shippingCost: 0` del cliente.

- [ ] **Step 3: Inyectar el servicio**

En `payments.module.ts`, importar `CheckoutModule`. En el constructor de `PaymentsService`, agregar `private readonly pricing: CheckoutPricingService`.

- [ ] **Step 4: Reemplazar `computeCheckoutTotals`**

Borrar el método privado `computeCheckoutTotals` (`payments.service.ts:2055-2085`) y reemplazar sus 4 llamadores por:

```ts
const quote = await this.pricing.quote({
  orderItems: dto.orderItems,
  deliveryType: dto.deliveryType === 'pickup' ? 'pickup' : 'shipping',
  shippingDeliveryType: dto.shippingDeliveryType as 'D' | 'S' | undefined,
  shippingZip: dto.shippingZip,
  shippingProductName: dto.shippingProductName,
  couponCode: dto.couponCode,
});

if (quote.couponError) {
  throw new BadRequestException(quote.couponError);
}
```

Después usar `quote.shippingCost`, `quote.total` y `quote.couponId` en lugar de las variables locales.

**Importante:** el `dto.shippingCost` del cliente **deja de leerse por completo**. Buscar y eliminar todas las referencias:

```bash
grep -n "dto.shippingCost\|shippingCostRaw" apps/api/src/payments/payments.service.ts
```

- [ ] **Step 5: Eliminar el bloque de re-cotización viejo**

Borrar `payments.service.ts:646-688` (la re-cotización con `cheapestRate` y el `BadRequestException` de "El costo de envío cambió"). Ya no hace falta: el server calcula el envío una sola vez y es el único que lo hace.

- [ ] **Step 6: Correr los tests**

```bash
cd apps/api && bun run test
```

Esperado: todo verde, incluido el nuevo.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/payments/
git commit -m "fix(payments): centralizar precios y arreglar rechazo de envio a domicilio"
```

---

### Task 1.4: Documentar el contrato de `getRates`

**Files:**
- Modify: `apps/api/src/shipping/shipping.service.ts:314-320`
- Modify: `apps/api/src/shipping/shipping.service.spec.ts`

`getRates` debe seguir devolviendo ambas modalidades: el checkout las necesita para que el cliente elija. Lo que hay que dejar escrito es que el consumidor está obligado a filtrar.

- [ ] **Step 1: Escribir el test que fija el contrato**

```ts
it('devuelve las tarifas de ambos tipos para que el front las muestre', async () => {
  // mock de MiCorreo con una tarifa D y una S
  const result = await service.getRates({
    items: [{ variantId: 'var-1', quantity: 1 }],
    postalCodeDestination: '5000',
  });

  expect(result.rates.map((r) => r.deliveredType).sort()).toEqual(['D', 'S']);
});
```

- [ ] **Step 2: Agregar la advertencia sobre el método**

```ts
/**
 * Cotiza sin `deliveredType`, así que devuelve domicilio (D) y sucursal (S)
 * juntas para que el checkout las muestre.
 *
 * ⚠️ Quien consuma esto DEBE filtrar por el tipo que eligió el cliente antes
 * de comparar precios. Tomar el mínimo global mezcla D con S y rompe el pago
 * a domicilio. El filtrado correcto vive en CheckoutPricingService.
 */
```

- [ ] **Step 3: Tests verdes y commit**

```bash
cd apps/api && bun run test -- shipping
git add apps/api/src/shipping/
git commit -m "docs(shipping): advertir que getRates devuelve D y S mezclados"
```

---

# FASE 2 — Configuración real y frontend sin cálculos

### Task 2.1: `GET /settings/public`

**Files:**
- Create: `apps/api/src/settings/settings-public.controller.ts`
- Modify: `apps/api/src/settings/settings.module.ts`

**Interfaces:**
- Produces: `GET /settings/public` → `{ data: PublicStoreSettings }`, sin guard.

```ts
export interface PublicStoreSettings {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  shippingEnabled: boolean;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  paymentMercadoPago: boolean;
  paymentCash: boolean;
  paymentTransfer: boolean;
}
```

> **No exponer** `email`, `notificationEmail`, `lowStockAlert` ni `lowStockThreshold`: son internos.

- [ ] **Step 1: Crear el controller**

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Configuración pública de la tienda',
    description:
      'Subconjunto sin datos internos, consumido por el ecommerce para saber qué medios de pago y qué reglas de envío están activos.',
  })
  async getPublic() {
    const s = await this.settings.get();
    return {
      data: {
        businessName: s.businessName,
        phone: s.phone,
        address: s.address,
        city: s.city,
        shippingEnabled: s.shippingEnabled,
        shippingFlatRate: s.shippingFlatRate,
        freeShippingThreshold: s.freeShippingThreshold,
        paymentMercadoPago: s.paymentMercadoPago,
        paymentCash: s.paymentCash,
        paymentTransfer: s.paymentTransfer,
      },
      message: 'Configuración pública obtenida',
    };
  }
}
```

- [ ] **Step 2: Registrarlo**

En `settings.module.ts`, agregar `SettingsPublicController` al array `controllers`.

> Cuidado con el orden de rutas: `GET /settings/public` debe declararse **antes** que cualquier `GET /settings/:id` si existiera. Verificar con `grep -n "@Get" apps/api/src/settings/settings.controller.ts`.

- [ ] **Step 3: Verificar que no exige auth**

```bash
curl -s http://localhost:3001/settings/public | jq
```

Esperado: 200 con el objeto, sin token.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/settings/
git commit -m "feat(settings): endpoint publico con la config que consume la tienda"
```

---

### Task 2.2: El server valida los medios de pago habilitados

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts` (métodos `offlineCheckout` y `brickInit`)
- Modify: `apps/api/src/payments/payments.service.spec.ts`

Hoy apagar "Efectivo" en el panel no tiene efecto: el server nunca consulta los toggles.

- [ ] **Step 1: Escribir el test**

```ts
it('rechaza efectivo cuando está deshabilitado en la configuración', async () => {
  settingsMock.get.mockResolvedValue({
    paymentCash: false,
    paymentTransfer: true,
    paymentMercadoPago: true,
    shippingFlatRate: 1500,
    freeShippingThreshold: 15000,
  });

  await expect(
    service.offlineCheckout({
      paymentProvider: 'CASH',
      deliveryType: 'pickup',
      customerEmail: 'test@example.com',
      orderItems: [{ variantId: 'var-1', quantity: 1 }],
    } as any),
  ).rejects.toThrow('El pago en efectivo no está disponible');
});
```

- [ ] **Step 2: Verificar que falla**

```bash
cd apps/api && bun run test -- payments.service
```

- [ ] **Step 3: Implementar el guard de método de pago**

Al principio de `offlineCheckout`, antes de crear nada:

```ts
const storeSettings = await this.settings.get();

if (dto.paymentProvider === PaymentProvider.CASH && !storeSettings.paymentCash) {
  throw new BadRequestException(
    'El pago en efectivo no está disponible en este momento.',
  );
}

if (
  dto.paymentProvider === PaymentProvider.TRANSFER &&
  !storeSettings.paymentTransfer
) {
  throw new BadRequestException(
    'El pago por transferencia no está disponible en este momento.',
  );
}
```

Y el equivalente al principio de `brickInit`:

```ts
if (!storeSettings.paymentMercadoPago) {
  throw new BadRequestException(
    'El pago con Mercado Pago no está disponible en este momento.',
  );
}
```

- [ ] **Step 4: Tests verdes y commit**

```bash
cd apps/api && bun run test
git add apps/api/src/payments/
git commit -m "fix(payments): respetar los toggles de medios de pago server-side"
```

---

### Task 2.3: El frontend deja de calcular precios

**Files:**
- Create: `apps/ecommerce/hooks/use-store-settings.ts`
- Create: `apps/ecommerce/hooks/use-checkout-quote.ts`
- Modify: `apps/ecommerce/components/checkout-form.tsx`
- Modify: `apps/ecommerce/components/checkout/payment-method-selector.tsx`
- Modify: `apps/ecommerce/components/cart-drawer.tsx`
- Modify: `apps/ecommerce/stores/cart-store.ts`

**Interfaces:**
- Consumes: `POST /checkout/quote`, `GET /settings/public`
- Produces: `useStoreSettings()`, `useCheckoutQuote(input)`

- [ ] **Step 1: Crear `use-store-settings.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface PublicStoreSettings {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  shippingEnabled: boolean;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  paymentMercadoPago: boolean;
  paymentCash: boolean;
  paymentTransfer: boolean;
}

export function useStoreSettings() {
  return useQuery<PublicStoreSettings>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/settings/public`);
      if (!res.ok) throw new Error("No se pudo cargar la configuración");
      const json = await res.json();
      return json.data as PublicStoreSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Crear `use-checkout-quote.ts`**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface CheckoutQuote {
  itemsSubtotal: number;
  shippingCost: number;
  shippingProvider: "correo_argentino" | "pickup" | "manual_quote_required";
  freeShippingApplied: boolean;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  total: number;
}

export interface QuoteInput {
  orderItems: { variantId: string; quantity: number }[];
  deliveryType: "shipping" | "pickup";
  shippingDeliveryType?: "D" | "S";
  shippingZip?: string;
  shippingProductName?: string;
  couponCode?: string;
}

export function useCheckoutQuote(input: QuoteInput | null) {
  return useQuery<CheckoutQuote>({
    queryKey: ["checkout-quote", input],
    enabled: input !== null && input.orderItems.length > 0,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/checkout/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "No se pudo cotizar el pedido");
      }
      const json = await res.json();
      return json.data as CheckoutQuote;
    },
  });
}
```

- [ ] **Step 3: Reemplazar el cálculo local en `checkout-form.tsx`**

Borrar la línea 401 (`const brickAmount = Math.max(0, total + shippingCost - couponDiscount)`) y la validación local de cupón de las líneas 59-63.

En su lugar:

```tsx
const quote = useCheckoutQuote(
  items.length > 0
    ? {
        orderItems: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        deliveryType: watch("deliveryType") === "pickup" ? "pickup" : "shipping",
        shippingDeliveryType: watch("shippingDeliveryType"),
        shippingZip: watch("zipCode"),
        shippingProductName: watch("shippingProductName"),
        couponCode: appliedCoupon ?? undefined,
      }
    : null,
);

const brickAmount = quote.data?.total ?? 0;
```

Mostrar `quote.data.couponError` con `toast.error` cuando exista, y bloquear el avance mientras `quote.isLoading`.

- [ ] **Step 4: Cablear los medios de pago a la configuración**

En `payment-method-selector.tsx`, reemplazar la lista hardcodeada de las líneas 238-266:

```tsx
const { data: settings } = useStoreSettings();

const methods = [
  ...(settings?.paymentMercadoPago !== false
    ? [{ id: "mercadopago" as const, label: "Mercado Pago" /* ... */ }]
    : []),
  ...(settings?.paymentTransfer !== false && transferEnabled
    ? [{ id: "transfer" as const /* ... */ }]
    : []),
  ...(settings?.paymentCash !== false && isPickup
    ? [{ id: "cash" as const /* ... */ }]
    : []),
];
```

> El `!== false` hace que, si la configuración todavía no cargó, el método se muestre. El server igual valida (Tarea 2.2), así que no hay riesgo de aceptar un método apagado.

- [ ] **Step 5: Cablear el umbral de envío gratis del carrito**

En `cart-store.ts`, borrar `freeShippingThreshold: 15000` de la línea 46 y todo lo que lo lea del store.

En `cart-drawer.tsx`:

```tsx
const { data: settings } = useStoreSettings();
const threshold = settings?.freeShippingThreshold ?? null;
```

Y **no renderizar la barra de envío gratis** mientras `threshold === null`. Así el carrito nunca promete algo que el checkout no vaya a cumplir.

- [ ] **Step 6: Verificar los tres caminos a mano**

Con `bun run dev` y la base levantada, en http://localhost:3000:

1. Carrito por debajo del umbral → checkout → envío a domicilio → CP `5000` → elegir tarifa → **el total del resumen debe coincidir con el del Brick**.
2. Carrito por encima del umbral → el envío debe figurar en $0 y la barra decirlo.
3. Cupón porcentual con envío pago → el descuento se aplica solo sobre productos y **el pago no se rechaza**.

- [ ] **Step 7: Commit**

```bash
git add apps/ecommerce/
git commit -m "fix(ecommerce): consumir cotizacion y config del server en vez de calcular"
```

---

# FASE 3 — Cerrar los agujeros de dinero

### Task 3.1: Blindar `existingOrderId`

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts:602-727`
- Modify: `apps/api/src/payments/payments.service.spec.ts`

Hoy el segundo paso del checkout recalcula el total desde el body del cliente y lo pisa, sin mirar los ítems persistidos ni el email.

- [ ] **Step 1: Escribir los dos tests que fallan**

```ts
describe('existingOrderId', () => {
  it('rechaza reutilizar la orden de otro comprador', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      total: 100000,
      status: 'PENDING',
      deletedAt: null,
      customerEmail: 'victima@example.com',
      items: [{ variantId: 'var-1', quantity: 10, price: 10000 }],
    });

    await expect(
      service.processBrickPayment({
        existingOrderId: 'order-1',
        orderItems: [{ variantId: 'var-1', quantity: 1 }],
        formData: {
          transaction_amount: 10000,
          payer: { email: 'atacante@example.com' },
        },
      } as any),
    ).rejects.toThrow('no corresponde');
  });

  it('cobra el total de los items persistidos, ignorando los del body', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      total: 100000,
      status: 'PENDING',
      deletedAt: null,
      customerEmail: 'cliente@example.com',
      items: [{ variantId: 'var-1', quantity: 10, price: 10000 }],
    });

    await service.processBrickPayment({
      existingOrderId: 'order-1',
      orderItems: [{ variantId: 'var-1', quantity: 1 }], // intento de fraude
      formData: {
        transaction_amount: 100000,
        payer: { email: 'cliente@example.com' },
      },
    } as any);

    const mpCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/v1/payments'),
    );
    const body = JSON.parse(mpCall[1].body);
    expect(body.transaction_amount).toBe(100000);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

```bash
cd apps/api && bun run test -- payments.service
```

- [ ] **Step 3: Traer los datos que faltan en el select**

Cambiar `payments.service.ts:604-607`:

```ts
const existing = await this.prisma.order.findUnique({
  where: { id: dto.existingOrderId },
  select: {
    id: true,
    total: true,
    status: true,
    deletedAt: true,
    customerEmail: true,
    shippingCost: true,
    items: {
      select: { variantId: true, quantity: true, price: true },
    },
  },
});
```

- [ ] **Step 4: Exigir que coincida el comprador**

Justo después de la validación de estado, replicando lo que ya hace `offlineCheckout:1927`:

```ts
const submittedEmail = dto.formData?.payer?.email?.trim().toLowerCase();

if (
  existing &&
  submittedEmail &&
  existing.customerEmail.trim().toLowerCase() !== submittedEmail
) {
  this.logger.warn(
    `Intento de reutilizar la orden ${existing.id} con otro email`,
  );
  throw new BadRequestException('La orden no corresponde a este comprador.');
}
```

- [ ] **Step 5: Cobrar desde los ítems persistidos**

Reemplazar el bloque de update del total (`payments.service.ts:712-721`):

```ts
// El total autoritativo es el que ya tiene la orden. El body del cliente
// no puede redefinir qué se está comprando después de creada.
const amountStr = Number(existing.total).toFixed(2);

await this.prisma.order.update({
  where: { id: existing.id },
  data: {
    ...(dto.notes ? { notes: dto.notes } : {}),
    paymentProvider: PaymentProvider.MERCADOPAGO,
  },
});
```

Borrar el `...(Math.abs(Number(existing.total) - finalAmount) > 0.01 ? { total: finalAmount } : {})`.

- [ ] **Step 6: Tests verdes**

```bash
cd apps/api && bun run test
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/payments/
git commit -m "fix(payments): validar comprador y cobrar desde items persistidos"
```

---

### Task 3.2: Eliminar `POST /payments/process` y su componente muerto

**Files:**
- Modify: `apps/api/src/payments/payments.controller.ts:45-59`
- Modify: `apps/api/src/payments/payments.service.ts` (método `processCardPayment`)
- Delete: `apps/ecommerce/components/checkout/card-payment-brick.tsx`
- Delete: `apps/api/src/payments/dto/create-order-payment.dto.ts` (si no lo usa nadie más)

- [ ] **Step 1: Confirmar que están huérfanos**

```bash
cd /c/Users/Usuario/Documents/Proyectos-propios/YerbaXanaesMain
grep -rn "card-payment-brick\|CardPaymentBrick" apps/ --include=*.tsx --include=*.ts | grep -v node_modules
grep -rn "payments/process" apps/ --include=*.ts --include=*.tsx | grep -v node_modules
grep -rn "CreateOrderPaymentDto" apps/api/src | grep -v "create-order-payment.dto.ts"
```

Esperado: solo se referencian a sí mismos. **Si aparece cualquier otro consumidor, parar y avisarle a Mateo** en vez de borrar.

- [ ] **Step 2: Borrar el endpoint**

Eliminar el bloque `@Post('process')` completo de `payments.controller.ts` y su import.

- [ ] **Step 3: Borrar el método y el componente**

```bash
rm apps/ecommerce/components/checkout/card-payment-brick.tsx
rm apps/api/src/payments/dto/create-order-payment.dto.ts
```

Eliminar `processCardPayment` de `payments.service.ts` y los tests que lo cubrían.

- [ ] **Step 4: Verificar**

```bash
bun run check-types && bun run build && cd apps/api && bun run test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(payments): eliminar endpoint process y componente card-brick muertos"
```

---

# FASE 4 — Integridad de inventario

### Task 4.1: `InventoryReservationService`

**Files:**
- Create: `apps/api/src/inventory/inventory-reservation.service.ts`
- Create: `apps/api/src/inventory/inventory-reservation.service.spec.ts`
- Modify: `apps/api/src/inventory/inventory.module.ts`
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces:

```ts
reserve(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: { variantId: string; quantity: number }[],
): Promise<void>

release(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: string,
): Promise<boolean>
```

`release()` es **idempotente**: si ya se liberó, devuelve `false` sin tocar stock.

- [ ] **Step 1: Agregar el campo de idempotencia al schema**

En `schema.prisma`, dentro del modelo `Order`:

```prisma
  // Marca cuándo se devolvió el stock al inventario. Null = sigue reservado.
  // Hace idempotente la liberación: cancelar dos veces no duplica la devolución.
  stockReleasedAt DateTime?
```

- [ ] **Step 2: Generar y aplicar la migración**

```bash
cd apps/api
bunx prisma migrate dev --name add_stock_released_at
bunx prisma generate
```

- [ ] **Step 3: Backfill de las órdenes históricas**

Las órdenes ya terminales nunca van a liberar stock, así que hay que marcarlas como liberadas para que el nuevo código no las toque:

```sql
UPDATE "Order"
SET "stockReleasedAt" = COALESCE("updatedAt", NOW())
WHERE "status" IN ('CANCELLED', 'REFUNDED')
   OR "deletedAt" IS NOT NULL;
```

```bash
docker compose exec -T postgres psql -U postgres -d yerbaxanaes -c '<el SQL de arriba>'
```

> **Antes de correr esto en producción, hacer backup de la base.** Coordinar con Mateo.

- [ ] **Step 4: Escribir los tests**

```ts
describe('InventoryReservationService', () => {
  it('libera el stock de una orden con receta devolviendo la cantidad exacta', async () => {
    // orden con 3 x "500g" que consume 500g de Yerba Granel cada una
    const released = await service.release(tx, 'order-1', 'CANCELLED');

    expect(released).toBe(true);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-yerba' },
        data: { currentStock: { increment: 1500 } },
      }),
    );
  });

  it('no libera dos veces la misma orden', async () => {
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      stockReleasedAt: new Date(),
      items: [],
    });

    const released = await service.release(tx, 'order-1', 'CANCELLED');

    expect(released).toBe(false);
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('libera variantes sin receta devolviendo a variant.stock', async () => {
    const released = await service.release(tx, 'order-2', 'REFUNDED');

    expect(released).toBe(true);
    expect(tx.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: { increment: 2 } } }),
    );
  });
});
```

- [ ] **Step 5: Implementar el servicio**

`release()` debe:

1. Bloquear la orden con `SELECT ... FOR UPDATE`.
2. Si `stockReleasedAt !== null`, devolver `false`.
3. Para cada `OrderItem`, cargar la variante con sus `ingredients`.
4. Si tiene ingredientes → `increment` sobre cada `InventoryItem` por `quantityRequired × quantity`.
5. Si no → `increment` sobre `variant.stock` por `quantity`.
6. Setear `stockReleasedAt = new Date()`.
7. Escribir un `OrderStateChange` con el motivo.
8. Devolver `true`.

Extraer la lógica de decremento que hoy vive dentro de `createPendingOrder` a `reserve()`, para que reserva y liberación sean simétricas y vivan juntas.

- [ ] **Step 6: Tests verdes y commit**

```bash
cd apps/api && bun run test -- inventory-reservation
git add apps/api/src/inventory/ apps/api/prisma/
git commit -m "feat(inventory): servicio de reserva y liberacion idempotente de stock"
```

---

### Task 4.2: Arreglar el cleanup de carritos abandonados

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts:1161-1194`
- Modify: `apps/api/src/payments/payments.service.spec.ts`

`NOT: { notes: { startsWith: ... } }` sobre una columna nullable excluye las filas con `notes = NULL`, que es el caso normal.

- [ ] **Step 1: Escribir el test**

```ts
it('encuentra carritos abandonados con notes en null', async () => {
  await service.cleanupExpiredPendingOrders();

  const where = prismaMock.order.findMany.mock.calls[0][0].where;
  const mpBranch = where.OR.find(
    (b: any) => b.mpPaymentId === null && b.paymentProvider === 'MERCADOPAGO',
  );

  expect(mpBranch.OR).toEqual(expect.arrayContaining([{ notes: null }]));
});
```

- [ ] **Step 2: Verificar que falla**

```bash
cd apps/api && bun run test -- payments.service
```

- [ ] **Step 3: Corregir el filtro**

En `payments.service.ts:1175`, reemplazar:

```ts
NOT: { notes: { startsWith: PAYMENT_LINK_NOTES } },
```

por:

```ts
// notes es nullable: un NOT sobre columna nullable excluye los NULL en
// Prisma, que es justo el caso del carrito abandonado normal.
OR: [
  { notes: null },
  { NOT: { notes: { startsWith: PAYMENT_LINK_NOTES } } },
],
```

> Ojo con el anidamiento: esa rama ya está dentro de un `OR` externo. El `OR` interno va como propiedad del objeto de la rama, junto a `paymentProvider`, `mpPaymentId` y `createdAt`.

- [ ] **Step 4: Verificar contra la base real**

Con Docker levantado:

```bash
docker compose exec -T postgres psql -U postgres -d yerbaxanaes -c \
  "SELECT COUNT(*) FROM \"Order\" WHERE status='PENDING' AND \"deletedAt\" IS NULL AND \"paymentProvider\"='MERCADOPAGO' AND \"mpPaymentId\" IS NULL AND notes IS NULL;"
```

Ese número es el de órdenes que hoy están reteniendo stock sin que nadie las libere. Después del fix, el cleanup debe recogerlas.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/payments/
git commit -m "fix(payments): el cleanup ya encuentra carritos abandonados con notes null"
```

---

### Task 4.3: Devolver stock en cancelaciones y reembolsos

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts:282-346`
- Modify: `apps/api/src/payments/payments-sync.service.ts:143-232`
- Modify: `apps/api/src/orders/orders.service.spec.ts`

- [ ] **Step 1: Escribir los tests**

```ts
it('devuelve el stock al cancelar una orden PAID', async () => {
  prismaMock.order.findUnique.mockResolvedValue({
    id: 'order-1',
    status: 'PAID',
    stockReleasedAt: null,
  });

  await service.update('order-1', { status: 'CANCELLED' } as any);

  expect(reservationMock.release).toHaveBeenCalledWith(
    expect.anything(),
    'order-1',
    'CANCELLED',
  );
});

it('devuelve el stock al reembolsar', async () => {
  prismaMock.order.findUnique.mockResolvedValue({
    id: 'order-2',
    status: 'PAID',
    stockReleasedAt: null,
  });

  await service.update('order-2', { status: 'REFUNDED' } as any);

  expect(reservationMock.release).toHaveBeenCalled();
});

it('no devuelve stock al pasar de PAID a SHIPPED', async () => {
  prismaMock.order.findUnique.mockResolvedValue({
    id: 'order-3',
    status: 'PAID',
    stockReleasedAt: null,
  });

  await service.update('order-3', { status: 'SHIPPED' } as any);

  expect(reservationMock.release).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Definir los estados que liberan**

En `orders.service.ts`, arriba del todo:

```ts
/** Estados en los que la mercadería vuelve al inventario. */
const STOCK_RELEASING_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.REJECTED,
];
```

- [ ] **Step 3: Envolver el cambio de estado en una transacción con liberación**

Reemplazar el `update` plano de `orders.service.ts:325-338`:

```ts
return this.prisma.$transaction(async (tx) => {
  const current = await tx.order.findUnique({
    where: { id },
    select: { id: true, status: true, stockReleasedAt: true },
  });

  if (!current) {
    throw new NotFoundException(`Orden ${id} no encontrada`);
  }

  if (status && STOCK_RELEASING_STATUSES.includes(status as OrderStatus)) {
    await this.reservation.release(tx, id, status);
  }

  const patch: Prisma.OrderUpdateInput = {};
  if (status) {
    patch.status = status as OrderStatus;
    patch.manualOverrideAt = new Date();
  }
  if (note !== undefined) patch.notes = note;

  const updated = await tx.order.update({ where: { id }, data: patch });

  if (status) {
    await tx.orderStateChange.create({
      data: {
        orderId: id,
        fromStatus: current.status,
        toStatus: status as OrderStatus,
        source: 'MANUAL_OVERRIDE',
      },
    });
  }

  return updated;
});
```

- [ ] **Step 4: Hacer lo mismo en el soft delete**

`orders.service.ts:341-346` (`remove`) debe liberar stock antes de marcar `deletedAt`, con el mismo patrón transaccional.

- [ ] **Step 5: Replicar en `updateOrderStatusWithAudit`**

En `payments-sync.service.ts`, dentro de la transacción que ya tiene el `FOR UPDATE`, agregar la misma llamada a `release()` cuando el nuevo estado esté en `STOCK_RELEASING_STATUSES`.

- [ ] **Step 6: Tests verdes y commit**

```bash
cd apps/api && bun run test
git add apps/api/src/orders/ apps/api/src/payments/
git commit -m "fix(orders): devolver stock al cancelar, reembolsar y borrar"
```

---

### Task 4.4: Dejar pasar los webhooks de reembolso

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts:1388-1400` y `:1479-1490`
- Modify: `apps/api/src/payments/payments-sync.service.ts:270`
- Modify: `apps/api/src/payments/payments.service.spec.ts`

El guard `isTerminal` descarta el webhook antes de mapear el estado, así que un reembolso desde el panel de Mercado Pago nunca llega a la orden.

- [ ] **Step 1: Escribir el test**

```ts
it('procesa un reembolso sobre una orden ya pagada', async () => {
  prismaMock.order.findUnique.mockResolvedValue({
    id: 'order-1',
    status: 'PAID',
    manualOverrideAt: null,
  });
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      external_reference: 'order-1',
      status: 'refunded',
    }),
  });

  await service.handleWebhook({
    body: {},
    signature: validSignature,
    requestId: 'req-1',
    dataIdUrl: 'pay-1',
    typeUrl: 'payment',
  });

  expect(syncMock.updateOrderStatusWithAudit).toHaveBeenCalledWith(
    'order-1',
    'REFUNDED',
    expect.anything(),
  );
});
```

- [ ] **Step 2: Cambiar el guard en los dos lugares**

Reemplazar:

```ts
const isTerminal =
  existing.status === OrderStatus.PAID ||
  existing.status === OrderStatus.CANCELLED;

if (isTerminal) { ... return { status: 'ok' }; }
```

por:

```ts
const newStatus = this.paymentsSync.mapMercadoPagoStatus(
  mpPayment.status as string,
);

// Un reembolso o contracargo sobre una orden ya pagada SÍ debe procesarse:
// es plata que se devuelve y stock que vuelve al inventario.
const isReversal =
  newStatus === OrderStatus.REFUNDED || newStatus === OrderStatus.CANCELLED;

const alreadySettled =
  existing.status === OrderStatus.CANCELLED ||
  (existing.status === OrderStatus.PAID && !isReversal);

if (alreadySettled) {
  this.logger.log(`Order ${extRef} sin cambios (${existing.status})`);
  return { status: 'ok' };
}
```

- [ ] **Step 3: Ampliar la reconciliación**

En `payments-sync.service.ts:270`, sumar `PAID` para que un reembolso perdido se recupere en la pasada periódica:

```ts
status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.PAID] },
```

- [ ] **Step 4: Tests verdes y commit**

```bash
cd apps/api && bun run test
git add apps/api/src/payments/
git commit -m "fix(payments): procesar webhooks de reembolso sobre ordenes pagadas"
```

---

### Task 4.5: Evitar órdenes duplicadas al volver atrás o refrescar en el paso de pago

**Files:**
- Modify: `apps/ecommerce/components/checkout-form.tsx:165-168, 197-230, 576-582`
- Modify: `apps/ecommerce/components/checkout/payment-brick.tsx:169, 277-335`

`brick-init` crea la orden y descuenta stock apenas el usuario entra al paso de pago. El guard anti-duplicado es un `useRef` **por montaje**, y el `orderId` solo sube al padre si el fetch alcanza a resolver. Volver atrás durante la inicialización, o refrescar la página en ese paso, dispara otro `brick-init`: otra orden pendiente y otro descuento de stock, repetible hasta el límite de 5 por email.

- [ ] **Step 1: Persistir el `orderId` junto al resto del checkout**

`checkout-form.tsx` ya guarda el paso actual en localStorage (líneas 197-230) pero **no** guarda `brickOrderId` ni `brickPreferenceId`, que son estado React. Agregarlos al mismo mecanismo de persistencia:

```tsx
const CHECKOUT_STORAGE_KEY = "yx-checkout-state";

interface PersistedCheckout {
  step: number;
  brickOrderId: string | null;
  brickPreferenceId: string | null;
}

// Al montar: restaurar
useEffect(() => {
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as PersistedCheckout;
    if (saved.step >= 0 && saved.step < steps.length) setCurrentStep(saved.step);
    if (saved.brickOrderId) setBrickOrderId(saved.brickOrderId);
    if (saved.brickPreferenceId) setBrickPreferenceId(saved.brickPreferenceId);
  } catch {
    // localStorage no disponible o corrupto: arrancamos limpio
  }
}, []);

// Al cambiar: guardar
useEffect(() => {
  try {
    localStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify({
        step: currentStep,
        brickOrderId,
        brickPreferenceId,
      } satisfies PersistedCheckout),
    );
  } catch {
    // sin localStorage el checkout sigue funcionando, solo pierde la reanudación
  }
}, [currentStep, brickOrderId, brickPreferenceId]);
```

- [ ] **Step 2: Limpiar la persistencia al confirmar el pago**

En el `onSuccess` del pago y en `checkout-success-cleanup.tsx`, agregar `localStorage.removeItem(CHECKOUT_STORAGE_KEY)` junto al vaciado del carrito.

- [ ] **Step 3: No re-inicializar si ya hay una orden viva**

En `payment-brick.tsx`, el efecto de inicialización debe cortar temprano cuando el padre ya le pasó un `existingOrderId`:

```tsx
useEffect(() => {
  // Si ya tenemos una orden de un intento anterior, la reutilizamos: crear
  // otra descontaría stock por segunda vez.
  if (existingOrderId && existingPreferenceId) {
    setIsInitializing(false);
    return;
  }
  if (brickInitStartedRef.current) return;
  brickInitStartedRef.current = true;
  // ... el fetch de brick-init que ya existía
}, [existingOrderId, existingPreferenceId]);
```

- [ ] **Step 4: Hoistear el `orderId` aunque el usuario se vaya**

El `cancelled = true` del cleanup impide llamar a `onInit`, así que la orden creada queda huérfana. Llamar a `onInit` **siempre** que la respuesta haya llegado, sin importar si el componente sigue montado:

```tsx
const json = await res.json();
// Reportamos el orderId aunque el componente ya se haya desmontado: la orden
// existe en la base y el stock ya está descontado. Perderla acá obliga a
// crear otra.
onInit?.({
  orderId: json.data.orderId,
  preferenceId: json.data.preferenceId,
});
if (cancelled) return;
setPreferenceId(json.data.preferenceId);
```

- [ ] **Step 5: Deshabilitar "Volver" mientras inicializa**

En `checkout-form.tsx:576-582`, el botón sólo se deshabilita con `isValidatingStock`. Agregar el estado de inicialización del Brick:

```tsx
<button
  onClick={handleBack}
  disabled={isValidatingStock || isBrickInitializing}
>
```

- [ ] **Step 6: Verificar los dos escenarios a mano**

Con la app corriendo y anotando el stock de la materia prima antes de empezar:

1. Entrar al paso de pago y apretar "Volver" mientras aparece el skeleton del Brick. Volver a entrar. Confirmar en la base que hay **una sola** orden PENDING y que el stock bajó **una sola vez**.
2. Entrar al paso de pago, esperar a que cargue el Brick, y refrescar con F5. Confirmar lo mismo.

```sql
SELECT id, status, "createdAt" FROM "Order"
WHERE "customerEmail" = '<tu email de prueba>'
ORDER BY "createdAt" DESC LIMIT 5;
```

- [ ] **Step 7: Commit**

```bash
git add apps/ecommerce/
git commit -m "fix(checkout): no duplicar orden ni stock al volver atras o refrescar"
```

---

# FASE 5 — Robustez

### Task 5.1: Helper de fetch con timeout

**Files:**
- Create: `apps/api/src/common/fetch-with-timeout.ts`
- Modify: `apps/api/src/payments/payments.service.ts` (6 llamadas)
- Modify: `apps/api/src/shipping/shipping.service.ts` (2 llamadas)
- Modify: `apps/api/src/notifications/notifications.service.ts` (1 llamada)
- Modify: `apps/api/src/common/revalidate-ecommerce.ts` (1 llamada)

- [ ] **Step 1: Crear el helper**

```ts
import { Logger, ServiceUnavailableException } from '@nestjs/common';

const DEFAULT_TIMEOUT_MS = 10_000;
const logger = new Logger('fetchWithTimeout');

/**
 * fetch con timeout obligatorio. El fetch de Node no tiene timeout por
 * defecto: una llamada externa lenta cuelga el request del checkout hasta
 * que la plataforma lo corta.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      logger.error(`Timeout de ${timeoutMs}ms llamando a ${url}`);
      throw new ServiceUnavailableException(
        'El servicio externo no respondió a tiempo. Intentá de nuevo en unos minutos.',
      );
    }
    throw error;
  }
}
```

- [ ] **Step 2: Reemplazar todas las llamadas**

```bash
grep -n "await fetch(" apps/api/src/payments/payments.service.ts \
  apps/api/src/shipping/shipping.service.ts \
  apps/api/src/notifications/notifications.service.ts \
  apps/api/src/common/revalidate-ecommerce.ts
```

Cambiar cada `await fetch(` por `await fetchWithTimeout(` e importar el helper. Timeouts sugeridos:

| Destino | Timeout |
|---|---|
| Mercado Pago (pagos) | 15.000 ms |
| Mercado Pago (webhook lookup) | 10.000 ms |
| MiCorreo `/token` | 8.000 ms |
| MiCorreo (resto) | 8.000 ms |
| Revalidate de Next | 5.000 ms |

- [ ] **Step 3: Verificar que no quedó ninguna**

```bash
grep -rn "await fetch(" apps/api/src --include=*.ts | grep -v spec
```

Esperado: sin resultados.

- [ ] **Step 4: Tests verdes y commit**

```bash
cd apps/api && bun run test
git add apps/api/src/
git commit -m "fix(api): timeout en todas las llamadas a servicios externos"
```

---

### Task 5.2: Filtro global de errores de Prisma

**Files:**
- Create: `apps/api/src/common/prisma-exception.filter.ts`
- Create: `apps/api/src/common/prisma-exception.filter.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir los tests**

```ts
describe('PrismaExceptionFilter', () => {
  it('mapea P2025 a 404', () => {
    const error = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '6',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('mapea P2002 a 409', () => {
    const error = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
  });

  it('mapea P2003 a 400', () => {
    const error = new Prisma.PrismaClientKnownRequestError('fk', {
      code: 'P2003',
      clientVersion: '6',
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('no expone detalles internos en el mensaje', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Invalid `prisma.order.update()` on table "Order"',
      { code: 'P2025', clientVersion: '6' },
    );

    filter.catch(error, host);

    const body = json.mock.calls[0][0];
    expect(body.message).not.toContain('prisma.');
    expect(body.message).not.toContain('Order');
  });
});
```

- [ ] **Step 2: Implementar el filtro**

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.map(exception.code);

    // El detalle completo va al log, nunca al cliente.
    this.logger.warn(
      `Prisma ${exception.code}: ${exception.message.split('\n')[0]}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }

  private map(code: string): { status: number; message: string } {
    switch (code) {
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'El recurso solicitado no existe.',
        };
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Ya existe un registro con esos datos.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'La referencia indicada no es válida.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error interno del servidor.',
        };
    }
  }
}
```

- [ ] **Step 3: Registrarlo antes del filtro de Sentry**

En `app.module.ts` el orden importa: el filtro más específico va primero.

```ts
providers: [
  AppService,
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  { provide: APP_FILTER, useClass: SentryGlobalFilter },
],
```

- [ ] **Step 4: Verificar a mano**

```bash
curl -s -X DELETE http://localhost:3001/orders/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer <TOKEN_ADMIN>" -w '\n%{http_code}\n'
```

Esperado: `404`, no `500`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/ apps/api/src/app.module.ts
git commit -m "feat(api): filtro global que mapea errores de Prisma a codigos HTTP"
```

---

### Task 5.3: Arreglar el 404 del catálogo

**Files:**
- Modify: `apps/ecommerce/lib/api.ts:36-49`

Un carácter: `if (fallbackData)` con `null` es falsy, así que `getProduct` lanza en vez de devolver `null`, y el `notFound()` queda inalcanzable.

- [ ] **Step 1: Corregir las dos guardas**

```ts
if (!res.ok) {
  if (fallbackData !== undefined) return fallbackData;
  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
}
return res.json();
} catch (error) {
  if (fallbackData !== undefined) return fallbackData;
  throw error;
}
```

- [ ] **Step 2: Verificar en el navegador**

```bash
bun run dev
```

Abrir `http://localhost:3000/productos/no-existe-este-slug`. Esperado: la página 404 de la tienda, no "Algo salió mal".

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/productos/no-existe-este-slug
```

Esperado: `404`.

- [ ] **Step 3: Commit**

```bash
git add apps/ecommerce/lib/api.ts
git commit -m "fix(ecommerce): devolver 404 real en productos inexistentes"
```

---

### Task 5.4: El webhook re-lanza errores para que Mercado Pago reintente

**Files:**
- Modify: `apps/api/src/payments/payments.service.ts:1342-1357`, `:1436-1446` y `:1525-1535`

Hoy un fallo de base se loguea y el webhook igual devuelve 200: Mercado Pago nunca reintenta y el pago queda sin acreditar.

- [ ] **Step 1: Mover el registro de dedup después del procesamiento exitoso**

El `webhookLog.create` de la línea 1348 se ejecuta **antes** de procesar. Si el procesamiento falla, el log ya está escrito y el reintento se descarta como duplicado. Reestructurar: hacer el `create` dentro de la misma transacción que actualiza la orden, o moverlo al final del camino feliz.

- [ ] **Step 2: Re-lanzar en el catch**

```ts
} catch (error) {
  this.logger.error(`Error procesando webhook payment ${dataIdUrl}`, error);
  // Re-lanzamos para que MP reintente. Un 200 acá significa "procesado" y
  // el pago quedaría sin acreditar para siempre.
  throw error;
}
```

- [ ] **Step 3: Distinguir el error de unique del resto en el dedup**

El `catch {}` de la línea 1351 trata cualquier fallo de base como "duplicado". Acotarlo:

```ts
} catch (error) {
  const isDuplicate =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002';

  if (!isDuplicate) throw error;

  this.logger.log(`Webhook duplicado ignorado: ${requestId}`);
  return { status: 'already_processed' };
}
```

- [ ] **Step 4: Tests verdes y commit**

```bash
cd apps/api && bun run test
git add apps/api/src/payments/
git commit -m "fix(payments): el webhook re-lanza errores para que MP reintente"
```

---

# FASE 6 — Panel de la clienta

### Task 6.1: Sacar el `placeholderData` global

**Files:**
- Modify: `apps/backoffice/providers/query-provider.tsx:38`
- Modify: los hooks de listado que sí lo quieran

Hoy abrir un pedido muestra los datos del anterior sin indicador de carga.

- [ ] **Step 1: Borrar la línea del default global**

```ts
// Sacar de defaultOptions.queries:
placeholderData: (previousData: unknown) => previousData,
```

- [ ] **Step 2: Reponerlo solo donde la key no cambia de entidad**

En los hooks de listado paginado (`useOrders`, `useProducts`, `useCustomers`), agregar el `placeholderData` por query, donde sí evita parpadeo al paginar. **Nunca** en `useOrder(id)` ni `useCustomer(id)`.

- [ ] **Step 3: Verificar a mano**

Abrir el panel, entrar a un pedido, cerrarlo, abrir otro. Debe verse el skeleton, nunca los datos del anterior.

- [ ] **Step 4: Commit**

```bash
git add apps/backoffice/
git commit -m "fix(backoffice): no mostrar datos de la entidad anterior al cambiar de ficha"
```

---

### Task 6.2: Errores visibles en subida de imágenes y mensajes reales del API

**Files:**
- Create: `apps/backoffice/lib/throw-api-error.ts`
- Modify: `apps/backoffice/hooks/use-products.ts:308-341` y handlers de error
- Modify: `apps/backoffice/hooks/use-inventory.ts`, `use-ratings.ts`, `use-coupons.ts`

- [ ] **Step 1: Crear el helper**

```ts
export async function throwApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new Error(body?.message ?? fallback);
}
```

- [ ] **Step 2: Agregar `onError` a las dos mutaciones de imagen**

```ts
export function useUploadProductImage() {
  return useMutation({
    mutationFn: uploadProductImage,
    onSuccess: (data) => {
      /* ... lo que ya hacía ... */
    },
    onError: (error: Error) => {
      toast.error("No se pudo subir la imagen", {
        description: error.message,
      });
    },
  });
}
```

Idem `useRemoveProductImage`.

- [ ] **Step 3: Propagar el mensaje real del backend**

Reemplazar los `throw new Error("Error al crear producto")` y equivalentes por `await throwApiError(response, "Error al crear producto")` en todos los hooks listados.

- [ ] **Step 4: Verificar a mano**

Intentar crear un producto con un slug duplicado. Debe verse el mensaje del backend, no "Error al crear producto".

- [ ] **Step 5: Commit**

```bash
git add apps/backoffice/
git commit -m "fix(backoffice): mostrar errores reales del API y no fallar en silencio"
```

---

### Task 6.3: Confirmación en acciones destructivas y arreglo del 404

**Files:**
- Modify: `apps/backoffice/components/orders-table.tsx:517-524, 691-698, 1264-1272`
- Modify: `apps/backoffice/app/not-found.tsx:18`

- [ ] **Step 1: Corregir el link del 404**

`/dashboard` no existe; el panel vive en `/`.

```tsx
<Link href="/">Ir al panel</Link>
```

- [ ] **Step 2: Agregar confirmación a Cancelar y Reembolsar**

Reutilizar el patrón que ya usa el borrado de producto (`products-manager.tsx:417-430`). El diálogo debe nombrar el pedido y el monto:

```tsx
<ConfirmDialog
  title="¿Cancelar este pedido?"
  description={`Pedido de ${order.customerName ?? order.customerEmail} por ${formatCurrency(order.total)}. El stock vuelve al inventario.`}
  confirmLabel="Cancelar pedido"
  onConfirm={() => onUpdateStatus(orderId, "CANCELLED")}
/>
```

> La frase sobre el stock ya es verdadera después de la Tarea 4.3.

- [ ] **Step 3: Confirmación también en la acción masiva**

En el bulk, el diálogo debe decir cuántos pedidos se van a afectar.

- [ ] **Step 4: Verificar a mano y commitear**

```bash
git add apps/backoffice/
git commit -m "fix(backoffice): confirmar acciones destructivas y arreglar link del 404"
```

---

# FASE 7 — Responsive

### Task 7.1: Los cuatro arreglos estructurales

**Files:**
- Modify: `apps/backoffice/components/create-inventory-modal.tsx:83-88`
- Modify: `apps/backoffice/app/globals.css`
- Modify: `apps/backoffice/components/product-form-modal.tsx:450`
- Modify: `apps/ecommerce/components/checkout-steps/delivery-details-step.tsx:319, 345`

- [ ] **Step 1: Scroll en el modal de insumo**

Copiar el patrón de `create-order-modal.tsx:453-456`:

```tsx
className="bg-white rounded-2xl shadow-xl w-full max-w-lg h-[100dvh] max-h-[100dvh] md:h-auto md:max-h-[90vh] overflow-y-auto"
```

- [ ] **Step 2: Regla anti-zoom de iOS en el backoffice**

Agregar a `apps/backoffice/app/globals.css`:

```css
/* iOS Safari hace zoom al enfocar cualquier input de menos de 16px. */
@media (max-width: 1023px) {
  input,
  select,
  textarea {
    font-size: 16px;
  }
}
```

- [ ] **Step 3: Botón de borrar variante visible en táctil**

```tsx
className="... opacity-100 md:opacity-0 md:group-hover:opacity-100"
```

- [ ] **Step 4: Breakpoints en las dos grillas del checkout**

Líneas 319 y 345: `grid grid-cols-2 gap-3` → `grid grid-cols-1 gap-3 sm:grid-cols-2`.

- [ ] **Step 5: Verificar en el navegador a 320, 375 y 390px**

1. Modal "Nuevo insumo" con teclado abierto: el botón Crear debe alcanzarse.
2. Buscador de inventario: enfocar no debe hacer zoom.
3. Borrar variante desde vista táctil: el botón debe verse.
4. Ciudad y CP: el texto debe entrar.

- [ ] **Step 6: Commit**

```bash
git add apps/backoffice/ apps/ecommerce/
git commit -m "fix(ui): scroll en modal de insumo, anti-zoom iOS y grillas del checkout"
```

---

### Task 7.2: Vista mobile para Inventario y Cupones, y dark mode muerto

**Files:**
- Modify: `apps/backoffice/components/inventory-table.tsx:265-301`
- Modify: `apps/backoffice/app/cupones/page.tsx:246-247`
- Modify: `packages/ui/tokens.css` (bloque `.dark`)
- Modify: `apps/ecommerce/package.json`, `apps/backoffice/package.json`

- [ ] **Step 1: Vista de tarjetas para Inventario**

Copiar el patrón dual de `customers-manager.tsx:143-168`: `<div className="space-y-2 md:hidden">` con tarjetas, y `hidden md:block` para la tabla. Cada tarjeta debe mostrar nombre, stock actual, alerta de mínimo y el botón **Ajustar** accesible sin scroll lateral.

- [ ] **Step 2: Lo mismo para Cupones**

Hoy fuerza `min-w-[40rem]`, o sea 640px duros.

- [ ] **Step 3: Preguntarle a Mateo qué hacer con el dark mode**

Está instalado pero nunca montado: no hay `ThemeProvider` en ninguna de las dos apps, así que la clase `.dark` jamás se aplica, y si se activara rompería por los colores hardcodeados.

**No borrar sin su OK.** Si dice que sí:

```bash
cd apps/ecommerce && bun remove next-themes
cd ../backoffice && bun remove next-themes
```

Borrar el bloque `.dark` de `packages/ui/tokens.css` y el `@custom-variant dark` de los dos `globals.css`.

- [ ] **Step 4: Verificar y commitear**

```bash
bun run check-types && bun run build
git add -A
git commit -m "fix(ui): vista mobile para inventario y cupones"
```

---

# FASE 8 — Verificación final

### Task 8.1: Checklist completo antes de habilitar la venta

- [ ] **Step 1: Verificación automatizada**

```bash
cd /c/Users/Usuario/Documents/Proyectos-propios/YerbaXanaesMain
bun run check-types
bun run lint
bun run build
cd apps/api && bun run test
```

Los cuatro deben pasar. Si alguno falla, no se sale a producción.

- [ ] **Step 2: E2E**

```bash
cd apps/ecommerce && bun run test:e2e
cd ../backoffice && bun run test:e2e
```

- [ ] **Step 3: Recorrer las nueve combinaciones a mano**

Con la app corriendo, completar una compra real de punta a punta en cada celda:

| | Mercado Pago | Transferencia | Efectivo |
|---|---|---|---|
| **Domicilio** | ☐ | ☐ | n/a (bloqueado por diseño) |
| **Sucursal** | ☐ | ☐ | n/a (bloqueado por diseño) |
| **Retiro** | ☐ | ☐ | ☐ |

Para cada una verificar: el total del resumen coincide con el cobrado; la orden aparece en el panel con los ítems correctos; el stock bajó lo que corresponde.

- [ ] **Step 4: Verificar el ciclo de devolución de stock**

1. Crear un pedido con retiro y efectivo. Anotar el stock de la materia prima antes y después.
2. Cancelarlo desde el panel.
3. Confirmar que el stock volvió al valor original.
4. Cancelarlo de nuevo: el stock **no** debe subir dos veces.

- [ ] **Step 5: Verificar el cleanup de abandonados**

1. Entrar al paso de pago con Mercado Pago y no pagar. Anotar el stock.
2. Confirmar en la base que la orden quedó PENDING con `notes` en NULL.
3. Disparar `POST /payments/cleanup-manual` con token admin y TTL 0.
4. Confirmar que la orden pasó a CANCELLED y el stock volvió.

- [ ] **Step 6: Verificar los toggles de configuración**

1. En el panel, apagar "Efectivo". Guardar.
2. En la tienda, ir a checkout con retiro: el método no debe aparecer.
3. Forzarlo por API: `POST /payments/offline-checkout` con `paymentProvider: "CASH"` debe devolver 400.

- [ ] **Step 7: Pendientes operativos (no son código)**

- [ ] Rotar la contraseña del admin en producción (el `admin123` pendiente desde junio).
- [ ] Activar `rateLimit` en Better Auth: requiere la migración de tablas de rate limit.
- [ ] Cargar el celular faltante en `CA_SENDER_CELL_PHONE`.
- [ ] Cargar peso real en **todas** las variantes. Hoy hay un fallback silencioso de 600 g que cobra envío de menos:
  ```sql
  SELECT pv.id, p.name, pv.name FROM "ProductVariant" pv
  JOIN "Product" p ON p.id = pv."productId"
  WHERE pv.weight IS NULL;
  ```
- [ ] Confirmar `CA_ENVIRONMENT` en producción y verificar que la máquina de desarrollo **no** apunte a PROD.
- [ ] Hacer una compra real de prueba con tarjeta propia y reembolsarla, para validar el ciclo completo contra Mercado Pago.

- [ ] **Step 8: Commit final y PR**

```bash
git add -A
git commit -m "chore: verificacion final de remediacion go-live"
```

Para el PR, usar el slash command `/freelance-pr`. **No hacer push sin autorización de Mateo.**

---

## Lo que este plan NO cubre

Queda deliberadamente fuera para no inflar el alcance. Todo esto es post-lanzamiento:

- **Cupones concurrentes:** `maxUses` se puede superar con requests simultáneos (read-then-write en `coupons.service.ts:79-122`). Necesita un `updateMany` condicional. Riesgo bajo con el volumen actual.
- **Sin paginación de servidor** en `GET /orders` y en Clientes. Empieza a doler cerca de los 2.000 pedidos.
- **Deriva de paleta:** conviven los tokens nuevos con la rampa vieja `stone`/`bg-white`. Es un pase de diseño completo, no un fix.
- **Edición de clientes, de ítems de inventario y de cupones:** hoy no existen ni en el panel ni en la API.
- **Corrección de datos de un pedido** (dirección, teléfono) desde el panel.
- **Impresión de remito** por pedido.
- **Accesibilidad del checkout:** los selectores de sucursal y tarifa no son operables por teclado (`<label>` con `onClick`, sin radio real). Los campos no tienen `autoComplete` ni `htmlFor`.
- **Trust proxy:** sin `app.set('trust proxy', 1)`, el rate limit de la API es global en vez de por IP. Vale la pena, pero primero hay que confirmar la topología real de Railway.

---

## Notas para quien ejecute

1. **Empezá por la Fase 0.** Sin CI verde no vas a saber si rompiste algo, y este plan toca el camino del dinero.
2. **Las Fases 1 a 4 son secuenciales.** La 5, 6 y 7 son independientes entre sí y se pueden repartir.
3. **Los tests van antes que la implementación**, siempre. Si un test pasa antes de escribir el código, el test está mal.
4. **Nunca hagas `push`, `merge` ni `rebase` sin OK de Mateo.** Los settings lo bloquean; no intentes esquivarlo.
5. **Si un hallazgo no reproduce**, decilo en vez de implementar el fix igual. La auditoría es análisis estático: puede haber algo que en runtime se comporte distinto.
6. **La memoria del proyecto puede estar desactualizada.** Un hallazgo de esta auditoría (la re-cotización de envío) figuraba como resuelto en julio y no lo estaba. Verificá siempre contra el código.
