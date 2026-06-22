import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { ADMIN, BACKOFFICE_URL } from "./helpers";

const authFile = path.join(__dirname, ".auth/admin.json");

/**
 * Setup project: deja una sesión admin reutilizable en storageState.
 *
 * 1. Asegura que el admin exista. La DB de test es efímera (tmpfs), pero el contenedor
 *    puede sobrevivir entre corridas → el signup es tolerante a "ya existe".
 * 2. Login REAL por la UI (ejercita el form de Better Auth), no inyección de cookie.
 * 3. Guarda el storageState para que el project `chromium` no re-loguee.
 */
setup("authenticate as admin", async ({ page, request }) => {
  // 1. Crear el admin vía Better Auth (allowlist ADMIN_EMAILS → rol ADMIN). Tolerante si ya existe.
  await request.post(`${BACKOFFICE_URL}/api/auth/sign-up/email`, {
    data: { email: ADMIN.email, password: ADMIN.password, name: ADMIN.name },
    failOnStatusCode: false,
  });

  // 2. Login real por la UI.
  await page.goto("/login");
  await page.getByTestId("login-email").fill(ADMIN.email);
  await page.getByTestId("login-password").fill(ADMIN.password);
  await page.getByTestId("login-submit").click();

  // 3. Esperar a salir de /login (redirect client-side a "/").
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
  await expect(page).not.toHaveURL(/\/login/);

  // 4. Persistir sesión.
  await page.context().storageState({ path: authFile });
});
