# AGENTS.md — YerbaXanaes (Grok)

Instrucciones para **Grok** en este monorepo. Fuente única de verdad del proyecto.
Este repo se trabaja con Grok, no con Claude Code.

---

## Stack (locked)

| Pieza | Tecnología |
|-------|------------|
| Runtime | Bun 1.3.8 + Turborepo |
| API | NestJS 11 + Prisma + PostgreSQL (`apps/api`, :3001) |
| Store | Next.js 16 App Router (`apps/ecommerce`, :3000) |
| Admin | Next.js 16 + Better Auth (`apps/backoffice`, :3002) |
| Shared | `@repo/types`, `@repo/ui` |
| Pagos | **Mercado Pago Payment Brick** (no Checkout Pro redirect) |
| Envíos | Correo Argentino / MiCorreo |
| Media | Cloudinary |
| Deploy | API → Railway · Fronts → Vercel |

---

## Layout

```
apps/api/          NestJS REST
apps/ecommerce/    Storefront
apps/backoffice/   Admin + Better Auth
packages/types/    Tipos compartidos
packages/ui/       Componentes React
docs/go-live.md    Checklist producción (P0/P1)
.grok/             Config y rules de Grok
```

---

## Comandos

```bash
# Raíz
bun install
bun run dev              # 3000 + 3001 + 3002
bun run build
bun run lint
bun run check-types

# API (apps/api)
bun run test
bun run test:e2e
bunx prisma generate
bunx prisma migrate dev
bunx prisma db push      # solo dev

# Infra local
docker compose up -d     # Postgres
```

---

## Contratos

**API envelope:** `{ data: T, meta?: object, message?: string }`  
**Errores:** `{ statusCode, message, error }`

- DTOs backend: `class-validator` (no Zod en Nest DTOs).
- Front: Zod + RHF; esquemas alineados con DTOs / `@repo/types`.
- Prisma: siempre `select`/`include` explícito; mutaciones multi-paso en `$transaction`.
- Órdenes: soft delete (`deletedAt`), nunca hard-delete.
- Errores Nest: `NotFoundException` / `BadRequestException` (no `throw new Error`).
- Front errores: Sonner `toast.error` — nunca silenciar.

---

## Seguridad / auth

- Backoffice: Better Auth + allowlist `ADMIN_EMAILS` → rol `ADMIN`.
- API admin: `AuthGuard` + `AdminGuard`.
- Pagos: montos y stock **solo server-side**; webhook MP con `MP_WEBHOOK_SECRET` (HMAC).
- Nunca `MP_ACCESS_TOKEN` en `NEXT_PUBLIC_*`.
- Nunca commitear `.env`.

---

## Cómo trabajar en este repo (rendimiento)

1. **CodeGraph primero** si existe `.codegraph/`: `codegraph_explore` / `codegraph_node` (MCP o CLI). Evitá `find` masivo sobre `/mnt/c` (FS 9p lento).
2. Preferí `grep`/tools acotados a `apps/api/src/...` sobre búsquedas del monorepo entero.
3. Tras mutar schema: `bunx prisma generate` y reiniciar API.
4. Antes de “listo”: correr el test/comando mínimo del área tocada.
5. **No inventar** datos de marca (dirección, teléfono, precios, testimonios). Ver `docs/go-live.md`.
6. Skills preferidas si hacen falta: `mercadopago-integration`, `nestjs-best-practices` / `nestjs-expert`, `better-auth-*`, `lazy-coding` / `design-principles`, `verification-before-completion`.
7. Skills a **no** activar salvo pedido: game-*, pptx, pdf, docx, claude-mem workflows, PE-bridge.

---

## Estilo por app

**API:** kebab-case files · feature folders · Prettier single quotes.  
**Next (ecommerce/backoffice):** double quotes en TSX · TanStack Query · Zustand carrito · RHF+Zod.

**Git:** conventional commits (`feat:`, `fix:`, `chore:`, …). Preguntar antes de `git push` o force.

---

## Referencias

| Doc | Uso |
|-----|-----|
| `docs/go-live.md` | Checklist salida a producción |
| `MERCADOPAGO_INTEGRATION.md` | Flujo Brick + webhook |
| `MICORREO_API.md` | Envíos Correo Argentino |
| `apps/ecommerce/PAYMENTS_QA_MANUAL.md` | QA manual pagos |
| `apps/api/test/PAYMENTS_STAGING_E2E_RUNBOOK.md` | Staging E2E pagos |

---

## Arranque Grok en este repo

```bash
cd /ruta/a/YerbaXanaesMain
direnv allow          # una vez: carga .envrc (aísla compat Claude)
grok                  # o: ./scripts/grok-here.sh
```

Tras cambios de código en WSL `/mnt/c`: `codegraph sync` (el watcher está deshabilitado en 9p).
