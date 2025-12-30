# Runbook (Ops + Deploy)

## Environments
- **UAT**: https://evt.powerbiit.com (Azure: vocab-trainer-uat.azurewebsites.net)
- **PRD**: https://evt.powerbiit.com (docelowo osobna subdomena, np. app.powerbiit.com)
- Custom domains hostowane w OVH, Azure Web App z custom domain binding.

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
  - `https://evt.powerbiit.com/api/auth/callback/google` (UAT/PRD)
  - `https://vocab-trainer-uat.azurewebsites.net/api/auth/callback/google` (Azure direct)
- JavaScript origins:
  - `http://localhost:3000`
  - `https://evt.powerbiit.com`
  - `https://vocab-trainer-uat.azurewebsites.net`

## Custom Domain Setup (OVH + Azure)

### Konfiguracja DNS w OVH
1. Zaloguj się do OVH Manager -> Domains -> powerbiit.com -> DNS Zone
2. Dodaj rekord CNAME:
   - Subdomain: `evt` (dla evt.powerbiit.com)
   - Target: `vocab-trainer-uat.azurewebsites.net.` (z kropką na końcu!)
   - TTL: 3600
3. Poczekaj na propagację DNS (5-30 min)

### Konfiguracja Custom Domain w Azure
1. Azure Portal -> vocab-trainer-uat -> Custom domains
2. Add custom domain: `evt.powerbiit.com`
3. Azure automatycznie sprawdzi DNS
4. Włącz HTTPS (App Service Managed Certificate - darmowy)

### Aktualizacja NEXTAUTH_URL
1. GitHub -> Settings -> Environments -> uat -> Secrets
2. Zmień `NEXTAUTH_URL` na `https://evt.powerbiit.com`
3. Wykonaj redeploy

### Weryfikacja
```bash
curl https://evt.powerbiit.com/api/health
```

## Infra lifecycle
- Provision: `Provision Azure Infrastructure` workflow (`confirm=create`)
- Destroy: `Destroy Azure Infrastructure` workflow (`confirm=destroy`)
- Po provisioning zaktualizuj redirect URIs w Google OAuth i zweryfikuj `NEXTAUTH_URL`.

## UAT database reset
- UAT runs `npx prisma migrate reset --force --skip-seed` on every deploy.
- All UAT data (users, usage, plans) is wiped each deploy.
