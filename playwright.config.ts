import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 3001);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      E2E_TEST: 'true',
      E2E_TEST_PASSWORD: 'e2e',
      NEXT_PUBLIC_E2E_TEST: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
    },
    {
      name: 'mobile-chrome',
      use: devices['Pixel 5'],
    },
  ],
});
