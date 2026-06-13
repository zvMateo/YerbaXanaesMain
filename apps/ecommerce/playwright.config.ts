import { defineConfig, devices } from '@playwright/test';

const ECOMMERCE_PORT = Number(process.env.E2E_ECOMMERCE_PORT ?? 3000);
const API_PORT = Number(process.env.E2E_API_PORT ?? 3001);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${ECOMMERCE_PORT}`;
const API_URL = process.env.E2E_API_URL ?? `http://localhost:${API_PORT}`;

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: {
      'x-e2e-test': '1',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
        DATABASE_URL:
          process.env.E2E_DATABASE_URL ??
          'postgresql://admin:yerbapassword123@localhost:5433/yerbaxanaes_test_db',
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
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
