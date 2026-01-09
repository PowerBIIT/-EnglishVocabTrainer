import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 3001);
const baseURL = process.env.BASE_URL || `http://localhost:${PORT}`;
const isRemote = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Skip webServer when testing against remote URL (BASE_URL set)
  webServer: isRemote
    ? undefined
    : {
        command: 'npm run build && npm run start',
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          PORT: String(PORT),
          NEXTAUTH_URL: `http://localhost:${PORT}`,
          E2E_TEST: 'true',
          E2E_TEST_PASSWORD: 'e2e',
          E2E_LOGIN_ENABLED: 'true',
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
