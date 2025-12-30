# Runbook (Ops + Deploy)

## Environments
- **UAT**: https://evt.powerbiit.com (Azure fallback: https://vocab-trainer-uat.azurewebsites.net)
- **PRD**: nieutworzone (docelowo osobna subdomena, np. https://app.powerbiit.com)
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
  - `https://evt.powerbiit.com/api/auth/callback/google` (UAT)
  - `https://app.powerbiit.com/api/auth/callback/google` (PRD, docelowo)
  - `https://vocab-trainer-uat.azurewebsites.net/api/auth/callback/google` (Azure direct, opcjonalnie)
- JavaScript origins:
  - `http://localhost:3000`
  - `https://evt.powerbiit.com`
  - `https://app.powerbiit.com` (PRD, docelowo)
  - `https://vocab-trainer-uat.azurewebsites.net`

## Custom Domain Setup (OVH + Azure)

### Aktualna konfiguracja UAT (2025-12-30)

**DNS w OVH (powerbiit.com):**
| Rekord | Typ | Target |
|--------|-----|--------|
| `evt.powerbiit.com` | CNAME | `vocab-trainer-uat.azurewebsites.net.` |
| `asuid.evt.powerbiit.com` | TXT | `0831dfa87fe27397bca7230c02f57d4b445936d818144fbf1e69bf5cfa0a8d65` |

**Azure Custom Domain:**
- App: `vocab-trainer-uat`
- Custom domain: `evt.powerbiit.com` (zweryfikowana)
- SSL: App Service Managed Certificate (GeoTrust, ważny do 2026-04-14)
- Thumbprint: `64AB5781F44D8FC672279EF133572180BBFF04C9`

**GitHub Secrets (env: uat):**
- `NEXTAUTH_URL`: `https://evt.powerbiit.com`

### Jak dodać/zmienić custom domain

#### 1. Konfiguracja DNS w OVH
1. Zaloguj się do OVH Manager -> Domains -> powerbiit.com -> DNS Zone
2. Dodaj rekord TXT (weryfikacja Azure):
   - Subdomain: `asuid.<subdomena>` (np. `asuid.evt` dla evt.powerbiit.com)
   - Wartość: `customDomainVerificationId` z Azure:
     ```bash
     az webapp show --name vocab-trainer-uat --resource-group vocab-trainer-rg \
       --query customDomainVerificationId -o tsv
     ```
3. Dodaj rekord CNAME:
   - Subdomain: `evt` (dla evt.powerbiit.com)
   - Target: `vocab-trainer-uat.azurewebsites.net.` (z kropką na końcu!)
   - TTL: domyślny
4. Poczekaj na propagację DNS (5-30 min)

#### 2. Konfiguracja Custom Domain w Azure (CLI)
```bash
# Dodaj custom domain
az webapp config hostname add --webapp-name vocab-trainer-uat \
  --resource-group vocab-trainer-rg --hostname evt.powerbiit.com

# Utwórz certyfikat SSL (może trwać kilka minut)
az webapp config ssl create --resource-group vocab-trainer-rg \
  --name vocab-trainer-uat --hostname evt.powerbiit.com

# Sprawdź thumbprint certyfikatu
az webapp config ssl show -g vocab-trainer-rg \
  --certificate-name evt.powerbiit.com --query thumbprint -o tsv

# Powiąż certyfikat
az webapp config ssl bind --name vocab-trainer-uat \
  --resource-group vocab-trainer-rg \
  --certificate-thumbprint <THUMBPRINT> --ssl-type SNI
```

#### 3. Aktualizacja NEXTAUTH_URL
```bash
# GitHub secret
gh secret set NEXTAUTH_URL --env uat --body "https://evt.powerbiit.com"

# Azure app settings
az webapp config appsettings set --name vocab-trainer-uat \
  --resource-group vocab-trainer-rg \
  --settings NEXTAUTH_URL=https://evt.powerbiit.com

# Uruchom redeploy
gh workflow run deploy-uat.yml --ref main
```

#### 4. Weryfikacja
```bash
# Sprawdź DNS
dig evt.powerbiit.com CNAME +short

# Sprawdź health
curl https://evt.powerbiit.com/api/health

# Sprawdź certyfikat SSL
openssl s_client -connect evt.powerbiit.com:443 -servername evt.powerbiit.com \
  </dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Infra lifecycle
- Provision: `Provision Azure Infrastructure` workflow (`confirm=create`)
- Destroy: `Destroy Azure Infrastructure` workflow (`confirm=destroy`)
- Po provisioning zaktualizuj redirect URIs w Google OAuth i zweryfikuj `NEXTAUTH_URL`.

## UAT database reset
- UAT runs `npx prisma migrate reset --force --skip-seed` on every deploy.
- All UAT data (users, usage, plans) is wiped each deploy.
