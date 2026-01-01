'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useLanguage, isAppLanguage, type AppLanguage } from '@/lib/i18n';
import { useHydration, useVocabStore } from '@/lib/store';

const loginCopy = {
  pl: {
    loading: 'Ładowanie...',
    tagline: 'Nowy dzień, nowa misja',
    description: 'Zaloguj się przez Google i kontynuuj przygodę z nowoczesną nauką słówek.',
    signInGoogle: 'Zaloguj się przez Google',
    noGuest: 'Bez trybu gościa, dane zawsze zsynchronizowane.',
    testLoginTitle: 'Logowanie testowe (E2E)',
    testEmailPlaceholder: 'Email testowy',
    testPasswordPlaceholder: 'Hasło testowe',
    testLoginError: 'Nieprawidłowe dane testowe.',
    testLoginButton: 'Zaloguj testowo',
    guideLabel: 'Twój przyjaciel Henio',
    guideNote: 'Wybierz styl Henia w onboardingu',
    languageLabel: 'Język',
  },
  en: {
    loading: 'Loading...',
    tagline: 'New day, new mission',
    description: 'Sign in with Google and continue your modern vocab journey.',
    signInGoogle: 'Sign in with Google',
    noGuest: 'No guest mode, your data is always synced.',
    testLoginTitle: 'Test login (E2E)',
    testEmailPlaceholder: 'Test email',
    testPasswordPlaceholder: 'Test password',
    testLoginError: 'Invalid test credentials.',
    testLoginButton: 'Sign in (test)',
    guideLabel: 'Your friend Henio',
    guideNote: "Choose Henio's style in onboarding",
    languageLabel: 'Language',
  },
  uk: {
    loading: 'Завантаження...',
    tagline: 'Новий день, нова місія',
    description: 'Увійди через Google і продовжуй сучасну пригоду зі словами.',
    signInGoogle: 'Увійти через Google',
    noGuest: 'Без гостьового режиму, дані завжди синхронізовані.',
    testLoginTitle: 'Тестовий вхід (E2E)',
    testEmailPlaceholder: 'Тестовий email',
    testPasswordPlaceholder: 'Тестовий пароль',
    testLoginError: 'Невірні тестові дані.',
    testLoginButton: 'Увійти (тест)',
    guideLabel: 'Твій друг Геньо',
    guideNote: 'Обери стиль Геньо у онбордингу',
    languageLabel: 'Мова',
  },
} as const;

type LoginCopy = typeof loginCopy.pl;

const detectPreferredLanguage = (): AppLanguage => {
  if (typeof navigator === 'undefined') return 'pl';
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (languages.some((lang) => lang.toLowerCase().startsWith('uk'))) return 'uk';
  if (languages.some((lang) => lang.toLowerCase().startsWith('ru'))) return 'uk';
  if (languages.some((lang) => lang.toLowerCase().startsWith('pl'))) return 'pl';
  if (languages.some((lang) => lang.toLowerCase().startsWith('en'))) return 'en';
  return 'pl';
};

const languageOptions = [
  {
    id: 'uk',
    label: 'UA',
    name: 'Українська',
    flagEmoji: '🇺🇦',
    flagSrc: '/flags/ua.svg',
  },
  {
    id: 'pl',
    label: 'PL',
    name: 'Polski',
    flagEmoji: '🇵🇱',
    flagSrc: '/flags/pl.svg',
  },
  {
    id: 'en',
    label: 'EN',
    name: 'English',
    flagEmoji: '🇬🇧',
    flagSrc: '/flags/gb.svg',
  },
] as const;

const isEnvEnabled = (value?: string) => value === 'true' || value === '1';

function FlagIcon({ src, fallback }: { src: string; fallback: string }) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <span className="text-base" aria-hidden="true">
        {fallback}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={24}
      height={16}
      className="h-4 w-6 rounded-sm object-cover"
      onError={() => setUseFallback(true)}
      unoptimized
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const hydrated = useHydration();
  const language = useLanguage();
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const t = (loginCopy[language] ?? loginCopy.pl) as LoginCopy;
  const isE2E =
    isEnvEnabled(process.env.NEXT_PUBLIC_E2E_TEST) &&
    process.env.NODE_ENV !== 'production';
  const [e2eEmail, setE2eEmail] = useState('');
  const [e2ePassword, setE2ePassword] = useState('');
  const [e2eError, setE2eError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    const destination = session?.user?.onboardingComplete ? '/' : '/onboarding';
    router.replace(destination);
  }, [router, session?.user?.onboardingComplete, status]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const storedLanguage = window.localStorage.getItem('uiLanguage');
      if (storedLanguage && isAppLanguage(storedLanguage) && storedLanguage !== language) {
        updateSettings('general', { language: storedLanguage });
      } else if (!storedLanguage) {
        // First visit - detect language from browser
        const preferred = detectPreferredLanguage();
        if (preferred !== language) {
          updateSettings('general', { language: preferred });
          window.localStorage.setItem('uiLanguage', preferred);
        }
      }
    } catch (error) {
      console.warn('Unable to read stored language preference.', error);
    }
  }, [hydrated, language, updateSettings]);

  const handleE2ELogin = async () => {
    setE2eError('');
    const result = await signIn('credentials', {
      redirect: false,
      email: e2eEmail,
      password: e2ePassword,
      callbackUrl: '/',
    });

    if (result?.error) {
      setE2eError(t.testLoginError);
      return;
    }

    router.replace(result?.url ?? '/');
  };

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-10 dark:opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-3xl grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center relative z-10">
        <div className="space-y-6">
          {/* Language selector in top right */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-lg shadow-primary-500/10">
              <Compass size={18} className="text-primary-500" />
              {t.tagline}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-1 shadow-lg shadow-primary-500/10">
                {languageOptions.map((option) => {
                  const isActive = option.id === language;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        updateSettings('general', { language: option.id });
                        try {
                          window.localStorage.setItem('uiLanguage', option.id);
                          window.localStorage.setItem('pendingLanguage', option.id);
                        } catch (error) {
                          console.warn('Unable to store language preference.', error);
                        }
                      }}
                      aria-label={option.name}
                      aria-pressed={isActive}
                      title={option.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-md'
                          : 'text-slate-500 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400'
                      }`}
                    >
                      <FlagIcon src={option.flagSrc} fallback={option.flagEmoji} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
            Henio
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            {t.description}
          </p>
          <div className="space-y-3">
            <Button
              size="lg"
              variant="gradient"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              {t.signInGoogle}
            </Button>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck size={16} className="text-primary-500" />
              {t.noGuest}
            </div>
          </div>
          {isE2E && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.testLoginTitle}
              </p>
              <input
                data-testid="e2e-email"
                type="email"
                value={e2eEmail}
                onChange={(e) => setE2eEmail(e.target.value)}
                placeholder={t.testEmailPlaceholder}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                data-testid="e2e-password"
                type="password"
                value={e2ePassword}
                onChange={(e) => setE2ePassword(e.target.value)}
                placeholder={t.testPasswordPlaceholder}
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
                {t.testLoginButton}
              </Button>
            </div>
          )}
        </div>
        <div className="relative">
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary-400 to-pink-400 opacity-40 blur-3xl" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-blue-400/30 blur-2xl" />
          <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-6 shadow-2xl shadow-primary-500/10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.guideLabel}</p>
                <p className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                  {t.guideNote}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                <Sparkles className="text-white" size={20} />
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400/20 to-pink-400/20 rounded-full blur-xl scale-110" />
                <MascotAvatar skinId="explorer" size={160} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
