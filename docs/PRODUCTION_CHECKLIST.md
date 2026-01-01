# Production Readiness Checklist

Use this list before running Deploy PRD.

## CI/CD Pipeline
- [x] CI workflow runs on every PR (lint, typecheck, test, build)
- [x] Branch protection requires passing CI before merge
- [x] E2E tests run after UAT deployment (blocking)
- [x] App Service Plan upgraded to S1 Standard (SLA 99.95%)

## Configuration
- [ ] Domain `henio.app` resolves and SSL is valid.
- [ ] `NEXTAUTH_URL` = `https://henio.app` and `NEXTAUTH_SECRET` set.
- [ ] Google OAuth: origins + redirect URIs include `https://henio.app`.
- [ ] `GEMINI_API_KEY` set (or AI features explicitly disabled).
- [ ] `ADMIN_EMAILS`, `ALLOWLIST_EMAILS`, `MAX_ACTIVE_USERS` set to intended values.

---

## Stripe Live Mode Transition Plan

### Step 1: Stripe Dashboard - Product Setup (Live Mode)

1. **Switch to Live Mode** in Stripe Dashboard (toggle in top-left corner)
   - Dashboard: https://dashboard.stripe.com

2. **Create Product** (Henio PRO):
   - Go to: Products → Add product
   - Name: `Henio PRO`
   - Description: `Full access to all Henio features including unlimited AI usage`

3. **Create Price - Monthly**:
   - Pricing model: Standard pricing
   - Price: `29.99 PLN` (or your chosen price)
   - Billing period: Monthly
   - **Save the Price ID** → `price_live_xxx` (for STRIPE_PRO_MONTHLY_PRICE_ID)

4. **Create Price - Annual**:
   - Pricing model: Standard pricing
   - Price: `249.99 PLN` (or ~30% discount vs monthly)
   - Billing period: Yearly
   - **Save the Price ID** → `price_live_xxx` (for STRIPE_PRO_ANNUAL_PRICE_ID)

### Step 2: Stripe Dashboard - Webhook Configuration

1. **Go to**: Developers → Webhooks → Add endpoint

2. **Endpoint URL**: `https://henio.app/api/stripe/webhook`

3. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

4. **Save and copy Signing Secret** → `whsec_live_xxx`

### Step 3: Stripe Dashboard - Get API Keys

1. **Go to**: Developers → API keys

2. **Copy keys**:
   - Publishable key: `pk_live_xxx`
   - Secret key: `sk_live_xxx` (Reveal and copy)

### Step 4: Azure Portal - Update PRD Environment Variables

Go to: Azure Portal → henio-prd → Configuration → Application settings

Update/Add these variables:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_xxx` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_xxx` |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | `price_live_monthly_xxx` |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | `price_live_annual_xxx` |

**Save and restart the app**.

> **Note**: After initial setup, prices can also be managed from Admin Panel → Pricing tab.
> Active prices are stored in AdminConfig (DB) with fallback to env vars.

### Step 5: Post-Deployment Verification

1. **Test Checkout Flow**:
   - Log in as test user
   - Go to Profile → Upgrade to PRO
   - Use Stripe test card: `4242 4242 4242 4242` (won't work in live - use real card or request test mode)
   - Verify redirect to success page

2. **Verify Webhook**:
   - Check Stripe Dashboard → Webhooks → Recent deliveries
   - Confirm `200 OK` responses

3. **Check Admin Panel**:
   - Go to `/admin` → Subscriptions tab
   - Verify subscription appears
   - Test Sync and Cancel actions

4. **Revenue Stats**:
   - Go to `/admin` → Statistics tab
   - Verify MRR/ARR calculations

### Step 6: Final Checklist

- [ ] Live mode enabled in Stripe Dashboard
- [ ] Product "Henio PRO" created with monthly + annual prices
- [ ] Webhook endpoint configured with correct URL and events
- [ ] All 5 Stripe environment variables updated in Azure PRD
- [ ] App restarted after config changes
- [ ] Test subscription created successfully
- [ ] Webhook events received (check Stripe Dashboard)
- [ ] Subscription visible in Admin Panel
- [ ] Customer can access Billing Portal (Manage Subscription)

### Rollback Plan

If issues occur after going live:

1. **Immediate**: Switch env vars back to test mode keys (`sk_test_xxx`)
2. **Refunds**: Process through Stripe Dashboard
3. **Data**: Subscription records remain in DB but won't sync with test mode

### Important Notes

- **Trial Period**: 7 days (configured in `src/lib/stripe.ts`)
- **Cancellation**: Sets `cancel_at_period_end: true` (access until period ends)
- **Currency**: Prices should be in PLN for Polish market
- **Tax**: Consider enabling Stripe Tax for EU VAT compliance

---

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
