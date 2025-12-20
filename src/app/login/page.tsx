'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isE2E = process.env.NEXT_PUBLIC_E2E_TEST === 'true';
  const [e2eEmail, setE2eEmail] = useState('');
  const [e2ePassword, setE2ePassword] = useState('');
  const [e2eError, setE2eError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    const destination = session?.user?.onboardingComplete ? '/' : '/onboarding';
    router.replace(destination);
  }, [router, session?.user?.onboardingComplete, status]);

  const handleE2ELogin = async () => {
    setE2eError('');
    const result = await signIn('credentials', {
      redirect: false,
      email: e2eEmail,
      password: e2ePassword,
      callbackUrl: '/',
    });

    if (result?.error) {
      setE2eError('Nieprawidłowe dane testowe.');
      return;
    }

    router.replace(result?.url ?? '/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/60 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow">
            <Compass size={18} className="text-primary-600" />
            Nowy dzień, nowa misja
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-slate-900 dark:text-white">
            English Vocab Trainer
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Zaloguj się przez Google i kontynuuj przygodę z nowoczesną nauką słówek.
          </p>
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              Zaloguj się przez Google
            </Button>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck size={16} className="text-primary-600" />
              Bez trybu gościa, dane zawsze zsynchronizowane.
            </div>
          </div>
          {isE2E && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Logowanie testowe (E2E)
              </p>
              <input
                data-testid="e2e-email"
                type="email"
                value={e2eEmail}
                onChange={(e) => setE2eEmail(e.target.value)}
                placeholder="Email testowy"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                data-testid="e2e-password"
                type="password"
                value={e2ePassword}
                onChange={(e) => setE2ePassword(e.target.value)}
                placeholder="Hasło testowe"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {e2eError && (
                <p className="text-xs text-error-500">{e2eError}</p>
              )}
              <Button
                data-testid="e2e-login"
                variant="secondary"
                className="w-full"
                onClick={handleE2ELogin}
                disabled={!e2eEmail.trim() || !e2ePassword.trim()}
              >
                Zaloguj testowo
              </Button>
            </div>
          )}
        </div>
        <div className="relative">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary-100/70 blur-2xl" />
          <div className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/40 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Twój przewodnik</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Wybierz swój styl w onboardingu</p>
              </div>
              <Sparkles className="text-amber-500" size={20} />
            </div>
            <div className="mt-6 flex justify-center">
              <MascotAvatar skinId="explorer" size={160} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
