# Go-live — YerbaXanaes

Checklist de salida a producción. Workspace: `~/projects/YerbaXanaesMain`.

## Estado del core

| Área | Madurez |
|------|---------|
| Catálogo + inventario receta | Alto |
| Checkout MP Brick + webhook + cleanup PENDING | Alto |
| Backoffice auth allowlist + AdminGuard | Alto |
| Envíos MiCorreo | Alto (requiere credenciales PROD) |
| Contenido/marca pública | **P0 código listo** — falta catálogo/fotos reales |
| Observabilidad (Sentry) | Ausente |
| Emails transaccionales | Ausente |

## Fuente de marca

Datos públicos del ecommerce: `apps/ecommerce/lib/brand.ts`  
(footer, contacto, WhatsApp envíos, schema.org).

---

## P0 — Contenido / confianza

- [x] Unificar contacto real: footer = `/contacto` = WhatsApp de envíos (`lib/brand.ts`)
- [x] Formulario de contacto fake → reemplazado por CTA WhatsApp + email
- [x] Newsletter simulado → eliminado del home
- [x] Testimonios inventados + “Miles de mates…” → eliminados
- [x] Hero claims “500+ / 24h” → reemplazados por claims honestos
- [x] Links footer: FAQ, Envíos, Términos, Privacidad (páginas reales)
- [x] Redes: no se muestran si no hay URL en `brand.social`
- [ ] Catálogo prod con productos/precios/fotos reales (operación BO + Cloudinary)
- [x] OG/Twitter image dinámica (`app/opengraph-image.tsx`) — sin depender de jpg faltante
- [ ] Foto hero/nosotros con asset real (opcional; placeholder honesto hoy)

## P1 — Técnico

- [x] CORS default incluye `admin.yerbaxanaes.com`
- [x] `POST /orders` solo admin (ecommerce usa payments/*)
- [x] Rate limit estricto en `POST /ratings`
- [x] `CLOUDINARY_*` documentado en `apps/api/.env.example`
- [x] PII quitada de `.env.example` raíz (`ADMIN_EMAILS` placeholder)
- [ ] `MP_ACCESS_TOKEN` + public key **APP_USR-**
- [ ] `MP_WEBHOOK_SECRET` + URL pública webhook
- [ ] `ALLOWED_ORIGINS` prod con tienda + admin HTTPS
- [ ] `ADMIN_EMAILS`, `BETTER_AUTH_SECRET`, Google OAuth prod
- [ ] MiCorreo `CA_ENVIRONMENT=PROD` + sender
- [ ] Cloudinary configurado en Railway
- [ ] `REVALIDATE_SECRET` API ↔ ecommerce
- [ ] Smoke: 1 compra real → BO → stock

## P2 — Post soft-launch

- [ ] Sentry API + fronts
- [ ] Backup Postgres Railway
- [ ] Better Auth rateLimit ON (DEBT documentado en `auth.ts`)
- [ ] Email o playbook WhatsApp “pedido pagado”
- [ ] Alertas 5xx / webhook

## QA pagos

Ver `apps/ecommerce/PAYMENTS_QA_MANUAL.md`.

## Variables prod

Ver matriz completa: `docs/prod-env-checklist.md`.

## Setup IA

- Grok-only: `AGENTS.md`, `.grok/`, `.envrc`, `docs/ai-setup-grok.md`
