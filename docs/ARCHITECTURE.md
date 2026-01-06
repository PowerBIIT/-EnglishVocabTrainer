# Henio - Technical Architecture

## Overview

Henio is a vocabulary learning application for Polish students (PL→EN) and Ukrainian students in Poland (UA→PL). It includes AI-powered word intake, flashcards, quizzes, pronunciation training, and subscription management.

**Version:** 1.0.76 (from `package.json`)
**Repository:** `-EnglishVocabTrainer`

## System Context

```
[Browser]
   |
   v
[Next.js App Router + API Routes]
   |-- PostgreSQL (Prisma)
   |-- Google OAuth (NextAuth)
   |-- Gemini API (AI features)
   |-- Stripe (subscriptions)
   |-- SMTP (email)
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Lucide Icons |
| State Management | Zustand (client-side) |
| Backend | Next.js API Routes |
| Database | PostgreSQL 16 via Prisma ORM |
| Authentication | NextAuth v4 (Google OAuth + Credentials) |
| AI | Google Gemini API |
| Payments | Stripe (subscriptions) |
| Email | Nodemailer (OVH SMTP) |
| File Processing | pdf-parse, mammoth |
| Testing | Vitest (unit), Playwright (E2E) |

## Code Layout

```
src/
├── app/                     # Next.js routes (App Router)
│   ├── api/                 # API endpoints
│   │   ├── ai/              # AI features (parse-text, tutor, extract-image, etc.)
│   │   ├── auth/            # Auth (NextAuth, register, verify-email)
│   │   ├── admin/           # Admin endpoints (config, users, stats, pricing)
│   │   ├── stripe/          # Stripe (checkout, portal, webhook)
│   │   ├── waitlist/        # Waitlist flows
│   │   └── health/          # Health check
│   ├── [feature]/page.tsx   # Feature pages
│   ├── providers.tsx        # Context providers
│   └── layout.tsx           # Root layout
│
├── components/              # UI components by domain
│   ├── ui/                  # Base components
│   ├── admin/               # Admin panel
│   ├── ai/                  # Word intake + tutor
│   ├── billing/             # Pricing and usage
│   ├── flashcard/           # Flashcard player
│   ├── quiz/                # Quiz engine
│   ├── pronunciation/       # Pronunciation training
│   ├── mascot/              # Mascot avatar system
│   └── layout/              # Layout helpers (SyncProvider, etc.)
│
├── lib/                     # Business logic & utilities
│   ├── auth.ts              # NextAuth config
│   ├── access.ts            # Access control (admin/allowlist)
│   ├── adminConfig.ts       # Admin-config schema
│   ├── config.ts            # App config (DB + env fallback)
│   ├── configDefaults.ts    # Default limits
│   ├── aiAccess.ts          # AI access + usage checks
│   ├── aiUsage.ts           # Usage counters + limits
│   ├── aiTelemetry.ts       # AI request logging + alerts
│   ├── aiCostAlerts.ts      # Cost alert checks
│   ├── aiModelCatalog.ts    # Gemini model catalog
│   ├── aiModelResolver.ts   # Model selection
│   ├── aiPromptCatalog.ts   # Prompt templates
│   ├── stripe.ts            # Stripe client
│   ├── subscription.ts      # Stripe subscription logic
│   └── rateLimit.ts         # Rate limiting
│
├── middleware/              # Server helpers (adminAuth)
├── test/                    # Test setup (Vitest)
└── data/                    # Static data (mascot skins, etc.)

middleware.ts                # Edge middleware (routing + access)
prisma/                       # Prisma schema and migrations
scripts/                      # Build/deploy helpers
infra/                        # Azure provisioning scripts
.github/workflows/            # CI/CD pipelines
```

## Data Model (Summary)

Core models:
- **User** + **UserState** (JSON state sync)
- **UserPlan** (plan + access status)
- **Subscription** (Stripe mapping)
- **WaitlistEntry** (waitlist workflow)

Configuration and usage:
- **AppConfig** + **ConfigHistory** (admin config + audit trail)
- **UsageCounter** + **GlobalUsage** (monthly usage tracking)
- **RateLimitWindow** (per-window request limits)

AI telemetry:
- **AiRequestLog** (per-request logging)
- **AiDailyStats** + **AiGlobalDailyStats** (aggregates)

## Authentication & Access Control

### NextAuth (`src/lib/auth.ts`)
- Providers: Google OAuth + Credentials
- Optional E2E login provider is gated by `E2E_LOGIN_ENABLED` + `E2E_TEST` flags
- Sessions use JWT with a 60-second refresh interval
- Plan/access status is synced into the JWT on login and periodically thereafter

### Access Priority
1. Admins (`ADMIN_EMAILS`, env only) -> always ACTIVE
2. Allowlist (`ALLOWLIST_EMAILS`, DB or env) -> always ACTIVE
3. Approved waitlist users -> ACTIVE
4. Existing active users -> remain ACTIVE
5. New users -> capacity check (`MAX_ACTIVE_USERS`)

### Middleware (`middleware.ts`)
- Redirects unauthenticated users to `/login`
- Enforces onboarding flow and waitlist gates
- Blocks `/admin` UI for non-admins (redirect)
- Admin API endpoints use `requireAdmin` (403 if unauthorized)

## State Synchronization

```
Client (Zustand) <-> /api/user/state (GET/POST)
  - initial hydrate on mount
  - debounced updates (800ms) via SyncProvider
