# Azure Deployment (UAT + PRD)

## Aktualna infrastruktura

| Środowisko | URL | Baza danych |
|------------|-----|-------------|
| **UAT** | https://uat.henio.app | `henio_uat` (reset przy deploy) |
| **PRD** | https://henio.app | `henio_prd` (dane zachowane) |

| Zasób | Nazwa | Szczegóły |
|-------|-------|-----------|
| Resource Group | `henio-rg` | Poland Central |
| App Service Plan | `henio-plan` | B1 (Basic), Linux |
| PostgreSQL | `henio-db` | Standard_B1ms, v16 |

**Koszt:** ~100 PLN/miesiąc

---

## Wdrażanie

### UAT (automatyczne)
```bash
git push origin main  # Deploy uruchomi się automatycznie
```

### PRD (manualne)
```bash
gh workflow run deploy-prd.yml
```

### Weryfikacja
```bash
curl https://henio.app/api/health
# {"status":"ok","version":"1.0.39","commit":"..."}
```

---

## Konfiguracja Stripe (PRD)

### Aktualne wartości

| Element | Wartość |
|---------|---------|
| Produkt | Henio PRO (`prod_TiWa58JPu0rg1j`) |
| Cena miesięczna | 19,99 PLN (`price_1Sl5Wr07EywajbxhNr0DRQ9p`) |
| Cena roczna | 149,99 PLN (`price_1Sl5Y907Eywajbxh4kcmhZw8`) |
| Webhook | `https://henio.app/api/stripe/webhook` |

### Ustawienie sekretów w Azure
```bash
az webapp config appsettings set --name henio-prd --resource-group henio-rg --settings \
  "STRIPE_SECRET_KEY=sk_live_..." \
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_..." \
  "STRIPE_WEBHOOK_SECRET=whsec_..." \
  "STRIPE_PRO_MONTHLY_PRICE_ID=price_..." \
  "STRIPE_PRO_ANNUAL_PRICE_ID=price_..."
```

**UWAGA:** Puste wartości Stripe powodują crash aplikacji (exit code 254).

---

## Konfiguracja Google OAuth

Authorized redirect URIs w [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
```
https://uat.henio.app/api/auth/callback/google
https://henio.app/api/auth/callback/google
```

---

## Konfiguracja DNS (OVH)

```
CNAME  uat.henio.app  ->  henio-uat.azurewebsites.net
A      henio.app      ->  20.215.12.2
```

---

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret dla NextAuth |
| `NEXTAUTH_URL` | URL aplikacji (https://henio.app) |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth credentials |
| `GEMINI_API_KEY` | API key dla AI |
| `STRIPE_*` | Klucze Stripe (patrz wyżej) |
| `ADMIN_EMAILS` | Lista adminów |
| `ALLOWLIST_EMAILS` | Lista dozwolonych (puste = wszyscy) |
| `SMTP_HOST` | Host SMTP (ssl0.ovh.net) |
| `SMTP_PORT` | Port SMTP (465) |
| `SMTP_USER` | Użytkownik SMTP (noreply@henio.app) |
| `SMTP_PASS` | Hasło SMTP |
| `SMTP_FROM` | Adres nadawcy (`Henio <noreply@henio.app>`) |
| `WAITLIST_CRON_SECRET` | Secret dla cron auto-approve (GitHub Actions) |

---

## Troubleshooting

### Aplikacja nie startuje (exit code 254)
```bash
# Sprawdź logi
az webapp log download --name henio-prd --resource-group henio-rg --log-file /tmp/logs.zip

# Sprawdź zmienne Stripe
az webapp config appsettings list --name henio-prd --resource-group henio-rg | grep STRIPE

# Restart
az webapp restart --name henio-prd --resource-group henio-rg
```

### OAuth error (`redirect_uri_mismatch`)
Dodaj brakujące URIs w Google Cloud Console.

### Health check fails
```bash
az webapp log tail --name henio-prd --resource-group henio-rg
```
