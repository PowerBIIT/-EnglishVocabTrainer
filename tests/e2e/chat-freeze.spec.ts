import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e';
const CHAT_PLACEHOLDER = /Wpisz słówka|Type words|Введи слова/i;
const SELECTION_HINT = /Zaznacz słówka|Select the words|Обери слова/i;
const REVIEW_TITLE = /Słówka gotowe|Words ready|Слова готові/i;
const ADD_BUTTON = /Dodaj|Add|Додати/i;
const CANCEL_BUTTON = /Anuluj|Cancel|Скасувати/i;
const CONSENT_ACTION = /Akceptuje i kontynuuje|Accept and continue|Приймаю і продовжую/i;
const CONTINUE_ACTION = /Dalej|Continue|Далі/i;
const START_MISSION = /Zaczynamy misję|Start the mission|Почати місію/i;

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

const login = async (
  page: Page,
  email: string,
  options?: { onboardingComplete?: boolean }
) => {
  await page.goto('/login');

  const response = await page.request.post('/api/test/login', {
    data: {
      email,
      password: TEST_PASSWORD,
      onboardingComplete: options?.onboardingComplete,
    },
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

test.describe('mobile chat overlay', () => {
  test('chat input works after add and cancel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');
    const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
    await login(page, email);

    await page.route('**/api/ai/parse-text', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          category_suggestion: 'Klasowka',
          words: [
            { target: 'apple', phonetic: '/apple/', native: 'jablko', difficulty: 'easy' },
            { target: 'banana', phonetic: '/banana/', native: 'banan', difficulty: 'easy' },
            { target: 'pear', phonetic: '/pear/', native: 'gruszka', difficulty: 'easy' },
          ],
        }),
      });
    });

    await page.goto('/chat');
    await dismissConsentBanner(page);

    const input = page.getByPlaceholder(CHAT_PLACEHOLDER);
    await input.fill('apple - jablko, banana - banan, pear - gruszka');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name: REVIEW_TITLE })).toBeVisible();
    await expect(page.getByText(SELECTION_HINT)).toBeVisible();
    await page.getByRole('button', { name: ADD_BUTTON }).click();
    await expect(page.getByRole('dialog', { name: REVIEW_TITLE })).toHaveCount(0);
    await expect(input).toBeEnabled();
    await input.fill('still works');
    await expect(input).toHaveValue('still works');

    await page.keyboard.press('Escape');
    await input.fill('apple - jablko');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name: REVIEW_TITLE })).toBeVisible();
    await page.getByRole('button', { name: CANCEL_BUTTON }).click();
    await expect(page.getByRole('dialog', { name: REVIEW_TITLE })).toHaveCount(0);
    await expect(input).toBeEnabled();
  });
});

test.describe('mobile onboarding intake', () => {
  test('input still works after cancel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');
    const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
    await login(page, email, { onboardingComplete: false });

    await page.route('**/api/ai/parse-text', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          category_suggestion: 'Klasowka',
          words: [
            { target: 'apple', phonetic: '/apple/', native: 'jablko', difficulty: 'easy' },
            { target: 'banana', phonetic: '/banana/', native: 'banan', difficulty: 'easy' },
            { target: 'pear', phonetic: '/pear/', native: 'gruszka', difficulty: 'easy' },
          ],
        }),
      });
    });

    await page.goto('/onboarding');

    const consentCheckboxes = page.getByRole('checkbox');
    await consentCheckboxes.nth(0).check();
    await consentCheckboxes.nth(1).check();
    await page.getByRole('button', { name: CONSENT_ACTION }).click();

    await page.getByRole('button', { name: CONTINUE_ACTION }).click();
    await page.getByRole('button', { name: CONTINUE_ACTION }).click();
    await page.getByRole('button', { name: CONTINUE_ACTION }).click();
    await page.getByRole('button', { name: START_MISSION }).click();

    const input = page.getByPlaceholder(CHAT_PLACEHOLDER);
    await input.fill('apple - jablko, banana - banan, pear - gruszka');
    await input.press('Enter');

    const reviewDialog = page.getByRole('dialog', { name: REVIEW_TITLE });
    await expect(reviewDialog).toBeVisible();
    await reviewDialog.getByRole('button', { name: CANCEL_BUTTON }).click();
    await expect(reviewDialog).toHaveCount(0);
    await expect(input).toBeEnabled();
    await input.fill('still works');
    await expect(input).toHaveValue('still works');
  });
});

test.describe('mobile klasowka intake', () => {
  test('input still works after cancel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'mobile only');
    const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
    await login(page, email);

    await page.route('**/api/ai/parse-text', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          category_suggestion: 'Klasowka',
          words: [
            { target: 'apple', phonetic: '/apple/', native: 'jablko', difficulty: 'easy' },
            { target: 'banana', phonetic: '/banana/', native: 'banan', difficulty: 'easy' },
            { target: 'pear', phonetic: '/pear/', native: 'gruszka', difficulty: 'easy' },
          ],
        }),
      });
    });

    await page.goto('/klasowka');
    await dismissConsentBanner(page);

    const input = page.getByPlaceholder(CHAT_PLACEHOLDER);
    await input.fill('apple - jablko, banana - banan, pear - gruszka');
    await input.press('Enter');

    const reviewDialog = page.getByRole('dialog', { name: REVIEW_TITLE });
    await expect(reviewDialog).toBeVisible();
    await reviewDialog.getByRole('button', { name: CANCEL_BUTTON }).click();
    await expect(reviewDialog).toHaveCount(0);
    await expect(input).toBeEnabled();
    await input.fill('still works');
    await expect(input).toHaveValue('still works');
  });
});
