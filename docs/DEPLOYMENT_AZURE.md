# Azure Deployment (UAT + PRD)

This setup uses Azure App Service (Linux) + Azure Database for PostgreSQL Flexible Server and GitHub Actions.

## 1) Provision Azure resources

Run the script with your preferred names (web app names must be globally unique).

```bash
export AZ_LOCATION=polandcentral
export AZ_RESOURCE_GROUP=evt-rg
export AZ_PLAN_NAME=evt-plan
export AZ_PLAN_SKU=B1
export AZ_APP_UAT=evt-uat-001
export AZ_APP_PRD=evt-prd-001
export AZ_PG_SERVER=evt-postgres-001
export AZ_PG_ADMIN_USER=vocabadmin
export AZ_PG_ADMIN_PASSWORD='REPLACE_ME'
export AZ_DB_UAT=evt_uat
export AZ_DB_PRD=evt_prd

./infra/azure/provision.sh
```

Notes:
- `AZ_PLAN_SKU=B1` is a low-cost baseline. Upgrade if needed.
- PostgreSQL is created with public access `All` + Azure services firewall rule. Tighten later.

## 2) Configure App Settings via GitHub Actions

App settings are injected at deploy time from GitHub environment secrets.
The deploy workflow also sets the startup command to `npm start`.

## 3) Initialize database schema (once per environment)

Because there are no migrations yet, use `db push` once:

```bash
DATABASE_URL="..." npx prisma db push
```

When you add migrations, switch to `npx prisma migrate deploy`.

Note: Azure PostgreSQL Flexible Server uses the admin user name as-is in the connection string
(no `@server` suffix).

## 4) GitHub Actions secrets

Create publish profiles:

```bash
az webapp deployment list-publishing-profiles \
  --resource-group evt-rg \
  --name evt-uat-001 \
  --xml > uat.publish.xml

az webapp deployment list-publishing-profiles \
  --resource-group evt-rg \
  --name evt-prd-001 \
  --xml > prd.publish.xml
```

Create an Azure service principal and store its credentials:

```bash
az ad sp create-for-rbac \
  --name "evt-deploy-sp" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP> \
  --sdk-auth > azure-credentials.json
```

Store secrets in GitHub (environment secrets for `uat` and `prd`):

```bash
gh secret set AZURE_RESOURCE_GROUP -b "evt-rg" -e uat
gh secret set AZURE_RESOURCE_GROUP -b "evt-rg" -e prd
gh secret set AZURE_WEBAPP_NAME_UAT -b "evt-uat-001" -e uat
gh secret set AZURE_WEBAPP_NAME_PRD -b "evt-prd-001" -e prd
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE_UAT -b "$(cat uat.publish.xml)" -e uat
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE_PRD -b "$(cat prd.publish.xml)" -e prd
gh secret set AZURE_CREDENTIALS -b "$(cat azure-credentials.json)" -e uat
gh secret set AZURE_CREDENTIALS -b "$(cat azure-credentials.json)" -e prd

gh secret set NEXTAUTH_URL -b "https://<UAT>.azurewebsites.net" -e uat
gh secret set NEXTAUTH_URL -b "https://<PRD>.azurewebsites.net" -e prd
gh secret set NEXTAUTH_SECRET -b "<secret>" -e uat
gh secret set NEXTAUTH_SECRET -b "<secret>" -e prd
gh secret set GOOGLE_CLIENT_ID -b "<client-id>" -e uat
gh secret set GOOGLE_CLIENT_ID -b "<client-id>" -e prd
gh secret set GOOGLE_CLIENT_SECRET -b "<client-secret>" -e uat
gh secret set GOOGLE_CLIENT_SECRET -b "<client-secret>" -e prd
gh secret set GEMINI_API_KEY -b "<api-key>" -e uat
gh secret set GEMINI_API_KEY -b "<api-key>" -e prd
gh secret set DATABASE_URL -b "<database-url-uat>" -e uat
gh secret set DATABASE_URL -b "<database-url-prd>" -e prd
```

## 5) Environments & approvals

Create GitHub environments `uat` and `prd`.
Set required reviewers for `prd` to gate production deployments.

## 6) Deploy

- UAT: push to `main` (see `.github/workflows/deploy-uat.yml`)
- PRD: run workflow `Deploy PRD` manually (see `.github/workflows/deploy-prd.yml`)
