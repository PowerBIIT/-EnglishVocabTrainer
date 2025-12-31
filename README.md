# Henio

Next.js app for school‑focused vocabulary learning (PL→EN for Polish students, UA→PL for
Ukrainian students in Poland). Includes onboarding, flashcards, quizzes, pronunciation practice,
and AI‑powered word intake with multi‑file upload.

## Status projektu (wersja 1.0.20 - stan na grudzień 2025)

### Funkcje użytkownika (szkoła/UA)
- Ścieżki onboardingu: „Uczeń w Polsce” (PL → EN) i „Uczeń z Ukrainy w Polsce” (UA → PL).
- UI dopasowane do uczniów: lekcje, zadania, krótkie quizy, zadanie dnia.
- Podpowiedź polskich znaków dla UI UA przy parze UA → PL.
- Dodawanie słówek: wklejanie tekstu, zdjęcia lub pliki (możesz wybrać wiele naraz).

### Wdrożone funkcje (stan stabilny)
✅ **Panel admina: szybkie akcje + zgłoszenia**
- Przyciski w tabeli: Nadaj dostęp / Zawieś / Usuń (z potwierdzeniem)
- Zakładka "Zgłoszenia" (lista WAITLISTED)

✅ **Panel admina PL/EN** - przełącznik języka w nagłówku

✅ **Domyślny język PL** - domyślna para `pl-en` i UI po polsku

✅ **Widoczny numer wersji w UI** - badge pobiera wersję z `/api/health`
- Plik: `src/components/layout/VersionBadge.tsx`

### Zgodność z RODO/GDPR (NOWE w 1.0.20)
✅ **Polityka prywatności** - `/privacy` (PL/EN/UA)
✅ **Regulamin** - `/terms` (PL/EN/UA)
✅ **Consent w onboardingu** - krok akceptacji jako pierwszy krok
✅ **Potwierdzenie wieku** - checkbox 16+ lub zgoda rodzica
✅ **Usunięcie konta** - przycisk w profilu (Art. 17 RODO)
✅ **ConsentBanner** - przypomnienie dla istniejących użytkowników
✅ **Footer** - linki do dokumentów prawnych

### Znane problemy
- Brak krytycznych znanych problemów.

### Panel admina (WDROŻONY)
- Dostępny pod `/admin` dla emaili z `ADMIN_EMAILS`
- Zakładki: Konfiguracja / Użytkownicy / Zgłoszenia / Statystyki (PL/EN)
- Szybkie akcje: Nadaj dostęp / Zawieś / Usuń (usuwa konto i dane)
- Konfiguracja zapisywana w DB (`AppConfig`), historia zmian w `ConfigHistory`
- UAT: baza resetowana przy każdym deployu (zmiany w panelu są nietrwałe)
- PRD: zmiany trwałe, migracje uruchamiane przy starcie aplikacji

### Jak przekazać pracę kolejnemu developerowi

1. **Sprawdź wdrożenie UAT:**
   ```bash
   curl https://henio-uat.azurewebsites.net/api/health
   # docelowo (po domenie): https://uat.henio.app/api/health
   ```
   Oczekiwana odpowiedź: `"status":"ok"`, `version` zgodna z `package.json`, `commit` zgodny z deployem

2. **Sprawdź panel admina:**
   - Zaloguj się kontem z `ADMIN_EMAILS`
   - Otwórz https://henio-uat.azurewebsites.net/admin
   - Przełącz język w nagłówku (PL/EN)
   - Sprawdź zakładkę "Zgłoszenia" i nadaj dostęp
   - Zmień np. `MAX_ACTIVE_USERS` i zapisz

3. **Środowisko:**
   - Region: Poland Central
   - UAT: https://henio-uat.azurewebsites.net (docelowo: https://uat.henio.app)
   - PRD: nieutworzone (docelowo: https://henio.app)
   - Deployment: GitHub Actions (`.github/workflows/`)
   - Aktualne adresy i domeny: `docs/DEPLOYMENT_AZURE.md` i `docs/RUNBOOK.md`

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

3) Start Postgres (wymagane dla testów i większości funkcji):
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
- Image intake supports JPG/PNG/WEBP up to 30 MB and resizes photos to 2400px on upload.
- Image extraction retries with `gemini-2.5-pro` if the active model fails on photos/handwriting.

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

CI runs lint + typecheck + unit + e2e on PR and `main`.
E2E wymaga działającego Postgresa i poprawnego `DATABASE_URL`.

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
