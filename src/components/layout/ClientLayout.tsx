'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n';

const PUBLIC_PATHS = new Set(['/login', '/onboarding', '/waitlist', '/privacy', '/terms']);

export function ClientLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const language = useLanguage();
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (isPublic || status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      const loginUrl = `/login?from=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
      return;
    }

    const accessStatus = session?.user?.accessStatus ?? 'ACTIVE';
    if (accessStatus !== 'ACTIVE' && pathname !== '/waitlist') {
      router.replace('/waitlist');
      return;
    }
    if (accessStatus === 'ACTIVE' && pathname === '/waitlist') {
      router.replace('/');
      return;
    }

    const onboardingComplete = Boolean(session?.user?.onboardingComplete);
    if (!onboardingComplete && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }
    if (onboardingComplete && pathname === '/onboarding') {
      router.replace('/');
    }
  }, [
    isPublic,
    pathname,
    router,
    session?.user?.accessStatus,
    session?.user?.onboardingComplete,
    status,
  ]);

  return null;
}
