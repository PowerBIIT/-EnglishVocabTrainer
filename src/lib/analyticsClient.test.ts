import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { normalizePathFeature, trackEvent } from './analyticsClient';

const setSendBeacon = (value?: unknown) => {
  Object.defineProperty(globalThis.navigator, 'sendBeacon', {
    value,
    configurable: true,
    writable: true,
  });
};

describe('analyticsClient', () => {
  const originalFetch = globalThis.fetch;
  const originalSendBeacon = globalThis.navigator?.sendBeacon;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(undefined) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setSendBeacon(originalSendBeacon);
    vi.restoreAllMocks();
  });

  it('normalizes known paths into feature labels', () => {
    expect(normalizePathFeature('/')).toBe('home');
    expect(normalizePathFeature('/quiz')).toBe('quiz');
    expect(normalizePathFeature('/klasowka')).toBe('quiz');
    expect(normalizePathFeature('/vocabulary/123')).toBe('vocabulary');
    expect(normalizePathFeature('/pronunciation')).toBe('pronunciation');
    expect(normalizePathFeature('/chat')).toBe('ai_chat');
    expect(normalizePathFeature('/profile/settings')).toBe('profile');
    expect(normalizePathFeature('/admin')).toBe('admin');
    expect(normalizePathFeature('/custom/path')).toBe('custom');
  });

  it('uses sendBeacon when available', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    setSendBeacon(sendBeacon);

    trackEvent({ eventName: 'quiz_started', feature: 'quiz' });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith('/api/analytics/event', expect.any(Blob));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('falls back to fetch when sendBeacon is unavailable', () => {
    setSendBeacon(undefined);

    trackEvent({ eventName: 'page_view', feature: 'home' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/analytics/event',
      expect.objectContaining({ method: 'POST', keepalive: true })
    );
  });

  it('ignores empty event names', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    setSendBeacon(sendBeacon);

    trackEvent({ eventName: '' });

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
