# Henio - Technical Architecture

## Overview

Henio is a vocabulary learning application for Polish students (PL→EN) and Ukrainian students in Poland (UA→PL). It features AI-powered word intake, flashcards, quizzes, pronunciation training, and subscription management.

**Version:** 1.0.63
**Repository:** `-EnglishVocabTrainer`

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
| File Processing | pdf-parse, mammoth (Word docs) |
| Testing | Vitest (unit), Playwright (E2E) |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API endpoints
│   │   ├── ai/           # AI features (generate-words, extract-image, tutor, etc.)
│   │   ├── auth/         # Authentication (NextAuth, register, verify-email)
│   │   ├── admin/        # Admin endpoints (config, users, stats, pricing)
│   │   ├── user/         # User data (state, profile, subscription, export)
│   │   ├── stripe/       # Payment (checkout, portal, webhook)
│   │   ├── waitlist/     # Waitlist management
│   │   └── health/       # Health check endpoint
│   ├── [feature]/page.tsx # Feature pages
│   ├── providers.tsx      # Context providers
│   └── layout.tsx         # Root layout
│
├── components/            # React components by domain
│   ├── ui/               # Base components (Button, Card, Modal, etc.)
│   ├── admin/            # Admin panel sections
│   ├── ai/               # WordIntake component
│   ├── billing/          # PricingSection, UsageDisplay
│   ├── flashcard/        # Flashcard player
│   ├── quiz/             # Quiz engine
│   ├── pronunciation/    # Pronunciation training
│   ├── mascot/           # Mascot avatar system
│   └── layout/           # SyncProvider, ConsentBanner, etc.
│
├── lib/                  # Business logic & utilities
│   ├── store.ts          # Zustand state management (~26KB)
│   ├── gemini.ts         # Gemini API client (GeminiService)
│   ├── auth.ts           # NextAuth configuration
│   ├── config.ts         # App config (DB + env fallback)
│   ├── aiUsage.ts        # AI usage tracking & limits
│   ├── aiTelemetry.ts    # AI request logging
│   ├── aiPromptCatalog.ts# AI prompt templates
│   ├── aiModelResolver.ts# Model selection with fallback
│   ├── userPlan.ts       # User plan & access management
│   ├── access.ts         # Access control (allowlist, admin)
│   ├── waitlist.ts       # Waitlist logic
│   ├── subscription.ts   # Stripe subscription logic
│   ├── stripe.ts         # Stripe client
│   ├── costEstimation.ts # Token cost calculation
│   └── rateLimit.ts      # Rate limiting
│
├── types/                # TypeScript definitions
├── hooks/                # Custom React hooks
├── middleware/           # Auth middleware
└── data/                 # Static data (mascot skins, etc.)

prisma/
└── schema.prisma         # Database schema

tests/                    # E2E tests (Playwright)
docs/                     # Documentation
.github/workflows/        # CI/CD pipelines
```

## Database Schema

### Core Models

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │────▶│    UserState    │     │    UserPlan     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ email           │     │ userId (FK)     │     │ userId (FK)     │
│ name            │     │ data (JSON)     │     │ plan (FREE/PRO) │
│ password (hash) │     │ updatedAt       │     │ accessStatus    │
│ emailVerified   │     └─────────────────┘     │ stripeCustomerId│
│ termsAcceptedAt │                             └─────────────────┘
│ mascotSkin      │
└─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│  Subscription   │     │  WaitlistEntry  │
├─────────────────┤     ├─────────────────┤
│ stripeSubId     │     │ email           │
│ stripeCustId    │     │ status          │
│ status          │     │ confirmToken    │
│ currentPeriod   │     │ confirmedAt     │
│ cancelAtEnd     │     │ approvedAt      │
└─────────────────┘     └─────────────────┘
```

