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

  await page.goto('/');
  await expect(page.getByText('Твоя сьогоднішня пригода')).toBeVisible();
};

test('tworzy zestaw z czatu i filtruje w quizie', async ({ page }, testInfo) => {
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
          { target: 'carrot', phonetic: '/carrot/', native: 'marchew', difficulty: 'easy' },
          { target: 'pear', phonetic: '/pear/', native: 'gruszka', difficulty: 'easy' },
        ],
      }),
    });
  });

  await page.goto('/chat');
  await page.getByPlaceholder(/Введи/).fill(
    'apple - jablko, banana - banan, carrot - marchew, pear - gruszka'
  );
  await page.keyboard.press('Enter');

  await expect(
    page.getByText('Обери слова, які хочеш додати до бібліотеки.')
  ).toBeVisible();
  await page.getByPlaceholder('Назва набору').fill('Biologia - kartkowka');
  await page.getByRole('button', { name: /Додати/ }).click();
  await expect(page.getByText(/Додано/).last()).toBeVisible();

  await page.getByPlaceholder(/Введи/).fill('plum - sliwka, peach - brzoskwinia');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Обери слова, які хочеш додати до бібліотеки.')
  ).toBeVisible();
  await page.getByTestId('set-selector').selectOption({ label: 'Biologia - kartkowka' });
  await page.getByRole('button', { name: /Додати/ }).click();
  await expect(page.getByText(/Додано/).last()).toBeVisible();

  await page.getByRole('link', { name: 'Профіль' }).click();
  await expect(page).toHaveURL(/\/profile/);
  const setRow = page
    .getByTestId('set-row')
    .filter({ hasText: 'Biologia - kartkowka' });
  await expect(setRow).toBeVisible();
  await expect(setRow.getByText(/8\s+слів/)).toBeVisible();
  await expect(setRow).toBeVisible();

  await page.getByRole('link', { name: 'Старт', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Квіз' }).click();
  await expect(page).toHaveURL(/\/quiz/);
  await expect(
    page.getByRole('button', { name: /Biologia - kartkowka \(8\)/ })
  ).toBeVisible();
});

test('usuwa zestaw i pozostawia slowka bez przypisania', async ({ page }, testInfo) => {
  const email = `e2e+${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@local.test`;
  await login(page, email);

  await page.route('**/api/ai/parse-text', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category_suggestion: 'Chemia',
        words: [
          { target: 'acid', phonetic: '/acid/', native: 'kwas', difficulty: 'easy' },
          { target: 'base', phonetic: '/base/', native: 'zasada', difficulty: 'easy' },
          { target: 'salt', phonetic: '/salt/', native: 'sol', difficulty: 'easy' },
          { target: 'water', phonetic: '/water/', native: 'woda', difficulty: 'easy' },
        ],
      }),
    });
  });

  await page.goto('/chat');
  await page.getByPlaceholder(/Введи/).fill(
    'acid - kwas, base - zasada, salt - sol, water - woda'
  );
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Обери слова, які хочеш додати до бібліотеки.')
  ).toBeVisible();
  await page.getByPlaceholder('Назва набору').fill('Chemia - kartkowka');
  await page.getByRole('button', { name: /Додати/ }).click();
  await expect(page.getByText(/Додано/)).toBeVisible();

  await page.getByRole('link', { name: 'Профіль' }).click();
  await expect(page).toHaveURL(/\/profile/);
  const setRow = page
    .getByTestId('set-row')
    .filter({ hasText: 'Chemia - kartkowka' });
  await expect(setRow).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await setRow.getByRole('button', { name: /Видал/ }).click();
  await expect(setRow).toHaveCount(0);

  await page.getByRole('link', { name: 'Старт', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Квіз' }).click();
  await expect(page).toHaveURL(/\/quiz/);
  await expect(
    page.getByRole('button', { name: /Chemia - kartkowka/ })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Без набору \(/ })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Chemia \(4\)/ })
  ).toBeVisible();
});
