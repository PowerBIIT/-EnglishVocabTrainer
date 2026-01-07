'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import type { AdminConfigItem } from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';

type ConfigSectionProps = {
  config: AdminConfigItem[];
  loading: boolean;
  error?: string | null;
  onSave: (updates: { key: string; value: string }[]) => Promise<void>;
};

const configCopy = {
  pl: {
    title: 'Konfiguracja',
    description:
      'Aktualizuj limity aplikacji i allowlistę. Puste pole przywraca env/domyślne.',
    save: 'Zapisz zmiany',
    saving: 'Zapisywanie...',
    toastSaved: 'Konfiguracja zapisana.',
    toastFailed: 'Nie udało się zapisać konfiguracji.',
    loading: 'Ładowanie konfiguracji...',
  },
  en: {
    title: 'Configuration',
    description:
      'Update application limits and allowlist. Empty value resets to env/default.',
    save: 'Save changes',
    saving: 'Saving...',
    toastSaved: 'Configuration saved.',
    toastFailed: 'Failed to save configuration.',
    loading: 'Loading configuration...',
  },
} as const;

type ConfigFieldCopy = {
  label: string;
  description: string;
  tooltip: string;
};

const configFieldCopyPl: Record<string, ConfigFieldCopy> = {
  MAX_ACTIVE_USERS: {
    label: 'Maks. aktywni użytkownicy',
    description:
      'Limituje liczbę użytkowników z dostępem ACTIVE jednocześnie. Pomaga kontrolować obciążenie i koszty; admini/VIP omijają limit, a aktywni nie tracą dostępu.',
    tooltip:
      'Określa maksymalną liczbę kont z dostępem ACTIVE naraz.\n' +
      'Gdy limit jest osiągnięty, nowe konta trafiają na WAITLIST (aktywni nie tracą dostępu).\n' +
      'VIP z ALLOWLIST_EMAILS oraz admini omijają limit.\n' +
      'Ustaw "unlimited", aby zdjąć limit; wartość 0 także go wyłącza.',
  },
  FREE_AI_REQUESTS_PER_MONTH: {
    label: 'FREE zapytania/miesiąc',
    description:
      'Miesięczny limit zapytań AI dla planu FREE. Kontroluje darmowe użycie i koszty; reset co miesiąc (UTC).',
    tooltip:
      'Limit liczby wywołań AI na planie FREE (liczy każde żądanie do modeli).\n' +
      'Po przekroczeniu limitu AI dla tego użytkownika jest blokowane do końca okresu.\n' +
      'Reset następuje 1. dnia miesiąca (UTC).\n' +
      'To inny limit niż tokeny (units).',
  },
  FREE_AI_UNITS_PER_MONTH: {
    label: 'FREE tokeny/miesiąc',
    description:
      'Miesięczny limit tokenów (units) dla planu FREE. Ogranicza kosztowne użycie; reset co miesiąc (UTC).',
    tooltip:
      'Limit tokenów (units) dla planu FREE.\n' +
      'Tokeny to koszt odpowiedzi — dłuższe odpowiedzi zużywają więcej.\n' +
      'Po przekroczeniu limitu AI jest blokowane do resetu miesiąca (UTC).',
  },
  PRO_AI_REQUESTS_PER_MONTH: {
    label: 'PRO zapytania/miesiąc',
    description:
      'Miesięczny limit zapytań AI dla planu PRO. Chroni przed nadmiernym użyciem i kosztem; reset co miesiąc (UTC).',
    tooltip:
      'Limit liczby wywołań AI dla planu PRO.\n' +
      'Działa niezależnie od limitu tokenów.\n' +
      'Po przekroczeniu AI jest blokowane do resetu miesiąca (UTC).\n' +
      'Globalne limity mogą zablokować AI wcześniej.',
  },
  PRO_AI_UNITS_PER_MONTH: {
    label: 'PRO tokeny/miesiąc',
    description:
      'Miesięczny limit tokenów (units) dla planu PRO. Pilnuje kosztów; reset co miesiąc (UTC).',
    tooltip:
      'Limit tokenów (units) dla planu PRO.\n' +
      'Tokeny odzwierciedlają koszt odpowiedzi i kontekstu.\n' +
      'Po przekroczeniu limitu AI jest blokowane do końca miesiąca (UTC).',
  },
  GLOBAL_AI_REQUESTS_PER_MONTH: {
    label: 'Globalne zapytania/miesiąc',
    description:
      'Globalny limit miesięcznych zapytań dla wszystkich użytkowników. Chroni system i koszty; po przekroczeniu AI jest blokowane do resetu.',
    tooltip:
      'Globalny limit liczby żądań AI dla wszystkich użytkowników łącznie.\n' +
      'Po przekroczeniu AI blokuje się dla wszystkich planów do resetu miesiąca (UTC).\n' +
      'Użyj, gdy chcesz twardo ograniczyć ruch niezależnie od planów.',
  },
  GLOBAL_AI_UNITS_PER_MONTH: {
    label: 'Globalne tokeny/miesiąc',
    description:
      'Globalny limit miesięcznych tokenów dla wszystkich użytkowników. Chroni koszty; po przekroczeniu AI jest blokowane do resetu.',
    tooltip:
      'Globalny limit tokenów dla wszystkich użytkowników łącznie.\n' +
      'Po przekroczeniu AI blokuje się dla wszystkich planów do resetu miesiąca (UTC).\n' +
      'Działa niezależnie od limitu zapytań.',
  },
  AI_COST_ALERT_THRESHOLD_USD: {
    label: 'Próg alertu kosztów AI (USD)',
    description:
      'Wysyła alert, gdy miesięczny koszt AI (faktyczny lub prognozowany) osiąga tę kwotę. Wczesne ostrzeżenie budżetowe.',
    tooltip:
      'Próg informacyjny — wysyła alert email i/lub webhook.\n' +
      'Alert uruchamia się, gdy koszt faktyczny lub prognozowany przekroczy próg.\n' +
      'Nie blokuje AI.\n' +
      '0 lub puste pole = wyłączone.',
  },
  AI_COST_HARD_LIMIT_USD: {
    label: 'Twardy limit kosztów AI (USD)',
    description:
      'Blokuje wszystkie żądania AI po osiągnięciu tej kwoty (także adminów). Ustaw 0 lub unlimited, aby wyłączyć.',
    tooltip:
      'Bezpiecznik kosztów — po przekroczeniu AI blokuje się dla wszystkich (także adminów).\n' +
      'Blokada trwa do końca bieżącego miesiąca rozliczeniowego (UTC).\n' +
      '0 lub puste pole = brak twardego limitu.',
  },
  AI_COST_ALERT_CHECK_INTERVAL_MINUTES: {
    label: 'Interwał sprawdzania alertu (min)',
    description:
      'Minimalna liczba minut między sprawdzeniami alertu kosztów. Większa wartość zmniejsza liczbę alertów i odczytów DB; 0 = każde żądanie.',
    tooltip:
      'Minimalny odstęp między sprawdzeniami kosztów.\n' +
      '0 = sprawdzaj przy każdym żądaniu AI.\n' +
      'Zbyt niska wartość zwiększa liczbę odczytów DB i alertów.',
  },
  AI_COST_ALERT_WEBHOOK_URL: {
    label: 'Webhook alertu kosztów AI',
    description:
      'Opcjonalny webhook do odbioru alertów kosztowych w JSON. Zostaw puste, aby wyłączyć.',
    tooltip:
      'Opcjonalny adres webhooka (HTTP POST z JSON).\n' +
      'Wysyłany razem z mailem, jeśli skonfigurowany.\n' +
      'Pozostaw puste, aby wyłączyć webhook.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD: {
    label: 'Próg alertu cleanupu email',
    description:
      'Minimalna liczba usunięć w jednym cleanupie, która wyzwala alert. Pomaga wykryć nietypowe skoki.',
    tooltip:
      'Alert email, gdy w jednym przebiegu cleanupu usunięto co najmniej tyle kont.\n' +
      'Finalny próg to max(z tego pola, średnia * mnożnik).\n' +
      '0 = brak alertów progowych.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER: {
    label: 'Mnożnik skoku cleanupu',
    description:
      'Alert, gdy usunięcia przekroczą średnią bazową x ten mnożnik. Do wykrywania nagłych wzrostów.',
    tooltip:
      'Wykrywanie skoków: jeśli liczba usunięć > średnia z ostatnich N przebiegów * mnożnik.\n' +
      'N pochodzi z pola "Okno bazowe cleanupu".\n' +
      'Ustaw >= 1.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW: {
    label: 'Okno bazowe cleanupu',
    description:
      'Liczba ostatnich cleanupów używana do średniej bazowej. Większe okno wygładza szum.',
    tooltip:
      'Rozmiar okna do obliczenia średniej bazowej usunięć (liczba ostatnich przebiegów).\n' +
      'Większe okno = mniej wahań, ale wolniejsza reakcja.\n' +
      'Minimum 1.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS: {
    label: 'Cooldown alertu cleanupu (h)',
    description:
      'Minimalna liczba godzin między alertami cleanupu. Zapobiega spamowi podczas burstów.',
    tooltip:
      'Minimalny czas między alertami cleanupu.\n' +
      'Chroni przed spamem w przypadku serii dużych cleanupów.\n' +
      '0 = bez cooldownu.',
  },
  ALLOWLIST_EMAILS: {
    label: 'VIP emaile (omijają limit)',
    description:
      'VIP emaile omijają limit MAX_ACTIVE_USERS. Przydatne dla wewnętrznych/testowych kont; nie omija twardego limitu kosztów.',
    tooltip:
      'Adresy e-mail z priorytetowym dostępem (omijają MAX_ACTIVE_USERS).\n' +
      'Wpisuj po jednym na linię lub oddzielaj spacją, przecinkiem albo średnikiem.\n' +
      'Nie omija twardego limitu kosztów AI.',
  },
  STRIPE_PRO_MONTHLY_PRICE_ID: {
    label: 'Stripe Price ID - PRO miesięczny',
    description:
      'ID ceny Stripe używane w checkout dla PRO miesięcznego. Zmień po aktualizacji ceny w Stripe.',
    tooltip:
      'ID ceny Stripe (np. price_...) używane w checkout dla PRO miesięcznego.\n' +
      'Zmiana nie wpływa na istniejące subskrypcje — tylko nowe zakupy/odnowienia.\n' +
      'Upewnij się, że ID pochodzi z trybu live.',
  },
  STRIPE_PRO_ANNUAL_PRICE_ID: {
    label: 'Stripe Price ID - PRO roczny',
    description:
      'ID ceny Stripe używane w checkout dla PRO rocznego. Zmień po aktualizacji ceny w Stripe.',
    tooltip:
      'ID ceny Stripe (np. price_...) używane w checkout dla PRO rocznego.\n' +
      'Zmiana nie wpływa na istniejące subskrypcje — tylko nowe zakupy/odnowienia.\n' +
      'Upewnij się, że ID pochodzi z trybu live.',
  },
};

