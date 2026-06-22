/**
 * Credenciales y constantes compartidas por el setup de auth y los specs del backoffice.
 *
 * El email debe coincidir con ADMIN_EMAILS del webServer del backoffice (playwright.config.ts)
 * para que el hook `databaseHooks.user.create.before` de Better Auth le asigne rol ADMIN.
 * La password es de test (DB efímera) — no es un secreto de producción.
 */
export const ADMIN = {
  email: "admin-e2e@yerbaxanaes.test",
  password: "E2eAdminPass123!",
  name: "Admin E2E",
} as const;

export const BACKOFFICE_URL =
  process.env.E2E_BASE_URL ?? "http://localhost:3002";
