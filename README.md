# Henio – AI-powered vocabulary trainer

Next.js 14 full-stack app for language learners. Flashcards, quizzes,
pronunciation practice and AI-generated word sets — built as a portfolio
project showcasing App Router, NextAuth, Prisma, Zustand, Stripe and
the Gemini API.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC)

## Quick start (≈ 2 minutes)

You need **Node.js 20+**, **npm** and **Docker**.

```bash
# 1. Install dependencies
npm install

# 2. Copy env template (defaults work out of the box)
cp .env.example .env

# 3. Start PostgreSQL (docker compose)
docker compose up -d

# 4. Apply schema + seed a demo user with sample data
npx prisma db push
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:

| Email | Password |
|-------|----------|
| `demo@henio.local` | `demo1234` |

The demo account is pre-seeded with vocabulary sets, progress stats and a
streak so every screen has content to show.

## Guided tour — what to click

Once you're logged in as `demo@henio.local`, walk through the app in this
order to see every major feature:

| # | Where | What you'll see |
|---|-------|-----------------|
| 1 | [`/`](http://localhost:3000/) | Home dashboard — streak, level progress, daily mission, quick actions |
| 2 | [`/flashcards`](http://localhost:3000/flashcards) | Swipe-style flashcards for the seeded words (apple, bread, ticket, hotel…). "I know / I don't know" updates progress |
| 3 | [`/quiz`](http://localhost:3000/quiz) | Multiple-choice quiz with XP rewards and streak tracking |
| 4 | [`/pronunciation`](http://localhost:3000/pronunciation) | Web Speech API pronunciation practice. Needs mic permission + a Chromium-based browser |
| 5 | [`/vocabulary`](http://localhost:3000/vocabulary) | Full word list, category filters, set management |
| 6 | [`/profile`](http://localhost:3000/profile) | Stats, badges, language pair, XP history, account actions — settings live here under `#settings` |
| 7 | [`/chat`](http://localhost:3000/chat) | AI tutor powered by Gemini — requires `GEMINI_API_KEY`, otherwise shows a "configure key" message |
| 8 | [`/klasowka`](http://localhost:3000/klasowka) | "Test mode" — classroom-style assessment over the current word set |
| 9 | [`/admin`](http://localhost:3000/admin) | Admin panel — only visible if you put your email in `ADMIN_EMAILS` |

**5-minute demo path:** Home → Flashcards (swipe a few cards) → Quiz
(answer a couple of questions) → Profile (see XP bump from the session) →
Vocabulary (browse word sets) → Settings (change language pair).

**Reset the demo any time** with `npm run db:seed` — it re-upserts the
same user and state so you start fresh.

## What works without any API keys

- Email + password login (via the seeded demo user)
- Flashcards, quiz, pronunciation UI
- Vocabulary management, progress tracking, daily mission
- Admin panel stub (add your email to `ADMIN_EMAILS` to unlock it)
- PL→EN / UK→PL / UK→EN / UK→DE / DE→EN language pairs

## What needs optional keys

Each of these degrades gracefully — the app still boots, the affected
endpoint simply returns `503 unconfigured` until you plug a key in.

| Feature | Env var(s) | Where to get it | Cost |
|---------|------------|-----------------|------|
| Google OAuth login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Free |
| AI word generation, tutor, pronunciation summary | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | Free tier (60 req/min) |
| PRO subscriptions (Stripe checkout + webhooks) | `STRIPE_*` (5 keys) | [Stripe test keys](https://dashboard.stripe.com/test/apikeys) | Free (test mode) |
| Registration / password reset emails | `SMTP_*` | Any SMTP provider | Varies |

### Enable AI features in 1 minute

```bash
# 1. Open https://aistudio.google.com/app/apikey and click "Create API key"
# 2. Paste it into your .env:
echo 'GEMINI_API_KEY=your_key_here' >> .env
# 3. Restart dev server (Ctrl+C then npm run dev)
```

After that, `/chat` (AI tutor) and the AI word intake in `/vocabulary` start
working. The free tier is more than enough for local exploration.

### Enable Stripe PRO subscriptions (test mode)

```bash
# 1. Sign up at https://dashboard.stripe.com (no payment info required)
# 2. Stay in TEST mode (toggle top-left)
# 3. Copy test keys from https://dashboard.stripe.com/test/apikeys
# 4. Create a test Product + recurring Price (monthly + annual)
# 5. Add a webhook endpoint pointing to http://localhost:3000/api/stripe/webhook
#    using `stripe listen --forward-to localhost:3000/api/stripe/webhook`
# 6. Paste all 5 values into .env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
#    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PRO_MONTHLY_PRICE_ID,
#    STRIPE_PRO_ANNUAL_PRICE_ID) and restart dev.
```

Test cards for Stripe checkout: `4242 4242 4242 4242` (any future expiry,
any CVC, any ZIP). See [Stripe test cards](https://docs.stripe.com/testing).

See `.env.example` for the full list — everything not marked `[REQUIRED]`
is safe to leave empty.

## Common commands

```bash
npm run dev              # dev server with hot reload
npm run build            # production build
npm run lint             # ESLint
npm run typecheck        # TypeScript strict check
npm run test:unit        # Vitest unit tests
npm run test:e2e         # Playwright end-to-end tests
npx prisma studio        # database GUI at localhost:5555
npm run db:seed          # reseed the demo user
```

## Architecture at a glance

```
src/
├── app/               # Next.js App Router (pages + /api routes)
│   ├── api/           # REST endpoints (ai/, admin/, user/, stripe/, health)
│   └── [feature]/     # quiz, flashcards, pronunciation, onboarding…
├── components/        # React components grouped by domain
├── lib/               # Business logic
│   ├── auth.ts        # NextAuth config (Google + credentials + E2E)
│   ├── gemini.ts      # Gemini client + AI prompt catalog
│   ├── store.ts       # Zustand store synced with server
│   ├── stripe.ts      # Lazy-initialised Stripe client
│   └── access.ts      # Allowlist / capacity / waitlist gating
└── types/             # Shared TypeScript types
```

More in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/API.md`](docs/API.md).

## Tech stack

- **Framework:** Next.js 14 (App Router, React 18, Server Actions)
- **Auth:** NextAuth v4 (Google OAuth + bcrypt credentials)
- **ORM / DB:** Prisma 5 + PostgreSQL 16
- **State:** Zustand (client) synced with a JSON blob on the server
- **AI:** Google Gemini via native fetch — no SDK lock-in
- **Payments:** Stripe subscriptions with webhook-driven state
- **Styling:** Tailwind CSS + lucide-react icons
- **Testing:** Vitest (unit) + Playwright (E2E)

## Health check

```bash
curl http://localhost:3000/api/health
```

Returns per-subsystem status (`database`, `auth`, `ai`, `stripe`, `smtp`)
so you can immediately see what is configured vs. what is still disabled.

## License

MIT – do whatever you want. If you find this useful, a star on GitHub is
appreciated.
