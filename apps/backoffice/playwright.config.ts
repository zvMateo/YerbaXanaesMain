import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * E2E del backoffice (admin). Estructura aislada del E2E del ecommerce.
 *
 * IMPORTANTE: comparte la MISMA DB de test (:5433, docker-compose.test.yml) que el
 * E2E del ecommerce. NO correr ambas suites en paralelo: el global-setup re-siembra
 * la DB y se pisarían. Correr `bun run test:e2e` en una app a la vez.
 *
 * Auth: un `setup` project crea el admin (signup vía Better Auth, allowlist ADMIN_EMAILS)
 * y hace login real por la UI, guardando storageState en e2e/.auth/admin.json. El project
 * `chromium` reusa ese estado para no re-loguear en cada test.
 */

const BACKOFFICE_PORT = Number(process.env.E2E_BACKOFFICE_PORT ?? 3002);
const API_PORT = Number(process.env.E2E_API_PORT ?? 3001);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${BACKOFFICE_PORT}`;
const API_URL = process.env.E2E_API_URL ?? `http://localhost:${API_PORT}`;

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://admin:yerbapassword123@localhost:5433/yerbaxanaes_test_db';

// Secreto fijo SOLO para test (DB efímera, local). No es un secreto de producción.
const E2E_BETTER_AUTH_SECRET =
  process.env.E2E_BETTER_AUTH_SECRET ??
  'e2e-test-secret-not-for-production-0123456789abcdef';

const isCI = !!process.env.CI;

const authFile = path.join(__dirname, 'e2e/.auth/admin.json');

export default defineConfig({
  testDir: './e2e',
  // Global: solo specs. El project `setup` define su propio testMatch para auth.setup.ts;
  // si el global incluyera *.setup.ts, el project `chromium` también lo correría (con sesión
  // ya activa → /login redirige a / y el login falla).
  testMatch: /.*\.spec\.ts$/,
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: authFile },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'bun run dev',
      cwd: '../api',
      url: `${API_URL}/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: E2E_DATABASE_URL,
        FRONTEND_URL: BASE_URL,
        API_URL,
      },
    },
    {
      command: 'bun run dev',
      cwd: '.',
      url: BASE_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // next dev fuerza NODE_ENV=development → auth-client resuelve window.origin (:3002).
        DATABASE_URL: E2E_DATABASE_URL,
        BETTER_AUTH_SECRET: E2E_BETTER_AUTH_SECRET,
        ADMIN_EMAILS: 'admin-e2e@yerbaxanaes.test',
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
