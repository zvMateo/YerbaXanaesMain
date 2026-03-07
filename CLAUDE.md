# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YerbaXanaes is a Turborepo monorepo for an e-commerce platform selling yerba mate products. It consists of three applications and shared packages.

## Tech Stack

- **Runtime**: Bun 1.3.8
- **Monorepo**: Turborepo
- **Backend**: NestJS 11 + Prisma + PostgreSQL
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **State**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Payments**: MercadoPago Checkout Pro
- **Auth**: Better Auth (backoffice)
- **UI**: shadcn/ui components

## Commands

```bash
# Install dependencies
bun install

# Development (all apps)
bun run dev

# Build all
bun run build

# Lint all
bun run lint

# Type checking
bun run check-types

# Format code
bun run format

# Database (from apps/api)
cd apps/api
bunx prisma generate      # Generate Prisma client
bunx prisma db push       # Push schema to DB
bunx prisma migrate dev   # Create migration
bunx prisma studio        # Open Prisma Studio

# API tests (from apps/api)
cd apps/api
bun run test              # Run unit tests
bun run test:watch        # Watch mode
bun run test:e2e          # E2E tests

# Docker (PostgreSQL)
docker compose up -d      # Start database
docker compose down       # Stop database
```

## Monorepo Structure

```
apps/
  api/          # NestJS backend (port 3001)
  ecommerce/    # Next.js customer store (port 3000)
  backoffice/   # Next.js admin panel (port 3002)

packages/
  ui/           # Shared React components (@repo/ui)
  types/        # Shared TypeScript types (@repo/types)
  eslint-config/
  typescript-config/
```

## Architecture

### API (NestJS)
Modular architecture with feature modules in `apps/api/src/`:
- `auth/` - Authentication (Better Auth integration)
- `catalog/` - Products and categories
- `inventory/` - Stock management
- `orders/` - Order processing
- `payments/` - MercadoPago integration
- `customers/` - Customer management
- `dashboard/` - Analytics endpoints
- `prisma/` - Database service

Each module follows NestJS conventions: `*.module.ts`, `*.controller.ts`, `*.service.ts`

### Frontends (Next.js App Router)
- **ecommerce**: Customer-facing store with checkout flow
  - `/` - Home/product listing
  - `/productos/[slug]` - Product detail
  - `/checkout` - Multi-step checkout with MercadoPago

- **backoffice**: Admin dashboard with Better Auth
  - `/login` - Authentication
  - `/productos` - Product management
  - `/inventario` - Inventory management
  - `/ordenes` - Order management
  - `/clientes` - Customer management
  - `/pagos` - Payment tracking

### Shared Types
Import from `@repo/types`:
- `Product`, `ProductVariant`, `Category`
- `Order`, `OrderItem`, `OrderStatus`
- `InventoryItem`, `VariantIngredient`
- `Create*Input` DTOs for mutations

### Database Schema (Prisma)
Key models: `User`, `Product`, `ProductVariant`, `Order`, `OrderItem`, `InventoryItem`, `Category`
- Products have variants with ingredients linked to inventory
- Orders track MercadoPago payment status
- Soft delete pattern on Order (`deletedAt`)

## Environment Variables

Required in `apps/api/.env`:
```
DATABASE_URL=postgresql://admin:yerbapassword123@localhost:5432/yerbaxanaes_main_db
MP_ACCESS_TOKEN=<mercadopago_access_token>
API_URL=http://localhost:3001
BACKOFFICE_URL=http://localhost:3002
```

Required in `apps/ecommerce/.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=<mercadopago_public_key>
```

## Agent Modes

This repo has specialized Claude Code agents. Invoke by mentioning or using slash commands:

- **Senior Dev** (`/senior-dev`) - Teaching mode, explains concepts
- **FullStack Dev** (`/fullstack-dev`) - NestJS + Next.js expert, business-focused
- **Corporate Frontend** (`/corporate-frontend`) - React architecture, strict patterns

## Code Conventions

- TypeScript strict mode, no `any` types
- Zod for runtime validation
- Remove console.log before committing
- Spanish variable names acceptable (this is an Argentine project)
- Ask before `git push` or destructive git operations
