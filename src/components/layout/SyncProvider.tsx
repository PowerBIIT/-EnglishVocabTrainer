'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useVocabStore } from '@/lib/store';
import { createDefaultState } from '@/lib/appState';
import type { AppState } from '@/types';

const SYNC_DEBOUNCE_MS = 800;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const hasLoadedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastPayloadRef = useRef<string>('');

  const hydrateFromServer = useVocabStore((state) => state.hydrateFromServer);
  const setReady = useVocabStore((state) => state.setReady);
  const isReady = useVocabStore((state) => state.isReady);

  const syncPayload = useVocabStore((state) => ({
    vocabulary: state.vocabulary,
    sets: state.sets,
    progress: state.progress,
    settings: state.settings,
    stats: state.stats,
    dailyMission: state.dailyMission,
  }));

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') {
        setReady(true);
      }
      return;
    }

    let cancelled = false;

    const loadState = async () => {
      try {
        const response = await fetch('/api/user/state');
        if (!response.ok) {
          throw new Error('Failed to load state');
        }
        const payload = await response.json();
        if (cancelled || !payload?.data) {
          return;
        }

        const legacyRaw = localStorage.getItem('vocab-storage');
        let legacyState: Record<string, unknown> | null = null;
        if (legacyRaw) {
          try {
            const parsed = JSON.parse(legacyRaw);
            legacyState = parsed?.state ?? parsed;
          } catch (error) {
            legacyState = null;
          }
        }

        const serverState = payload.data as Record<string, unknown>;
        const serverHasProgress =
          Object.keys((serverState as { progress?: Record<string, unknown> }).progress || {}).length > 0;
        const serverHasXp =
          ((serverState as { stats?: { totalXp?: number } }).stats?.totalXp || 0) > 0;

        const legacyHasProgress =
          !!legacyState &&
          Object.keys((legacyState as { progress?: Record<string, unknown> }).progress || {}).length > 0;
        const legacyHasXp =
          ((legacyState as { stats?: { totalXp?: number } }).stats?.totalXp || 0) > 0;

        if (legacyState && (legacyHasProgress || legacyHasXp) && !serverHasProgress && !serverHasXp) {
          const defaults = createDefaultState();
          const mergedState = {
            ...defaults,
            ...legacyState,
            dailyMission:
              (legacyState as { dailyMission?: typeof defaults.dailyMission }).dailyMission ||
              defaults.dailyMission,
          };

          hydrateFromServer(mergedState);
          hasLoadedRef.current = true;

          await fetch('/api/user/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: mergedState }),
          });
          localStorage.removeItem('vocab-storage');
          return;
        }

        hydrateFromServer(serverState as unknown as AppState);
        hasLoadedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromServer, setReady, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !isReady || !hasLoadedRef.current) {
      return;
    }

    const payload = JSON.stringify(syncPayload);
    if (payload === lastPayloadRef.current) {
      return;
    }

    lastPayloadRef.current = payload;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetch('/api/user/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: syncPayload }),
      }).catch(() => null);
    }, SYNC_DEBOUNCE_MS);
  }, [isReady, status, syncPayload]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return children;
}
