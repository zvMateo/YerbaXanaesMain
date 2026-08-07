# Emails de pedido con Gmail SMTP

Para arrancar sin Resend. Límite típico Gmail personal: ~500 destinatarios/día (de sobra al inicio).

## Pasos (5 minutos)

1. Entrá a la cuenta Gmail que va a **enviar** (puede ser `yerbaxanaes@gmail.com`).
2. Activá **Verificación en 2 pasos**.
3. Creá una **Contraseña de aplicaciones**:  
   https://myaccount.google.com/apppasswords  
   Nombre sugerido: `YerbaXanaes API`.
4. Copiá las 16 letras (sin espacios o con; nodemailer acepta ambos).
5. En **Railway → API → Variables**:

```env
ORDER_NOTIFY_EMAIL=email-de-tu-hermana@gmail.com
EMAIL_FROM=YerbaXanaes <yerbaxanaes@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yerbaxanaes@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx
```

6. Redeploy de la API.
7. Hacé un pago de prueba (o venta CASH en el panel) y revisá bandeja (y spam).

## Comportamiento

| Evento | Quién recibe |
|--------|----------------|
| Orden → `PAID` | Dueña (`ORDER_NOTIFY_EMAIL`) + comprador (`customerEmail`) |
| Reintento webhook | No reenvía (idempotente con `notifiedPaidAt`) |

## Después: Resend

Cuando quieras dominio propio y más confiabilidad:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=YerbaXanaes <hola@yerbaxanaes.com>
# Podés dejar SMTP_* o borrarlos: si hay RESEND_API_KEY, gana Resend
```

## Problemas comunes

| Síntoma | Qué hacer |
|---------|-----------|
| `Invalid login` | Usá App Password, no la clave de Gmail |
| No llega mail | Mirar spam; verificar `ORDER_NOTIFY_EMAIL` |
| Logs `email_skipped_no_provider` | Faltan `SMTP_HOST/USER/PASS` en el servidor |
| Google bloquea | Bajar volumen; más adelante migrar a Resend |
