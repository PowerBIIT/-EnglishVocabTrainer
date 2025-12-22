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
