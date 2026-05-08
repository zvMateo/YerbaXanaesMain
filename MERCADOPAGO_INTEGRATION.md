# Integración Mercado Pago — Payment Brick

La tienda usa **Mercado Pago Payment Brick** como único flujo de pago online.

## Flujo activo

1. El ecommerce valida datos, stock y envío.
2. `POST /payments/brick-init` crea una orden `PENDING`, descuenta stock y genera una preferencia para habilitar billetera/cuotas dentro del Brick.
3. El usuario paga desde el Payment Brick.
4. `POST /payments/brick` procesa tarjetas/tickets/billetera cuando corresponde.
5. `POST /payments/webhook` recibe la confirmación de Mercado Pago y actualiza el estado real de la orden.
6. `/checkout/success?orderId=...` consulta `GET /payments/order-status/:id` para mostrar el estado canónico.

## Flujos removidos

- **Checkout Pro redirect** (`POST /payments/checkout`) queda desactivado/removido.
- **MODO** queda removido del ecommerce, API y schema Prisma.

## Variables principales

API:

```env
MP_ACCESS_TOKEN="APP_USR-..."
MP_WEBHOOK_SECRET="..."
API_URL="https://api.tudominio.com"
FRONTEND_URL="https://tudominio.com"
```

Ecommerce:

```env
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
NEXT_PUBLIC_API_URL="https://api.tudominio.com"
```

## Reglas de seguridad

- Nunca exponer `MP_ACCESS_TOKEN` con prefijo `NEXT_PUBLIC_`.
- El webhook debe tener firma válida (`MP_WEBHOOK_SECRET`).
- El backend debe ser la fuente de verdad para stock, total de orden y estado de pago.
- No confiar en redirects del proveedor: siempre consultar estado canónico por `orderId`.
