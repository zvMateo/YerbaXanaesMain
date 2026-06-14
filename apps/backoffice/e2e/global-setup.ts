import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Global setup de Playwright (backoffice): prepara la DB de test ANTES de levantar servers.
 *
 * Idéntico en intención al del ecommerce: aplica migraciones + seed determinista contra la
 * DB de test (:5433). NO levanta Postgres (eso lo hace el script `test:e2e` o un service
 * container en CI). El seed es idempotente (limpia y repuebla); el admin del backoffice NO
 * lo crea el seed — lo crea `auth.setup.ts` vía signup de Better Auth.
 *
 * Guarda explícita: si la URL apunta a la DB de dev (:5432), abortamos (el seed hace
 * deleteMany y borraría datos reales).
 */

const API_DIR = path.resolve(process.cwd(), "../api");

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://admin:yerbapassword123@localhost:5433/yerbaxanaes_test_db";

function assertNotDevDatabase(url: string): void {
  if (url.includes(":5432") || url.includes("yerbaxanaes_main_db")) {
    throw new Error(
      `[e2e:backoffice] ABORT: E2E_DATABASE_URL apunta a la DB de desarrollo (${url}). ` +
        `El seed borraría datos reales. Apuntá a la DB de test (:5433).`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  assertNotDevDatabase(E2E_DATABASE_URL);

  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };

  console.log("[e2e:backoffice] Aplicando migraciones contra la DB de test...");
  execSync("bunx prisma migrate deploy", {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });

  console.log("[e2e:backoffice] Sembrando datos deterministas...");
  execSync("bun prisma/seed.ts", {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });

  console.log("[e2e:backoffice] DB de test lista.");
}
