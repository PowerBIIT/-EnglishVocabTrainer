'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    joinTitle: 'Dołącz do listy oczekujących',
    joinMessage:
      'Zostaw adres e-mail, a damy znać, gdy pojawi się wolne miejsce.',
    joinLabel: 'Adres e-mail',
    joinAction: 'Dołącz',
    joining: 'Wysyłanie…',
    joinSuccess: 'Sprawdź skrzynkę i kliknij link potwierdzający.',
    joinError: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.',
    confirmSuccess: 'Adres potwierdzony. Otworzymy dostęp, gdy zwolni się miejsce.',
    approvedSuccess: 'Masz dostęp! Zaloguj się, aby rozpocząć.',
    invalidLink: 'Link jest nieprawidłowy. Spróbuj zapisać się ponownie.',
    expiredLink: 'Link wygasł. Zapisz się ponownie, aby otrzymać nowy.',
    login: 'Zaloguj się',
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
    joinTitle: 'Join the waitlist',
    joinMessage: 'Leave your email and we will let you know when a spot opens up.',
    joinLabel: 'Email address',
    joinAction: 'Join waitlist',
    joining: 'Sending…',
    joinSuccess: 'Check your inbox and confirm your email.',
    joinError: 'Could not submit. Please try again in a moment.',
    confirmSuccess: 'Email confirmed. We will notify you when access is available.',
    approvedSuccess: 'You are in! Sign in to get started.',
    invalidLink: 'This link is invalid. Please sign up again.',
    expiredLink: 'This link has expired. Please sign up again to receive a new one.',
    login: 'Sign in',
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
    joinTitle: 'Приєднатися до списку очікування',
    joinMessage: 'Залиште e-mail і ми повідомимо, коли зʼявиться місце.',
    joinLabel: 'Email',
    joinAction: 'Приєднатися',
    joining: 'Надсилаємо…',
    joinSuccess: 'Перевірте пошту та підтвердіть адресу.',
    joinError: 'Не вдалося надіслати. Спробуйте ще раз трохи пізніше.',
    confirmSuccess: 'Email підтверджено. Ми повідомимо, коли буде доступ.',
    approvedSuccess: 'Доступ готовий! Увійдіть, щоб почати.',
    invalidLink: 'Посилання недійсне. Спробуйте ще раз.',
    expiredLink: 'Посилання прострочене. Заповніть форму повторно.',
    login: 'Увійти',
  },
} as const;

type WaitlistCopy = typeof waitlistCopy.pl;

type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export default function WaitlistPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const language = useLanguage();
  const t = (waitlistCopy[language] ?? waitlistCopy.pl) as WaitlistCopy;
  const accessStatus = session?.user?.accessStatus ?? 'WAITLISTED';
  const isSuspended = accessStatus === 'SUSPENDED';
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });
  const status = searchParams.get('status');

  const statusMessage = useMemo(() => {
    if (!status) return null;
    if (status === 'approved') return t.approvedSuccess;
    if (status === 'confirmed') return t.confirmSuccess;
    if (status === 'expired') return t.expiredLink;
    return t.invalidLink;
  }, [status, t.approvedSuccess, t.confirmSuccess, t.expiredLink, t.invalidLink]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    try {
      setFormState({ status: 'loading' });

      const params = new URLSearchParams();
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      utmKeys.forEach((key) => {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      });

      const payload = {
        email,
        language,
        source: 'waitlist_page',
        utmSource: params.get('utm_source'),
        utmMedium: params.get('utm_medium'),
        utmCampaign: params.get('utm_campaign'),
        utmContent: params.get('utm_content'),
        utmTerm: params.get('utm_term'),
      };

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setFormState({ status: 'error', message: t.joinError });
        return;
      }

      setFormState({ status: 'success', message: t.joinSuccess });
    } catch (error) {
      console.error('Waitlist signup failed:', error);
      setFormState({ status: 'error', message: t.joinError });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl bg-white/85 dark:bg-slate-800/80 shadow-sm border border-white/60 dark:border-slate-700 p-8 text-center space-y-6">
        {session?.user ? (
          <>
            <div className="space-y-3">
              <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
                {isSuspended ? t.suspendedTitle : t.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                {isSuspended ? t.suspendedMessage : t.message}
              </p>
            </div>
            {session.user.email ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t.emailLabel} <span className="font-semibold">{session.user.email}</span>
              </div>
            ) : null}
            {statusMessage ? (
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-sm text-primary-900">
                {statusMessage}
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
          </>
        ) : (
          <>
            <div className="space-y-3">
              <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
                {t.joinTitle}
              </h1>
              <p className="text-slate-600 dark:text-slate-300">{t.joinMessage}</p>
            </div>
            {statusMessage ? (
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-sm text-primary-900">
                {statusMessage}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="text-left space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t.joinLabel}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={formState.status === 'loading'}>
                {formState.status === 'loading' ? t.joining : t.joinAction}
              </Button>
              {formState.status === 'success' || formState.status === 'error' ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    formState.status === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border border-error-200 bg-error-50 text-error-900'
                  }`}
                >
                  {formState.message}
                </div>
              ) : null}
            </form>
            {status === 'approved' ? (
              <Button type="button" variant="ghost" onClick={() => (window.location.href = '/login')}>
                {t.login}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
