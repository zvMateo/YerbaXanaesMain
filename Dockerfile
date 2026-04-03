# ============================================================
# Dockerfile — YerbaXanaes API (NestJS + Prisma + Bun)
# Estrategia: single-stage para garantizar que dist/ esté
# disponible en runtime (sin problemas de multi-stage copy).
# ============================================================

FROM oven/bun:1.3.8-slim

WORKDIR /app

# Instalar OpenSSL — requerido por Prisma en runtime
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copiar archivos del monorepo (respeta .dockerignore)
COPY . .

# Instalar todas las dependencias del workspace
RUN bun install --frozen-lockfile

# Generar Prisma Client y compilar NestJS
RUN cd apps/api && bunx prisma generate && bun run build

# Variable de entorno de producción
ENV NODE_ENV=production

# Railway inyecta PORT automáticamente — lo exponemos como documentación
EXPOSE 3001

# Aplicar migraciones pendientes e iniciar la API
CMD ["sh", "-c", "cd apps/api && bunx prisma migrate deploy && node dist/main"]
