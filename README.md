# English Vocab Trainer

Next.js app for learning vocabulary with AI assistance. Includes onboarding, flashcards, quizzes,
pronunciation practice, and AI-powered word intake.

## Status projektu (wersja 1.0.5 - 2025-12-23)

### Wdrożone zmiany w 1.0.5
✅ **Przycisk "Pomiń" w onboardingu** - przeniesiony z nagłówka do sekcji akcji (przy przyciskach "Dalej"/"Start misji")
- Pliki: `src/app/onboarding/page.tsx`
- Dostępny w krokach: pair, skin, words (nie pokazuje się w kroku mission)

✅ **Auto-detekcja języka** - automatyczne wykrywanie języka przeglądarki przy pierwszej wizycie
- Plik: `src/app/login/page.tsx`
- Funkcja: `detectPreferredLanguage()` (linie 62-70)
- Kolejność: uk (ukraiński) → ru (ukraiński) → pl (polski) → en (angielski)
- Zapis w localStorage: `uiLanguage`

✅ **Flagi emoji zamiast CSS gradient** - zamiana na Unicode emoji
- Plik: `src/app/login/page.tsx` (linie 72-90)
- UA: 🇺🇦, PL: 🇵🇱, EN: 🇬🇧

### Znane problemy DO NAPRAWY

❌ **Problem 1: Flagi emoji nie wyświetlają się poprawnie**
- Symptom: Użytkownik nie widzi flag emoji na stronie logowania
- Możliwe przyczyny:
  - Cache przeglądarki (nie pobrano nowej wersji `login/page.tsx`)
  - Brak wsparcia dla emoji w systemie użytkownika
  - Błąd w renderowaniu (może trzeba sprawdzić DevTools Console)
- Lokalizacja kodu: `src/app/login/page.tsx:193` - `<span className="text-base">{option.flag}</span>`
- Do sprawdzenia:
  1. Wyczyść cache przeglądarki (Ctrl+Shift+R)
  2. Sprawdź Console w DevTools (F12)
  3. Sprawdź czy emoji renderują się w innych miejscach aplikacji
  4. Rozważ fallback: jeśli emoji nie działa, użyć SVG flag lub powrót do CSS gradient

❌ **Problem 2: Brak widocznego numeru wersji w UI**
- Wersja jest dostępna tylko w `/api/health` endpoint
- Brak wyświetlania wersji dla użytkownika w interfejsie
- Sugerowane rozwiązanie: dodać numer wersji w stopce aplikacji lub w menu użytkownika
- Lokalizacja: można dodać np. w `src/components/layout/Footer.tsx` lub w rozwijanym menu profilu

### Panel admina - tylko PLAN (NIE wdrożono)

⚠️ **UWAGA:** W wersji 1.0.5 tylko ZAPLANOWANO rozbudowę panelu admina. Nie wprowadzono żadnych zmian.

**Obecny stan:**
- Panel admina (`/admin`) tylko WYŚWIETLA dane (read-only)
- Limity konfigurowane przez zmienne środowiskowe (env vars)
- Brak możliwości edycji przez UI

**Plan rozbudowy (Phase 2 - DO WDROŻENIA):**
Szczegółowy plan w pliku: `/home/radek/.claude/plans/joyful-sprouting-chipmunk.md`

**Co ma zawierać edytowalny panel admina:**
1. **Zarządzanie limitami użytkowników**
   - MAX_ACTIVE_USERS (zwiększanie/zmniejszanie)
   - Konfiguracja przechowywana w bazie danych (tabela `AppConfig`)

2. **Zarządzanie limitami AI (kontrola kosztów)**
   - FREE_AI_REQUESTS_PER_MONTH, FREE_AI_UNITS_PER_MONTH
   - PRO_AI_REQUESTS_PER_MONTH, PRO_AI_UNITS_PER_MONTH
   - GLOBAL_AI_REQUESTS_PER_MONTH, GLOBAL_AI_UNITS_PER_MONTH

3. **Zarządzanie whitelistą**
   - Dodawanie/usuwanie emaili (ALLOWLIST_EMAILS)
   - UI z tabelą i formularzem

4. **Zarządzanie statusami użytkowników**
   - Zmiana statusu: ACTIVE / WAITLISTED / SUSPENDED
   - Zmiana planu: FREE / PRO
   - Tabela użytkowników z filtrowaniem i paginacją

5. **Statystyki i estymacja kosztów**
   - AI usage (global, per-plan, top users, daily trend)
   - Estymacja miesięcznych kosztów (Gemini pricing)
   - Projekcja do końca miesiąca

