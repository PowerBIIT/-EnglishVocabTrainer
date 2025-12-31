# Azure Deployment (UAT + PRD)

Kompletny przewodnik wdrożenia aplikacji Henio na Azure.

## Szybki start - wdrożenie od zera

### Krok 1: Wymagania wstępne

1. **Konto Azure** z aktywną subskrypcją
2. **Konto GitHub** z dostępem do repozytorium
3. **Konto Google Cloud** z projektem OAuth
4. **Azure CLI** zainstalowane i zalogowane:
   ```bash
   az login
   az account show  # sprawdź czy jesteś zalogowany
   ```
5. **GitHub CLI** zainstalowane i zalogowane:
   ```bash
   gh auth login
   gh auth status
   ```

### Krok 2: Utwórz infrastrukturę Azure

```bash
# Używane nazwy (aktualny naming); dla równoległych środowisk dodaj suffix.
RG="henio-rg"
PLAN="henio-plan"
APP_UAT="henio-uat"
APP_PRD="henio-prd" # opcjonalnie
PG_SERVER="henio-db"
PG_ADMIN="henioadmin"
DB_UAT="henio_uat"
DB_PRD="henio_prd"

# 1. Utwórz resource group
az group create --name "$RG" --location polandcentral

# 2. Utwórz App Service Plan
az appservice plan create --name "$PLAN" --resource-group "$RG" --sku B1 --is-linux

# 3. Utwórz Web Apps
az webapp create --name "$APP_UAT" --resource-group "$RG" --plan "$PLAN" --runtime "NODE|20-lts"
# Opcjonalnie PRD:
az webapp create --name "$APP_PRD" --resource-group "$RG" --plan "$PLAN" --runtime "NODE|20-lts"

# 4. Wygeneruj hasło PostgreSQL
PG_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
echo "PostgreSQL password: $PG_PASS"  # ZAPISZ TO!

# 5. Utwórz PostgreSQL Flexible Server (~5 min)
az postgres flexible-server create \
  --name "$PG_SERVER" \
  --resource-group "$RG" \
  --location polandcentral \
  --admin-user "$PG_ADMIN" \
  --admin-password "$PG_PASS" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access All

# 6. Utwórz bazy danych
az postgres flexible-server db create --resource-group "$RG" --server-name "$PG_SERVER" --database-name "$DB_UAT"
az postgres flexible-server db create --resource-group "$RG" --server-name "$PG_SERVER" --database-name "$DB_PRD"

# 7. Dodaj regułę firewall dla Azure
az postgres flexible-server firewall-rule create \
  --resource-group "$RG" \
  --name "$PG_SERVER" \
  --rule-name AllowAllAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Krok 3: Skonfiguruj GitHub Secrets

```bash
# Pobierz wartości z kroku 2
RG="henio-rg"
APP_UAT="henio-uat"
PG_SERVER="henio-db"
PG_ADMIN="henioadmin"
DB_UAT="henio_uat"
PG_PASS="TwojeHaslo"  # Hasło z kroku 2

