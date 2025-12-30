'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const PUBLIC_PATHS = new Set(['/login', '/onboarding', '/waitlist', '/privacy', '/terms']);

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isPublic = PUBLIC_PATHS.has(pathname);
  const accessStatus = session?.user?.accessStatus ?? 'ACTIVE';

  if (isPublic) {
    return <>{children}</>;
  }

  if (status !== 'authenticated' || accessStatus !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
