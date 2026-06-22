import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Global setup de Playwright: prepara la DB de test ANTES de levantar los servers.
 *
 * - NO levanta el contenedor de Postgres (eso lo hace el script `test:e2e` o, en CI,
 *   un service container). Acá solo aplicamos el schema + seed determinista.
 * - Corre `prisma migrate deploy` (refleja prod: aplica todas las migraciones) y luego
 *   el seed existente, que es idempotente porque limpia la DB antes de poblarla.
 *
 * El DATABASE_URL apunta a la DB de test (:5433). Hay una guarda explícita: si por error
 * la URL apunta a la DB de dev (:5432), abortamos — el seed hace deleteMany y borraría datos.
 */

const API_DIR = path.resolve(process.cwd(), "../api");

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://admin:yerbapassword123@localhost:5433/yerbaxanaes_test_db";

function assertNotDevDatabase(url: string): void {
  // El seed borra todo (deleteMany). Nunca debe correr contra la DB de dev.
  if (url.includes(":5432") || url.includes("yerbaxanaes_main_db")) {
    throw new Error(
      `[e2e] ABORT: E2E_DATABASE_URL apunta a la DB de desarrollo (${url}). ` +
        `El seed borraría datos reales. Apuntá a la DB de test (:5433).`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  assertNotDevDatabase(E2E_DATABASE_URL);

  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };

  console.log("[e2e] Aplicando migraciones contra la DB de test...");
  execSync("bunx prisma migrate deploy", {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });

  console.log("[e2e] Sembrando datos deterministas...");
  execSync("bun prisma/seed.ts", {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });

  console.log("[e2e] DB de test lista.");
}