# Utwórz Service Principal dla deploymentu
SP_JSON=$(az ad sp create-for-rbac --name "henio-deploy-sp" --role contributor \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${RG}" --sdk-auth)

# Pobierz publish profile
UAT_PROFILE=$(az webapp deployment list-publishing-profiles --resource-group "${RG}" --name "${APP_UAT}" --xml)

# Ustaw sekrety dla środowiska UAT
gh secret set AZURE_CREDENTIALS --env uat --body "$SP_JSON"
gh secret set AZURE_RESOURCE_GROUP --env uat --body "${RG}"
gh secret set AZURE_WEBAPP_NAME_UAT --env uat --body "${APP_UAT}"
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE_UAT --env uat --body "$UAT_PROFILE"
gh secret set DATABASE_URL --env uat --body "postgresql://${PG_ADMIN}:${PG_PASS}@${PG_SERVER}.postgres.database.azure.com:5432/${DB_UAT}?sslmode=require"
gh secret set NEXTAUTH_URL --env uat --body "https://uat.henio.app"
# Fallback (Azure): https://henio-uat.azurewebsites.net

# Wygeneruj NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
gh secret set NEXTAUTH_SECRET --env uat --body "$NEXTAUTH_SECRET"

# Ustaw pozostałe sekrety (skopiuj z .env.local lub Google Cloud Console)
gh secret set GOOGLE_CLIENT_ID --env uat --body "TWOJ_GOOGLE_CLIENT_ID"
gh secret set GOOGLE_CLIENT_SECRET --env uat --body "TWOJ_GOOGLE_CLIENT_SECRET"
gh secret set GEMINI_API_KEY --env uat --body "TWOJ_GEMINI_API_KEY"
gh secret set ADMIN_EMAILS --env uat --body "twoj@email.com"
gh secret set ALLOWLIST_EMAILS --env uat --body ""
gh secret set MAX_ACTIVE_USERS --env uat --body "100"
gh secret set FREE_AI_REQUESTS_PER_MONTH --env uat --body "100"
gh secret set FREE_AI_UNITS_PER_MONTH --env uat --body "10000"
gh secret set PRO_AI_REQUESTS_PER_MONTH --env uat --body "1000"
gh secret set PRO_AI_UNITS_PER_MONTH --env uat --body "100000"
gh secret set GLOBAL_AI_REQUESTS_PER_MONTH --env uat --body "10000"
gh secret set GLOBAL_AI_UNITS_PER_MONTH --env uat --body "1000000"
```

### Krok 4: Skonfiguruj domenę (OVH / własna) - zalecane

Domeny `*.azurewebsites.net` bywają blokowane w sieciach firmowych. Jeśli logowanie pod
`https://<APP_UAT>.azurewebsites.net/login` jest blokowane, ustaw domenę własną i używaj jej jako `NEXTAUTH_URL`.

1. **DNS w OVH**
   - Dla subdomeny: dodaj rekord CNAME, np. `uat` -> `<APP_UAT>.azurewebsites.net`
   - Dla domeny głównej użyj rekordu A zgodnie z instrukcją Azure.
2. **Azure App Service**
   - Dodaj hostname (Custom domain) dla UAT/PRD w Azure App Service.
3. **HTTPS**
   - Włącz certyfikat (Managed Certificate lub własny).
4. **Sekrety i OAuth**
   - Ustaw `NEXTAUTH_URL` na domenę własną.
   - Dodaj redirect URI w Google OAuth (patrz kolejny krok).

Aktualna konfiguracja domen:
- UAT: https://uat.henio.app (SSL włączony)
- PRD: https://henio.app (SSL włączony)

Aktualna konfiguracja DNS (OVH, henio.app):
```
CNAME  uat.henio.app            -> henio-uat.azurewebsites.net
TXT    asuid.uat.henio.app      -> (customDomainVerificationId z Azure)
TXT    asuid.henio.app          -> (customDomainVerificationId z Azure)
A      henio.app                -> 20.215.12.2
```
Pobierz `customDomainVerificationId`:
```bash
az webapp show --name henio-uat --resource-group henio-rg \
  --query customDomainVerificationId -o tsv
```

### Krok 5: Skonfiguruj Google OAuth

1. Otwórz [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Znajdź swój OAuth 2.0 Client
3. Dodaj **Authorized JavaScript origins** (Azure lub domena własna):
   ```
   https://henio-uat.azurewebsites.net
   https://henio-prd.azurewebsites.net
   https://uat.henio.app
   https://henio.app
   ```
4. Dodaj **Authorized redirect URIs** (Azure lub domena własna):
   ```
   https://henio-uat.azurewebsites.net/api/auth/callback/google
   https://henio-prd.azurewebsites.net/api/auth/callback/google
   https://uat.henio.app/api/auth/callback/google
   https://henio.app/api/auth/callback/google
   ```
5. Zapisz zmiany

### Krok 6: Wdróż aplikację

```bash
# Zwiększ wersję w package.json
# "version": "1.0.15" -> "1.0.16"

# Commit i push
git add package.json
git commit -m "Bump version to 1.0.16"
git push origin main

# Deployment UAT uruchomi się automatycznie
# Sprawdź status:
gh run list --workflow="Deploy UAT" --limit 1
gh run watch  # monitoruj na żywo
```

### Krok 7: Zweryfikuj wdrożenie

```bash
# Health check
curl https://uat.henio.app/api/health
# fallback (Azure): https://henio-uat.azurewebsites.net/api/health

# Oczekiwana odpowiedź:
# {"status":"ok","version":"1.0.16","commit":"abc123","buildTime":"...","env":"production"}
```

---

## Aktualna infrastruktura (stan obecny)

| Zasób | Nazwa | URL/Szczegóły |
|-------|-------|---------------|
| Resource Group | `henio-rg` | Poland Central |
| App Service Plan | `henio-plan` | B1 (Basic) |
| UAT Web App | `henio-uat` | https://henio-uat.azurewebsites.net |
| PRD Web App | `henio-prd` | https://henio-prd.azurewebsites.net |
| PostgreSQL Server | `henio-db` | Standard_B1ms, PostgreSQL 16 |
| UAT Database | `henio_uat` | Reset przy każdym deploy |
| PRD Database | `henio_prd` | Docelowo dla PRD |
| Custom domains | `uat.henio.app`, `henio.app` | skonfigurowane (SSL SNI) |

OAuth: skonfigurowany dla `uat.henio.app` i `henio.app` (login działa).

**Koszt:** ~25 USD/miesiąc (~100 PLN/miesiąc)

---

## Workflows GitHub Actions

### Deploy UAT (automatyczny)
- **Trigger:** Push do `main` (bez zmian tylko w docs)
- **Co robi:** lint, test, build, reset bazy UAT, deploy, health check
- **Uwaga:** stabilność opiera się o health check (`/api/health`), a nie o status startu z Azure.

### Deploy PRD (manualny)
```bash
gh workflow run deploy-prd.yml
```
- **Co robi:** lint, test, build, migracje bazy (bez reset), deploy, health check

### Destroy Infrastructure (manualny)
```bash
gh workflow run destroy-infra.yml
# Potwierdź wpisując: destroy
```

---

## Sekrety GitHub

### Konfigurowane automatycznie przez provisioning:
- `AZURE_CREDENTIALS` - Service Principal JSON
- `AZURE_RESOURCE_GROUP` - henio-rg
- `AZURE_WEBAPP_NAME_UAT` / `AZURE_WEBAPP_NAME_PRD`
- `AZURE_WEBAPP_PUBLISH_PROFILE_UAT` / `AZURE_WEBAPP_PUBLISH_PROFILE_PRD`
- `DATABASE_URL`
- `NEXTAUTH_URL`

### Do ręcznej konfiguracji:
- `NEXTAUTH_SECRET` - `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - z Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - z Google Cloud Console
- `GEMINI_API_KEY` - z Google AI Studio
- `ADMIN_EMAILS` - lista adminów (comma-separated)
- `ALLOWLIST_EMAILS` - lista dozwolonych (puste = wszyscy)
- `MAX_ACTIVE_USERS` - limit użytkowników (default: 100)
- Limity AI: `FREE_AI_*`, `PRO_AI_*`, `GLOBAL_AI_*`

---

## Migracje bazy danych

Migracje uruchamiają się automatycznie przy starcie aplikacji:
```bash
node scripts/ensure-migrations.js && npx prisma migrate deploy
```

- **UAT:** Baza resetowana przy każdym deploy (czysta instalacja)
- **PRD:** Tylko migracje (dane zachowane)

---

## Troubleshooting

### Błąd logowania OAuth (`redirect_uri_mismatch`)
1. Otwórz Google Cloud Console → APIs & Services → Credentials
2. Edytuj OAuth 2.0 Client
3. Dodaj brakujące URIs (origins + redirect)
4. Zapisz i poczekaj 1-5 minut

### Deploy fails - Azure login error
```bash
# Sprawdź czy SP jest aktualny
az ad sp show --id "CLIENT_ID_Z_AZURE_CREDENTIALS"

# Jeśli wygasł, utwórz nowy:
az ad sp create-for-rbac --name "henio-deploy-sp" --role contributor \
  --scopes "/subscriptions/SUBSCRIPTION_ID/resourceGroups/henio-rg" --sdk-auth
```

### Health check fails
```bash
# Sprawdź logi aplikacji
az webapp log tail --name henio-uat --resource-group henio-rg

# Sprawdź ustawienia
az webapp config appsettings list --name henio-uat --resource-group henio-rg
```

### Baza danych niedostępna
```bash
# Sprawdź firewall PostgreSQL
az postgres flexible-server firewall-rule list --resource-group henio-rg --name henio-db

# Sprawdź status serwera
az postgres flexible-server show --resource-group henio-rg --name henio-db --query "state"
```

---

## Usuwanie środowiska

```bash
# Opcja 1: Workflow
gh workflow run destroy-infra.yml
# Wpisz: destroy

# Opcja 2: Ręcznie (szybsze)
az group delete --name henio-rg --yes --no-wait
```

---

## Checklist przed wdrożeniem PRD

- [ ] Wszystkie testy przechodzą (`npm run test:unit`)
- [ ] Build działa lokalnie (`npm run build`)
- [ ] UAT działa i przetestowany
- [ ] Testy manualne wykonane (`docs/MANUAL_TESTS.md`)
- [ ] Wersja w package.json zaktualizowana
- [ ] OAuth URIs dla PRD skonfigurowane w Google Cloud
- [ ] Sekrety PRD skonfigurowane w GitHub
- [ ] Backup danych (jeśli potrzebny)