```

## AI System

### Model Selection
- Default model: `gemini-2.5-flash`
- Override via `GEMINI_MODEL` (DB or env; not exposed in Admin UI)
- Invalid config falls back to the default model

### Request Flow

```
/api/ai/*
  -> rate limit check (DB; memory fallback)
  -> access check (plan + waitlist + hard cost cap)
  -> Gemini request
  -> usage counters (monthly)
  -> telemetry + cost alerts (async)
```

### Usage Limits (Defaults, configurable via Admin Config)

| Scope | Requests/month | Units/month |
|-------|----------------|-------------|
| FREE  | 60             | 45,000      |
| PRO   | 600            | 450,000     |
| GLOBAL| 6,000          | 4,500,000   |

Limits reset monthly (UTC). Units represent tokens.

### Cost Alerts
- Controlled by `AI_COST_ALERT_THRESHOLD_USD`
- Optional webhook: `AI_COST_ALERT_WEBHOOK_URL`
- Email alerts use `ADMIN_EMAILS` + SMTP config

### Hard Cost Limit
- Controlled by `AI_COST_HARD_LIMIT_USD`
- Blocks all AI requests once monthly cost meets or exceeds the cap (including admins)

## Subscriptions

Stripe flow:
1. Client requests checkout session (`/api/stripe/create-checkout-session`)
2. Stripe redirects to payment
3. Webhook updates subscription + plan
4. Customer portal handled by `/api/stripe/create-portal-session`

## Configuration System

Priority order:
1. Database (`AppConfig`) via Admin Panel
2. Environment variables (GitHub Secrets)
3. Code defaults (`configDefaults.ts`)

Config cache:
- Default TTL: 5s
- Max TTL: 60s
- Controlled by `CONFIG_CACHE_TTL_MS`

## Health & Observability

`GET /api/health` returns build metadata and subsystem checks:
- `database`, `stripe`, `smtp`, `auth`, `ai`
- `status` is `ok`, `degraded`, or `error`
- Used by CI/CD pipelines to validate deployments
- `APP_ENV` controls the reported `env` value and strictness of config checks

AI telemetry is stored in `AiRequestLog` and daily aggregates, with async error handling to avoid blocking requests.

## Security

Security headers (`next.config.js`):
- CSP with strict defaults (no third-party script sources)
- HSTS (`max-age=63072000; includeSubDomains; preload`)
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Permissions-Policy: `camera=(self)`, `microphone=(self)`, `geolocation=()`

E2E login endpoints are disabled in production unless explicitly enabled via env flags.

## Error Handling

| Code | Meaning |
|------|---------|
| 401 | Unauthorized (no session) |
| 403 | Forbidden (access/admin) |
| 429 | Rate limit or usage limit reached |
| 503 | Service not available (missing AI key, DB unavailable) |

## Key Files Reference

| Purpose | File |
|---------|------|
| State management | `src/lib/store.ts` |
| Auth config | `src/lib/auth.ts` |
| Access control | `src/lib/access.ts`, `src/lib/userPlan.ts` |
| App config | `src/lib/config.ts`, `src/lib/adminConfig.ts` |
| AI pipeline | `src/lib/aiAccess.ts`, `src/lib/aiUsage.ts`, `src/lib/aiTelemetry.ts` |
| Stripe | `src/lib/stripe.ts`, `src/lib/subscription.ts` |
| Health check | `src/app/api/health/route.ts` |
| Middleware | `middleware.ts`, `src/middleware/adminAuth.ts` |
| DB schema | `prisma/schema.prisma` |
