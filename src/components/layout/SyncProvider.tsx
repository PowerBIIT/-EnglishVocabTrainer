'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useVocabStore } from '@/lib/store';
import { isAppLanguage } from '@/lib/i18n';
import type { AppState } from '@/types';

const SYNC_DEBOUNCE_MS = 800;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const hasLoadedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastPayloadRef = useRef<string>('');

  const hydrateFromServer = useVocabStore((state) => state.hydrateFromServer);
  const setReady = useVocabStore((state) => state.setReady);
  const isReady = useVocabStore((state) => state.isReady);
  const updateSettings = useVocabStore((state) => state.updateSettings);

  const syncPayload = useVocabStore((state) => ({
    vocabulary: state.vocabulary,
    sets: state.sets,
    progress: state.progress,
    settings: state.settings,
    stats: state.stats,
    dailyMission: state.dailyMission,
  }));

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.accessStatus !== 'ACTIVE') {
      if (status === 'unauthenticated') {
        setReady(true);
      } else if (status === 'authenticated') {
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

        hydrateFromServer(payload.data as unknown as AppState);
        try {
          const pendingLanguage = window.localStorage.getItem('pendingLanguage');
          if (pendingLanguage && isAppLanguage(pendingLanguage)) {
            updateSettings('general', { language: pendingLanguage });
          }
          window.localStorage.removeItem('pendingLanguage');
        } catch (error) {
          console.warn('Unable to apply pending language preference.', error);
        }
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
  }, [hydrateFromServer, setReady, session?.user?.accessStatus, status]);

  useEffect(() => {
    if (
      status !== 'authenticated' ||
      session?.user?.accessStatus !== 'ACTIVE' ||
      !isReady ||
      !hasLoadedRef.current
    ) {
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
  }, [isReady, session?.user?.accessStatus, status, syncPayload]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return children;
}
