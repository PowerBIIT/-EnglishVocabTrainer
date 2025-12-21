import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'e2e';

const login = async (
  page: Parameters<typeof test>[0] extends { page: infer P } ? P : never,
  email: string
) => {
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
  await expect(page.getByText('Twoja dzisiejsza przygoda')).toBeVisible();
};

test('tworzy zestaw z czatu i filtruje w quizie', async ({ page }) => {
  const email = `e2e+${Date.now()}@local.test`;
  await login(page, email);

  await page.route('**/api/ai/parse-text', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category_suggestion: 'Klasowka',
        words: [
          { en: 'apple', phonetic: '/apple/', pl: 'jablko', difficulty: 'easy' },
          { en: 'banana', phonetic: '/banana/', pl: 'banan', difficulty: 'easy' },
          { en: 'carrot', phonetic: '/carrot/', pl: 'marchew', difficulty: 'easy' },
          { en: 'pear', phonetic: '/pear/', pl: 'gruszka', difficulty: 'easy' },
        ],
      }),
    });
  });

  await page.goto('/chat');
  await page.getByPlaceholder(/Wpisz/).fill(
    'apple - jablko, banana - banan, carrot - marchew, pear - gruszka'
  );
  await page.keyboard.press('Enter');

  await expect(page.getByText(/Zaznacz/).last()).toBeVisible();
  await page.getByPlaceholder('Nazwa zestawu').fill('Biologia - kartkowka');
  await page.getByRole('button', { name: /Dodaj/ }).click();
  await expect(page.getByText(/Dodano/).last()).toBeVisible();

  await page.getByPlaceholder(/Wpisz/).fill('plum - sliwka, peach - brzoskwinia');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Zaznacz/).last()).toBeVisible();
  await page.getByTestId('set-selector').selectOption({ label: 'Biologia - kartkowka' });
  await page.getByRole('button', { name: /Dodaj/ }).click();
  await expect(page.getByText(/Dodano/).last()).toBeVisible();

  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page).toHaveURL(/\/profile/);
  const setRow = page
    .getByTestId('set-row')
    .filter({ hasText: 'Biologia - kartkowka' });
  await expect(setRow).toBeVisible();
  await expect(setRow.getByText(/8 s..wek/)).toBeVisible();
  await expect(setRow).toBeVisible();

  await page.getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Quiz' }).click();
  await expect(page).toHaveURL(/\/quiz/);
  await expect(
    page.getByRole('button', { name: /Biologia - kartkowka \(8\)/ })
  ).toBeVisible();
});

test('usuwa zestaw i pozostawia slowka bez przypisania', async ({ page }) => {
  const email = `e2e+${Date.now()}@local.test`;
  await login(page, email);

  await page.route('**/api/ai/parse-text', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category_suggestion: 'Chemia',
        words: [
          { en: 'acid', phonetic: '/acid/', pl: 'kwas', difficulty: 'easy' },
          { en: 'base', phonetic: '/base/', pl: 'zasada', difficulty: 'easy' },
          { en: 'salt', phonetic: '/salt/', pl: 'sol', difficulty: 'easy' },
          { en: 'water', phonetic: '/water/', pl: 'woda', difficulty: 'easy' },
        ],
      }),
    });
  });

  await page.goto('/chat');
  await page.getByPlaceholder(/Wpisz/).fill(
    'acid - kwas, base - zasada, salt - sol, water - woda'
  );
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Zaznacz/)).toBeVisible();
  await page.getByPlaceholder('Nazwa zestawu').fill('Chemia - kartkowka');
  await page.getByRole('button', { name: /Dodaj/ }).click();
  await expect(page.getByText(/Dodano/)).toBeVisible();

  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page).toHaveURL(/\/profile/);
  const setRow = page
    .getByTestId('set-row')
    .filter({ hasText: 'Chemia - kartkowka' });
  await expect(setRow).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await setRow.getByRole('button', { name: /Usu/ }).click();
  await expect(setRow).toHaveCount(0);

  await page.getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Quiz' }).click();
  await expect(page).toHaveURL(/\/quiz/);
  await expect(
    page.getByRole('button', { name: /Chemia - kartkowka/ })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Bez zestawu \(/ })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Chemia \(4\)/ })
  ).toBeVisible();
});
