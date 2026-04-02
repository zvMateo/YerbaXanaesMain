# AGENTS.md — YerbaXanaes Monorepo

Guide for AI coding agents operating in this Turborepo monorepo (Bun + NestJS + Next.js).

---

## Monorepo Layout

```
apps/api/          → NestJS 11 REST API       (port 3001)
apps/ecommerce/    → Next.js 16 storefront    (port 3000)
apps/backoffice/   → Next.js 16 admin panel   (port 3002)
packages/types/    → Shared TS types          (@repo/types)
packages/ui/       → Shared React components  (@repo/ui)
```

---

## Commands

### Root (run from repo root)

```bash
bun install              # Install all workspaces
bun run dev              # Start all apps concurrently via Turborepo
bun run build            # Build all apps
bun run lint             # Lint all apps
bun run check-types      # Type-check all apps
bun run format           # Prettier format all TS/TSX/MD files
```

### API — `apps/api/` (NestJS + Jest)

```bash
# Run from apps/api/
bun run test                                        # All unit tests
bun run test:watch                                  # Watch mode
bun run test:cov                                    # Coverage report
bun run test:e2e                                    # E2E (jest-e2e.json config)

# Run a SINGLE test file
bun run test -- --testPathPattern=catalog.service   # Match by filename
bun run test -- src/catalog/catalog.service.spec.ts # Exact path

# Run a SINGLE test by name
bun run test -- --testNamePattern="should create product"
```

### Database (run from `apps/api/`)

```bash
bunx prisma generate      # Regenerate Prisma Client after schema change
bunx prisma db push       # Sync schema → DB (dev only, no migration file)
bunx prisma migrate dev   # Create + apply a named migration
bunx prisma studio        # Open Prisma Studio GUI
```

### Infrastructure

```bash
docker compose up -d      # Start PostgreSQL (required before API)
docker compose down       # Stop containers
```

---

## Architecture Contracts

### API Response Shape

All NestJS endpoints must return a consistent envelope:

```ts
{ data: T, meta?: Record<string, unknown>, message?: string }
```

Errors (via global HTTP Exception Filter):

```ts
{ statusCode: number, message: string, error: string }
```

### Frontend Error Handling

- Catch API errors explicitly; display them with **Sonner** `toast.error()`.
- Never fail silently. Always show a user-facing message.

### Shared Types

- Import domain interfaces from `@repo/types` — never re-define them locally.
- Frontend Zod schemas must mirror backend DTOs field-for-field.
- `Create*Input` interfaces live in `packages/types/src/index.ts`.

---

## NestJS Code Style (`apps/api/`)

### File & Folder Naming

- Feature modules: `apps/api/src/<feature>/`
- File names: `kebab-case` — `catalog.service.ts`, `create-catalog.dto.ts`
- One class per file; class name = PascalCase mirror of filename.

### Module Anatomy (required files per feature)

```
<feature>.module.ts      → @Module decorator, imports/providers
<feature>.controller.ts  → @Controller, route handlers only — no business logic
<feature>.service.ts     → All business logic; inject PrismaService here
dto/create-<feature>.dto.ts
dto/update-<feature>.dto.ts   → extends PartialType(Create*Dto)
<feature>.spec.ts        → Unit tests alongside source
```

### DTOs

- Use `class-validator` decorators — no raw Zod in backend DTOs.
- Global `ValidationPipe` is set with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Nest nested DTOs with `@ValidateNested({ each: true })` + `@Type(() => ChildDto)`.

### Error Handling

```ts
throw new NotFoundException(`Product #${id} not found`);
throw new BadRequestException("Category ID not found");
// Never throw raw Error objects — use NestJS built-in HTTP exceptions.
```

### Database (Prisma)

- Always use explicit `select` or `include` — prevent N+1 and field leakage.
- Wrap multi-step mutations in `this.prisma.$transaction(async (tx) => { ... })`.
- Soft delete: set `deletedAt: new Date()` on `Order` — never hard-delete orders.
- After any schema change: `bunx prisma generate` then restart the API.

### Formatting (Prettier config in `apps/api/.prettierrc`)

```json
{ "singleQuote": true, "trailingComma": "all", "endOfLine": "auto" }
```

---

## Next.js Code Style (`apps/ecommerce/` & `apps/backoffice/`)

### File & Folder Naming

- App Router pages: `app/<route>/page.tsx`, `app/<route>/layout.tsx`
- Components: `PascalCase.tsx` in `components/`
- Hooks: `use-<name>.ts` in `hooks/` (kebab-case filename, camelCase export)
- Stores: `<name>-store.ts` in `stores/`
- Schemas: `<name>-schema.ts` in `schemas/`

### Quotes — TSX/JSX uses double quotes

```tsx
// Correct
import { Product } from "@repo/types";
const label = "Yerba Premium";
```

### State Management

- **Server state**: TanStack Query (`useQuery`, `useMutation`). `queryKey` arrays must be descriptive: `["products", filters]`.
- **Client/UI state**: Zustand stores with `persist` middleware for cart/session.
- **Forms**: React Hook Form + Zod (`@hookform/resolvers/zod`). Always infer form types: `z.infer<typeof schema>`.

### Data Fetching

- Use the `safeFetch` wrapper in `lib/api.ts` — it includes a 5 s timeout and fallback support.
- Server Components: use `next/cache` `revalidate` tags (`tags: ["products"]`).
- Read `NEXT_PUBLIC_API_URL` (never hardcode `localhost:3001`).

### Auth (backoffice only)

- Better Auth session is validated in `middleware.ts` via cookie check.
- Public routes: `/login`, `/api/auth/**`, `/_next/**`.
- Do not bypass middleware for new protected routes.

---

## TypeScript Rules (all workspaces)

- **Strict null checks** are on — always handle `null | undefined` explicitly.
- **No `any`** — use `unknown` + type guards, or proper generics.
- **No `console.log`** in committed code — use NestJS `Logger` in the API; remove debug logs in frontends before committing.
- Infer types from Zod schemas: `type FormData = z.infer<typeof mySchema>`.
- Prefer `interface` for object shapes that may be extended; `type` for unions/intersections.

---

## Imports Order (enforced by ESLint)

1. Node built-ins
2. External packages (`@nestjs/*`, `next`, `react`, etc.)
3. Monorepo packages (`@repo/types`, `@repo/ui`)
4. Internal absolute (`@/components/…`)
5. Relative (`./catalog.service`)

---

## Git & Safety Rules

- **Ask before `git push`** or any destructive git operation.
- **Never commit** `.env` files — use `.env.example` for templates.
- **Never commit** `console.log`, commented-out dead code, or `TODO` placeholders without a ticket reference.
- Commit message format: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` prefix (conventional commits).

---

## Environment Variable Checklist

When adding a new env var:

1. Add it to the relevant `apps/*/.env.example`.
2. Document it in `README.md` under **Environment Variables**.
3. Access it via `ConfigService` in NestJS — never `process.env` directly in services.
4. Prefix with `NEXT_PUBLIC_` only for values that must be exposed to the browser.
