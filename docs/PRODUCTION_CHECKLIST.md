# Production Readiness Checklist

Use this list before running Deploy PRD.

## Configuration
- [ ] Domain `henio.app` resolves and SSL is valid.
- [ ] `NEXTAUTH_URL` = `https://henio.app` and `NEXTAUTH_SECRET` set.
- [ ] Google OAuth: origins + redirect URIs include `https://henio.app`.
- [ ] Stripe (if billing enabled): live keys, webhook secret, price IDs, and webhook endpoint configured at `/api/stripe/webhook`.
- [ ] `GEMINI_API_KEY` set (or AI features explicitly disabled).
- [ ] `ADMIN_EMAILS`, `ALLOWLIST_EMAILS`, `MAX_ACTIVE_USERS` set to intended values.

## Data & DB
- [ ] Backups enabled and restore tested.
- [ ] Migrations reviewed and ready for `prisma migrate deploy`.
- [ ] UAT reset logic is not used for PRD.

## Security & Access
- [ ] `E2E_TEST=false` and `NEXT_PUBLIC_E2E_TEST=false` in PRD app settings.
- [ ] Admin endpoints protected by `ADMIN_EMAILS`.
- [ ] CSP/HSTS headers reviewed for production.

## Observability
- [ ] Uptime/health check monitoring in place for `/api/health`.
- [ ] Log retention and alerting configured (Azure + external if needed).

## Testing
- [ ] `npm run test:unit` green.
- [ ] `npm run test:e2e` green.
- [ ] Manual checklist executed (`docs/MANUAL_TESTS.md`).

## Release
- [ ] `package.json` version bumped and deployed.
- [ ] Rollback plan agreed (previous build + DB restore).
