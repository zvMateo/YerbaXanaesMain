# Go-live — YerbaXanaes

Checklist de salida a producción (relevamiento 2026-08). Actualizar al cerrar ítems.

## Estado del core

| Área | Madurez |
|------|---------|
| Catálogo + inventario receta | Alto |
| Checkout MP Brick + webhook + cleanup PENDING | Alto |
| Backoffice auth allowlist + AdminGuard | Alto |
| Envíos MiCorreo | Alto (requiere credenciales PROD) |
| Contenido/marca pública | **Bajo — bloqueante** |
| Observabilidad (Sentry) | Ausente |
| Emails transaccionales | Ausente |

---

## P0 — Contenido / confianza (antes de anunciar)

- [ ] Unificar contacto real: **footer = `/contacto` = WhatsApp de envíos**
  - Hoy inconsistente: footer con Buenos Aires / `+54 11 1234-5678` vs contacto Córdoba / WA real
- [ ] Formulario de contacto: implementar envío real **o** quitar y dejar solo WhatsApp/email
- [ ] Newsletter: implementar **o** quitar (hoy es toast simulado)
- [ ] Testimonios inventados + “Miles de mates felices” + hero “500+” / “24h”: reales o fuera
- [ ] Links muertos footer: Instagram, Facebook, FAQ, Envíos, Términos, Privacidad
- [ ] Catálogo prod con productos/precios/fotos reales (no seeds Unsplash/placehold)
- [ ] `og-image.jpg` y fotos hero/nosotros reales

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