### Configuration & Analytics Models

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AppConfig     │     │  UsageCounter   │     │  GlobalUsage    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ key             │     │ userId          │     │ feature         │
│ value           │     │ feature         │     │ periodStart     │
│ description     │     │ periodStart     │     │ count           │
│ updatedBy       │     │ count / units   │     │ units           │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  AiRequestLog   │     │  AiDailyStats   │     │AiGlobalDaily    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ userId          │     │ userId          │     │ date            │
│ feature         │     │ feature         │     │ feature         │
│ model           │     │ date            │     │ totalRequests   │
│ inputTokens     │     │ requests/tokens │     │ totalTokens     │
│ outputTokens    │     │ cost / errors   │     │ totalCost       │
│ cost / duration │     └─────────────────┘     └─────────────────┘
│ success/error   │
└─────────────────┘
```

### Key Enums

- **Plan**: `FREE`, `PRO`
- **AccessStatus**: `ACTIVE`, `WAITLISTED`, `SUSPENDED`
- **WaitlistStatus**: `PENDING`, `CONFIRMED`, `APPROVED`, `DECLINED`
- **SubscriptionStatus**: `ACTIVE`, `PAST_DUE`, `CANCELED`, `INCOMPLETE`, `TRIALING`

## State Management

### Zustand Store (`src/lib/store.ts`)

The client-side state is managed by Zustand with the following structure:

```typescript
interface AppState {
  vocabulary: VocabularyItem[];      // All vocabulary items
  sets: StudySet[];                  // Named word collections
  progress: Record<string, UserProgress>; // Per-word progress
  settings: AppSettings;             // User preferences
  stats: UserStats;                  // XP, level, streaks, badges
  dailyMission: DailyMission;        // Current mission
  currentQuizResults: QuizResult[];  // Active quiz session
}
```

### State Synchronization

```
┌─────────────┐     GET /api/user/state      ┌─────────────┐
│   Client    │ ◀──────────────────────────▶ │   Server    │
│  (Zustand)  │     POST /api/user/state     │  (Prisma)   │
└─────────────┘                              └─────────────┘
      │                                             │
      │ hydrateFromServer()                         │
      │ on mount                                    │
      ▼                                             ▼
┌─────────────┐                              ┌─────────────┐
│ SyncProvider│                              │  UserState  │
│  (debounced │                              │    .data    │
│   800ms)    │                              │   (JSON)    │
└─────────────┘                              └─────────────┘
```

## Authentication Flow

### NextAuth Configuration (`src/lib/auth.ts`)

**Providers:**
1. **Google OAuth** - Primary authentication
2. **Credentials** - Email/password with email verification
3. **E2E Test** - Test-only provider (when `E2E_LOGIN_ENABLED=true`)

**Session Strategy:** JWT with 60-second refresh interval

**Authorization Flow:**
```
Login Request
     │
     ▼
┌─────────────────┐
│ NextAuth Handler│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Check Provider  │────▶│ Validate Creds  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Create/Get User │     │ Check Email     │
│   (Prisma)      │     │   Verified      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Sync UserPlan   │     │ Check Access    │
│ (every 60s)     │     │    Status       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│              JWT Token                   │
│  { userId, email, plan, accessStatus,   │
│    isAdmin, mascotSkin }                │
└─────────────────────────────────────────┘
```

## Access Control System

### Priority Order (highest to lowest):

1. **Admins** (`ADMIN_EMAILS`) → Always `ACTIVE`
2. **Allowlist** (`ALLOWLIST_EMAILS`) → Always `ACTIVE`
3. **Waitlist Approved** → Always `ACTIVE`
4. **Already Active Users** → Stay `ACTIVE`
5. **New Users** → Check capacity (`MAX_ACTIVE_USERS`)
   - Capacity available → `ACTIVE`
   - Capacity full → `WAITLISTED`

### Middleware Protection (`src/middleware.ts`)

```
Request
   │
   ▼
┌─────────────────┐
│ Public Pages?   │──Yes──▶ Allow
│ (/privacy,      │
│  /terms, etc.)  │
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐
│ Has Session?    │──No───▶ Redirect /login
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Onboarding Done?│──No───▶ Redirect /onboarding
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Access ACTIVE?  │──No───▶ Redirect /waitlist
└────────┬────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Admin Route?    │──Yes & !isAdmin──▶ 403 Forbidden
└────────┬────────┘
         │
         ▼
      Allow
```

## AI Integration

### GeminiService (`src/lib/gemini.ts`)

```typescript
class GeminiService {
  private timeout = 20000; // 20 seconds