const configFieldCopyEn: Record<string, ConfigFieldCopy> = {
  MAX_ACTIVE_USERS: {
    label: 'Max active users',
    description:
      'Caps how many users can be ACTIVE at once. Helps control load and cost; admins/VIP bypass it and existing active users keep access.',
    tooltip:
      'Sets the maximum number of ACTIVE accounts at the same time.\n' +
      'When the limit is reached, new accounts go to the WAITLIST (active users keep access).\n' +
      'VIPs from ALLOWLIST_EMAILS and admins bypass the cap.\n' +
      'Use "unlimited" to remove the cap; value 0 also disables it.',
  },
  FREE_AI_REQUESTS_PER_MONTH: {
    label: 'FREE requests/month',
    description:
      'Monthly AI request quota for FREE plan. Controls free usage and cost; resets monthly (UTC).',
    tooltip:
      'Limit of AI calls on the FREE plan (counts each request to the models).\n' +
      'After hitting the limit, AI is blocked for that user until period reset.\n' +
      'Resets on the 1st day of the month (UTC).\n' +
      'This is different from the token (units) limit.',
  },
  FREE_AI_UNITS_PER_MONTH: {
    label: 'FREE tokens/month',
    description:
      'Monthly token (unit) quota for FREE plan. Controls cost-heavy usage; resets monthly (UTC).',
    tooltip:
      'Token (unit) limit for the FREE plan.\n' +
      'Tokens represent response cost — longer outputs use more.\n' +
      'After hitting the limit, AI is blocked until month reset (UTC).',
  },
  PRO_AI_REQUESTS_PER_MONTH: {
    label: 'PRO requests/month',
    description:
      'Monthly AI request quota for PRO plan. Prevents runaway usage and protects infrastructure; resets monthly (UTC).',
    tooltip:
      'AI call limit for the PRO plan.\n' +
      'Independent from the token limit.\n' +
      'After hitting the limit, AI is blocked until month reset (UTC).\n' +
      'Global limits can block AI earlier.',
  },
  PRO_AI_UNITS_PER_MONTH: {
    label: 'PRO tokens/month',
    description:
      'Monthly token (unit) quota for PRO plan. Protects cost ceiling; resets monthly (UTC).',
    tooltip:
      'Token (unit) limit for the PRO plan.\n' +
      'Tokens track response/context cost.\n' +
      'After hitting the limit, AI is blocked until month reset (UTC).',
  },
  GLOBAL_AI_REQUESTS_PER_MONTH: {
    label: 'Global requests/month',
    description:
      'Global monthly request cap across all users. Protects system-wide load/cost; when exceeded, AI is blocked for everyone until reset.',
    tooltip:
      'Global limit of AI requests across all users combined.\n' +
      'When exceeded, AI is blocked for all plans until the monthly reset (UTC).\n' +
      'Use this to enforce a hard overall traffic cap.',
  },
  GLOBAL_AI_UNITS_PER_MONTH: {
    label: 'Global tokens/month',
    description:
      'Global monthly token cap across all users. Protects system-wide cost; when exceeded, AI is blocked for everyone until reset.',
    tooltip:
      'Global token limit across all users combined.\n' +
      'When exceeded, AI is blocked for all plans until the monthly reset (UTC).\n' +
      'Independent from the request limit.',
  },
  AI_COST_ALERT_THRESHOLD_USD: {
    label: 'AI cost alert threshold (USD)',
    description:
      'Send alert when actual or projected monthly AI cost reaches this USD amount. Early warning for budget control.',
    tooltip:
      'Informational threshold — sends email and/or webhook alerts.\n' +
      'Triggers when actual or projected cost exceeds the threshold.\n' +
      'Does not block AI.\n' +
      '0 or empty = disabled.',
  },
  AI_COST_HARD_LIMIT_USD: {
    label: 'AI cost hard limit (USD)',
    description:
      'Hard stop for all AI requests once monthly cost reaches this USD amount (including admins). Use 0 or unlimited to disable.',
    tooltip:
      'Cost safety stop — once reached, AI is blocked for everyone (including admins).\n' +
      'Block lasts until the current monthly billing period resets (UTC).\n' +
      '0 or empty = no hard limit.',
  },
  AI_COST_ALERT_CHECK_INTERVAL_MINUTES: {
    label: 'AI cost alert check interval (minutes)',
    description:
      'Minimum minutes between cost alert checks. Higher values reduce alert noise and DB reads; 0 checks every request.',
    tooltip:
      'Minimum time between cost checks.\n' +
      '0 = check on every AI request.\n' +
      'Too low increases DB reads and alert noise.',
  },
  AI_COST_ALERT_WEBHOOK_URL: {
    label: 'AI cost alert webhook URL',
    description: 'Optional webhook URL to receive AI cost alerts as JSON. Leave empty to disable.',
    tooltip:
      'Optional webhook endpoint (HTTP POST with JSON payload).\n' +
      'Sent in addition to email when configured.\n' +
      'Leave empty to disable the webhook.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD: {
    label: 'Email cleanup alert threshold',
    description:
      'Minimum deletions in one cleanup run to trigger an alert. Helps catch unusual spikes.',
    tooltip:
      'Email alert when a single cleanup deletes at least this many accounts.\n' +
      'Final threshold is max(this value, average * multiplier).\n' +
      '0 = no threshold-based alerts.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER: {
    label: 'Email cleanup spike multiplier',
    description:
      'Alert when deletions exceed baseline average by this multiplier. Use to detect sudden surges.',
    tooltip:
      'Spike detection: alert when deletions > average of last N runs * multiplier.\n' +
      'N comes from the "baseline window" setting.\n' +
      'Set >= 1.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW: {
    label: 'Email cleanup baseline window',
    description:
      'Number of recent cleanup runs used for baseline average. Larger window smooths noise.',
    tooltip:
      'Window size for the baseline average (number of recent runs).\n' +
      'Larger window = less noise, slower reaction.\n' +
      'Minimum 1.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS: {
    label: 'Email cleanup alert cooldown (hours)',
    description: 'Minimum hours between cleanup alerts. Prevents repeated notifications during bursts.',
    tooltip:
      'Minimum time between cleanup alerts.\n' +
      'Prevents alert spam during bursts.\n' +
      '0 = no cooldown.',
  },
  ALLOWLIST_EMAILS: {
    label: 'VIP emails (bypass limit)',
    description:
      'VIP emails that bypass MAX_ACTIVE_USERS capacity gate. Useful for internal/test access; does not bypass AI cost hard limit.',
    tooltip:
      'Email addresses with priority access (bypass MAX_ACTIVE_USERS).\n' +
      'Separate by new line, space, comma, or semicolon.\n' +
      'Does not bypass the AI cost hard limit.',
  },
  STRIPE_PRO_MONTHLY_PRICE_ID: {
    label: 'Stripe Monthly Price ID',
    description: 'Stripe Price ID used for the PRO monthly checkout. Update when you change the live price.',
    tooltip:
      'Stripe Price ID (e.g., price_...) used in checkout for PRO monthly.\n' +
      'Changing it does not affect existing subscriptions — only new purchases/renewals.\n' +
      'Make sure the ID is from live mode.',
  },
  STRIPE_PRO_ANNUAL_PRICE_ID: {
    label: 'Stripe Annual Price ID',
    description: 'Stripe Price ID used for the PRO annual checkout. Update when you change the live price.',
    tooltip:
      'Stripe Price ID (e.g., price_...) used in checkout for PRO annual.\n' +
      'Changing it does not affect existing subscriptions — only new purchases/renewals.\n' +
      'Make sure the ID is from live mode.',
  },
};

