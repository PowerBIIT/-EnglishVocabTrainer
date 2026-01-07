'use client';

import { useEffect, useMemo, useState } from 'react';
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

const configFieldCopyPl: Record<string, { label: string; description: string }> = {
  MAX_ACTIVE_USERS: {
    label: 'Maks. aktywni użytkownicy',
    description:
      'Limituje liczbę użytkowników z dostępem ACTIVE jednocześnie. Pomaga kontrolować obciążenie i koszty; admini/VIP omijają limit, a aktywni nie tracą dostępu.',
  },
  FREE_AI_REQUESTS_PER_MONTH: {
    label: 'FREE zapytania/miesiąc',
    description:
      'Miesięczny limit zapytań AI dla planu FREE. Kontroluje darmowe użycie i koszty; reset co miesiąc (UTC).',
  },
  FREE_AI_UNITS_PER_MONTH: {
    label: 'FREE tokeny/miesiąc',
    description:
      'Miesięczny limit tokenów (units) dla planu FREE. Ogranicza kosztowne użycie; reset co miesiąc (UTC).',
  },
  PRO_AI_REQUESTS_PER_MONTH: {
    label: 'PRO zapytania/miesiąc',
    description:
      'Miesięczny limit zapytań AI dla planu PRO. Chroni przed nadmiernym użyciem i kosztem; reset co miesiąc (UTC).',
  },
  PRO_AI_UNITS_PER_MONTH: {
    label: 'PRO tokeny/miesiąc',
    description:
      'Miesięczny limit tokenów (units) dla planu PRO. Pilnuje kosztów; reset co miesiąc (UTC).',
  },
  GLOBAL_AI_REQUESTS_PER_MONTH: {
    label: 'Globalne zapytania/miesiąc',
    description:
      'Globalny limit miesięcznych zapytań dla wszystkich użytkowników. Chroni system i koszty; po przekroczeniu AI jest blokowane do resetu.',
  },
  GLOBAL_AI_UNITS_PER_MONTH: {
    label: 'Globalne tokeny/miesiąc',
    description:
      'Globalny limit miesięcznych tokenów dla wszystkich użytkowników. Chroni koszty; po przekroczeniu AI jest blokowane do resetu.',
  },
  AI_COST_ALERT_THRESHOLD_USD: {
    label: 'Próg alertu kosztów AI (USD)',
    description:
      'Wysyła alert, gdy miesięczny koszt AI (faktyczny lub prognozowany) osiąga tę kwotę. Wczesne ostrzeżenie budżetowe.',
  },
  AI_COST_HARD_LIMIT_USD: {
    label: 'Twardy limit kosztów AI (USD)',
    description:
      'Blokuje wszystkie żądania AI po osiągnięciu tej kwoty (także adminów). Ustaw 0 lub unlimited, aby wyłączyć.',
  },
  AI_COST_ALERT_CHECK_INTERVAL_MINUTES: {
    label: 'Interwał sprawdzania alertu (min)',
    description:
      'Minimalna liczba minut między sprawdzeniami alertu kosztów. Większa wartość zmniejsza liczbę alertów i odczytów DB; 0 = każde żądanie.',
  },
  AI_COST_ALERT_WEBHOOK_URL: {
    label: 'Webhook alertu kosztów AI',
    description:
      'Opcjonalny webhook do odbioru alertów kosztowych w JSON. Zostaw puste, aby wyłączyć.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD: {
    label: 'Próg alertu cleanupu email',
    description:
      'Minimalna liczba usunięć w jednym cleanupie, która wyzwala alert. Pomaga wykryć nietypowe skoki.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER: {
    label: 'Mnożnik skoku cleanupu',
    description:
      'Alert, gdy usunięcia przekroczą średnią bazową x ten mnożnik. Do wykrywania nagłych wzrostów.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW: {
    label: 'Okno bazowe cleanupu',
    description:
      'Liczba ostatnich cleanupów używana do średniej bazowej. Większe okno wygładza szum.',
  },
  EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS: {
    label: 'Cooldown alertu cleanupu (h)',
    description:
      'Minimalna liczba godzin między alertami cleanupu. Zapobiega spamowi podczas burstów.',
  },
  ALLOWLIST_EMAILS: {
    label: 'VIP emaile (omijają limit)',
    description:
      'VIP emaile omijają limit MAX_ACTIVE_USERS. Przydatne dla wewnętrznych/testowych kont; nie omija twardego limitu kosztów.',
  },
  STRIPE_PRO_MONTHLY_PRICE_ID: {
    label: 'Stripe Price ID - PRO miesięczny',
    description:
      'ID ceny Stripe używane w checkout dla PRO miesięcznego. Zmień po aktualizacji ceny w Stripe.',
  },
  STRIPE_PRO_ANNUAL_PRICE_ID: {
    label: 'Stripe Price ID - PRO roczny',
    description:
      'ID ceny Stripe używane w checkout dla PRO rocznego. Zmień po aktualizacji ceny w Stripe.',
  },
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
            const localized = language === 'pl' ? configFieldCopyPl[item.key] : null;
            const label = localized?.label ?? item.label;
            const description = localized?.description ?? item.description;
            return (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {label}
                    </p>
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
