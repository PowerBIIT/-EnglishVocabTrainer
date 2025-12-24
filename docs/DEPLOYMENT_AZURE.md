# Azure Deployment (UAT + PRD)

Infrastructure as Code deployment using Azure App Service (Linux) + PostgreSQL Flexible Server and GitHub Actions.

## Infrastructure (dynamic, grudzień 2025)

Zasoby są tworzone przez workflow `provision-infra.yml` i dostają losowy suffix `<suffix>`.
Po uruchomieniu `destroy-infra.yml` środowisko może nie istnieć.

**Region:** Poland Central
**Resource Group:** `evt-rg-pl`

| Resource | Name (pattern) | Details |
|----------|----------------|---------|
| App Service Plan | `evt-plan-pl` | B1 (Basic, ~13 USD/month) |
| UAT Web App | `evt-uat-pl-<suffix>` | https://evt-uat-pl-<suffix>.azurewebsites.net |
| PRD Web App | `evt-prd-pl-<suffix>` | https://evt-prd-pl-<suffix>.azurewebsites.net |
| PostgreSQL Server | `evt-pg-pl-<suffix>` | Burstable B1ms (~12 USD/month) |
| UAT Database | `evt_uat` | Reset on every deploy |
| PRD Database | `evt_prd` | Persistent, migration-applied |

**Total Cost (B1 + B1ms):** ~25 USD/month (~100 PLN/month)

## Deployment Workflows

### 1. Provision Infrastructure

**Workflow:** `.github/workflows/provision-infra.yml`
**Trigger:** Manual (workflow_dispatch)

Creates all Azure resources and configures GitHub secrets automatically.

**Usage:**
1. Go to Actions → Provision Azure Infrastructure
2. Click "Run workflow"
3. Enter confirmation: `create`
4. Optional: customize region, resource group, SKU

**What it does:**
- Creates Resource Group
- Creates App Service Plan (B1)
- Creates Web Apps (UAT + PRD)
- Creates PostgreSQL Flexible Server (Burstable B1ms)
- Creates databases (evt_uat, evt_prd)
- Creates Service Principal for deployments
- Configures GitHub secrets for both environments

**Required GitHub secrets (once):**
- `AZURE_PROVISION_CREDENTIALS` - Service Principal with Owner role

**Important (permissions):**
- Provisioning uses `gh secret set` to update environment secrets.
- Ensure the token used by the workflow can write environment secrets
  (e.g. `actions: write` on `GITHUB_TOKEN` or a PAT with repo admin rights).

### 2. Deploy to UAT

**Workflow:** `.github/workflows/deploy-uat.yml`
**Trigger:** Automatic on push to `main` (excluding docs-only changes)

**What it does:**
1. Lint, test, build
2. Login to Azure
3. **Reset UAT database** (fresh start every deploy)
4. Configure app settings
5. Deploy application
6. Restart app
7. Verify health (version + commit match)

### 3. Deploy to PRD

**Workflow:** `.github/workflows/deploy-prd.yml`
**Trigger:** Manual (workflow_dispatch)

**What it does:**
1. Lint, test, build
2. Login to Azure
3. **Apply database migrations** (`prisma migrate deploy`, no reset)
4. Configure app settings
5. Deploy application
6. Ensure app is running (start or restart)
7. Verify health (version + commit match)

**Usage:**
```bash
gh workflow run deploy-prd.yml
```

### 4. Destroy Infrastructure

**Workflow:** `.github/workflows/destroy-infra.yml`
**Trigger:** Manual (workflow_dispatch)

Removes all Azure resources and clears GitHub secrets.

**Usage:**
1. Go to Actions → Destroy Azure Infrastructure
2. Click "Run workflow"
3. Enter confirmation: `destroy`

**What it does:**
- Lists resources to be deleted
- Deletes Service Principal
- Deletes Resource Group (and all resources)
- Clears GitHub secrets for UAT and PRD

## GitHub Environments

Create two environments in GitHub repository settings:
- `uat` - UAT environment
- `prd` - PRD environment (add required reviewers for approval)

## GitHub Secrets

