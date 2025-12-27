# Azure Deployment (UAT + PRD)

Kompletny przewodnik wdrożenia aplikacji English Vocab Trainer na Azure.

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
# 1. Utwórz resource group
az group create --name evt-rg-pl --location polandcentral

# 2. Utwórz App Service Plan
az appservice plan create --name evt-plan-pl --resource-group evt-rg-pl --sku B1 --is-linux

# 3. Wygeneruj losowy suffix (np. 6e5d)
SUFFIX=$(openssl rand -hex 2)
echo "Suffix: $SUFFIX"

# 4. Utwórz Web Apps
az webapp create --name evt-uat-pl-$SUFFIX --resource-group evt-rg-pl --plan evt-plan-pl --runtime "NODE|20-lts"
az webapp create --name evt-prd-pl-$SUFFIX --resource-group evt-rg-pl --plan evt-plan-pl --runtime "NODE|20-lts"

# 5. Wygeneruj hasło PostgreSQL
PG_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
echo "PostgreSQL password: $PG_PASS"  # ZAPISZ TO!

# 6. Utwórz PostgreSQL Flexible Server (~5 min)
az postgres flexible-server create \
  --name evt-pg-pl-$SUFFIX \
  --resource-group evt-rg-pl \
  --location polandcentral \
  --admin-user vocabadmin \
  --admin-password "$PG_PASS" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access All

# 7. Utwórz bazy danych
az postgres flexible-server db create --resource-group evt-rg-pl --server-name evt-pg-pl-$SUFFIX --database-name evt_uat
az postgres flexible-server db create --resource-group evt-rg-pl --server-name evt-pg-pl-$SUFFIX --database-name evt_prd

# 8. Dodaj regułę firewall dla Azure
az postgres flexible-server firewall-rule create \
  --resource-group evt-rg-pl \
  --name evt-pg-pl-$SUFFIX \
  --rule-name AllowAllAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Krok 3: Skonfiguruj GitHub Secrets

```bash
# Pobierz wartości
SUFFIX="6e5d"  # Twój suffix
PG_PASS="TwojeHaslo"  # Hasło z kroku 2

# Utwórz Service Principal dla deploymentu
SP_JSON=$(az ad sp create-for-rbac --name "evt-deploy-sp" --role contributor \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/evt-rg-pl" --sdk-auth)

# Pobierz publish profile
UAT_PROFILE=$(az webapp deployment list-publishing-profiles --resource-group evt-rg-pl --name evt-uat-pl-$SUFFIX --xml)

# Ustaw sekrety dla środowiska UAT
gh secret set AZURE_CREDENTIALS --env uat --body "$SP_JSON"
gh secret set AZURE_RESOURCE_GROUP --env uat --body "evt-rg-pl"
gh secret set AZURE_WEBAPP_NAME_UAT --env uat --body "evt-uat-pl-$SUFFIX"
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE_UAT --env uat --body "$UAT_PROFILE"
gh secret set DATABASE_URL --env uat --body "postgresql://vocabadmin:${PG_PASS}@evt-pg-pl-${SUFFIX}.postgres.database.azure.com:5432/evt_uat?sslmode=require"
gh secret set NEXTAUTH_URL --env uat --body "https://evt-uat-pl-${SUFFIX}.azurewebsites.net"

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

### Krok 4: Skonfiguruj Google OAuth

1. Otwórz [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Znajdź swój OAuth 2.0 Client
3. Dodaj **Authorized JavaScript origins**:
   ```
   https://evt-uat-pl-SUFFIX.azurewebsites.net
   https://evt-prd-pl-SUFFIX.azurewebsites.net
   ```
4. Dodaj **Authorized redirect URIs**:
   ```
   https://evt-uat-pl-SUFFIX.azurewebsites.net/api/auth/callback/google
   https://evt-prd-pl-SUFFIX.azurewebsites.net/api/auth/callback/google
   ```
5. Zapisz zmiany

### Krok 5: Wdróż aplikację

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

### Krok 6: Zweryfikuj wdrożenie

```bash
# Health check
curl https://evt-uat-pl-SUFFIX.azurewebsites.net/api/health

# Oczekiwana odpowiedź:
# {"status":"ok","version":"1.0.16","commit":"abc123","buildTime":"...","env":"production"}
```

---

## Aktualna infrastruktura (grudzień 2025)

| Zasób | Nazwa | URL/Szczegóły |
|-------|-------|---------------|
| Resource Group | `evt-rg-pl` | Poland Central |
| App Service Plan | `evt-plan-pl` | B1 (~13 USD/mies.) |
| UAT Web App | `evt-uat-pl-6e5d` | https://evt-uat-pl-6e5d.azurewebsites.net |
| PRD Web App | `evt-prd-pl-6e5d` | https://evt-prd-pl-6e5d.azurewebsites.net |
| PostgreSQL Server | `evt-pg-pl-6e5d` | Burstable B1ms (~12 USD/mies.) |
| UAT Database | `evt_uat` | Reset przy każdym deploy |
| PRD Database | `evt_prd` | Trwała (migracje) |

**Koszt:** ~25 USD/miesiąc (~100 PLN/miesiąc)

---

## Workflows GitHub Actions

### Deploy UAT (automatyczny)
- **Trigger:** Push do `main` (bez zmian tylko w docs)
- **Co robi:** lint, test, build, reset bazy UAT, deploy, health check

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
- `AZURE_RESOURCE_GROUP` - evt-rg-pl
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
az ad sp create-for-rbac --name "evt-deploy-sp" --role contributor \
  --scopes "/subscriptions/SUBSCRIPTION_ID/resourceGroups/evt-rg-pl" --sdk-auth
```

### Health check fails
```bash
# Sprawdź logi aplikacji
az webapp log tail --name evt-uat-pl-6e5d --resource-group evt-rg-pl

# Sprawdź ustawienia
az webapp config appsettings list --name evt-uat-pl-6e5d --resource-group evt-rg-pl
```

### Baza danych niedostępna
```bash
# Sprawdź firewall PostgreSQL
az postgres flexible-server firewall-rule list --resource-group evt-rg-pl --name evt-pg-pl-6e5d

# Sprawdź status serwera
az postgres flexible-server show --resource-group evt-rg-pl --name evt-pg-pl-6e5d --query "state"
```

---

## Usuwanie środowiska

```bash
# Opcja 1: Workflow
gh workflow run destroy-infra.yml
# Wpisz: destroy

# Opcja 2: Ręcznie (szybsze)
az group delete --name evt-rg-pl --yes --no-wait
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
