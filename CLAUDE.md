# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Henio - Next.js vocabulary learning app for Polish students (PL→EN) and Ukrainian students in Poland (UA→PL). Features onboarding, flashcards, quizzes, pronunciation practice, and AI-powered word intake with multi-file upload.

## Common Commands

```bash
# Development
npm run dev                  # Start dev server
docker compose up -d         # Start PostgreSQL (required)
npx prisma db push          # Apply schema to DB

# Testing
npm run test:unit           # Unit tests (Vitest)
npm run test:e2e            # E2E tests (Playwright)
npm test -- src/lib/store.test.ts  # Single test file

# Build & Lint
npm run build               # Production build (runs prisma generate first)
npm run lint                # ESLint

# Database
npx prisma studio           # DB GUI
npx prisma migrate dev      # Create migration
```

## Architecture

### Core Stack
- Next.js 14 (App Router) + React 18
- NextAuth with Google OAuth + Prisma Adapter
- Prisma + PostgreSQL
- Zustand for client state
- Gemini API for AI features

### Directory Structure
```
src/
├── app/           # Next.js App Router pages and API routes
│   ├── api/       # REST endpoints (ai/, admin/, user/, health)
│   └── [feature]/ # Feature pages (quiz, flashcards, pronunciation, etc.)
├── components/    # React components by domain (admin, ai, flashcard, quiz, ui)
├── lib/           # Business logic and utilities
│   ├── gemini.ts      # Gemini API client + AI_PROMPTS
│   ├── store.ts       # Zustand store (vocabulary, settings, progress)
│   ├── aiErrors.ts    # AI error classification
│   ├── aiUsage.ts     # Usage tracking (per-plan limits)
│   └── access.ts      # User access control
└── types/         # TypeScript definitions
```

### Key Patterns

**State Management**: Zustand store in `src/lib/store.ts` syncs with backend via `SyncProvider`. State includes vocabulary, quiz progress, settings, and missions.

**AI Integration**: All AI features go through `GeminiService` in `src/lib/gemini.ts`. Prompts are in `AI_PROMPTS` object. Model selection via `aiModelResolver.ts` with fallback to `gemini-2.5-pro` for image tasks.

**Access Control**: Three-tier system:
- `ALLOWLIST_EMAILS` - if set, only these can access
- `MAX_ACTIVE_USERS` - capacity limit, excess goes to waitlist
- `ADMIN_EMAILS` - grants access to `/admin` panel

**Language Pairs**: Configured in onboarding, stored in user state. Main pairs: `pl-en` (Polish students), `uk-pl` (Ukrainian students).

### API Routes
- `/api/ai/*` - AI endpoints (generate-words, extract-image, tutor, pronunciation)
- `/api/admin/*` - Admin config, users, stats
- `/api/user/*` - Profile, state sync, account deletion (DELETE /api/user/account)
- `/api/health` - Build metadata for deployment verification

### Legal/GDPR Compliance
- `/privacy` - Privacy Policy page (PL/EN/UA)
- `/terms` - Terms of Service page (PL/EN/UA)
- Consent step in onboarding (first step, requires terms + age confirmation)
- Account deletion in profile page (GDPR Art. 17)
- ConsentBanner for existing users without consent
- User model fields: `termsAcceptedAt`, `privacyAcceptedAt`, `ageConfirmedAt`, `parentEmail`, `consentVersion`

## Testing

- Unit tests: Vitest + Testing Library in `*.test.ts(x)` files alongside source
- E2E tests: Playwright in `tests/` directory
- Test login: `E2E_TEST=true` enables mock auth
- PostgreSQL required for most tests

## Deployment

- **UAT**: https://henio-uat.azurewebsites.net (docelowo: https://uat.henio.app)
  - Auto-deploy on push to `main`
  - Custom domain via OVH DNS CNAME
- **PRD**: docelowo https://henio.app
  - Manual trigger via `gh workflow run deploy-prd.yml`
- Migrations run on startup: `scripts/ensure-migrations.js` + `prisma migrate deploy`
- Verify: `curl https://henio-uat.azurewebsites.net/api/health`
- See `docs/RUNBOOK.md` for custom domain setup instructions

## Environment Variables

Required for full functionality:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` - NextAuth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth
- `GEMINI_API_KEY` - AI features

See `.env.example` for complete list including AI limits and access control.
