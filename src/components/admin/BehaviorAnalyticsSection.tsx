'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toast } from '@/components/ui/Toast';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
  AdminAnalyticsOverviewResponse,
  AdminAnalyticsUsersResponse,
} from '@/types/adminAnalytics';

const MAX_RANGE_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '365d', days: 365 },
];

const adminAnalyticsCopy = {
  pl: {
    title: 'Analiza zachowan',
    subtitle: 'Szczegolowa aktywnosc uzytkownikow i wykorzystanie AI.',
    rangeLabel: 'Zakres',
    startLabel: 'Od',
    endLabel: 'Do',
    maxRangeHint: 'Maksymalnie 365 dni',
    loading: 'Ladowanie analityki...',
    empty: 'Brak danych dla wybranego zakresu.',
    retry: 'Sprobuj ponownie',
    events: 'Zdarzenia',
    activeUsers: 'Aktywni uzytkownicy',
    aiRequests: 'Zapytania AI',
    aiTokens: 'Tokeny AI',
    aiCost: 'Koszt AI',
    wordsAdded: 'Dodane slowa',
    generatedWords: 'Wygenerowane slowa',
    dailyActivity: 'Aktywnosc dzienna',
    dailyLegendEvents: 'Zdarzenia',
    dailyLegendAi: 'Zapytania AI',
    topActions: 'Najczestsze akcje',
    topActionsEmpty: 'Brak zarejestrowanych akcji.',
    vocabularyIntake: 'Zbieranie slow',
    intakeSources: 'Zrodla wejscia',
    intakeEmpty: 'Brak danych z pobierania slow.',
    aiByFeature: 'AI wg funkcji',
    aiByModel: 'AI wg modelu',
    tableFeature: 'Funkcja',
    tableModel: 'Model',
    tableRequests: 'Zapytania',
    tableTokens: 'Tokeny',
    tableCost: 'Koszt',
    pageViews: 'Najczesciej odwiedzane',
    recentEvents: 'Ostatnia aktywnosc',
    recentEmpty: 'Brak ostatnich zdarzen.',
    userActivity: 'Aktywnosc uzytkownikow',
    userSearch: 'Szukaj po emailu lub imieniu',
    userColumns: {
      user: 'Uzytkownik',
      events: 'Zdarzenia',
      aiRequests: 'AI',
      tokens: 'Tokeny',
      cost: 'Koszt',
      lastActive: 'Ostatnio aktywny',
    },
    userEmpty: 'Brak uzytkownikow w tym okresie.',
    rowsLabel: 'Wiersze',
    prev: 'Poprzednia',
    next: 'Nastepna',
    periodLabel: (start: string, end: string, days: number) =>
      `Zakres: ${start} - ${end} (${days} dni)`,
    sources: {
      text: 'Tekst',
      image: 'Zdjecie',
      camera: 'Aparat',
      file: 'Plik',
      prompt: 'Temat',
      manual: 'Recznie',
      unknown: 'Inne',
    },
    eventsMap: {
      page_view: 'Odwiedziny strony',
      quiz_started: 'Start quizu',
      quiz_completed: 'Koniec quizu',
      vocab_parse_text: 'Analiza tekstu',
      vocab_generate_words: 'Generowanie slow',
      vocab_extract_image: 'Slowa ze zdjecia',
      vocab_extract_file: 'Slowa z pliku',
      vocab_words_added: 'Dodanie slow',
      vocab_stats_viewed: 'Statystyki slow',
    },
  },
  en: {
    title: 'Behavior analytics',
    subtitle: 'Detailed user activity and AI usage insights.',
    rangeLabel: 'Range',
    startLabel: 'From',
    endLabel: 'To',
    maxRangeHint: 'Max 365 days',
    loading: 'Loading analytics...',
    empty: 'No data for the selected range.',
    retry: 'Retry',
    events: 'Events',
    activeUsers: 'Active users',
    aiRequests: 'AI requests',
    aiTokens: 'AI tokens',
    aiCost: 'AI cost',
    wordsAdded: 'Words added',
    generatedWords: 'Generated words',
    dailyActivity: 'Daily activity',
    dailyLegendEvents: 'Events',
    dailyLegendAi: 'AI requests',
    topActions: 'Top actions',
    topActionsEmpty: 'No actions recorded.',
    vocabularyIntake: 'Vocabulary intake',
    intakeSources: 'Intake sources',
    intakeEmpty: 'No intake data available.',
    aiByFeature: 'AI by feature',
    aiByModel: 'AI by model',
    tableFeature: 'Feature',
    tableModel: 'Model',
    tableRequests: 'Requests',
    tableTokens: 'Tokens',
    tableCost: 'Cost',
    pageViews: 'Top pages',
    recentEvents: 'Recent activity',
    recentEmpty: 'No recent activity.',
    userActivity: 'User activity',
    userSearch: 'Search by email or name',
    userColumns: {
      user: 'User',
      events: 'Events',
      aiRequests: 'AI',
      tokens: 'Tokens',
      cost: 'Cost',
      lastActive: 'Last active',
    },
    userEmpty: 'No users in this period.',
    rowsLabel: 'Rows',
    prev: 'Previous',
    next: 'Next',
    periodLabel: (start: string, end: string, days: number) =>
      `Range: ${start} - ${end} (${days} days)`,
    sources: {
      text: 'Text',
      image: 'Image',
      camera: 'Camera',
      file: 'File',
      prompt: 'Prompt',
      manual: 'Manual',
      unknown: 'Other',
    },
    eventsMap: {
      page_view: 'Page view',
      quiz_started: 'Quiz started',
      quiz_completed: 'Quiz completed',
      vocab_parse_text: 'Parse text',
      vocab_generate_words: 'Generate words',
      vocab_extract_image: 'Words from image',
      vocab_extract_file: 'Words from file',
      vocab_words_added: 'Words added',
      vocab_stats_viewed: 'Vocabulary stats',
    },
  },
} as const;

