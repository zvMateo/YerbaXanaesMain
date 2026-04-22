# CLAUDE.md - YerbaXanaes Project Context

This file provides guidance to Claude Code when working with the YerbaXanaes monorepo.

---

## 📋 Project Overview

**YerbaXanaes** - Argentine yerba mate e-commerce platform.

**Three applications:**

1. **ecommerce** (Next.js) - Customer store + checkout
2. **backoffice** (Next.js) - Admin dashboard
3. **api** (NestJS) - Backend API

**Shared packages:**

- `@repo/ui` - React components (shadcn/ui based)
- `@repo/types` - TypeScript types + Zod schemas

---

## 🏗️ Tech Stack (LOCKED IN)

- **Runtime:** Bun 1.3.8
- **Monorepo:** Turborepo
- **Backend:** NestJS 11 + Prisma + PostgreSQL
- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- **State:** Zustand (client) + TanStack Query v5 (server)
- **Forms:** react-hook-form + Zod
- **Auth:** Better Auth (backoffice only)
- **Payments:** MercadoPago Checkout Pro
- **Testing:** Vitest (unit) + Playwright (E2E)
- **DevOps:** Docker (PostgreSQL) + GitHub Actions + Turborepo

---

## 📁 Monorepo Structure

```
yerbaxanaes/
├── apps/
│   ├── api/                    # NestJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── auth/           # Better Auth integration
│   │   │   ├── catalog/        # Products + categories
│   │   │   ├── inventory/      # Stock management
│   │   │   ├── orders/         # Order processing
│   │   │   ├── payments/       # MercadoPago webhook
│   │   │   ├── customers/      # Customer data
│   │   │   ├── dashboard/      # Analytics endpoints
│   │   │   └── prisma/         # Database service
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── migrations/     # Versioned migrations
│   │   └── __tests__/          # Unit + E2E tests
│   │
│   ├── ecommerce/              # Next.js store (port 3000)
│   │   ├── src/
│   │   │   ├── app/            # Routes + layouts
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # TanStack Query hooks
│   │   │   ├── lib/            # Utilities
│   │   │   └── types/          # Local types (import from @repo/types)
│   │   └── __tests__/
│   │
│   └── backoffice/             # Next.js admin (port 3002)
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       └── __tests__/
│
├── packages/
│   ├── ui/                     # shadcn/ui based components
│   │   └── src/components/
│   │
│   ├── types/                  # Shared TypeScript types
│   │   ├── auth.ts             # Auth types
│   │   ├── product.ts          # Product types
│   │   ├── order.ts            # Order types
│   │   ├── payment.ts          # Payment types
│   │   └── schemas/            # Zod schemas (mirror backend DTOs)
│   │
│   ├── eslint-config/
│   └── typescript-config/
│
├── docker-compose.yml          # PostgreSQL + services
├── turbo.json                  # Turborepo configuration
├── CLAUDE.md                   # THIS FILE
└── .env.local                  # Secrets (NOT committed)
```

---

## 🔒 Architecture Decisions (LOCKED IN)

### API Strategy: **REST** (NOT GraphQL)

**Why:**

- Single client (ecommerce) initially, admin (backoffice) uses same REST API
- Product catalog + orders = straightforward CRUD
- Simpler to implement quickly
- Easy to cache with Redis if needed

### Database: **PostgreSQL + Prisma** (NOT Supabase)

**Why:**

- Full control over schema
- Advanced features: soft deletes, enums, relationships
- Prisma provides type-safe ORM
- Migrations versioned in git

### Hosting:

- **Frontend:** Vercel (ecommerce + backoffice)
- **Backend:** Railway with Docker
- **Database:** Railway PostgreSQL
- **Error tracking:** Sentry

### Payments: **MercadoPago Checkout Pro** (NOT Stripe)

**Why:** Argentine company, MercadoPago is standard in LATAM

---

## 🗄️ Database Schema (Prisma)

**Key Models:**

- `User` - Customers + backoffice users
- `Product` - Yerba mate products
- `ProductVariant` - Size/flavor variations
- `Category` - Product categories
- `VariantIngredient` - Product composition
- `InventoryItem` - Stock levels per variant
- `Order` - Customer orders
- `OrderItem` - Items in order
- `OrderPayment` - MercadoPago payment tracking

**Important Patterns:**

- **Soft deletes:** `Order` has `deletedAt` field
- **Enums:** `OrderStatus`, `PaymentStatus`, `UserRole`
- **Relationships:** Products → Variants → Ingredients → Inventory

