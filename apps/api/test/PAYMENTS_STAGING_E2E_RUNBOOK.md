# Payments Staging E2E Runbook (Real Services)

Objetivo: ejecutar validación end-to-end de pagos con servicios reales (sin mocks) antes de release.

## Alcance

- Checkout Brick de Mercado Pago.
- API NestJS real + DB staging.
- Webhook real de Mercado Pago hacia staging.
- Sin MODO (fuera de alcance).

## Requisitos previos

1. Staging desplegado con HTTPS.
2. `MP_ACCESS_TOKEN` de entorno test/staging configurado.
3. `MP_WEBHOOK_SECRET` configurado en API staging.
4. URL webhook configurada en panel MP apuntando a staging: `POST /payments/webhook`.
5. Usuario test comprador y datos de tarjetas de prueba disponibles.
6. Stock preparado para variantes de prueba.

## Verificaciones iniciales

1. Health API responde 200.
2. CORS permite dominio frontend staging.
3. Endpoint `POST /payments/brick` responde envelope `{ data, message }`.
4. Logs contienen `X-Correlation-Id` y request ids de webhook.

## Matriz obligatoria (real)

### Tarjeta aprobada

- Ejecutar checkout completo.
- Esperado: orden final `PAID` y conciliación OK.

### Tarjeta rechazada

- Ejecutar checkout con tarjeta de rechazo.
- Esperado: mensaje claro en frontend y orden no confirmada.

### Tarjeta `in_process`

- Ejecutar checkout con escenario de revisión.
- Esperado: estado intermedio y posterior transición por webhook.

### Ticket pending

- Ejecutar checkout con `rapipago` o `pagofacil`.
- Esperado: `ticketUrl` presente y orden `PENDING`.

### Account money approved

- Ejecutar flujo wallet aprobado.
- Esperado: orden `PAID`.

### Account money pending

- Ejecutar flujo wallet pendiente.
- Esperado: orden `PENDING` y actualización eventual por webhook.

### Webhook duplicado

- Reenviar mismo evento.
- Esperado: idempotencia, sin doble transición de estado.

### Mismatch de monto

- Forzar diferencia cliente-servidor.
- Esperado: `400` de recotización y sin intento de cobro.

### Cupón inválido

- Aplicar cupón no válido.
- Esperado: rechazo controlado y sin descuento aplicado.

### Stock insuficiente

- Forzar compra por encima de stock.
- Esperado: rechazo previo al cobro.

## Evidencia mínima requerida

1. Captura de resultado frontend por caso.
2. Request/response HTTP por caso (incluido envelope y errores).
3. IDs correlacionados (`X-Correlation-Id`, `x-request-id`, `mpPaymentId`, `orderId`).
4. Estado final de orden en DB por caso.
5. Confirmación de recepción de webhook por caso aplicable.

## Criterio de salida (go/no-go)

- GO: todos los casos obligatorios pasan y no hay inconsistencias de estado.
- NO-GO: cualquier falla en idempotencia, monto, webhook o contrato de respuesta.
