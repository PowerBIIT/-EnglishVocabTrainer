'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AITutor } from '@/components/ai/AITutor';

const PUBLIC_PATHS = new Set(['/login', '/onboarding']);

export function ClientLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublic || status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      const loginUrl = `/login?from=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
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
  }, [isPublic, pathname, router, session?.user?.onboardingComplete, status]);

  if (isPublic) {
    return null;
  }

  return <AITutor />;
}
