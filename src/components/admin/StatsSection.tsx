'use client';

import { Toast } from '@/components/ui/Toast';
import type { AdminStats } from '@/hooks/useAdminData';
import { cn } from '@/lib/utils';

type StatsSectionProps = {
  stats: AdminStats | null;
  loading: boolean;
  error?: string | null;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

export function StatsSection({ stats, loading, error }: StatsSectionProps) {
  if (loading && !stats) {
    return <div className="text-sm text-slate-500">Loading statistics...</div>;
  }

  if (error) {
    return <Toast variant="error" message={error} />;
  }

  if (!stats) {
    return <div className="text-sm text-slate-500">No stats available.</div>;
  }

  const usage = stats.aiUsage.global;

  const ratio = (value: number, max: number) => {
    if (!Number.isFinite(max) || max === 0) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Statistics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Current period: {stats.meta.period}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Active', value: stats.users.active },
          { label: 'Waitlisted', value: stats.users.waitlisted },
          { label: 'Suspended', value: stats.users.suspended },
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Global AI usage</p>
            <span className="text-xs text-slate-400">
              {formatNumber(usage.count)} requests · {formatNumber(usage.units)} units
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Requests</span>
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
                <span>Units</span>
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
          <p className="text-sm text-slate-500">Estimated cost</p>
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Estimated monthly</span>
              <span className="font-semibold">{formatUsd(stats.costs.estimatedMonthly)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Projected end-of-month</span>
              <span className="font-semibold">{formatUsd(stats.costs.projectedEndOfMonth)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-sm text-slate-500">Plan usage</p>
          <div className="mt-3 space-y-2">
            {stats.aiUsage.byPlan.map((plan) => (
              <div key={plan.plan} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
                  <span>{plan.plan}</span>
                  <span>
                    {formatNumber(plan.count)} requests · {formatNumber(plan.units)} units
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
          <p className="text-sm text-slate-500">Top users (units)</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {stats.aiUsage.topUsers.length === 0 ? (
              <div>No AI usage yet.</div>
            ) : (
              stats.aiUsage.topUsers.map((user) => (
                <div key={user.email} className="flex items-center justify-between">
                  <span>{user.email}</span>
                  <span className="font-semibold">{formatNumber(user.units)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4">
          <p className="text-sm text-slate-500">Plan breakdown</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {stats.users.planBreakdown.length === 0 ? (
              <div>No plan breakdown data.</div>
            ) : (
              stats.users.planBreakdown.map((entry) => (
                <div
                  key={`${entry.plan}-${entry.accessStatus}`}
                  className="flex items-center justify-between"
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
