# English Vocab Trainer

Next.js app for learning vocabulary with AI assistance. Includes onboarding, flashcards, quizzes,
pronunciation practice, and AI-powered word intake.

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

## Testing
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- Manual plan: `docs/MANUAL_TEST_PLAN.md`

CI runs lint + typecheck + unit + e2e on PR and `main`.

## Deployment
Azure deployment (UAT + PRD) is documented in `docs/DEPLOYMENT_AZURE.md`.

## CI/CD
- `CI`: `.github/workflows/ci.yml`
- `Deploy UAT`: `.github/workflows/deploy-uat.yml` (push to `main`)
- `Deploy PRD`: `.github/workflows/deploy-prd.yml` (manual)

## Data model
No migrations yet. Production uses `prisma db push` for now; switch to migrations when the schema
stabilizes.