Configured automatically by provision workflow:
- `AZURE_RESOURCE_GROUP`
- `AZURE_WEBAPP_NAME_UAT` / `AZURE_WEBAPP_NAME_PRD`
- `AZURE_CREDENTIALS`
- `AZURE_WEBAPP_PUBLISH_PROFILE_UAT` / `AZURE_WEBAPP_PUBLISH_PROFILE_PRD`
- `DATABASE_URL`
- `NEXTAUTH_URL`

**Manually configure these secrets** for both `uat` and `prd` environments:
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GEMINI_API_KEY` - From Google AI Studio
- `ALLOWLIST_EMAILS` - Comma-separated emails (leave empty to allow all)
- `ADMIN_EMAILS` - Admin emails (e.g., radekbroniszewski@gmail.com)
- `MAX_ACTIVE_USERS` - User limit (default: 100)
- AI limits: `FREE_AI_REQUESTS_PER_MONTH`, `FREE_AI_UNITS_PER_MONTH`, etc.

## Database Migrations

Migrations run automatically on app startup:
```bash
node scripts/ensure-migrations.js && npx prisma migrate deploy
```

The `ensure-migrations.js` script baselines existing databases by marking initial migrations as applied when tables already exist.

PRD deploy dodatkowo uruchamia `prisma migrate deploy` przed wdrożeniem, aby ograniczyć drift schematu.

## Health Check

Every deployment verifies the app is running correctly:
```bash
curl https://evt-uat-pl-44b1.azurewebsites.net/api/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.14",
  "commit": "<SHORT_SHA>",
  "buildTime": "2025-12-23T08:43:01Z",
  "env": "production"
}
```

The deploy workflow fails if:
- Status is not "ok"
- Version doesn't match `package.json`
- Commit doesn't match deployment SHA

## Admin User Exclusion

Admins (configured in `ADMIN_EMAILS`) are excluded from the `MAX_ACTIVE_USERS` limit:

**Implementation:** `src/lib/userPlan.ts`
- Admins always get `ACTIVE` status (lines 17-19)
- Admins are not counted in the active user limit (lines 27-37)
- Regular users get `WAITLISTED` when limit is reached

**Example:**
- `MAX_ACTIVE_USERS=100`
- 100 regular users: ACTIVE
- Admin (radekbroniszewski@gmail.com): ACTIVE (not counted)
- 101st regular user: WAITLISTED

## Cost Optimization

**Current setup (~25 USD/month):**
- App Service Plan B1: ~13 USD/month
- PostgreSQL Burstable B1ms: ~12 USD/month

**Further optimization:**
- Use Free tier (F1) for App Service Plan (limited to 60 CPU minutes/day)
- Use Azure Database for PostgreSQL Single Server (cheaper for dev/test)
- Delete UAT environment when not in use (use destroy workflow)

**Destroy after testing:**
```bash
# Run destroy workflow
gh workflow run destroy-infra.yml

# Or manually:
az group delete --name evt-rg-pl --yes
```

## Production Hardening (recommended)

- PostgreSQL is provisioned with public access for convenience. For production,
  restrict access to private networks or an IP allowlist and remove `0.0.0.0`.
- Use separate service principals for provisioning and deployment with least privilege.

## Troubleshooting

**Deploy fails with Azure login error:**
- Check `AZURE_CREDENTIALS` secret is valid
- Verify Service Principal has Contributor role on Resource Group

**Health check fails:**
- Check app logs: `az webapp log tail --name evt-uat-pl-44b1 --resource-group evt-rg-pl`
- Verify all secrets are configured correctly
- Check database connectivity

**Database migration fails:**
- Check `DATABASE_URL` secret is correct
- Verify PostgreSQL firewall allows Azure services
- Review migration files in `prisma/migrations/`

**Admin cannot login despite limit:**
- Verify `ADMIN_EMAILS` contains the correct email
- Check user status in database: `SELECT * FROM "UserPlan" WHERE userId IN (SELECT id FROM "User" WHERE email = 'admin@example.com')`
- Ensure email is lowercase (normalized)