type DateRangeState = { start: string; end: string };

type Preset = (typeof PRESETS)[number];

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string) => {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toUtcMs = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

const diffDays = (start: Date, end: Date) =>
  Math.floor((toUtcMs(end) - toUtcMs(start)) / MS_PER_DAY) + 1;

const clampRangeInputs = (startValue: string, endValue: string) => {
  const endDate = parseInputDate(endValue) ?? new Date();
  let startDate = parseInputDate(startValue) ?? new Date(endDate.getTime());
  let adjustedEnd = endDate;

  if (startDate.getTime() > adjustedEnd.getTime()) {
    const temp = startDate;
    startDate = adjustedEnd;
    adjustedEnd = temp;
  }

  let days = diffDays(startDate, adjustedEnd);
  if (days > MAX_RANGE_DAYS) {
    startDate = new Date(adjustedEnd.getTime());
    startDate.setDate(adjustedEnd.getDate() - (MAX_RANGE_DAYS - 1));
    days = MAX_RANGE_DAYS;
  }

  return {
    start: formatDateInput(startDate),
    end: formatDateInput(adjustedEnd),
    days,
  };
};

const buildDefaultRange = (): DateRangeState => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
};

const formatCompactNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  );

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale).format(value);

const formatCurrency = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

const formatDateLabel = (value: string, locale: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};

const formatDateLong = (value: string, locale: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getEventLabel = (
  eventName: string,
  language: keyof typeof adminAnalyticsCopy
) => {
  const map = adminAnalyticsCopy[language].eventsMap as Record<string, string>;
  return map[eventName] ?? eventName.replace(/_/g, ' ');
};

const getSourceLabel = (
  source: string,
  language: keyof typeof adminAnalyticsCopy
) => {
  const map = adminAnalyticsCopy[language].sources as Record<string, string>;
  return map[source] ?? map.unknown;
};

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card variant="elevated" className="h-full">
      <CardContent className="p-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        {helper && <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
      </CardContent>
    </Card>
  );
}

