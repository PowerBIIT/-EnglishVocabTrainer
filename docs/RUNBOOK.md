# Runbook (Ops + Deploy)

## Environments
- UAT: https://evt-uat-pl-44b1.azurewebsites.net
- PRD: https://evt-prd-pl-44b1.azurewebsites.net

## Pipeline behavior
- UAT deploy: push to `main` -> lint, unit, e2e -> build -> reset DB -> deploy -> restart -> health check.
- PRD deploy: manual `Deploy PRD` workflow -> lint, unit, build -> migrate status -> deploy -> restart -> health check.
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

## Google OAuth
- Keep redirect URIs in Google Cloud Console up to date:
  - `https://evt-uat-pl-44b1.azurewebsites.net/api/auth/callback/google`
  - `https://evt-prd-pl-44b1.azurewebsites.net/api/auth/callback/google`

## UAT database reset
- UAT runs `npx prisma migrate reset --force --skip-seed` on every deploy.
- All UAT data (users, usage, plans) is wiped each deploy.
