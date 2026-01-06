import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseAnalyticsRange, ANALYTICS_RANGE_LIMITS } from './analyticsRange';

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

describe('analyticsRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to a 30-day range ending today', () => {
    const range = parseAnalyticsRange(new URLSearchParams());

    expect(range.days).toBe(30);
    expect(toDateKey(range.endDate)).toBe('2026-01-10');
    expect(toDateKey(range.startDate)).toBe('2025-12-12');
    expect(range.start.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
    expect(range.end.toISOString().endsWith('T23:59:59.999Z')).toBe(true);
  });

  it('uses the provided date range when valid', () => {
    const params = new URLSearchParams({ start: '2026-01-05', end: '2026-01-07' });
    const range = parseAnalyticsRange(params);

    expect(range.days).toBe(3);
    expect(toDateKey(range.startDate)).toBe('2026-01-05');
    expect(toDateKey(range.endDate)).toBe('2026-01-07');
  });

  it('swaps dates when start is after end', () => {
    const params = new URLSearchParams({ start: '2026-01-10', end: '2026-01-01' });
    const range = parseAnalyticsRange(params);

    expect(range.days).toBe(10);
    expect(toDateKey(range.startDate)).toBe('2026-01-01');
    expect(toDateKey(range.endDate)).toBe('2026-01-10');
  });

  it('clamps ranges longer than the maximum', () => {
    const params = new URLSearchParams({ start: '2024-01-01', end: '2026-01-10' });
    const range = parseAnalyticsRange(params);

    const expectedStart = new Date('2026-01-10T00:00:00Z');
    expectedStart.setUTCDate(
      expectedStart.getUTCDate() - (ANALYTICS_RANGE_LIMITS.maxDays - 1)
    );

    expect(range.days).toBe(ANALYTICS_RANGE_LIMITS.maxDays);
    expect(toDateKey(range.startDate)).toBe(toDateKey(expectedStart));
  });
});
