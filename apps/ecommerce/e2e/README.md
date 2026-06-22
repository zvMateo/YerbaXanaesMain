# E2E — Playwright (checkout + webhook)

Tests end-to-end del ecommerce. Cubren el flujo de compra hasta la creación de la
preferencia de Mercado Pago (Opción B) y la seguridad del webhook.

## Cómo correr

```bash
# Desde apps/ecommerce. Levanta la DB de test (:5433) y corre la suite.
bun run test:e2e

# Modo UI interactivo
bun run test:e2e:ui

# Apagar la DB de test al terminar
bun run test:e2e:down
```

El script levanta `docker-compose.test.yml` (Postgres efímero en `:5433`, aislado de
la DB de dev en `:5432`). El `global-setup.ts` aplica `prisma migrate deploy` + seed
determinista (`apps/api/prisma/seed.ts`) antes de cada corrida. Playwright levanta la
API (`:3001`) y el ecommerce (`:3000`) vía `webServer`.

> Cerrá cualquier `bun run dev` antes de correr: con un dev server activo en `:3000/:3001`,
> Playwright lo **reutiliza** (`reuseExistingServer` en local) y los tests correrían contra
> la DB de dev en vez de la de test.

## Qué se testea

### `checkout-happy.spec.ts`
Flujo real: listado → detalle → carrito → checkout con **Retiro en local** (pickup,
saltea la cotización de Correo Argentino) → paso de pago. Verifica que el backend
genera `preferenceId` (`POST /payments/brick-init`) y que la orden PENDING descuenta
stock. **No** completa el Payment Brick de MP (iframe controlado por MP, flaky en CI).

### `webhook-security.spec.ts`
Seguridad del webhook por HTTP. Como el controller convierte los rechazos de firma en
`200 {status:'ok'}`, la aceptación/rechazo se observa por el **dedup**: una firma válida
crea un `webhookLog` (replay → `already_processed`); una inválida/expirada/ausente se
rechaza antes de loguear (replay → nunca `already_processed`). Lee `MP_WEBHOOK_SECRET`
de `apps/api/.env`.

## Fuera de alcance (a propósito)

- **Brick de MP completo** (Opción A): iframe de terceros, flaky. Si se agrega, marcarlo
  `@slow` y dejarlo fuera del gating de CI.
- **Webhook → orden PAID + stock**: el handler hace un fetch real a `api.mercadopago.com`
  para confirmar el pago, lo que exigiría un pago real de sandbox. Esa lógica está cubierta
  por el unit test de Jest (`apps/api/src/payments/payments.service.spec.ts`).
