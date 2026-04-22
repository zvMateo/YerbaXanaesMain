# YerbaXanaes Main

Monorepo Turborepo (Bun) para e-commerce de yerba mate.

## Apps

- `apps/api`: NestJS + Prisma (puerto 3001)
- `apps/ecommerce`: Next.js storefront (puerto 3000)
- `apps/backoffice`: Next.js admin (puerto 3002)

## Comandos principales

Desde la raíz:

```bash
bun install
bun run dev
bun run build
bun run lint
bun run check-types
bun run format
```

API (desde `apps/api`):

```bash
bun run test
bun run test:e2e
bunx prisma generate
bunx prisma migrate dev
```

## Variables de entorno

- API: ver `apps/api/.env.example`
- Ecommerce: ver `apps/ecommerce/.env.example`

Notas clave:

- Nunca exponer `MP_ACCESS_TOKEN` en variables `NEXT_PUBLIC_*`.
- En producción usar URLs `https` para `FRONTEND_URL`, `BACKOFFICE_URL`, `API_URL` y webhooks.

## Mercado Pago - Checklist de salida a producción

1. Configuración

- `MP_ACCESS_TOKEN` productivo configurado en backend.
- `MP_WEBHOOK_SECRET` configurado y validado.
- `FRONTEND_URL`, `BACKOFFICE_URL` y `ALLOWED_ORIGINS` con dominios https reales.

1. Webhooks

- URL pública de webhook activa (`POST /payments/webhook`).
- Verificación de firma habilitada.
- Reintentos duplicados verificados (idempotencia).

1. Observabilidad

- Correlación frontend-backend activa vía `X-Correlation-Id`.
- Logs de errores de pago y webhook revisados en entorno staging.
- Alertas mínimas configuradas para errores 5xx y rechazos anómalos.

1. QA mínima antes de release

- Tarjeta aprobada.
- Tarjeta rechazada.
- Tarjeta en `in_process`.
- Ticket pending con comprobante.
- Account money `approved` y `pending`.
- Mismatch de monto y stock insuficiente.

1. Seguridad

- CORS limitado a orígenes esperados.
- Sin secretos en frontend ni en repositorio.
- Entorno de producción sin credenciales `TEST-*`.

## Runbooks de operación

- Validación E2E staging (servicios reales): `apps/api/test/PAYMENTS_STAGING_E2E_RUNBOOK.md`
- Alertas y umbrales de pagos: `PAYMENTS_ALERTS_RUNBOOK.md`
