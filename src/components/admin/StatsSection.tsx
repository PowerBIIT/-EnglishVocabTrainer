'use client';

import { Toast } from '@/components/ui/Toast';
import type { AdminStats } from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StatsSectionProps = {
  stats: AdminStats | null;
  loading: boolean;
  error?: string | null;
};

const statsCopy = {
  pl: {
    title: 'Statystyki',
    periodLabel: (period: string) => `Aktualny okres: ${period}`,
    loading: 'Ładowanie statystyk...',
    empty: 'Brak statystyk.',
    active: 'Aktywni',
    waitlisted: 'Oczekujący',
    suspended: 'Zawieszeni',
    globalUsage: 'Globalne użycie AI',
    requests: 'Zapytania',
    units: 'Jednostki',
    estimatedCost: 'Szacowany koszt',
    estimatedMonthly: 'Szacowany miesięcznie',
    projectedEnd: 'Prognoza na koniec miesiąca',
    planUsage: 'Użycie planów',
    topUsers: 'Top użytkownicy (jednostki)',
    topUsersEmpty: 'Brak użycia AI.',
    planBreakdown: 'Podział planów',
    planBreakdownEmpty: 'Brak danych podziału planów.',
  },
  en: {
    title: 'Statistics',
    periodLabel: (period: string) => `Current period: ${period}`,
    loading: 'Loading statistics...',
    empty: 'No stats available.',
    active: 'Active',
    waitlisted: 'Waitlisted',
    suspended: 'Suspended',
    globalUsage: 'Global AI usage',
    requests: 'Requests',
    units: 'Units',
    estimatedCost: 'Estimated cost',
    estimatedMonthly: 'Estimated monthly',
    projectedEnd: 'Projected end-of-month',
    planUsage: 'Plan usage',
    topUsers: 'Top users (units)',
    topUsersEmpty: 'No AI usage yet.',
    planBreakdown: 'Plan breakdown',
    planBreakdownEmpty: 'No plan breakdown data.',
  },
} as const;

export function StatsSection({ stats, loading, error }: StatsSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? statsCopy.pl : statsCopy.en;
  const locale = language === 'pl' ? 'pl-PL' : 'en-US';
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const formatUsd = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);

  if (loading && !stats) {
    return <div className="text-sm text-slate-500">{t.loading}</div>;
  }

  if (error) {
    return <Toast variant="error" message={error} />;
  }

  if (!stats) {
    return <div className="text-sm text-slate-500">{t.empty}</div>;
  }

  const usage = stats.aiUsage.global;

  const ratio = (value: number, max: number) => {
    if (!Number.isFinite(max) || max === 0) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.periodLabel(stats.meta.period)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: t.active, value: stats.users.active },
          { label: t.waitlisted, value: stats.users.waitlisted },
          { label: t.suspended, value: stats.users.suspended },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{t.globalUsage}</p>
            <span className="text-xs text-slate-400">
              {formatNumber(usage.count)} {t.requests} · {formatNumber(usage.units)} {t.units}
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{t.requests}</span>
                <span>
                  {formatNumber(usage.count)} /{' '}
                  {Number.isFinite(usage.maxRequests)
                    ? formatNumber(usage.maxRequests)
                    : '∞'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-primary-500"
                  style={{ width: `${ratio(usage.count, usage.maxRequests)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{t.units}</span>
                <span>
                  {formatNumber(usage.units)} /{' '}
                  {Number.isFinite(usage.maxUnits) ? formatNumber(usage.maxUnits) : '∞'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-primary-500"
                  style={{ width: `${ratio(usage.units, usage.maxUnits)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 space-y-3">
          <p className="text-sm text-slate-500">{t.estimatedCost}</p>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{t.estimatedMonthly}</span>
              <span className="font-semibold">{formatUsd(stats.costs.estimatedMonthly)}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{t.projectedEnd}</span>
              <span className="font-semibold">{formatUsd(stats.costs.projectedEndOfMonth)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-sm text-slate-500">{t.planUsage}</p>
          <div className="mt-3 space-y-2">
            {stats.aiUsage.byPlan.map((plan) => (
              <div key={plan.plan} className="space-y-1">
                <div className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <span>{plan.plan}</span>
                  <span>
                    {formatNumber(plan.count)} {t.requests} · {formatNumber(plan.units)} {t.units}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn('h-1.5 rounded-full', plan.plan === 'PRO' ? 'bg-amber-500' : 'bg-primary-500')}
                    style={{ width: `${ratio(plan.units, plan.maxUnits)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-sm text-slate-500">{t.topUsers}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {stats.aiUsage.topUsers.length === 0 ? (
              <div>{t.topUsersEmpty}</div>
            ) : (
              stats.aiUsage.topUsers.map((user) => (
                <div
                  key={user.email}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="break-all sm:break-normal">{user.email}</span>
                  <span className="font-semibold">{formatNumber(user.units)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-sm text-slate-500">{t.planBreakdown}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {stats.users.planBreakdown.length === 0 ? (
              <div>{t.planBreakdownEmpty}</div>
            ) : (
              stats.users.planBreakdown.map((entry) => (
                <div
                  key={`${entry.plan}-${entry.accessStatus}`}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {entry.plan} · {entry.accessStatus}
                  </span>
                  <span className="font-semibold">{formatNumber(entry.count)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
