# Runbook (Henio - Ops + Deploy)

## Environments
- **UAT**: https://uat.henio.app (Azure fallback: https://henio-uat.azurewebsites.net)
- **PRD**: https://henio.app (Azure fallback: https://henio-prd.azurewebsites.net)
- Custom domains hostowane w OVH, Azure Web App z custom domain binding.
- Domeny `*.azurewebsites.net` bywają blokowane w sieciach firmowych, używaj domeny własnej.

## Pipeline behavior
- CI: lint + typecheck + unit + e2e (Postgres service w CI).
- UAT deploy: push to `main` (excluding doc-only changes) -> lint, unit -> build -> reset DB -> deploy -> restart -> health check.
- PRD deploy: manual `Deploy PRD` -> lint, unit -> build -> apply migrations -> deploy -> start/restart -> health check.
- PRD never resets data.

## Health/version verification
- `GET /api/health` returns `status`, `version`, `commit`, `buildTime`.
- `version` comes from `package.json`.
- `commit` is short git SHA from the deploy.
- Health checks in workflows compare these values to the build.

## Access control (waitlist/allowlist)
- `ALLOWLIST_EMAILS`, `ADMIN_EMAILS`, `MAX_ACTIVE_USERS` are injected from GitHub environment secrets.
- Do not change app settings manually in Azure Portal; deploys will overwrite them.
- If a user is still waitlisted after allowlist update, log out and clear cookies or use incognito to refresh the JWT.
- Required admin: `radekbroniszewski@gmail.com` (must be present in `ADMIN_EMAILS` for all environments).

## Google OAuth
- OAuth Client ID: `8637723384-klt7n7hoekdpo0bhlk52a450n9gkv6b7.apps.googleusercontent.com`
- Google Cloud Project: `angielski` (gen-lang-client-0315840383)
- Redirect URIs (must match NEXTAUTH_URL):
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://henio-uat.azurewebsites.net/api/auth/callback/google` (UAT)
  - `https://henio-prd.azurewebsites.net/api/auth/callback/google` (PRD, Azure)
  - `https://uat.henio.app/api/auth/callback/google` (UAT)
  - `https://henio.app/api/auth/callback/google` (PRD)
- JavaScript origins:
  - `http://localhost:3000`
  - `https://henio-uat.azurewebsites.net`
  - `https://henio-prd.azurewebsites.net` (PRD, Azure)
  - `https://uat.henio.app` (UAT)
  - `https://henio.app` (PRD)

## Custom Domain Setup (OVH + Azure)

### Aktualny stan
- Custom domain UAT: `uat.henio.app` (SSL SNI)
- Custom domain PRD: `henio.app` (SSL SNI)

**Aktualna konfiguracja DNS (OVH, henio.app):**
| Rekord | Typ | Target |
|--------|-----|--------|
| `uat.henio.app` | CNAME | `henio-uat.azurewebsites.net.` |
| `asuid.uat.henio.app` | TXT | `0831DFA87FE27397BCA7230C02F57D4B445936D818144FBF1E69BF5CFA0A8D65` |
| `henio.app` | A | `20.215.12.2` |
| `asuid.henio.app` | TXT | `0831DFA87FE27397BCA7230C02F57D4B445936D818144FBF1E69BF5CFA0A8D65` |

### Jak dodać/zmienić custom domain

#### 1. Konfiguracja DNS w OVH
1. Zaloguj się do OVH Manager -> Domains -> henio.app -> DNS Zone
2. Dodaj rekord TXT (weryfikacja Azure):
   - Subdomain: `asuid.<subdomena>` (np. `asuid.uat` dla uat.henio.app, `asuid` dla henio.app)
   - Wartość: `customDomainVerificationId` z Azure:
     ```bash
     az webapp show --name henio-uat --resource-group henio-rg \
       --query customDomainVerificationId -o tsv
     ```
3. Dodaj rekord CNAME:
   - Subdomain: `uat` (dla uat.henio.app)
   - Target: `henio-uat.azurewebsites.net.` (z kropką na końcu!)
   - TTL: domyślny
4. Dodaj rekord A (root domeny):
   - Subdomain: `@` (lub puste pole)
   - IPv4: `20.215.12.2`
   - TTL: domyślny
5. Poczekaj na propagację DNS (5-30 min)

#### 2. Konfiguracja Custom Domain w Azure (CLI)
```bash
# Dodaj custom domain (UAT)
az webapp config hostname add --webapp-name henio-uat \
  --resource-group henio-rg --hostname uat.henio.app

# Dodaj custom domain (PRD)
az webapp config hostname add --webapp-name henio-prd \
  --resource-group henio-rg --hostname henio.app

# Utwórz certyfikat SSL (może trwać kilka minut)
az webapp config ssl create --resource-group henio-rg \
  --name henio-uat --hostname uat.henio.app

az webapp config ssl create --resource-group henio-rg \
  --name henio-prd --hostname henio.app

# Sprawdź thumbprint certyfikatu
az webapp config ssl show -g henio-rg \
  --certificate-name uat.henio.app --query thumbprint -o tsv

az webapp config ssl show -g henio-rg \
  --certificate-name henio.app --query thumbprint -o tsv

# Powiąż certyfikat
az webapp config ssl bind --name henio-uat \
  --resource-group henio-rg \
  --certificate-thumbprint <THUMBPRINT> --ssl-type SNI

az webapp config ssl bind --name henio-prd \
  --resource-group henio-rg \
  --certificate-thumbprint <THUMBPRINT> --ssl-type SNI
```

#### 3. Aktualizacja NEXTAUTH_URL
```bash
# GitHub secret
gh secret set NEXTAUTH_URL --env uat --body "https://uat.henio.app"

# Azure app settings
az webapp config appsettings set --name henio-uat \
  --resource-group henio-rg \
  --settings NEXTAUTH_URL=https://uat.henio.app

# Uruchom redeploy
gh workflow run deploy-uat.yml --ref main
```

#### 4. Weryfikacja
```bash
# Sprawdź DNS
dig uat.henio.app CNAME +short
dig henio.app A +short

# Sprawdź health
curl https://uat.henio.app/api/health

# Sprawdź certyfikat SSL
openssl s_client -connect uat.henio.app:443 -servername uat.henio.app \
  </dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Infra lifecycle
- Provision: `Provision Azure Infrastructure` workflow (`confirm=create`)
- Destroy: `Destroy Azure Infrastructure` workflow (`confirm=destroy`)
- Po provisioning zaktualizuj redirect URIs w Google OAuth i zweryfikuj `NEXTAUTH_URL`.

## UAT database reset
- UAT runs `npx prisma migrate reset --force --skip-seed` on every deploy.
- All UAT data (users, usage, plans) is wiped each deploy.
