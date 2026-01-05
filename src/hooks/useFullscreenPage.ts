'use client';

import { useEffect } from 'react';

export const useFullscreenPage = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('fullscreen-page');
    return () => {
      document.body.classList.remove('fullscreen-page');
    };
  }, [enabled]);
};
