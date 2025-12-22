import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = 'e2e';

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
  await expect(page.getByText('Твоя сьогоднішня пригода')).toBeVisible();

  await page.goto('/chat');
  await expect(page.getByRole('heading', { name: 'AI Асистент' })).toBeVisible();
  await expect(page.getByPlaceholder('Введи слова або запитай...')).toBeVisible();

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Профіль навчання' })).toBeVisible();
});
