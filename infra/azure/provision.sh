#!/usr/bin/env bash
set -euo pipefail

: "${AZ_LOCATION:=polandcentral}"
: "${AZ_RESOURCE_GROUP:=evt-rg}"
: "${AZ_PLAN_NAME:=evt-plan}"
: "${AZ_PLAN_SKU:=B1}"
: "${AZ_APP_UAT:=evt-uat}"
: "${AZ_APP_PRD:=evt-prd}"
: "${AZ_PG_SERVER:=evt-postgres}"
: "${AZ_PG_ADMIN_USER:=vocabadmin}"
: "${AZ_PG_ADMIN_PASSWORD:=}"
: "${AZ_DB_UAT:=evt_uat}"
: "${AZ_DB_PRD:=evt_prd}"
: "${AZ_NODE_RUNTIME:=NODE|20-lts}"

if [[ -z "${AZ_PG_ADMIN_PASSWORD}" ]]; then
  echo "AZ_PG_ADMIN_PASSWORD is required." >&2
  exit 1
fi

echo "Creating resource group ${AZ_RESOURCE_GROUP} in ${AZ_LOCATION}..."
az group create --name "${AZ_RESOURCE_GROUP}" --location "${AZ_LOCATION}"

echo "Creating App Service plan ${AZ_PLAN_NAME}..."
az appservice plan create \
  --name "${AZ_PLAN_NAME}" \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --sku "${AZ_PLAN_SKU}" \
  --is-linux

echo "Creating Web Apps..."
az webapp create \
  --name "${AZ_APP_UAT}" \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --plan "${AZ_PLAN_NAME}" \
  --runtime "${AZ_NODE_RUNTIME}"

az webapp create \
  --name "${AZ_APP_PRD}" \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --plan "${AZ_PLAN_NAME}" \
  --runtime "${AZ_NODE_RUNTIME}"

echo "Creating PostgreSQL flexible server ${AZ_PG_SERVER}..."
az postgres flexible-server create \
  --name "${AZ_PG_SERVER}" \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --location "${AZ_LOCATION}" \
  --admin-user "${AZ_PG_ADMIN_USER}" \
  --admin-password "${AZ_PG_ADMIN_PASSWORD}" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access All

echo "Creating databases..."
az postgres flexible-server db create \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --server-name "${AZ_PG_SERVER}" \
  --database-name "${AZ_DB_UAT}"

az postgres flexible-server db create \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --server-name "${AZ_PG_SERVER}" \
  --database-name "${AZ_DB_PRD}"

echo "Allowing Azure services to connect to PostgreSQL..."
az postgres flexible-server firewall-rule create \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --name "${AZ_PG_SERVER}" \
  --rule-name AllowAllAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

PG_HOST="${AZ_PG_SERVER}.postgres.database.azure.com"
PG_USER="${AZ_PG_ADMIN_USER}"

UAT_DATABASE_URL="postgresql://${PG_USER}:${AZ_PG_ADMIN_PASSWORD}@${PG_HOST}:5432/${AZ_DB_UAT}?sslmode=require"
PRD_DATABASE_URL="postgresql://${PG_USER}:${AZ_PG_ADMIN_PASSWORD}@${PG_HOST}:5432/${AZ_DB_PRD}?sslmode=require"

COMMON_SETTINGS=(
  "NODE_ENV=production"
  "WEBSITE_RUN_FROM_PACKAGE=1"
  "SCM_DO_BUILD_DURING_DEPLOYMENT=false"
  "WEBSITE_NODE_DEFAULT_VERSION=20"
)

echo "Setting base app settings..."
az webapp config appsettings set \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --name "${AZ_APP_UAT}" \
  --settings "${COMMON_SETTINGS[@]}" "DATABASE_URL=${UAT_DATABASE_URL}"

az webapp config appsettings set \
  --resource-group "${AZ_RESOURCE_GROUP}" \
  --name "${AZ_APP_PRD}" \
  --settings "${COMMON_SETTINGS[@]}" "DATABASE_URL=${PRD_DATABASE_URL}"

echo "Done. Add secrets (NEXTAUTH, GOOGLE, GEMINI) in App Settings."