type InfoTooltipProps = {
  content: string;
  label: string;
};

const InfoTooltip = ({ content, label }: InfoTooltipProps) => {
  const id = useId();
  if (!content) return null;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="group inline-flex items-center justify-center rounded-full text-slate-400 transition hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
      >
        <Info size={14} aria-hidden="true" />
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs leading-snug text-white shadow-lg opacity-0 translate-y-1 whitespace-pre-line transition group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0 dark:bg-slate-800"
        >
          {content}
        </span>
      </button>
    </span>
  );
};

export function ConfigSection({ config, loading, error, onSave }: ConfigSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? configCopy.pl : configCopy.en;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    config.forEach((item) => {
      // Don't overwrite drafts for keys that are pending save
      if (pendingKeys.has(item.key)) {
        nextDrafts[item.key] = drafts[item.key] ?? item.value;
      } else {
        nextDrafts[item.key] = item.value;
      }
    });
    setDrafts(nextDrafts);
    // Clear pending keys after config is updated
    if (pendingKeys.size > 0) {
      setPendingKeys(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const updates = useMemo(
    () =>
      config
        .filter((item) => drafts[item.key] !== item.value)
        .map((item) => ({ key: item.key, value: drafts[item.key] ?? '' })),
    [config, drafts]
  );

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    // Mark keys as pending so they won't be overwritten during reload
    setPendingKeys(new Set(updates.map((u) => u.key)));
    try {
      await onSave(updates);
      setToast({ type: 'success', message: t.toastSaved });
    } catch (saveError) {
      setPendingKeys(new Set());
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : t.toastFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const sourceVariant = (source: AdminConfigItem['source']) => {
    if (source === 'db') return 'info';
    if (source === 'env') return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.description}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || updates.length === 0 || loading}
          className="w-full sm:w-auto"
        >
          {saving ? t.saving : t.save}
        </Button>
      </div>

      {toast && (
        <Toast
          variant={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {error && <Toast variant="error" message={error} />}

      <div className="space-y-4">
        {loading && config.length === 0 ? (
          <div className="text-sm text-slate-500">{t.loading}</div>
        ) : (
          config.map((item) => {
            const localized =
              (language === 'pl' ? configFieldCopyPl : configFieldCopyEn)[item.key] ?? null;
            const label = localized?.label ?? item.label;
            const description = localized?.description ?? item.description;
            const tooltip = localized?.tooltip ?? description;
            const tooltipLabel =
              language === 'pl' ? `Wyjaśnienie: ${label}` : `Explanation: ${label}`;
            return (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {label}
                      </p>
                      {tooltip ? (
                        <InfoTooltip content={tooltip} label={tooltipLabel} />
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {description}
                    </p>
                  </div>
                  <Badge variant={sourceVariant(item.source)}>{item.source}</Badge>
                </div>
                <div className="mt-3">
                {item.dataType === 'list' ? (
                  <textarea
                    value={drafts[item.key] ?? ''}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [item.key]: event.target.value }))
                    }
                    placeholder={item.defaultValue}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                ) : (
                  <Input
                    value={drafts[item.key] ?? ''}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [item.key]: event.target.value }))
                    }
                    placeholder={item.defaultValue}
                  />
                )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
