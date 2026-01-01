'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AiTokenStatsResponse,
  AiTrendsResponse,
  AiAnalyticsPeriod,
} from '@/types/aiAnalytics';

const PERIODS: { value: AiAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function AiAnalyticsSection() {
  const [period, setPeriod] = useState<AiAnalyticsPeriod>('7d');
  const [stats, setStats] = useState<AiTokenStatsResponse | null>(null);
  const [trends, setTrends] = useState<AiTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, trendsRes] = await Promise.all([
        fetch(`/api/admin/stats/ai-tokens?period=${period}`),
        fetch(`/api/admin/stats/ai-trends?period=${period}`),
      ]);

      if (!statsRes.ok || !trendsRes.ok) {
        throw new Error('Failed to load AI analytics');
      }

      const [statsData, trendsData] = await Promise.all([
        statsRes.json(),
        trendsRes.json(),
      ]);

      setStats(statsData);
      setTrends(trendsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <button
          onClick={loadData}
          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Token Analytics
        </h2>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Requests"
          value={formatNumber(stats.totals.requests)}
          subtitle={`${stats.totals.successRate.toFixed(1)}% success`}
        />
        <SummaryCard
          title="Total Tokens"
          value={formatNumber(stats.totals.totalTokens)}
          subtitle={`In: ${formatNumber(stats.totals.inputTokens)} / Out: ${formatNumber(stats.totals.outputTokens)}`}
        />
        <SummaryCard
          title="Actual Cost"
          value={formatCost(stats.totals.actualCost)}
          subtitle="Based on token usage"
          highlight
        />
        <SummaryCard
          title="Avg Response"
          value={formatDuration(stats.totals.avgDurationMs)}
          subtitle="Average duration"
        />
      </div>

      {/* Cost by Model */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Cost by Model
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 font-medium text-right">Requests</th>
                <th className="pb-2 font-medium text-right">Input Tokens</th>
                <th className="pb-2 font-medium text-right">Output Tokens</th>
                <th className="pb-2 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.byModel.map((model) => (
                <tr
                  key={model.model}
                  className="border-b border-gray-100 dark:border-gray-700"
                >
                  <td className="py-2 text-gray-900 dark:text-white font-mono text-xs">
                    {model.model}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {formatNumber(model.requests)}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {formatNumber(model.inputTokens)}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {formatNumber(model.outputTokens)}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                    {formatCost(model.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost by Feature */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Cost by Feature
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium">Feature</th>
                <th className="pb-2 font-medium text-right">Requests</th>
                <th className="pb-2 font-medium text-right">Tokens</th>
                <th className="pb-2 font-medium text-right">Cost</th>
                <th className="pb-2 font-medium text-right">Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.byFeature.map((feature) => (
                <tr
                  key={feature.feature}
                  className="border-b border-gray-100 dark:border-gray-700"
                >
                  <td className="py-2 text-gray-900 dark:text-white">
                    {feature.feature}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {formatNumber(feature.requests)}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                    {formatNumber(feature.totalTokens)}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                    {formatCost(feature.cost)}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={`${
                        feature.errorRate > 5
                          ? 'text-red-600 dark:text-red-400'
                          : feature.errorRate > 1
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {feature.errorRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Top Users by Cost
        </h3>
        <div className="space-y-2">
          {stats.topUsers.map((user, index) => (
            <div
              key={user.userId}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                  {index + 1}
                </span>
                <span className="text-gray-900 dark:text-white truncate max-w-[200px]">
                  {user.email || user.userId}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {formatNumber(user.requests)} req
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatNumber(user.totalTokens)} tok
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCost(user.cost)}
                </span>
              </div>
            </div>
          ))}
          {stats.topUsers.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
              No usage data for this period
            </p>
          )}
        </div>
      </div>

      {/* Daily Trend Chart (simple bar visualization) */}
      {trends && trends.daily.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Daily Usage Trend
          </h3>
          <div className="h-40 flex items-end gap-1">
            {trends.daily.map((day, index) => {
              const maxCost = Math.max(...trends.daily.map((d) => d.cost), 0.01);
              const height = (day.cost / maxCost) * 100;
              return (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                  title={`${day.date}: ${formatCost(day.cost)}`}
                >
                  <div
                    className="bg-blue-500 dark:bg-blue-400 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-300"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {index % 7 === 0 && (
                    <span className="absolute -bottom-5 left-0 text-xs text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Total: {formatCost(trends.totals.cost)}</span>
            <span>{formatNumber(trends.totals.requests)} requests</span>
            <span>{trends.totals.uniqueUsers} unique users</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        highlight
          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-700/50'
      }`}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div
        className={`text-2xl font-bold mt-1 ${
          highlight
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}
