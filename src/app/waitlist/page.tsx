'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n';

const waitlistCopy = {
  pl: {
    title: 'Jesteś na liście oczekujących',
    message:
      'Dziękujemy! Obecnie liczba miejsc jest ograniczona. Gdy tylko zwolni się miejsce, aktywujemy dostęp do aplikacji.',
    suspendedTitle: 'Konto wstrzymane',
    suspendedMessage:
      'Twoje konto zostało tymczasowo wstrzymane. Skontaktuj się z administratorem, aby wyjaśnić sytuację.',
    emailLabel: 'Konto:',
    refresh: 'Sprawdź ponownie',
    signOut: 'Wyloguj się',
  },
  en: {
    title: 'You are on the waitlist',
    message:
      'Thanks for joining! Access is limited right now. We will activate your account once more spots are available.',
    suspendedTitle: 'Account suspended',
    suspendedMessage:
      'Your account has been temporarily suspended. Contact the administrator for more details.',
    emailLabel: 'Account:',
    refresh: 'Check again',
    signOut: 'Sign out',
  },
  uk: {
    title: 'Ви у списку очікування',
    message:
      'Дякуємо! Зараз кількість місць обмежена. Ми активуємо доступ, щойно з’являться місця.',
    suspendedTitle: 'Акаунт призупинено',
    suspendedMessage:
      'Ваш акаунт тимчасово призупинений. Зверніться до адміністратора для деталей.',
    emailLabel: 'Обліковий запис:',
    refresh: 'Перевірити ще раз',
    signOut: 'Вийти',
  },
} as const;

type WaitlistCopy = typeof waitlistCopy.pl;

export default function WaitlistPage() {
  const { data: session } = useSession();
  const language = useLanguage();
  const t = (waitlistCopy[language] ?? waitlistCopy.pl) as WaitlistCopy;
  const accessStatus = session?.user?.accessStatus ?? 'WAITLISTED';
  const isSuspended = accessStatus === 'SUSPENDED';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl bg-white/85 dark:bg-slate-800/80 shadow-sm border border-white/60 dark:border-slate-700 p-8 text-center space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
            {isSuspended ? t.suspendedTitle : t.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {isSuspended ? t.suspendedMessage : t.message}
          </p>
        </div>
        {session?.user?.email ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t.emailLabel} <span className="font-semibold">{session.user.email}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t.refresh}
          </Button>
          <Button type="button" variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>
            {t.signOut}
          </Button>
        </div>
      </div>
    </div>
  );
}