  async generateContent(prompt: string, options?: {
    model?: string;
    imageData?: string;
  }): Promise<{
    content: string;
    usage: { inputTokens: number; outputTokens: number };
  }>;
}
```

### Model Selection (`src/lib/aiModelResolver.ts`)

| Task Type | Primary Model | Fallback |
|-----------|---------------|----------|
| Text tasks | `gemini-2.0-flash` | `gemini-1.5-flash` |
| Image tasks | `gemini-2.0-flash` | `gemini-2.5-pro` |

### AI Request Flow

```
API Request (/api/ai/*)
        │
        ▼
┌─────────────────┐
│ Rate Limit Check│──Exceeded──▶ 429 Too Many Requests
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ Access Check    │──Not ACTIVE──▶ 403 Forbidden
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ Usage Limit     │──Exceeded──▶ 402 Limit Reached
│ Check (Plan)    │
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ GeminiService   │
│   .generate()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log Telemetry   │ (async, non-blocking)
│ (AiRequestLog)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Usage    │
│ Counters        │
└────────┬────────┘
         │
         ▼
    Response
```

### AI Features

| Endpoint | Feature | Model |
|----------|---------|-------|
| `/api/ai/generate-words` | Generate vocabulary from topic | Flash |
| `/api/ai/parse-text` | Parse manual word input | Flash |
| `/api/ai/extract-file` | Extract from PDF/DOCX | Flash |
| `/api/ai/extract-image` | OCR from image | Pro (fallback) |
| `/api/ai/explain-word` | Word explanation | Flash |
| `/api/ai/evaluate-pronunciation` | Score pronunciation | Flash |
| `/api/ai/tutor` | AI tutor chat | Flash |

## Subscription System

### Stripe Integration

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │     │    Next.js      │     │     Stripe      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ Click "Upgrade"       │                       │
         │──────────────────────▶│                       │
         │                       │ Create Checkout       │
         │                       │──────────────────────▶│
         │                       │◀──────────────────────│
         │◀──────────────────────│ Checkout URL          │
         │                       │                       │
         │ Redirect to Stripe    │                       │
         │──────────────────────────────────────────────▶│
         │                       │                       │
         │                       │ Webhook: session.completed
         │                       │◀──────────────────────│
         │                       │                       │
         │                       │ Create Subscription   │
         │                       │ Update UserPlan       │
         │                       │                       │
         │◀────────────────────────────────────────────── │
         │ Redirect to success   │                       │
```

### Plan Limits

| Feature | FREE | PRO |
|---------|------|-----|
| AI Requests/month | 50 | 600 |
| Priority Support | No | Yes |
| Advanced Stats | No | Yes |

## Configuration System

### Hybrid Configuration (`src/lib/config.ts`)

```
Priority Order:
1. Database (AppConfig table) ← Admin Panel changes
2. Environment Variables      ← Deployment secrets
3. Code Defaults             ← Fallback values

Cache: 5-second TTL with invalidation on changes
```

### Key Configuration Values

| Key | Source | Description |
|-----|--------|-------------|
| `STRIPE_PRO_MONTHLY_PRICE_ID` | DB/Env | Stripe price ID |
| `MAX_ACTIVE_USERS` | DB/Env | Capacity limit |
| `ALLOWLIST_EMAILS` | DB/Env | VIP access list |
| `ADMIN_EMAILS` | Env only | Admin users |

## Error Handling

### AI Errors (`src/lib/aiErrors.ts`)

```typescript
class GeminiApiError extends Error {
  type: 'RATE_LIMIT' | 'QUOTA' | 'INVALID_REQUEST' | 'SERVER' | 'NETWORK';
  retryable: boolean;
  retryAfter?: number;
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 401 | Unauthorized (no session) |
| 402 | Usage limit reached |
| 403 | Forbidden (access/admin) |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Security

### Headers (`next.config.js`)

- **CSP**: Script-src, style-src, img-src policies
- **HSTS**: `max-age=31536000; includeSubDomains`
- **X-Frame-Options**: `DENY`
- **X-Content-Type-Options**: `nosniff`
- **Permissions-Policy**: Restricted camera, microphone, geolocation

### GDPR Compliance

- Terms/Privacy acceptance tracking
- Age confirmation (16+)
- Account deletion (`DELETE /api/user/account`)
- Data export (`GET /api/user/export`)
- Consent versioning

## Performance Patterns

### Caching

| What | TTL | Invalidation |
|------|-----|--------------|
| Config cache | 5s | On change |
| JWT session | 60s | On refresh |

### Optimizations

- Debounced state sync (800ms)
- Async telemetry logging (non-blocking)
- Parallel tool calls in AI processing
- Prisma connection pooling

## Key Files Reference

| Purpose | File |
|---------|------|
| State management | `src/lib/store.ts` |
| AI service | `src/lib/gemini.ts` |
| Auth config | `src/lib/auth.ts` |
| App config | `src/lib/config.ts` |
| Access control | `src/lib/access.ts`, `src/lib/userPlan.ts` |
| Usage tracking | `src/lib/aiUsage.ts` |
| Subscription | `src/lib/subscription.ts` |
| Database schema | `prisma/schema.prisma` |
| Middleware | `src/middleware.ts` |
| State sync | `src/components/layout/SyncProvider.tsx` |
