# Henio

Next.js vocabulary learning app for Polish students (PL→EN) and Ukrainian students in Poland (UA→PL). Features AI-powered word intake, flashcards, quizzes, pronunciation training, and subscription management.

**Version:** 1.0.63

## Environments

| Environment | URL |
|-------------|-----|
| UAT | https://uat.henio.app |
| PRD | https://henio.app |

## Quick Start

```bash
# Install dependencies
npm ci

# Configure environment
cp .env.example .env.local

# Start PostgreSQL
docker compose up -d

# Initialize database
npx prisma db push

# Run development server
npm run dev
```

## Key Features

- **Learning Modes:** Flashcards, quizzes, pronunciation training
- **AI Word Intake:** Paste text, upload photos, or files (PDF, DOCX)
- **Subscriptions:** FREE and PRO plans via Stripe
- **Access Control:** Allowlist, capacity limits, waitlist
- **Admin Panel:** User management, stats, pricing configuration
- **GDPR Compliance:** Consent management, data export, account deletion

## AI Limits & Monitoring

- Limits are enforced per plan and globally (requests + tokens), reset monthly (UTC).
- Configure limits and cost alerts in Admin Panel → Config (stored in DB, override env defaults).
- Admins (`ADMIN_EMAILS`) bypass limits; retries/fallbacks count as separate usage.
- Cost alerts use `AI_COST_ALERT_THRESHOLD_USD` and optional webhook + admin email (SMTP).
- Admin analytics endpoints: `/api/admin/stats`, `/api/admin/stats/ai-tokens`, `/api/admin/stats/ai-trends`, `/api/admin/stats/ai-features`.

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture, data models, patterns |
| [API.md](docs/API.md) | Complete API reference |
| [USER_FLOWS.md](docs/USER_FLOWS.md) | User journeys and UI flows |
| [RUNBOOK.md](docs/RUNBOOK.md) | Operations, deployment, troubleshooting |
| [MANUAL_TESTS.md](docs/MANUAL_TESTS.md) | Manual test cases |

## Commands

```bash
# Development
npm run dev                  # Start dev server
docker compose up -d         # Start PostgreSQL

# Testing
npm run test:unit           # Unit tests (Vitest)
npm run test:e2e            # E2E tests (Playwright)
npm run typecheck           # TypeScript check

# Build
npm run build               # Production build
npm run lint                # ESLint

# Database
npx prisma studio           # DB GUI
npx prisma migrate dev      # Create migration
```

## Deployment

- **UAT:** Auto-deploy on push to `main` (E2E tests run after)
- **PRD:** Manual trigger via `gh workflow run deploy-prd.yml`

Health check: `curl https://henio.app/api/health`

See [RUNBOOK.md](docs/RUNBOOK.md) for complete deployment guide.

## Tech Stack

- Next.js 14 (App Router) + React 18
- NextAuth (Google OAuth + Credentials)
- Prisma + PostgreSQL
- Zustand (state management)
- Gemini API (AI features)
- Stripe (subscriptions)
- Tailwind CSS
- Vitest + Playwright

## Environment Variables

See `.env.example` for complete list. Key variables:

- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` - Auth config
- `GOOGLE_CLIENT_ID/SECRET` - OAuth
- `GEMINI_API_KEY` - AI features
- `STRIPE_*` - Payment integration
- `ADMIN_EMAILS` - Admin access
