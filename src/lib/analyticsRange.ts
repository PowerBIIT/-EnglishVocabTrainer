export type AnalyticsRange = {
  start: Date;
  end: Date;
  startDate: Date;
  endDate: Date;
  days: number;
};

const MAX_RANGE_DAYS = 365;
const DEFAULT_RANGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toStartOfDayUtc = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toEndOfDayUtc = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );

const parseDateInput = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const addDaysUtc = (date: Date, offset: number) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + offset);
  return next;
};

const clampRange = (start: Date, end: Date) => {
  let startDate = toStartOfDayUtc(start);
  let endDate = toStartOfDayUtc(end);

  if (startDate.getTime() > endDate.getTime()) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  let days = Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
  if (days > MAX_RANGE_DAYS) {
    startDate = addDaysUtc(endDate, -(MAX_RANGE_DAYS - 1));
    days = MAX_RANGE_DAYS;
  }
  if (days < 1) {
    startDate = endDate;
    days = 1;
  }

  return { startDate, endDate, days };
};

export function parseAnalyticsRange(searchParams: URLSearchParams): AnalyticsRange {
  const endInput = parseDateInput(searchParams.get('end')) ?? new Date();
  const startInput = parseDateInput(searchParams.get('start'));

  let start = startInput ?? addDaysUtc(endInput, -(DEFAULT_RANGE_DAYS - 1));
  let end = endInput;

  const { startDate, endDate, days } = clampRange(start, end);

  return {
    start: toStartOfDayUtc(startDate),
    end: toEndOfDayUtc(endDate),
    startDate,
    endDate,
    days,
  };
}

export const ANALYTICS_RANGE_LIMITS = {
  maxDays: MAX_RANGE_DAYS,
  defaultDays: DEFAULT_RANGE_DAYS,
};
