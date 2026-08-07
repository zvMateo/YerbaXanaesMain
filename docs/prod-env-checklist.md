# Checklist de variables de producción

Completar en Railway (API) y Vercel (ecommerce + backoffice) **antes** del anuncio público.

## API — Railway

| Variable | Valor esperado | ✓ |
|----------|----------------|---|
| `DATABASE_URL` | Postgres prod (pool pequeño en Hobby) | |
| `NODE_ENV` | `production` | |
| `MP_ACCESS_TOKEN` | `APP_USR-…` (**no** `TEST-`) | |
| `MP_WEBHOOK_SECRET` | Del panel MP al configurar webhook | |
| `API_URL` | `https://…` pública de la API | |
| `FRONTEND_URL` | `https://yerbaxanaes.com` (sin slash final) | |
| `BACKOFFICE_URL` | `https://admin.yerbaxanaes.com` | |
| `ALLOWED_ORIGINS` | `https://yerbaxanaes.com,https://www.yerbaxanaes.com,https://admin.yerbaxanaes.com` | |
| `CA_ENVIRONMENT` | `PROD` | |
| `CA_USER_TOKEN` / `CA_PASSWORD_TOKEN` / `CA_EMAIL` / `CA_PASSWORD` | MiCorreo prod | |
| `CA_POSTAL_CODE_ORIGIN` | `5963` (Villa del Rosario) | |
| `CA_SENDER_*` | Si el perfil MiCorreo está incompleto | |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Cuenta Cloudinary | |
| `REVALIDATE_SECRET` | Igual que en ecommerce | |
| `MP_CART_ABANDONED_TTL_MINUTES` | `15` (default ok) | |
| `MP_PENDING_PAYMENT_TTL_MINUTES` | `1440` (default ok) | |
| `ORDER_NOTIFY_EMAIL` | Email de la dueña / operaciones | |
| `EMAIL_FROM` | Ej. `YerbaXanaes <tu-gmail@gmail.com>` | |
| **Gmail SMTP (arranque)** | | |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `465` (o `587`) | |
| `SMTP_SECURE` | `true` si port 465 | |
| `SMTP_USER` | tu Gmail | |
| `SMTP_PASS` | App Password de Google (16 chars) | |
| **Resend (opcional, pisa SMTP)** | | |
| `RESEND_API_KEY` | Si está seteado, se usa en vez de Gmail | |

### Webhook Mercado Pago

URL: `POST {API_URL}/payments/webhook`  
Eventos: payment + order (según Brick).  
Probar con pago de prueba real o sandbox y revisar logs.

## Ecommerce — Vercel

| Variable | Valor | ✓ |
|----------|-------|---|
| `NEXT_PUBLIC_API_URL` | URL API https | |
| `API_URL` | Misma (server rewrites) | |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | `APP_USR-…` | |
| `NEXT_PUBLIC_SITE_URL` | `https://yerbaxanaes.com` | |
| `NEXT_PUBLIC_SHIPPING_WHATSAPP_URL` | Opcional (default `lib/brand.ts`) | |
| `REVALIDATE_SECRET` | Igual que API | |

## Backoffice — Vercel

| Variable | Valor | ✓ |
|----------|-------|---|
| `NEXT_PUBLIC_API_URL` / `API_URL` | API https | |
| `DATABASE_URL` | **Misma** DB que la API | |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | |
| `BETTER_AUTH_BASE_URL` | `https://admin.yerbaxanaes.com` | |
| `NEXT_PUBLIC_APP_URL` | Igual base URL | |
| `ADMIN_EMAILS` | Emails de dueña/operadores (coma) | |
| `GOOGLE_CLIENT_ID` / `SECRET` | OAuth + redirect prod | |

Redirect Google: `https://admin.yerbaxanaes.com/api/auth/callback/google`

## Smoke post-deploy

1. `GET {API}/health` → ok  
2. Login backoffice con email en `ADMIN_EMAILS`  
3. Crear producto + imagen Cloudinary  
4. Compra real monto bajo en tienda → orden PAID en BO  
5. Stock coherente  
6. (Opcional) import envío MiCorreo  

## Catálogo

No uses seeds de Unsplash en prod. Cargá productos reales desde el backoffice (`/productos`) con fotos propias.

## Observabilidad

| Variable | Dónde | ✓ |
|----------|-------|---|
| `SENTRY_DSN` | Railway API | |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel ecommerce + backoffice | |