**Critical Queries:**

- Product with variants + ingredients + inventory (for catalog)
- Order with items + payment status (for checkout tracking)
- Inventory levels per variant (for stock checking)

---

## 📝 Code Conventions

### Backend (NestJS)

**File Naming:**

```
*.module.ts      - Feature modules
*.controller.ts  - HTTP endpoints
*.service.ts     - Business logic
*.dto.ts         - Data Transfer Objects
*.entity.ts      - Database entities
```

**Validation & Security:**

```typescript
// ALWAYS use ValidationPipe globally
@UseGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))

// ALWAYS define DTOs for requests
export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ValidateNested()
  items: CreateOrderItemDto[];
}

// ALWAYS return standard shape
{
  data: T,
  meta?: { timestamp, pagination },
  message?: string
}
```

**Auth & Guards:**

```typescript
// Endpoints MUST have auth guard
@Get(':id')
@UseGuards(AuthGuard('jwt'))
async getOrder(@Param('id') id: string) {
  return { data: order, message: 'Order fetched' };
}
```

**Database Queries:**

```typescript
// ALWAYS explicit select/include (prevent N+1)
const order = await this.prisma.order.findUnique({
  where: { id: orderId },
  include: {
    items: {
      include: {
        variant: {
          include: { product: true, ingredient: true },
        },
      },
    },
    payment: true,
  },
});

// ❌ NEVER do N+1:
// ✅ Always use include/select
```

### Frontend (Next.js)

**Data Fetching:**

```typescript
// ✅ ONLY use TanStack Query custom hooks
export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed");
      return res.json().then((r) => r.data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ❌ NO useEffect for data fetching
// ❌ NO individual useState for form fields
```

**Forms:**

```typescript
// ✅ ALWAYS react-hook-form + Zod
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const checkoutSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(10),
});

export const CheckoutForm = () => {
  const form = useForm({
    resolver: zodResolver(checkoutSchema),
  });

  // ...
};

// ❌ NO individual useState for form fields
```

**Error Handling:**

```typescript
// ALWAYS show toast on errors (Sonner)
const handleCheckout = async (data) => {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const { message } = await res.json();
      toast.error(message);
      return;
    }

    toast.success("Order created!");
  } catch (err) {
    toast.error("An error occurred");
  }
};

// ❌ NEVER silent failures
```

---

## 🧪 Testing Standards

### Unit Tests (Vitest)

```bash
# Path: src/**/*.spec.ts
# Run: cd apps/api && bun run test

# Coverage goal: 80%+ for:
# - Services (business logic)
# - DTOs (validation)
# - Utils
```

### E2E Tests (Playwright)

```bash
# Path: tests/e2e/*.spec.ts
# Run: cd apps/api && bun run test:e2e

# Critical flows:
# - Customer signup → Product browse → Checkout → Payment
# - Admin login → Manage inventory → View orders
```

---

## 📦 Shared Types (Important!)

**Location:** `packages/types/`

**RULE:** Backend DTOs MUST match frontend Zod schemas.

```typescript
// Backend DTO: apps/api/src/products/dtos/product.dto.ts
export class ProductDto {
  id: string;
  name: string;
  description: string;
  price: number;
  variants: ProductVariantDto[];
}

// Frontend Schema: packages/types/schemas/product.ts
export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  variants: z.array(productVariantSchema),
});

// ✅ Import in components
import { productSchema } from "@repo/types/schemas";
```

---

## 🔌 Environment Variables

**`apps/api/.env`** (Database + External APIs):

```
DATABASE_URL=postgresql://admin:yerbapassword123@localhost:5432/yerbaxanaes_main_db
MP_ACCESS_TOKEN=<mercadopago_access_token>
API_URL=http://localhost:3001
BACKOFFICE_URL=http://localhost:3002
JWT_SECRET=your_secret_key
NODE_ENV=development
```

**`apps/ecommerce/.env`** (Client-side):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=<mercadopago_public_key>
```

**`apps/backoffice/.env`** (Client-side):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Rule:** Never commit `.env.local` (add to `.gitignore`)

---

## 🚀 Common Commands

```bash
# Development
bun install                      # Install dependencies
bun run dev                      # Start all apps (port 3000, 3001, 3002)

# Building
bun run build                    # Build all apps
bun run build --filter=api       # Build only API

# Type checking & Linting
bun run check-types              # TypeScript check all
bun run lint                     # ESLint all

