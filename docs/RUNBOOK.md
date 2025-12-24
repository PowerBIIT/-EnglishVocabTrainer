# Runbook (Ops + Deploy)

## Environments
- UAT: https://<APP_UAT>.azurewebsites.net
- PRD: https://<APP_PRD>.azurewebsites.net
- Aktualne URL-e znajdziesz w outputcie workflow `Provision Azure Infrastructure`
  oraz w sekretach `NEXTAUTH_URL` środowisk `uat` i `prd`.

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
- Keep redirect URIs in Google Cloud Console up to date:
  - `https://<APP_UAT>.azurewebsites.net/api/auth/callback/google`
  - `https://<APP_PRD>.azurewebsites.net/api/auth/callback/google`

## Infra lifecycle
- Provision: `Provision Azure Infrastructure` workflow (`confirm=create`)
- Destroy: `Destroy Azure Infrastructure` workflow (`confirm=destroy`)
- Po provisioning zaktualizuj redirect URIs w Google OAuth i zweryfikuj `NEXTAUTH_URL`.

## UAT database reset
- UAT runs `npx prisma migrate reset --force --skip-seed` on every deploy.
- All UAT data (users, usage, plans) is wiped each deploy.
