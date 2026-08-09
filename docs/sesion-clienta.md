# Sesión con clienta — setup producción

Guía para completar **en persona** (o con pantalla compartida) lo que necesita acceso a cuentas de ella.  
Código de emails (Gmail SMTP) ya está en `main` — solo falta configurar variables.

**Duración estimada:** 45–90 min si las cuentas ya existen.  
**No copiar secretos al chat ni al repo.** Solo a Railway / Vercel / panel del proveedor.

Referencias:

| Doc | Uso |
|-----|-----|
| `docs/prod-env-checklist.md` | Matriz completa de variables |
| `docs/email-gmail-setup.md` | Gmail App Password paso a paso |
| `docs/go-live.md` | Estado general go-live |
| `apps/ecommerce/PAYMENTS_QA_MANUAL.md` | Pruebas de pago |

---

## Antes de la reunión (vos solo)

- [ ] Confirmá que `main` está deployado (Railway API + Vercel tienda/admin)
- [ ] Anotá URLs reales:
  - API: `https://________________`
  - Tienda: `https://yerbaxanaes.com` (o la que usen)
  - Admin: `https://admin.yerbaxanaes.com`
- [ ] Tené abiertos: Railway, Vercel (2 proyectos), este doc
- [ ] Llevá monedas de prueba: tarjeta MP de prueba o monto muy bajo en prod

---

## 0) Quién entra a qué (5 min)

Pedir acceso o que ella se loguee en:

| Cuenta | Para qué |
|--------|----------|
| Gmail de la marca / operaciones | Envío de mails de pedido (SMTP) |
| Mercado Pago (cuenta cobros) | Tokens + webhook |
| Google Cloud OAuth (si login admin con Google) | Client ID/Secret backoffice |
| Cloudinary | Fotos de productos |
| MiCorreo / Correo Argentino | Cotización envíos |
| Railway (API) | Variables backend |
| Vercel (ecommerce + backoffice) | Variables front |

---

## 1) Emails de pedido — Gmail (10–15 min)

**Objetivo:** al pasar una orden a `PAID`, mail a dueña + comprador.

1. En **su** Gmail (la que envía):
   - [ ] Verificación en 2 pasos **activada**  
     https://myaccount.google.com/signinoptions/two-step-verification
   - [ ] Contraseña de aplicación  
     https://myaccount.google.com/apppasswords  
     Nombre: `YerbaXanaes API` → copiar 16 caracteres
2. Si Google dice *“no disponible para tu cuenta”*:
   - [ ] Probar otro Gmail personal, **o**
   - [ ] Plan B: Resend free (`RESEND_API_KEY`) — ver `docs/email-gmail-setup.md`
3. En **Railway → servicio API → Variables** (sin espacios de más):

```env
ORDER_NOTIFY_EMAIL=email-donde-quiere-recibir-avisos@...
EMAIL_FROM=YerbaXanaes <gmail-que-envia@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=gmail-que-envia@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

4. [ ] Redeploy API
5. [ ] Prueba: venta CASH en backoffice **o** pago test → mails en bandeja + spam

Detalle: `docs/email-gmail-setup.md`.

---

## 2) Mercado Pago producción (15–20 min)

**Objetivo:** cobros reales con Brick + webhook firmado.

En [panel developers MP](https://www.mercadopago.com.ar/developers/panel):

- [ ] App de producción (no solo prueba)
- [ ] **Access Token** empieza con `APP_USR-` (nunca `TEST-`)
- [ ] **Public Key** también `APP_USR-…`
- [ ] Webhook URL: `https://{API_URL}/payments/webhook`
- [ ] Eventos: pagos / merchant_order según panel
- [ ] Copiar **secret** del webhook → `MP_WEBHOOK_SECRET`

| Dónde | Variable | Valor |
|-------|----------|--------|
| Railway API | `MP_ACCESS_TOKEN` | `APP_USR-…` |
| Railway API | `MP_WEBHOOK_SECRET` | secret del panel |
| Vercel ecommerce | `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | public key `APP_USR-…` |

- [ ] Redeploy API + ecommerce
- [ ] Smoke: 1 pago real monto bajo → orden `PAID` en admin

---

## 3) Backoffice — quién puede entrar (10 min)

| Dónde | Variable | Notas |
|-------|----------|--------|
| Vercel backoffice | `ADMIN_EMAILS` | Emails Google de dueña/operadores, separados por coma |
| Vercel backoffice | `BETTER_AUTH_SECRET` | `openssl rand -hex 32` si no existe |
| Vercel backoffice | `BETTER_AUTH_BASE_URL` | `https://admin.yerbaxanaes.com` |
| Vercel backoffice | `NEXT_PUBLIC_APP_URL` | Igual que base URL |
| Vercel backoffice | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| Google Cloud Console | Redirect URI | `https://admin.yerbaxanaes.com/api/auth/callback/google` |

