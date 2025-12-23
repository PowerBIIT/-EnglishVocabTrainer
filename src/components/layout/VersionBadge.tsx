'use client';

import { useEffect, useState } from 'react';

type VersionBadgeProps = {
  version?: string;
};

type HealthResponse = {
  version?: string;
};

const FALLBACK_LABEL = process.env.NODE_ENV === 'development' ? 'dev' : 'unknown';

const normalizeVersion = (value?: string) => {
  const normalized = (value ?? '').trim();
  if (!normalized || normalized === 'unknown') {
    return null;
  }
  return normalized.startsWith('v') || normalized.startsWith('V') ? normalized : `v${normalized}`;
};

export function VersionBadge({ version }: VersionBadgeProps) {
  const [label, setLabel] = useState(() => normalizeVersion(version) ?? '...');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadVersion = async () => {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = (await response.json()) as HealthResponse;
        const next = normalizeVersion(data?.version) ?? FALLBACK_LABEL;
        if (!cancelled) {
          setLabel(next);
        }
      } catch (error) {
        if (!cancelled && (error as Error).name !== 'AbortError') {
          setLabel(FALLBACK_LABEL);
        }
      }
    };

    loadVersion();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const title =
    label === '...'
      ? 'Loading app version'
      : label === 'unknown'
        ? 'App version unavailable'
        : `App version ${label}`;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 md:bottom-4 md:left-28 z-40 text-[11px] text-slate-500 dark:text-slate-400">
      <div
        className="rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/70 px-2 py-1 shadow-sm backdrop-blur"
        title={title}
      >
        {label}
      </div>
    </div>
  );
}
