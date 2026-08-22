# Go-live — YerbaXanaes

Checklist de salida a producción (relevamiento 2026-08). Actualizar al cerrar ítems.

## Estado del core

| Área | Madurez |
|------|---------|
| Catálogo + inventario receta | Alto |
| Checkout MP Brick + webhook + cleanup PENDING | Alto |
| Backoffice auth allowlist + AdminGuard | Alto |
| Envíos MiCorreo | Alto (requiere credenciales PROD) |
| Contenido/marca pública | Medio — fotos hero/nosotros listas; yerbas principales en Cloudinary; accesorios/blends sin foto ocultos al público |
| Observabilidad (Sentry) | Ausente |
| Emails transaccionales | Ausente |

---

## P0 — Contenido / confianza (antes de anunciar)

- [x] Unificar contacto real: **footer = `/contacto` = WhatsApp de envíos**
  - Fuente única `apps/ecommerce/lib/brand.ts` (Villa del Rosario, Córdoba, CP 5963; email `hola@yerbaxanaes.com`; WA desde `NEXT_PUBLIC_SHIPPING_WHATSAPP_URL` / `NEXT_PUBLIC_WHATSAPP_URL`)
- [x] Formulario de contacto: implementado envío real **o** quitar y dejar solo WhatsApp/email
  - Quitado el form simulado; quedan WhatsApp + mailto
- [x] Newsletter: implementado **o** quitar (hoy es toast simulado)
  - Quitado de home (`NewsletterCta` desenganchado)
- [x] Testimonios inventados + “Miles de mates felices” + hero “500+” / “24h”: reales o fuera
- [x] Links footer FAQ, Envíos, Términos, Privacidad (páginas honestas; sin `href="#"`)
- [x] Instagram real (`https://www.instagram.com/yerbaxanaes/`, default en `brand.ts`)
- [ ] Facebook (icono solo si hay `NEXT_PUBLIC_FACEBOOK_URL`; aún sin URL del cliente)
- [x] Catálogo prod: yerbas principales ya con fotos Cloudinary (no Unsplash); el GET público oculta productos sin imagen
- [ ] Fotos pendientes (accesorios mates/yerbera y blends Frescura Herbal / Esencia Floral / Burrito) para volver a mostrarlos
- [x] `og-image.jpg` y fotos hero/nosotros reales (`public/og-image.jpg`, `public/brand/hero.jpg`, `public/brand/nosotros.jpg`, logo circular en header/footer)

## P1 — Técnico (antes de tráfico real)

- [ ] `MP_ACCESS_TOKEN` + public key **APP_USR-** (no TEST-)
- [ ] `MP_WEBHOOK_SECRET` + URL pública `POST /payments/webhook`
- [ ] `ALLOWED_ORIGINS` con tienda + admin HTTPS
- [ ] `ADMIN_EMAILS`, `BETTER_AUTH_SECRET`, Google OAuth redirect prod
- [ ] MiCorreo `CA_ENVIRONMENT=PROD` + perfil remitente / `CA_SENDER_*`
- [ ] Cloudinary (`CLOUDINARY_*`)
- [ ] `REVALIDATE_SECRET` API ↔ ecommerce
- [ ] Smoke: 1 compra real → orden BO → stock correcto → webhook

## P2 — Primera semana post soft-launch

- [ ] Sentry API + fronts
- [ ] Backup Postgres Railway
- [ ] Rate limit Better Auth ON
- [ ] Email o proceso WhatsApp documentado para “pedido pagado”
- [ ] Endurecer `POST /orders` (CASH/TRANSFER solo admin si el store solo usa MP)
- [ ] Quitar PII de `.env.example` (email admin hardcodeado en raíz)

## QA pagos (mínimo)

Ver `apps/ecommerce/PAYMENTS_QA_MANUAL.md`:

- Tarjeta aprobada / rechazada / in_process
- Ticket (Rapipago/Pago Fácil) pending
- Account money approved/pending
- Mismatch de monto y stock insuficiente
- Webhook duplicado idempotente

## Skills / setup IA

- Setup Grok del repo: `AGENTS.md`, `.grok/`, `.envrc`
- No usar Claude Code en este proyecto