- [ ] Login con email listado en `ADMIN_EMAILS`
- [ ] Usuario no listado **no** entra como admin

---

## 4) URLs / CORS (5 min)

| Dónde | Variable | Ejemplo |
|-------|----------|---------|
| Railway API | `FRONTEND_URL` | `https://yerbaxanaes.com` (sin `/` final) |
| Railway API | `BACKOFFICE_URL` | `https://admin.yerbaxanaes.com` |
| Railway API | `ALLOWED_ORIGINS` | `https://yerbaxanaes.com,https://www.yerbaxanaes.com,https://admin.yerbaxanaes.com` |
| Vercel ecommerce | `NEXT_PUBLIC_API_URL` / `API_URL` | URL pública Railway |
| Vercel ecommerce | `NEXT_PUBLIC_SITE_URL` | `https://yerbaxanaes.com` |
| Vercel backoffice | `NEXT_PUBLIC_API_URL` / `API_URL` | Misma API |
| Vercel backoffice | `DATABASE_URL` | **Misma** Postgres que la API |

- [ ] `GET {API}/health` OK
- [ ] Tienda habla con la API (catálogo carga)
- [ ] Admin habla con la API (órdenes cargan)

---

## 5) Cloudinary — fotos (5–10 min)

| Dónde | Variable |
|-------|----------|
| Railway API | `CLOUDINARY_CLOUD_NAME` |
| Railway API | `CLOUDINARY_API_KEY` |
| Railway API | `CLOUDINARY_API_SECRET` |

- [ ] Subir 1 foto desde backoffice → se ve en tienda
- [ ] (Opcional) `REVALIDATE_SECRET` igual en API y ecommerce

---

## 6) Correo Argentino / MiCorreo (10–15 min)

| Dónde | Variable | Notas |
|-------|----------|--------|
| Railway API | `CA_ENVIRONMENT` | `PROD` |
| Railway API | `CA_USER_TOKEN` / `CA_PASSWORD_TOKEN` | Tokens API |
| Railway API | `CA_EMAIL` / `CA_PASSWORD` | Login MiCorreo |
| Railway API | `CA_POSTAL_CODE_ORIGIN` | `5963` Villa del Rosario |
| Railway API | `CA_SENDER_*` | Si el perfil está incompleto |

- [ ] Checkout cotiza envío sin error
- [ ] Si falla: anotar status/log y no forzar go-live de envíos (WhatsApp backup ya existe en marca)

---

## 7) Smoke final de la sesión (15 min)

Hacer **en este orden**:

1. [ ] Login admin OK  
2. [ ] Producto real + precio + stock/foto  
3. [ ] Compra en tienda (tarjeta / método real de bajo monto)  
4. [ ] Orden `PAID` en backoffice  
5. [ ] Stock descontado bien  
6. [ ] Mail a dueña y (si hay) comprador  
7. [ ] (Opcional) venta CASH/TRANSFER desde BO  
8. [ ] Anotar qué falló en `docs/qa-payments-evidence.md` si hiciste matriz completa  

---

## Plan B si algo no cierra en la sesión

| Bloqueo | Qué hacer igual |
|---------|-----------------|
| Gmail sin App Password | Resend free o solo operar por backoffice unos días |
| MiCorreo demora alta | Dejar `CA_ENVIRONMENT=TEST` o cotización manual / WhatsApp |
| OAuth Google roto | Revisar redirect URI y `ADMIN_EMAILS` |
| Webhook MP no llega | Revisar URL pública, secret, logs Railway |

---

## Después de la sesión (vos)

- [ ] Tildar ítems en `docs/go-live.md` P1 que hayan quedado OK  
- [ ] Completar filas en `docs/prod-env-checklist.md`  
- [ ] Si hubo bugs: issue o fix en repo (sin secretos en el issue)  
- [ ] Soft-launch: avisar solo a círculo chico antes de pauta paga  

---

## Notas de seguridad

- Nunca `MP_ACCESS_TOKEN` en `NEXT_PUBLIC_*`
- Nunca commitear `.env`
- App Password de Gmail se puede **revocar** en Google si se filtra
- Preferí que ella pegue secretos en Railway/Vercel; vos no te los lleves por WhatsApp si se puede evitar