**Architektura (database-first):**
- Nowe tabele: `AppConfig`, `ConfigHistory`
- Cache 1-minutowy w pamięci
- Fallback do env vars (backward compatibility)
- API endpoints: `/api/admin/config`, `/api/admin/users`, `/api/admin/stats`
- Nowe komponenty UI: Tabs, Input, Select, Modal, Toast, Badge

**Fazy implementacji:**
1. Database schema (Prisma migrations)
2. Lib layer (`src/lib/config.ts` z cache)
3. API endpoints
4. UI komponenty
5. Estymacja kosztów

**Uwaga:** Implementacja panelu admina to kompleksowy projekt (8-12h pracy).

### Jak przekazać pracę kolejnemu developerowi

1. **Sprawdź wdrożenie UAT:**
   ```bash
   curl https://evt-uat-pl-44b1.azurewebsites.net/api/health
   ```
   Oczekiwana odpowiedź: `"version":"1.0.5"`, `"status":"ok"`

2. **Reprodukuj problemy z flagami:**
   - Otwórz https://evt-uat-pl-44b1.azurewebsites.net/login
   - Otwórz DevTools (F12) → Console
   - Sprawdź czy są błędy
   - Sprawdź czy emoji renderują się (`🇺🇦 🇵🇱 🇬🇧`)

3. **Przejrzyj plan panelu admina:**
   - Plik: `/home/radek/.claude/plans/joyful-sprouting-chipmunk.md`
   - Zawiera kompletną specyfikację: schema, API, UI, kolejność wdrożenia

4. **Środowisko:**
   - Region: Poland Central
   - UAT: https://evt-uat-pl-44b1.azurewebsites.net
   - PRD: https://evt-prd-pl-44b1.azurewebsites.net
   - Deployment: GitHub Actions (`.github/workflows/`)

### Commity w wersji 1.0.5
- `acb41c7` - "Ulepsz onboarding i konfigurację językową"
- `05ecf1b` - "Napraw błąd TypeScript - dodaj import AppLanguage"

## Stack
- Next.js 14 / React 18
- NextAuth (Google OAuth)
- Prisma + PostgreSQL
- Tailwind CSS
- Vitest + Playwright

## Local development
1) Install dependencies:
```bash
npm ci
```

2) Configure env:
```bash
cp .env.example .env.local
```

3) Start Postgres (optional for local):
```bash
docker compose up -d
```

4) Initialize schema:
```bash
npx prisma db push
```

5) Run the app:
```bash
npm run dev
```

Notes:
- AI features need `GEMINI_API_KEY`.
- Google login needs OAuth credentials. E2E uses a test login when `E2E_TEST=true`.

## Access control & limits
- Allowlist: `ALLOWLIST_EMAILS` (comma/space separated). If set, only listed emails are active.
- Admins: `ADMIN_EMAILS` to access `/admin` dashboard.
- Capacity: `MAX_ACTIVE_USERS` (over-capacity users are routed to `/waitlist`).
- Per-plan AI limits (monthly): `FREE_AI_REQUESTS_PER_MONTH`, `FREE_AI_UNITS_PER_MONTH`,
  `PRO_AI_REQUESTS_PER_MONTH`, `PRO_AI_UNITS_PER_MONTH`.
- Global AI limits (monthly): `GLOBAL_AI_REQUESTS_PER_MONTH`, `GLOBAL_AI_UNITS_PER_MONTH`.
- User plans live in `UserPlan` (default `FREE`); upgrade to `PRO` manually until Stripe is added.

## Testing
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- Manual plan: `docs/MANUAL_TEST_PLAN.md`

CI runs lint + typecheck + unit + e2e on PR and `main`.

## Deployment
Azure deployment (UAT + PRD) is documented in `docs/DEPLOYMENT_AZURE.md`.
`/api/health` returns build metadata (`APP_VERSION`, `APP_COMMIT_SHA`, `APP_BUILD_TIME`)
for post-deploy verification.
Ops runbook: `docs/RUNBOOK.md`.

## CI/CD
- `CI`: `.github/workflows/ci.yml`
- `Deploy UAT`: `.github/workflows/deploy-uat.yml` (push to `main`)
- `Deploy PRD`: `.github/workflows/deploy-prd.yml` (manual)

## Data model
Migrations are stored in `prisma/migrations`. Deployments run
`node scripts/ensure-migrations.js` + `prisma migrate deploy` on startup.
