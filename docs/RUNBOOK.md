# Henio Operations Runbook

## 1. Environments

### URLs

| Environment | Custom Domain | Azure Fallback |
|-------------|---------------|----------------|
| **UAT** | https://uat.henio.app | https://henio-uat.azurewebsites.net |
| **PRD** | https://henio.app | https://henio-prd.azurewebsites.net |

> **Note:** Azure `*.azurewebsites.net` domains may be blocked in corporate networks. Always use custom domains.

### Azure Resources

| Resource | Name | Details |
|----------|------|---------|
| Resource Group | `henio-rg` | Poland Central |
| App Service Plan | `henio-plan` | B1 (Basic), Linux |
| PostgreSQL | `henio-db` | Standard_B1ms, v16 |

**Estimated Cost:** ~100 PLN/month

### Database Behavior

| Environment | On Deploy |
|-------------|-----------|
| UAT | Full reset (`prisma migrate reset --force`) - all data wiped |
| PRD | Migrations only (`prisma migrate deploy`) - data preserved |

---

## 2. CI/CD Pipelines

### Pipeline Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PRs to `main` | Lint → Typecheck → Test → Build |
| `deploy-uat.yml` | Push to `main` | Full deploy with DB reset + E2E tests |
| `deploy-prd.yml` | Manual dispatch | Production deploy with migrations |
| `waitlist-cron.yml` | Hourly (`:00`) | Auto-approve waitlist entries + cleanup unverified signups |

### UAT Pipeline Steps

1. Checkout code
2. Install dependencies
3. Lint + Typecheck + Unit tests
4. Build
5. **Reset UAT database** (all data wiped!)
6. Configure app settings
7. Deploy to Azure (with retries)
8. Health check verification
9. **E2E tests** (blocking - must pass)

### PRD Pipeline Steps

1. Checkout code
2. Install dependencies
3. Lint + Typecheck + Unit tests
4. Build
5. **Apply migrations** (data preserved)
6. Configure app settings
7. Deploy to Azure (with retries)
8. Health check verification
9. No E2E tests (run on UAT)

### Concurrency

- **UAT:** Cancel in-progress deploys on new push
- **PRD:** Single deploy at a time, no cancellation

---

## 3. Deployment

### Deploy to UAT (Automatic)

```bash
git push origin main  # Triggers deploy-uat.yml
```

### Deploy to PRD (Manual)

```bash
gh workflow run deploy-prd.yml
```

Or via GitHub Actions UI: Actions → Deploy PRD → Run workflow

### Health Verification

```bash
# Check deployment
curl https://henio.app/api/health

# Expected response
{
  "status": "ok",
  "version": "1.0.76",
  "commit": "1cb5ff86b418",
  "buildTime": "2026-01-06T21:37:47Z",
  "env": "production",
  "subsystems": {
    "database": { "status": "ok" },
    "stripe": { "status": "ok" },
    "smtp": { "status": "ok" },
    "auth": { "status": "ok" },
    "ai": { "status": "ok" }
  }
}
```

### Version Verification

The health check endpoint returns:
- `version` - from `package.json`
- `commit` - short git SHA from deploy
- `buildTime` - UTC timestamp of build
- `env` - runtime environment (`APP_ENV` if set, else `NODE_ENV`)
- `subsystems` - configuration/status checks for DB, auth, AI, Stripe, SMTP

Pipelines verify these values match the build before marking deploy successful.

---

## 4. Configuration

### Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `DATABASE_URL` | PostgreSQL connection string | GitHub Secret |
| `NEXTAUTH_SECRET` | NextAuth JWT secret | GitHub Secret |
| `NEXTAUTH_URL` | App URL (https://henio.app) | GitHub Secret |
| `APP_ENV` | Runtime label used by health checks (`production`, `uat`) | Deploy workflow |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | GitHub Secret |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | GitHub Secret |
| `GEMINI_API_KEY` | Gemini AI API key | GitHub Secret |
| `ADMIN_EMAILS` | Comma-separated admin emails | GitHub Secret |
| `ALLOWLIST_EMAILS` | VIP access list (optional) | GitHub Secret |
| `MAX_ACTIVE_USERS` | Capacity limit | GitHub Secret |
| `STRIPE_SECRET_KEY` | Stripe secret key | GitHub Secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | GitHub Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | GitHub Secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Monthly price ID | GitHub Secret |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Annual price ID | GitHub Secret |
| `SMTP_HOST` | OVH SMTP host (ssl0.ovh.net) | GitHub Secret |
| `SMTP_PORT` | SMTP port (465) | GitHub Secret |
| `SMTP_USER` | SMTP user (noreply@henio.app) | GitHub Secret |
| `SMTP_PASS` | SMTP password | GitHub Secret |
| `SMTP_FROM` | From address | GitHub Secret |
| `WAITLIST_CRON_SECRET` | Cron job bearer token | GitHub Secret |

### Admin Panel Config (App Config)

Configuration keys can be set in **Admin Panel → Config**. Values are stored in the database and override env defaults.

- Supports `unlimited`, `infinity`, `inf`, or `-1` to remove caps
- Changes are cached briefly (up to ~60 seconds)
- These settings persist across deploys

### AI Usage Limits

| Variable | Description |
|----------|-------------|
| `FREE_AI_REQUESTS_PER_MONTH` | FREE plan request limit (default: 60) |
| `FREE_AI_UNITS_PER_MONTH` | FREE plan token limit (default: 45,000) |
| `PRO_AI_REQUESTS_PER_MONTH` | PRO plan request limit (default: 600) |
| `PRO_AI_UNITS_PER_MONTH` | PRO plan token limit (default: 450,000) |
| `GLOBAL_AI_REQUESTS_PER_MONTH` | Global request limit (default: 6,000) |
| `GLOBAL_AI_UNITS_PER_MONTH` | Global token limit (default: 4,500,000) |

Notes:
- Limits reset monthly (UTC).
- Admins (`ADMIN_EMAILS`) bypass usage limits, but not the hard cost cap.
- Requests and token usage are tracked per AI call; retries/fallbacks count separately.

### AI Cost Alerts

Configured via **Admin Panel → Config**:

| Key | Description |
|-----|-------------|
| `AI_COST_ALERT_THRESHOLD_USD` | Send alert when actual or projected monthly cost exceeds this value |
| `AI_COST_ALERT_CHECK_INTERVAL_MINUTES` | Minimum minutes between checks (0 = check every request) |
| `AI_COST_ALERT_WEBHOOK_URL` | Optional webhook URL for JSON alerts |

Alerts are sent to `ADMIN_EMAILS` via SMTP (if configured) and to the webhook URL (if set).

### AI Cost Hard Limit

| Key | Description |
|-----|-------------|
| `AI_COST_HARD_LIMIT_USD` | Hard stop when monthly AI cost reaches this value (0 disables). Applies to all users, including admins. |

### E2E Test Settings

| Environment | `E2E_TEST` | `E2E_LOGIN_ENABLED` |
|-------------|------------|---------------------|
| UAT | `true` | `true` |
| PRD | `false` | `false` |

**Important:** Never enable E2E test login in production!

### Access Control

- `ADMIN_EMAILS` - Users with admin panel access
- `ALLOWLIST_EMAILS` - VIPs who bypass capacity limits
- `MAX_ACTIVE_USERS` - Maximum concurrent active users

> **Note:** Azure app settings are overwritten by deploys; update env vars via GitHub Secrets. App Config values (Admin → Config) live in the DB and persist across deploys.

### Email Verification Cleanup

- Unverified credential-based users are deleted after the verification TTL (`EMAIL_VERIFY_TTL_HOURS`, default 24h).
- Cleanup runs hourly via `waitlist-cron.yml`.
- Cleanup alerts are sent to `ADMIN_EMAILS` via SMTP when deletions spike above baseline.
- Cleanup is lightweight (indexed queries + deletes) and safe to run hourly on production.

#### Cleanup Alert Config (Admin Panel → Config)

| Key | Description |
|-----|-------------|
| `EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD` | Minimum deletions in a single cleanup run to trigger an alert |
| `EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER` | Alert when deletions exceed baseline average by this multiplier |
| `EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW` | Number of recent cleanup runs used for baseline average |
| `EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS` | Minimum hours between alert emails |

---

## 5. Stripe Setup (Production)

### Current Configuration

| Element | Value |
|---------|-------|
| Product | Henio PRO (`prod_TiWa58JPu0rg1j`) |
| Monthly Price | 19.99 PLN (`price_1Sl5Wr07EywajbxhNr0DRQ9p`) |
| Annual Price | 149.99 PLN (`price_1Sl5Y907Eywajbxh4kcmhZw8`) |
| Webhook URL | `https://henio.app/api/stripe/webhook` |
| Trial Period | 7 days |

### Live Mode Transition Plan

#### Step 1: Create Product in Stripe Dashboard (Live Mode)

1. Switch to **Live Mode** in Stripe Dashboard (toggle top-left)
2. Go to: Products → Add product
3. Create product:
   - Name: `Henio PRO`
   - Description: `Full access to all Henio features including unlimited AI usage`

#### Step 2: Create Prices

**Monthly Price:**
- Pricing model: Standard pricing
- Price: `29.99 PLN` (or chosen price)
- Billing period: Monthly
- Save the Price ID → `price_live_xxx`

**Annual Price:**
- Pricing model: Standard pricing
- Price: `249.99 PLN` (~30% discount vs monthly)
- Billing period: Yearly
- Save the Price ID → `price_live_xxx`

#### Step 3: Configure Webhook

1. Go to: Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://henio.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Save and copy Signing Secret → `whsec_live_xxx`

#### Step 4: Get API Keys

1. Go to: Developers → API keys
2. Copy:
   - Publishable key: `pk_live_xxx`
   - Secret key: `sk_live_xxx`

#### Step 5: Update GitHub Secrets (PRD environment)

```bash
gh secret set STRIPE_SECRET_KEY --env prd --body "sk_live_xxx"
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --env prd --body "pk_live_xxx"
gh secret set STRIPE_WEBHOOK_SECRET --env prd --body "whsec_live_xxx"
gh secret set STRIPE_PRO_MONTHLY_PRICE_ID --env prd --body "price_live_monthly_xxx"
gh secret set STRIPE_PRO_ANNUAL_PRICE_ID --env prd --body "price_live_annual_xxx"
```

#### Step 6: Post-Deployment Verification

1. **Test Checkout Flow:**
   - Log in as test user
   - Go to Profile → Upgrade to PRO
   - Complete checkout with real card
   - Verify redirect to success page

2. **Verify Webhook:**
   - Check Stripe Dashboard → Webhooks → Recent deliveries
   - Confirm `200 OK` responses

3. **Check Admin Panel:**
   - Go to `/admin` → Subscriptions tab
   - Verify subscription appears

### Important Notes

- **Trial Period:** 7 days (configured in `src/lib/stripe.ts`)
- **Cancellation:** Sets `cancel_at_period_end: true` (access until period ends)
- **Currency:** PLN for Polish market
- **Tax:** Consider enabling Stripe Tax for EU VAT compliance
- **Prices can also be managed from Admin Panel → Pricing tab**

---

## 6. Google OAuth

### Client Configuration

- **OAuth Client ID:** `8637723384-klt7n7hoekdpo0bhlk52a450n9gkv6b7.apps.googleusercontent.com`
- **Google Cloud Project:** `angielski` (gen-lang-client-0315840383)
- **Console:** https://console.cloud.google.com/apis/credentials

### Authorized Redirect URIs

```
http://localhost:3000/api/auth/callback/google
https://henio-uat.azurewebsites.net/api/auth/callback/google
https://henio-prd.azurewebsites.net/api/auth/callback/google
https://uat.henio.app/api/auth/callback/google
https://henio.app/api/auth/callback/google
```

### Authorized JavaScript Origins

```
http://localhost:3000
https://henio-uat.azurewebsites.net
https://henio-prd.azurewebsites.net
https://uat.henio.app
https://henio.app
```

---

## 7. Custom Domain Setup

### Current DNS Configuration (OVH)

| Record | Type | Target |
|--------|------|--------|
| `uat.henio.app` | CNAME | `henio-uat.azurewebsites.net.` |
| `asuid.uat.henio.app` | TXT | `0831DFA87FE27397BCA7230C02F57D4B445936D818144FBF1E69BF5CFA0A8D65` |
| `henio.app` | A | `20.215.12.2` |
| `asuid.henio.app` | TXT | `0831DFA87FE27397BCA7230C02F57D4B445936D818144FBF1E69BF5CFA0A8D65` |

### Adding a New Custom Domain

#### Step 1: Get Azure Verification ID

```bash
az webapp show --name henio-uat --resource-group henio-rg \
  --query customDomainVerificationId -o tsv
```

#### Step 2: Configure DNS in OVH

1. Log in to OVH Manager → Domains → henio.app → DNS Zone
2. Add TXT record for verification:
   - Subdomain: `asuid.<subdomain>` (e.g., `asuid.uat`)
   - Value: verification ID from Step 1
3. Add CNAME record:
   - Subdomain: `<subdomain>` (e.g., `uat`)
   - Target: `<app-name>.azurewebsites.net.` (with trailing dot!)
4. For root domain, add A record:
   - Subdomain: `@` or empty
   - IPv4: Azure IP address
5. Wait for DNS propagation (5-30 min)

#### Step 3: Add Domain in Azure

```bash
# Add custom domain
az webapp config hostname add --webapp-name henio-uat \
  --resource-group henio-rg --hostname uat.henio.app

# Create SSL certificate
az webapp config ssl create --resource-group henio-rg \
  --name henio-uat --hostname uat.henio.app

# Get certificate thumbprint
THUMBPRINT=$(az webapp config ssl show -g henio-rg \
  --certificate-name uat.henio.app --query thumbprint -o tsv)

# Bind certificate
az webapp config ssl bind --name henio-uat \
  --resource-group henio-rg \
  --certificate-thumbprint $THUMBPRINT --ssl-type SNI
```

#### Step 4: Update NEXTAUTH_URL

```bash
# Update GitHub secret
gh secret set NEXTAUTH_URL --env uat --body "https://uat.henio.app"

# Trigger redeploy
gh workflow run deploy-uat.yml --ref main
```

#### Step 5: Verify

```bash
# Check DNS
dig uat.henio.app CNAME +short
dig henio.app A +short

# Check health
curl https://uat.henio.app/api/health

# Check SSL certificate
openssl s_client -connect uat.henio.app:443 -servername uat.henio.app \
  </dev/null 2>/dev/null | openssl x509 -noout -dates
```

---

## 8. Email (SMTP)

### OVH SMTP Configuration

| Setting | Value |
|---------|-------|
| Host | `ssl0.ovh.net` |
| Port | `465` |
| User | `noreply@henio.app` |
| From | `Henio <noreply@henio.app>` |
| Security | SSL/TLS |

### Waitlist Email Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `WAITLIST_CONFIRM_TTL_HOURS` | 24 | Confirmation link expiry |
| `WAITLIST_CONFIRM_RESEND_MINUTES` | 10 | Cooldown between resends |

---

## 9. Troubleshooting

### Application Won't Start (Exit Code 254)

Usually caused by missing Stripe configuration.

```bash
# Check logs
az webapp log download --name henio-prd --resource-group henio-rg \
  --log-file /tmp/logs.zip

# Check Stripe variables
az webapp config appsettings list --name henio-prd \
  --resource-group henio-rg | grep STRIPE

# Restart app
az webapp restart --name henio-prd --resource-group henio-rg
```

### OAuth Error: `redirect_uri_mismatch`

Add missing redirect URIs in Google Cloud Console:
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit OAuth 2.0 Client
3. Add the missing redirect URI

### Health Check Fails

```bash
# Stream live logs
az webapp log tail --name henio-prd --resource-group henio-rg

# Check app status
az webapp show --name henio-prd --resource-group henio-rg --query state

# Force restart
az webapp restart --name henio-prd --resource-group henio-rg
```

### JWT Token Issues After Allowlist Update

If a user is still waitlisted after being added to allowlist:
- Sign out completely
- Clear browser cookies
- Or use incognito mode

The JWT token caches access status for 60 seconds.

### Database Connection Issues

```bash
# Test connection
az postgres flexible-server connect --name henio-db \
  --admin-user postgres --admin-password $DB_PASSWORD
```

---

## 10. Infrastructure Lifecycle

### Provision New Infrastructure

```bash
gh workflow run provision-infra.yml -f confirm=create
```

After provisioning:
1. Update redirect URIs in Google OAuth
2. Set up custom domains
3. Configure all GitHub secrets
4. Run initial deploy

### Destroy Infrastructure

```bash
gh workflow run destroy-infra.yml -f confirm=destroy
```

**Warning:** This deletes all resources including the database!

---

## 11. Pre-Production Checklist

### CI/CD

- [ ] CI workflow runs on every PR (lint, typecheck, test, build)
- [ ] E2E tests run after UAT deployment (blocking)
- [ ] App Service Plan adequate for expected load

### Configuration

- [ ] Domain `henio.app` resolves and SSL is valid
- [ ] `NEXTAUTH_URL` = `https://henio.app`
- [ ] Google OAuth: origins + redirect URIs include production domain
- [ ] `GEMINI_API_KEY` set
- [ ] `ADMIN_EMAILS`, `ALLOWLIST_EMAILS`, `MAX_ACTIVE_USERS` configured
- [ ] AI usage limits (requests + tokens) configured in Admin → Config
- [ ] AI cost alerts configured (threshold/webhook/email) if required
- [ ] Email SMTP config set and tested
- [ ] Waitlist cron active (hourly)

### Stripe

- [ ] Live mode enabled in Stripe Dashboard
- [ ] Product and prices created
- [ ] Webhook endpoint configured with correct URL
- [ ] All 5 Stripe environment variables set
- [ ] Test subscription completed successfully
- [ ] Webhook events receiving 200 OK

### Security

- [ ] `E2E_TEST=false` in production
- [ ] Admin endpoints protected
- [ ] CSP/HSTS headers reviewed

### Data

- [ ] Database backups enabled
- [ ] Migrations reviewed
- [ ] UAT reset logic NOT used for PRD

### Testing

- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Manual test checklist executed

### Rollback Plan

1. **Immediate:** Redeploy previous version
   ```bash
   git revert HEAD
   git push origin main  # for UAT
   gh workflow run deploy-prd.yml  # for PRD
   ```

2. **Database:** Restore from backup if needed

3. **Stripe:** Switch back to test mode keys if payment issues
