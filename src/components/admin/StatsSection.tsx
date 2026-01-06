'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import type {
  ActiveUserUsageQuery,
  ActiveUserUsageResponse,
  AdminStats,
  RevenueStats,
} from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StatsSectionProps = {
  stats: AdminStats | null;
  loading: boolean;
  error?: string | null;
  activeUsage?: ActiveUserUsageResponse | null;
  activeUsageLoading?: boolean;
  activeUsageError?: string | null;
  activeUsageQuery?: ActiveUserUsageQuery;
  onActiveUsageQueryChange?: (nextQuery: ActiveUserUsageQuery) => void;
  onExportActiveUsage?: (search?: string) => void;
  onOpenUser?: (user: { id: string; email: string | null; name: string | null }) => void;
  revenueStats?: RevenueStats | null;
  revenueLoading?: boolean;
  revenueError?: string | null;
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
    units: 'Tokeny',
    actualCost: 'Koszt rzeczywisty',
    monthToDate: 'Od początku miesiąca',
    projectedEnd: 'Prognoza na koniec miesiąca',
    planUsage: 'Użycie planów',
    topUsers: 'Top użytkownicy (tokeny)',
    topUsersEmpty: 'Brak użycia AI.',
    planBreakdown: 'Podział planów',
    planBreakdownEmpty: 'Brak danych podziału planów.',
    activeUsage: 'Użycie aktywnych użytkowników',
    activeUsageSubtitle: (shown: number, total: number) =>
      `Wyświetlono ${shown} z ${total} aktywnych użytkowników`,
    activeUsageLoading: 'Ładowanie użycia aktywnych użytkowników...',
    activeUsageEmpty: 'Brak aktywnych użytkowników.',
    activeUsageUnknown: 'Nieznany',
    activeUsageColumns: {
      user: 'Użytkownik',
      plan: 'Plan',
      requestsUsed: 'Zapytania użyte',
      requestsRemaining: 'Zapytania pozostałe',
      tokensUsed: 'Tokeny użyte',
      tokensRemaining: 'Tokeny pozostałe',
      actions: 'Akcje',
    },
    activeUsageSearch: 'Szukaj po emailu lub imieniu',
    activeUsageExport: 'Eksport CSV',
    activeUsageManage: 'Zarządzaj',
    activeUsagePageLabel: (page: number, totalPages: number, total: number) =>
      `Strona ${page} z ${totalPages} · ${total} użytkowników`,
    activeUsageRowsLabel: 'Wiersze',
    activeUsagePrev: 'Poprzednia',
    activeUsageNext: 'Następna',
    // Revenue
    revenueTitle: 'Przychody',
    mrr: 'MRR',
    arr: 'ARR',
    activeSubscribers: 'Aktywni subskrybenci',
    trialSubscribers: 'W trial',
    trialConversion: 'Konwersja trial',
    churnRate: 'Churn rate',
    revenueByPeriod: 'Przychody wg okresu',
    newSubscribers: 'Nowi',
    canceledSubscribers: 'Anulowani',
    activeAtEnd: 'Aktywni',
    noRevenue: 'Brak danych przychodów.',
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
    units: 'Tokens',
    actualCost: 'Actual cost',
    monthToDate: 'Month-to-date',
    projectedEnd: 'Projected end-of-month',
    planUsage: 'Plan usage',
    topUsers: 'Top users (tokens)',
    topUsersEmpty: 'No AI usage yet.',
    planBreakdown: 'Plan breakdown',
    planBreakdownEmpty: 'No plan breakdown data.',
    activeUsage: 'Active user usage',
    activeUsageSubtitle: (shown: number, total: number) =>
      `Showing ${shown} of ${total} active users`,
    activeUsageLoading: 'Loading active user usage...',
    activeUsageEmpty: 'No active users.',
    activeUsageUnknown: 'Unknown',
    activeUsageColumns: {
      user: 'User',
      plan: 'Plan',
      requestsUsed: 'Requests used',
      requestsRemaining: 'Requests remaining',
      tokensUsed: 'Tokens used',
      tokensRemaining: 'Tokens remaining',
      actions: 'Actions',
    },
    activeUsageSearch: 'Search by email or name',
    activeUsageExport: 'Export CSV',
    activeUsageManage: 'Manage',
    activeUsagePageLabel: (page: number, totalPages: number, total: number) =>
      `Page ${page} of ${totalPages} · ${total} users`,
    activeUsageRowsLabel: 'Rows',
    activeUsagePrev: 'Previous',
    activeUsageNext: 'Next',
    // Revenue
    revenueTitle: 'Revenue',
    mrr: 'MRR',
    arr: 'ARR',
    activeSubscribers: 'Active subscribers',
    trialSubscribers: 'In trial',
    trialConversion: 'Trial conversion',
    churnRate: 'Churn rate',
    revenueByPeriod: 'Revenue by period',
    newSubscribers: 'New',
    canceledSubscribers: 'Canceled',
    activeAtEnd: 'Active',
    noRevenue: 'No revenue data.',
  },
} as const;