# Database (from apps/api)
cd apps/api
bunx prisma generate            # Generate Prisma client
bunx prisma db push             # Push schema to DB
bunx prisma migrate dev --name add_field  # Create migration
bunx prisma studio              # Open Prisma Studio (GUI)

# Testing
cd apps/api && bun run test              # Unit tests
cd apps/api && bun run test:watch        # Watch mode
cd apps/api && bun run test:e2e          # E2E tests

# Docker
docker compose up -d             # Start PostgreSQL
docker compose down              # Stop PostgreSQL
docker compose logs -f postgres  # View logs

# Git (always ask before pushing)
git status
git add .
git commit -m "message"
# ASK before: git push
```

---

## 🎯 When Working on Features

### Backend Feature:

1. **Define DTO** in `apps/api/src/module/dtos/`
2. **Update Prisma schema** if needed
3. **Create migration** (`bunx prisma migrate dev`)
4. **Implement Service** - business logic
5. **Create Controller** - HTTP endpoint
6. **Write Vitest tests** - unit test service
7. **Update shared types** in `@repo/types` if DTO changed

### Frontend Feature:

1. **Import DTO schema** from `@repo/types`
2. **Create Zod schema** matching backend DTO
3. **Build component** with `react-hook-form`
4. **Create TanStack Query hook** for API calls
5. **Write Playwright E2E test** for user flow
6. **Test with Vitest** if complex logic

### Database Change:

1. **Update Prisma schema** (`apps/api/prisma/schema.prisma`)
2. **Create migration** (`bunx prisma migrate dev --name description`)
3. **Generate client** (`bunx prisma generate`)
4. **Update DTOs** if entity changed
5. **Update shared types** in `@repo/types`

---

## 🔐 Security Checklist

- [ ] All API endpoints have `@UseGuards(AuthGuard('jwt'))` if needed
- [ ] ValidationPipe enabled globally with `whitelist: true`
- [ ] Sensitive fields excluded from response (DTOs use `@Exclude()`)
- [ ] Environment variables NOT committed (.env.local in .gitignore)
- [ ] CORS configured in NestJS (whitelist frontend domains)
- [ ] MercadoPago webhook signature verified
- [ ] Soft delete pattern used (don't hard delete)
- [ ] Database backups configured in Railway

---

## 🚨 Common Mistakes (Avoid These)

| ❌ Mistake                                | ✅ Solution                    |
| ----------------------------------------- | ------------------------------ |
| useEffect for data                        | Use TanStack Query custom hook |
| Individual useState for forms             | Use react-hook-form + Zod      |
| Updating DTOs without sharing to frontend | Update @repo/types too         |
| N+1 queries in Prisma                     | Use explicit include/select    |
| Forgetting ValidationPipe                 | Add globally in main.ts        |
| Silent error failures                     | Always show toast (Sonner)     |
| Hard deleting records                     | Use soft delete (deletedAt)    |
| Pushing to git without tests              | Run tests first                |

---

## 📊 Performance Targets

- **Frontend Lighthouse:** 95+ score
- **API Response Time:** p99 < 200ms
- **Database Query Time:** < 100ms
- **Bundle Size:** < 200KB (gzipped)
- **Test Coverage:** 80%+ for critical paths

---

## 🔄 Git Workflow

1. **Create feature branch:** `git checkout -b feature/[name]`
2. **Make changes** (use Claude Code)
3. **Run tests:** `bun run test:ci`
4. **Commit:** `git commit -m "feat: description"`
5. **Push:** `git push origin feature/[name]`
6. **Create PR** (GitHub)
7. **Request review**
8. **Merge** after approval

---

## 🎯 Recent Context (For Claude Code)

**Latest features implemented:**

- MercadoPago Checkout Pro integration
- Product variants with ingredients
- Inventory tracking per variant
- Order soft delete pattern
- Better Auth in backoffice

**Current focus areas:**

- E2E checkout flow testing
- Inventory management optimization
- Payment webhook reliability

---

## 🤖 Claude Code Agents Available

This repo uses custom Claude agents. Invoke by name:

- **Fullstack Dev** - NestJS + Next.js expert, architecture decisions
- **Backend Specialist** - NestJS service/controller implementation
- **Frontend Specialist** - React/Next.js component building

---

**Last updated:** [Date]
**Project:** YerbaXanaes E-commerce Platform
**Location:** Villa del Rosario, Córdoba, Argentina 🇦🇷
