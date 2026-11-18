#!/usr/bin/env bash
# Réplica local de .github/workflows/ci.yml (type-check, lint, build, tests unitarios).
# Úsalo antes de mergear a main si GitHub Actions no está disponible.
#
#   ./scripts/verify-local.sh          # CI completo
#   ./scripts/verify-local.sh --e2e    # + Playwright de backoffice y ecommerce (requiere Docker)
#
# Los E2E vacían las credenciales externas (MP, MiCorreo, SMTP, Cloudinary, Sentry) para que
# la API local, que carga apps/api/.env, nunca llame a servicios reales.
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

step "Prisma generate"
(cd apps/api && bunx prisma generate)

step "Type check"
bun run check-types

step "Lint"
bun run lint

step "Build (NODE_ENV=production)"
NODE_ENV=production bun run build

step "API unit tests"
(cd apps/api && bun run test)

if [[ "${1:-}" == "--e2e" ]]; then
  clean_env=(
    MP_ACCESS_TOKEN= MP_PUBLIC_KEY= MP_WEBHOOK_SECRET=e2e-ci-webhook-secret-fixed-not-prod
    CA_USER_TOKEN= CA_PASSWORD_TOKEN= CA_EMAIL= CA_PASSWORD= CA_ENVIRONMENT=TEST CA_POSTAL_CODE_ORIGIN=
    SMTP_HOST= SMTP_USER= SMTP_PASS= RESEND_API_KEY= ORDER_NOTIFY_EMAIL= EMAIL_FROM=
    CLOUDINARY_CLOUD_NAME= CLOUDINARY_API_KEY= CLOUDINARY_API_SECRET=
    SENTRY_DSN= NEXT_PUBLIC_SENTRY_DSN= REVALIDATE_SECRET= CI=true
  )

  # Una suite a la vez: comparten la misma DB de test (:5433).
  step "E2E backoffice"
  (cd apps/backoffice && env "${clean_env[@]}" bun run test:e2e)

  step "E2E ecommerce"
  (cd apps/ecommerce && env "${clean_env[@]}" bun run test:e2e)

  step "Bajando DB de test"
  docker compose -f docker-compose.test.yml down
fi

printf '\n\033[1;32mOK: todo verde.\033[0m\n'