export function StatsSection({
  stats,
  loading,
  error,
  activeUsage,
  activeUsageLoading,
  activeUsageError,
  activeUsageQuery,
  onActiveUsageQueryChange,
  onExportActiveUsage,
  onOpenUser,
  revenueStats,
  revenueLoading,
  revenueError,
}: StatsSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? statsCopy.pl : statsCopy.en;
  const locale = language === 'pl' ? 'pl-PL' : 'en-US';
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const formatRemaining = (value: number | null) =>
    value === null ? '∞' : formatNumber(value);
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
  const activeUsageData =
    activeUsage ??
    ({
      period: stats.meta.period,
      total: stats.aiUsage.activeUsers.total,
      page: 0,
      limit: stats.aiUsage.activeUsers.limit,
      items: stats.aiUsage.activeUsers.items,
    } satisfies ActiveUserUsageResponse);
  const activeQuery =
    activeUsageQuery ??
    ({
      page: activeUsageData.page,
      limit: activeUsageData.limit,
      search: '',
    } satisfies ActiveUserUsageQuery);
  const activeUsersShown = activeUsageData.items.length;
  const activeUsersTotal = activeUsageData.total;
  const activeUsersTotalPages = Math.max(
    1,
    Math.ceil(activeUsageData.total / Math.max(1, activeUsageData.limit))
  );
  const canUpdateActiveUsage = Boolean(onActiveUsageQueryChange);

  const ratio = (value: number, max: number) => {
    if (!Number.isFinite(max) || max === 0) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  };

  const getUserLabel = (email: string | null, name: string | null) =>
    email ?? name ?? t.activeUsageUnknown;
  const getUserSubLabel = (email: string | null, name: string | null) =>
    email && name ? name : null;
  const updateActiveUsage = (next: Partial<ActiveUserUsageQuery>) => {
    if (!onActiveUsageQueryChange) return;
    onActiveUsageQueryChange({ ...activeQuery, ...next });
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
          <p className="text-sm text-slate-500">{t.actualCost}</p>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{t.monthToDate}</span>
              <span className="font-semibold">{formatUsd(stats.costs.actualMonthToDate)}</span>
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

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-500">{t.activeUsage}</p>
            <span className="text-xs text-slate-400">
              {t.activeUsageSubtitle(activeUsersShown, activeUsersTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="min-w-[220px] sm:min-w-[260px]">
              <Input
                value={activeQuery.search}
                placeholder={t.activeUsageSearch}
                disabled={!canUpdateActiveUsage}
                onChange={(event) =>
                  updateActiveUsage({ search: event.target.value, page: 0 })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{t.activeUsageRowsLabel}</span>
              <Select
                value={String(activeQuery.limit)}
                disabled={!canUpdateActiveUsage}
                className="w-20"
                onChange={(event) =>
                  updateActiveUsage({ limit: Number(event.target.value), page: 0 })
                }
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onExportActiveUsage?.(activeQuery.search)}
              disabled={!onExportActiveUsage}
            >
              {t.activeUsageExport}
            </Button>
          </div>
        </div>

        {activeUsageError && <Toast variant="error" message={activeUsageError} />}

        {activeUsageLoading && activeUsageData.items.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">{t.activeUsageLoading}</div>
        ) : activeUsageData.items.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">{t.activeUsageEmpty}</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-2 py-1">{t.activeUsageColumns.user}</th>
                  <th className="px-2 py-1">{t.activeUsageColumns.plan}</th>
                  <th className="px-2 py-1 text-right">{t.activeUsageColumns.requestsUsed}</th>
                  <th className="px-2 py-1 text-right">
                    {t.activeUsageColumns.requestsRemaining}
                  </th>
                  <th className="px-2 py-1 text-right">{t.activeUsageColumns.tokensUsed}</th>
                  <th className="px-2 py-1 text-right">
                    {t.activeUsageColumns.tokensRemaining}
                  </th>
                  {onOpenUser && (
                    <th className="px-2 py-1 text-right">
                      {t.activeUsageColumns.actions}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {activeUsageData.items.map((user) => {
                  const userLabel = getUserLabel(user.email, user.name);
                  const subLabel = getUserSubLabel(user.email, user.name);
                  return (
                    <tr
                      key={user.id}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium break-all sm:break-normal">
                          {userLabel}
                        </div>
                        {subLabel && <div className="text-xs text-slate-400">{subLabel}</div>}
                      </td>
                      <td className="px-2 py-2">{user.plan}</td>
                      <td className="px-2 py-2 text-right">
                        {formatNumber(user.usage.count)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatRemaining(user.remaining.count)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatNumber(user.usage.units)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatRemaining(user.remaining.units)}
                      </td>
                      {onOpenUser && (
                        <td className="px-2 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onOpenUser({ id: user.id, email: user.email, name: user.name })
                            }
                          >
                            {t.activeUsageManage}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeUsageData.total > 0 && (
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t.activeUsagePageLabel(
                activeQuery.page + 1,
                activeUsersTotalPages,
                activeUsageData.total
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateActiveUsage({ page: Math.max(0, activeQuery.page - 1) })}
                disabled={!canUpdateActiveUsage || activeQuery.page === 0}
              >
                {t.activeUsagePrev}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateActiveUsage({
                    page: Math.min(activeUsersTotalPages - 1, activeQuery.page + 1),
                  })
                }
                disabled={
                  !canUpdateActiveUsage || activeQuery.page + 1 >= activeUsersTotalPages
                }
              >
                {t.activeUsageNext}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t.revenueTitle}
        </h3>

        {revenueError && <Toast variant="error" message={revenueError} />}

        {revenueLoading && !revenueStats ? (
          <div className="text-sm text-slate-500">{t.loading}</div>
        ) : !revenueStats ? (
          <div className="text-sm text-slate-500">{t.noRevenue}</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
                <p className="text-sm text-slate-500">{t.mrr}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {formatUsd(revenueStats.mrr / 100)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
                <p className="text-sm text-slate-500">{t.arr}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {formatUsd(revenueStats.arr / 100)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
                <p className="text-sm text-slate-500">{t.activeSubscribers}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {formatNumber(revenueStats.activeSubscribers)}
                </p>
                <p className="text-xs text-slate-400">
                  +{formatNumber(revenueStats.trialSubscribers)} {t.trialSubscribers}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
                <p className="text-sm text-slate-500">{t.trialConversion}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {revenueStats.trialConversionRate}%
                </p>
                <p className="text-xs text-slate-400">
                  {t.churnRate}: {revenueStats.churnRate}%
                </p>
              </div>
            </div>

            {revenueStats.revenueByPeriod.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
                <p className="text-sm text-slate-500 mb-3">{t.revenueByPeriod}</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="px-2 py-1">Period</th>
                        <th className="px-2 py-1 text-right">{t.newSubscribers}</th>
                        <th className="px-2 py-1 text-right">{t.canceledSubscribers}</th>
                        <th className="px-2 py-1 text-right">{t.activeAtEnd}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-200">
                      {revenueStats.revenueByPeriod.map((period) => (
                        <tr
                          key={period.period}
                          className="border-t border-slate-100 dark:border-slate-800"
                        >
                          <td className="px-2 py-2 font-medium">{period.period}</td>
                          <td className="px-2 py-2 text-right text-green-600">
                            +{period.newSubscribers}
                          </td>
                          <td className="px-2 py-2 text-right text-red-600">
                            -{period.canceledSubscribers}
                          </td>
                          <td className="px-2 py-2 text-right">{period.activeAtEnd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
