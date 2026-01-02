import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e';
const HOME_HEADING = /Dzisiejsza lekcja|Your lesson today|Твоя сьогоднішня пригода/i;
const CHAT_PLACEHOLDER = /Wpisz słówka|Type words|Введи слова/i;
const SELECTION_HINT = /Zaznacz słówka|Select the words|Обери слова/i;
const SET_NAME_PLACEHOLDER = /Nazwa zestawu|Set name|Назва набору/i;
const ADD_BUTTON = /Dodaj|Add|Додати/i;
const ADDED_MESSAGE = /Dodano|Added|Додано/i;
const PROFILE_LINK = /Profil|Profile|Профіль/i;
const HOME_LINK = /Start|Home|Старт/i;
const QUIZ_LINK = /Quiz|Квіз/i;
const UNASSIGNED_SET = /Bez zestawu|Unassigned|Без набору/i;
const EIGHT_WORDS = /8\s+(słów|words|слів)/i;
const DELETE_BUTTON = /Usuń|Delete|Видал/i;

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
  await expect(page.getByRole('heading', { name: HOME_HEADING })).toBeVisible();
  await dismissConsentBanner(page);
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
  await page.getByPlaceholder(CHAT_PLACEHOLDER).fill(
    'apple - jablko, banana - banan, carrot - marchew, pear - gruszka'
  );
  await page.keyboard.press('Enter');

  await expect(
    page.getByText(SELECTION_HINT)
  ).toBeVisible();
  await page.getByPlaceholder(SET_NAME_PLACEHOLDER).fill('Biologia - kartkowka');
  await dismissConsentBanner(page);
  await page.getByRole('button', { name: ADD_BUTTON }).click();
  await expect(page.getByText(ADDED_MESSAGE).last()).toBeVisible();

  await page.getByPlaceholder(CHAT_PLACEHOLDER).fill('plum - sliwka, peach - brzoskwinia');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(SELECTION_HINT)
  ).toBeVisible();
  await page.getByTestId('set-selector').selectOption({ label: 'Biologia - kartkowka' });
  await dismissConsentBanner(page);
  await page.getByRole('button', { name: ADD_BUTTON }).click();
  await expect(page.getByText(ADDED_MESSAGE).last()).toBeVisible();

  await page.getByRole('link', { name: PROFILE_LINK }).click();
  await expect(page).toHaveURL(/\/profile/);
  const setRow = page
    .getByTestId('set-row')
    .filter({ hasText: 'Biologia - kartkowka' });
  await expect(setRow).toBeVisible();
  await expect(setRow.getByText(EIGHT_WORDS)).toBeVisible();
  await expect(setRow).toBeVisible();

  const nav = page.getByRole('navigation');
  await nav.getByRole('link', { name: HOME_LINK }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: QUIZ_LINK }).first().click();
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
  await page.getByPlaceholder(CHAT_PLACEHOLDER).fill(
    'acid - kwas, base - zasada, salt - sol, water - woda'
  );
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(SELECTION_HINT)
  ).toBeVisible();
  await page.getByPlaceholder(SET_NAME_PLACEHOLDER).fill('Chemia - kartkowka');
  await dismissConsentBanner(page);
  await page.getByRole('button', { name: ADD_BUTTON }).click();
  await expect(page.getByText(ADDED_MESSAGE)).toBeVisible();

  await page.getByRole('link', { name: PROFILE_LINK }).click();
  await expect(page).toHaveURL(/\/profile/);
  const setRow = page
    .getByTestId('set-row')
    .filter({ hasText: 'Chemia - kartkowka' });
  await expect(setRow).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await dismissConsentBanner(page);
  await setRow.getByRole('button', { name: DELETE_BUTTON }).click();
  await expect(setRow).toHaveCount(0);

  const nav = page.getByRole('navigation');
  await nav.getByRole('link', { name: HOME_LINK }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: QUIZ_LINK }).first().click();
  await expect(page).toHaveURL(/\/quiz/);
  await expect(
    page.getByRole('button', { name: /Chemia - kartkowka/ })
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: new RegExp(`${UNASSIGNED_SET.source} \\(`, 'i') })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Chemia \(4\)/ })
  ).toBeVisible();
});
