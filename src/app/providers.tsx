'use client';

import { SessionProvider } from 'next-auth/react';
import { SyncProvider } from '@/components/layout/SyncProvider';
import { SettingsEffects } from '@/components/layout/SettingsEffects';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SyncProvider>
        <SettingsEffects />
        {children}
      </SyncProvider>
    </SessionProvider>
  );
}
