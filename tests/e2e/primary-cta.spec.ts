import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e';
const START_FLASHCARDS = /Rozpocznij sesję|Start session|Почати сесію/i;
const START_QUIZ = /Rozpocznij quiz|Start quiz|Почати квіз/i;

const dismissConsentBanner = async (page: Page) => {
  const laterButton = page.getByRole('button', { name: /Przypomnij pozniej/i });
  if (await laterButton.count()) {
    await laterButton.first().click();
    return;
  }

  const acceptButton = page.getByRole('button', { name: /Akceptuje/i });
  if (await acceptButton.count()) {
    await acceptButton.first().click();
  }
};

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

  const sessionCookie =
    setCookieHeaders.find((value) => value.startsWith('next-auth.session-token=')) ||
    setCookieHeaders.find((value) => value.startsWith('__Secure-next-auth.session-token='));

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

test.describe('mobile primary CTAs', () => {
  test('flashcards start button stays visible', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');
    const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
    await login(page, email);

    await page.goto('/flashcards');
    await dismissConsentBanner(page);

    const startButton = page.getByRole('button', { name: START_FLASHCARDS });
    await expect(startButton).toBeVisible();

    await page.mouse.wheel(0, 2000);
    await expect(startButton).toBeVisible();
  });

  test('quiz start button stays visible', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');
    const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
    await login(page, email);

    await page.goto('/quiz');
    await dismissConsentBanner(page);

    const startButton = page.getByRole('button', { name: START_QUIZ });
    await expect(startButton).toBeVisible();

    await page.mouse.wheel(0, 2000);
    await expect(startButton).toBeVisible();
  });
});

