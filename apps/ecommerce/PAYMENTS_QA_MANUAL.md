# Payments QA Manual (Ecommerce)

Guía manual para validar el flujo de checkout con Mercado Pago en `apps/ecommerce`.

## Precondiciones

1. API levantada en `http://localhost:3001`.
2. Ecommerce levantado en `http://localhost:3000`.
3. Credenciales de Mercado Pago configuradas (`MP_ACCESS_TOKEN` en API y `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` en ecommerce).
4. Stock disponible para al menos una variante.
5. Webhook de MP accesible para entorno probado (si aplica).

## Casos obligatorios

### Tarjeta aprobada

- Ir a checkout y completar datos válidos.
- Seleccionar pago con tarjeta.
- Esperado: redirección a success con orden confirmada o estado `PAID`.

### Tarjeta rechazada

- Usar datos de prueba que produzcan rechazo.
- Esperado: toast de error claro y orden no confirmada.

### Tarjeta en `in_process`

- Simular método/tarjeta con estado en revisión.
- Esperado: checkout/success en estado pendiente y mensaje de verificación.

### Ticket pending (`rapipago`/`pagofacil`)

- Elegir método offline en Payment Brick.
- Esperado: respuesta pendiente con `ticketUrl` y CTA para abrir comprobante.

### Account money aprobado

- Seleccionar wallet (`account_money`).
- Esperado: estado `approved` y orden en success.

### Account money pending

- Simular caso wallet en revisión.
- Esperado: estado pendiente y comunicación no bloqueante al usuario.

### Mismatch de monto frontend/backend

- Forzar cambio de monto entre cálculo cliente y servidor.
- Esperado: `400` con mensaje de recotización y sin cobro.

### Cupón inválido

- Aplicar cupón inexistente o vencido.
- Esperado: mensaje de error y flujo continúa sin descuento.

### Stock insuficiente

- Intentar comprar más unidades que el stock disponible.
- Esperado: rechazo previo al pago con mensaje de stock.

### Webhook duplicado

- Enviar mismo evento dos veces.
- Esperado: primer evento procesado, segundo ignorado sin inconsistencias.

## Verificación de contrato API

Para `POST /payments/brick`, el frontend debe esperar envelope:

```json
{
  "data": {
    "orderId": "string",
    "status": "approved|pending|in_process|rejected",
    "detail": "string opcional",
    "ticketUrl": "string opcional",
    "mpPaymentId": "string opcional"
  },
  "message": "Pago procesado"
}
```

## Evidencia recomendada por caso

1. Captura de pantalla del estado final (checkout/success o error).
2. Payload y respuesta HTTP relevantes (Network tab).
3. Logs de API con `X-Correlation-Id` para trazabilidad.
4. Resultado final de orden (`PENDING`, `PAID`, `CANCELLED`) validado contra backend.
