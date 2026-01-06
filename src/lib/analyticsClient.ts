'use client';

export type ClientAnalyticsEvent = {
  eventName: string;
  feature?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

const sendAnalytics = (payload: ClientAnalyticsEvent) => {
  const body = JSON.stringify(payload);

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/event', blob);
    return;
  }

  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
};

export const trackEvent = (payload: ClientAnalyticsEvent) => {
  if (typeof window === 'undefined') return;
  if (!payload.eventName) return;
  sendAnalytics(payload);
};

export const normalizePathFeature = (pathname: string) => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/quiz') || pathname.startsWith('/klasowka')) return 'quiz';
  if (pathname.startsWith('/vocabulary')) return 'vocabulary';
  if (pathname.startsWith('/pronunciation')) return 'pronunciation';
  if (pathname.startsWith('/chat')) return 'ai_chat';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/admin')) return 'admin';
  const trimmed = pathname.replace(/^\/+/, '').split('/')[0];
  return trimmed || 'unknown';
};
