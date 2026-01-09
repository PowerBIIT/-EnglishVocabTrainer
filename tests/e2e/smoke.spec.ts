import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e';
const HOME_HEADING = /Dzisiejsza lekcja|Your lesson today|Твоя сьогоднішня пригода/i;
const CHAT_HEADING = /Asystent AI|AI Assistant|AI Асистент/i;
const CHAT_PLACEHOLDER = /Wpisz słówka|Type words|Введи слова/i;
const PROFILE_HEADING = /Profil nauki|Learning profile|Профіль навчання/i;
const SETTINGS_TAB = /Ustawienia|Settings|Налаштування/i;

const login = async (page: Page, email: string) => {
  await page.goto('/login');

  const response = await page.request.post('/api/test/login', {
    data: { email, password: TEST_PASSWORD },
  });

  expect(response.ok()).toBeTruthy();

  const setCookieHeaders = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);

  const sessionCookie = setCookieHeaders.find((value) =>
    value.startsWith('next-auth.session-token=')
  ) || setCookieHeaders.find((value) =>
    value.startsWith('__Secure-next-auth.session-token=')
  );

  if (!sessionCookie) {
    throw new Error('Missing session cookie');
  }

  const [nameValue] = sessionCookie.split(';');
  const [name, value] = nameValue.split('=');
  await page.context().addCookies([
    {
      name,
      value,
      url: page.url(),
    },
  ]);
};

test('smoke: core pages load', async ({ page }, testInfo) => {
  const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
  await login(page, email);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: HOME_HEADING })).toBeVisible();

  await page.goto('/chat');
  await expect(page.getByRole('heading', { name: CHAT_HEADING })).toBeVisible();
  await expect(page.getByPlaceholder(CHAT_PLACEHOLDER)).toBeVisible();

  await page.goto('/profile');
  await page.getByRole('button', { name: SETTINGS_TAB }).click();
  await expect(page.getByRole('heading', { name: PROFILE_HEADING })).toBeVisible();
});