function ActivityChart({
  data,
  locale,
  eventsLabel,
  aiLabel,
  emptyLabel,
}: {
  data: AdminAnalyticsOverviewResponse['activity']['daily'];
  locale: string;
  eventsLabel: string;
  aiLabel: string;
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</div>;
  }

  const maxEvents = Math.max(1, ...data.map((point) => point.events));
  const maxAi = Math.max(1, ...data.map((point) => point.aiRequests));
  const barCount = data.length;
  const minWidth = Math.max(320, barCount * 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary-500" />
          {eventsLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {aiLabel}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-0.5 h-32" style={{ minWidth }}>
          {data.map((point) => {
            const eventHeight =
              point.events === 0 ? 0 : Math.max(2, (point.events / maxEvents) * 100);
            const aiHeight =
              point.aiRequests === 0 ? 0 : Math.max(2, (point.aiRequests / maxAi) * 100);
            const tooltip = `${formatDateLabel(point.date, locale)} - ${eventsLabel}: ${point.events} - ${aiLabel}: ${point.aiRequests}`;
            return (
              <div key={point.date} className="flex items-end gap-0.5" title={tooltip}>
                <span
                  className="w-1.5 rounded-sm bg-primary-500/80"
                  style={{ height: `${eventHeight}%` }}
                />
                <span
                  className="w-1.5 rounded-sm bg-amber-500/80"
                  style={{ height: `${aiHeight}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{formatDateLabel(data[0].date, locale)}</span>
        <span>{formatDateLabel(data[data.length - 1].date, locale)}</span>
      </div>
    </div>
  );
}

export function BehaviorAnalyticsSection() {
  const language = useLanguage();
  const t = language === 'pl' ? adminAnalyticsCopy.pl : adminAnalyticsCopy.en;
  const locale = language === 'pl' ? 'pl-PL' : 'en-US';

  const [range, setRange] = useState<DateRangeState>(buildDefaultRange);
  const [overview, setOverview] = useState<AdminAnalyticsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [userData, setUserData] = useState<AdminAnalyticsUsersResponse | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);

  const rangeDays = useMemo(() => {
    const start = parseInputDate(range.start);
    const end = parseInputDate(range.end);
    if (!start || !end) return 0;
    return diffDays(start, end);
  }, [range]);

  const isPresetActive = (preset: Preset) => {
    if (rangeDays !== preset.days) return false;
    const today = formatDateInput(new Date());
    return range.end === today;
  };

  const applyPreset = (preset: Preset) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (preset.days - 1));
    setRange({
      start: formatDateInput(startDate),
      end: formatDateInput(endDate),
    });
    setPage(0);
  };

  const updateRange = (next: Partial<DateRangeState>) => {
    const nextStart = next.start ?? range.start;
    const nextEnd = next.end ?? range.end;
    const clamped = clampRangeInputs(nextStart, nextEnd);
    setRange({ start: clamped.start, end: clamped.end });
    setPage(0);
  };

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const params = new URLSearchParams();
      params.set('start', range.start);
      params.set('end', range.end);
      const response = await fetch(`/api/admin/analytics/overview?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to load analytics');
      }
      const data = (await response.json()) as AdminAnalyticsOverviewResponse;
      setOverview(data);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setOverviewLoading(false);
    }
  }, [range.end, range.start]);

  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const params = new URLSearchParams();
      params.set('start', range.start);
      params.set('end', range.end);
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (userSearch) {
        params.set('search', userSearch);
      }
      const response = await fetch(`/api/admin/analytics/users?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to load users');
      }
      const data = (await response.json()) as AdminAnalyticsUsersResponse;
      setUserData(data);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setUserLoading(false);
    }
  }, [limit, page, range.end, range.start, userSearch]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setUserSearch(userSearchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearchInput]);

  const headerPeriod = overview
    ? t.periodLabel(
        formatDateLong(overview.period.start.slice(0, 10), locale),
        formatDateLong(overview.period.end.slice(0, 10), locale),
        overview.period.days
      )
    : t.maxRangeHint;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          <p className="text-xs text-slate-400">{headerPeriod}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-xl border transition',
                  isPresetActive(preset)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-400'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">{t.rangeLabel}</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                {t.startLabel}
                <Input
                  type="date"
                  value={range.start}
                  onChange={(event) => updateRange({ start: event.target.value })}
                  className="text-xs"
                />
              </label>
              <label className="flex items-center gap-2">
                {t.endLabel}
                <Input
                  type="date"
                  value={range.end}
                  onChange={(event) => updateRange({ end: event.target.value })}
                  className="text-xs"
                />
              </label>
            </div>
            <span className="text-[11px] text-slate-400">{t.maxRangeHint}</span>
          </div>
        </div>
      </div>

      {overviewError && <Toast variant="error" message={overviewError} />}

      {overviewLoading && !overview ? (
        <div className="text-sm text-slate-500">{t.loading}</div>
      ) : null}

      {!overviewLoading && overview && overview.totals.events === 0 ? (
        <div className="text-sm text-slate-500">{t.empty}</div>
      ) : null}

      {overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              label={t.events}
              value={formatCompactNumber(overview.totals.events, locale)}
            />
            <MetricCard
              label={t.activeUsers}
              value={formatCompactNumber(overview.totals.uniqueUsers, locale)}
            />
            <MetricCard
              label={t.aiRequests}
              value={formatCompactNumber(overview.totals.aiRequests, locale)}
            />
            <MetricCard
              label={t.aiTokens}
              value={formatCompactNumber(overview.totals.aiTokens, locale)}
            />
            <MetricCard
              label={t.aiCost}
              value={formatCurrency(overview.totals.aiCost, locale)}
            />
            <MetricCard
              label={t.wordsAdded}
              value={formatCompactNumber(overview.vocabulary.wordsAdded, locale)}
              helper={`${t.generatedWords}: ${formatCompactNumber(overview.vocabulary.generated, locale)}`}
            />
          </div>

          <Card variant="elevated">
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.dailyActivity}
              </h3>
            </CardHeader>
            <CardContent>
              <ActivityChart
                data={overview.activity.daily}
                locale={locale}
                eventsLabel={t.dailyLegendEvents}
                aiLabel={t.dailyLegendAi}
                emptyLabel={t.empty}
              />
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t.topActions}
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.events.byName.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.topActionsEmpty}</p>
                ) : (
                  overview.events.byName.map((item) => (
                    <div key={item.eventName} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">
                          {getEventLabel(item.eventName, language === 'pl' ? 'pl' : 'en')}
                        </span>
                        <span className="text-slate-500">
                          {formatNumber(item.count, locale)}
                        </span>
                      </div>
                      <ProgressBar
                        value={item.count}
                        max={overview.events.byName[0]?.count || 1}
                        size="sm"
                        variant="gradient"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card variant="elevated" className="h-full">
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t.vocabularyIntake}
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-xs text-slate-500">{t.wordsAdded}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatNumber(overview.vocabulary.wordsAdded, locale)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-xs text-slate-500">{t.generatedWords}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatNumber(overview.vocabulary.generated, locale)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t.intakeSources}
                  </p>
                  {overview.vocabulary.intakeSources.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.intakeEmpty}</p>
                  ) : (
                    overview.vocabulary.intakeSources.map((item) => (
                      <div key={item.source} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 dark:text-slate-300">
                            {getSourceLabel(item.source, language === 'pl' ? 'pl' : 'en')}
                          </span>
                          <span className="text-slate-500">
                            {formatNumber(item.count, locale)}
                          </span>
                        </div>
                        <ProgressBar
                          value={item.count}
                          max={overview.vocabulary.intakeSources[0]?.count || 1}
                          size="sm"
                          variant="default"
                        />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" className="h-full">
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t.pageViews}
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.events.pageViews.length === 0 ? (
                  <p className="text-sm text-slate-500">{t.topActionsEmpty}</p>
                ) : (
                  overview.events.pageViews.map((item) => (
                    <div key={item.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">
                          {item.feature}
                        </span>
                        <span className="text-slate-500">
                          {formatNumber(item.count, locale)}
                        </span>
                      </div>
                      <ProgressBar
                        value={item.count}
                        max={overview.events.pageViews[0]?.count || 1}
                        size="sm"
                        variant="success"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card variant="elevated">
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t.aiByFeature}
                </h3>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 font-medium">{t.tableFeature}</th>
                      <th className="py-2 font-medium text-right">{t.tableRequests}</th>
                      <th className="py-2 font-medium text-right">{t.tableTokens}</th>
                      <th className="py-2 font-medium text-right">{t.tableCost}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.aiUsage.byFeature.map((row) => (
                      <tr key={row.feature} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-2 text-slate-700 dark:text-slate-300">
                          {row.feature}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatNumber(row.requests, locale)}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatCompactNumber(row.tokens, locale)}
                        </td>
                        <td className="py-2 text-right text-slate-700 dark:text-slate-200">
                          {formatCurrency(row.cost, locale)}
                        </td>
                      </tr>
                    ))}
                    {overview.aiUsage.byFeature.length === 0 && (
                      <tr>
                        <td className="py-3 text-sm text-slate-500" colSpan={4}>
                          {t.intakeEmpty}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t.aiByModel}
                </h3>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 font-medium">{t.tableModel}</th>
                      <th className="py-2 font-medium text-right">{t.tableRequests}</th>
                      <th className="py-2 font-medium text-right">{t.tableTokens}</th>
                      <th className="py-2 font-medium text-right">{t.tableCost}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.aiUsage.byModel.map((row) => (
                      <tr key={row.model} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-2 text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {row.model}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatNumber(row.requests, locale)}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatCompactNumber(row.tokens, locale)}
                        </td>
                        <td className="py-2 text-right text-slate-700 dark:text-slate-200">
                          {formatCurrency(row.cost, locale)}
                        </td>
                      </tr>
                    ))}
                    {overview.aiUsage.byModel.length === 0 && (
                      <tr>
                        <td className="py-3 text-sm text-slate-500" colSpan={4}>
                          {t.intakeEmpty}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <Card variant="elevated">
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.recentEvents}
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.recentEvents.length === 0 ? (
                <p className="text-sm text-slate-500">{t.recentEmpty}</p>
              ) : (
                overview.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-slate-100 dark:border-slate-700 pb-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-700 dark:text-slate-300">
                        {event.email ?? event.name ?? event.userId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {getEventLabel(event.eventName, language === 'pl' ? 'pl' : 'en')}
                        {event.feature && ` - ${event.feature}`}
                        {event.source &&
                          ` - ${getSourceLabel(event.source, language === 'pl' ? 'pl' : 'en')}`}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(event.createdAt))}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card variant="elevated">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t.userActivity}
            </h3>
            <p className="text-xs text-slate-500">{t.maxRangeHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={userSearchInput}
              onChange={(event) => setUserSearchInput(event.target.value)}
              placeholder={t.userSearch}
              className="w-64"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{t.rowsLabel}</span>
              <Select
                value={String(limit)}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(0);
                }}
                className="w-20"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {userError && <Toast variant="error" message={userError} />}
          {userLoading && !userData ? (
            <div className="text-sm text-slate-500">{t.loading}</div>
          ) : null}
          {userData && userData.items.length === 0 ? (
            <div className="text-sm text-slate-500">{t.userEmpty}</div>
          ) : null}
          {userData && userData.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 font-medium">{t.userColumns.user}</th>
                    <th className="py-2 font-medium text-right">{t.userColumns.events}</th>
                    <th className="py-2 font-medium text-right">{t.userColumns.aiRequests}</th>
                    <th className="py-2 font-medium text-right">{t.userColumns.tokens}</th>
                    <th className="py-2 font-medium text-right">{t.userColumns.cost}</th>
                    <th className="py-2 font-medium text-right">{t.userColumns.lastActive}</th>
                  </tr>
                </thead>
                <tbody>
                  {userData.items.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="py-2 text-slate-700 dark:text-slate-300">
                        <div className="flex flex-col">
                          <span>{user.email ?? user.name ?? user.id}</span>
                          {user.email && user.name && (
                            <span className="text-xs text-slate-400">{user.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {formatNumber(user.events, locale)}
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {formatNumber(user.aiRequests, locale)}
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {formatCompactNumber(user.aiTokens, locale)}
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                        {formatCurrency(user.aiCost, locale)}
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {user.lastEventAt
                          ? new Intl.DateTimeFormat(locale, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(user.lastEventAt))
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {userData && userData.total > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                {userData.page + 1} / {Math.max(1, Math.ceil(userData.total / userData.limit))}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  disabled={userData.page === 0}
                  className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                  {t.prev}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(prev + 1, Math.max(0, Math.ceil(userData.total / userData.limit) - 1))
                    )
                  }
                  disabled={userData.page + 1 >= Math.ceil(userData.total / userData.limit)}
                  className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                  {t.next}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
