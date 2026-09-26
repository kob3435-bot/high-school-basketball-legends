import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const isProd = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: BASE, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
  webServer: isProd ? undefined : { command: 'npx vite build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true, timeout: 120_000 },
  testMatch: isProd ? /prod\.spec\.ts$/ : /^(?!.*prod\.spec).*\.spec\.ts$/,
});
