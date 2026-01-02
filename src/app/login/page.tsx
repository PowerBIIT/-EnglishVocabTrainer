'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { Compass, ShieldCheck, Sparkles, Eye, EyeOff, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useLanguage, isAppLanguage, type AppLanguage } from '@/lib/i18n';
import { useHydration, useVocabStore } from '@/lib/store';

const loginCopy = {
  pl: {
    loading: 'Ładowanie...',
    tagline: 'Nowy dzień, nowa misja',
    description: 'Zaloguj się i kontynuuj przygodę z nowoczesną nauką słówek.',
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
    // Email/password login
    orDivider: 'lub',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Hasło',
    signIn: 'Zaloguj się',
    forgotPassword: 'Zapomniałeś hasła?',
    noAccount: 'Nie masz konta?',
    register: 'Zarejestruj się',
    invalidCredentials: 'Nieprawidłowy email lub hasło',
    emailNotVerified: 'Potwierdź swój adres email przed zalogowaniem. Sprawdź skrzynkę odbiorczą.',
    emailVerified: 'Email potwierdzony! Możesz się teraz zalogować.',
    invalidToken: 'Link weryfikacyjny jest nieprawidłowy lub wygasł.',
    tokenExpired: 'Link weryfikacyjny wygasł. Zarejestruj się ponownie.',
    userNotFound: 'Użytkownik nie został znaleziony.',
    verificationFailed: 'Weryfikacja nie powiodła się. Spróbuj ponownie.',
    resendVerification: 'Wyślij ponownie email weryfikacyjny',
    resendSuccess: 'Email weryfikacyjny został wysłany.',
    resendError: 'Nie udało się wysłać emaila. Spróbuj ponownie.',
  },
  en: {
    loading: 'Loading...',
    tagline: 'New day, new mission',
    description: 'Sign in and continue your modern vocab journey.',
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
    // Email/password login
    orDivider: 'or',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    signIn: 'Sign in',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    register: 'Register',
    invalidCredentials: 'Invalid email or password',
    emailNotVerified: 'Please confirm your email before signing in. Check your inbox.',
    emailVerified: 'Email confirmed! You can now sign in.',
    invalidToken: 'The verification link is invalid or has expired.',
    tokenExpired: 'The verification link has expired. Please register again.',
    userNotFound: 'User not found.',
    verificationFailed: 'Verification failed. Please try again.',
    resendVerification: 'Resend verification email',
    resendSuccess: 'Verification email sent.',
    resendError: 'Failed to send email. Please try again.',
  },
  uk: {
    loading: 'Завантаження...',
    tagline: 'Новий день, нова місія',
    description: 'Увійди і продовжуй сучасну пригоду зі словами.',
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
    // Email/password login
    orDivider: 'або',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Пароль',
    signIn: 'Увійти',
    forgotPassword: 'Забули пароль?',
    noAccount: 'Немає акаунту?',
    register: 'Зареєструватися',
    invalidCredentials: 'Невірний email або пароль',
    emailNotVerified: 'Підтвердіть свою електронну пошту перед входом. Перевірте вхідні.',
    emailVerified: 'Email підтверджено! Тепер можете увійти.',
    invalidToken: 'Посилання для підтвердження недійсне або застаріле.',
    tokenExpired: 'Посилання для підтвердження застаріло. Зареєструйтеся знову.',
    userNotFound: 'Користувача не знайдено.',
    verificationFailed: 'Перевірка не вдалася. Спробуйте ще раз.',
    resendVerification: 'Надіслати лист підтвердження знову',
    resendSuccess: 'Лист підтвердження надіслано.',
    resendError: 'Не вдалося надіслати email. Спробуйте ще раз.',
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Email/password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // URL params for verification status
  const verified = searchParams.get('verified');
  const urlError = searchParams.get('error');

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: email.trim(),
      password,
      callbackUrl: '/',
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === 'EMAIL_NOT_VERIFIED') {
        setError(t.emailNotVerified);
      } else {
        setError(t.invalidCredentials);
      }
      return;
    }

    router.replace(result?.url ?? '/');
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    setResendSuccess(false);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), language }),
      });

      if (res.ok) {
        setResendSuccess(true);
      } else {
        setError(t.resendError);
      }
    } catch {
      setError(t.resendError);
    } finally {
      setResendLoading(false);
    }
  };

  const getUrlErrorMessage = () => {
    switch (urlError) {
      case 'invalid_token':
        return t.invalidToken;
      case 'token_expired':
        return t.tokenExpired;
      case 'user_not_found':
        return t.userNotFound;
      case 'verification_failed':
        return t.verificationFailed;
      default:
        return null;
    }
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
          {/* Success/Error messages from URL params */}
          {verified === 'true' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 text-sm">
              <CheckCircle2 size={18} />
              {t.emailVerified}
            </div>
          )}
          {getUrlErrorMessage() && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 text-sm">
              <AlertCircle size={18} />
              {getUrlErrorMessage()}
            </div>
          )}

          <div className="space-y-3">
            <Button
              size="lg"
              variant="gradient"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              {t.signInGoogle}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-sm text-slate-400 dark:text-slate-500">{t.orDivider}</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Email/Password form */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{error}</p>
                    {error === t.emailNotVerified && email.trim() && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="mt-2 flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                      >
                        <Mail size={14} />
                        {resendLoading ? '...' : t.resendVerification}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {resendSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 text-sm">
                  <CheckCircle2 size={18} />
                  {t.resendSuccess}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                variant="secondary"
                className="w-full"
                disabled={isLoading || !email.trim() || !password}
              >
                {isLoading ? '...' : t.signIn}
              </Button>
            </form>

            {/* Links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
              <Link
                href="/forgot-password"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {t.forgotPassword}
              </Link>
              <span className="text-slate-500 dark:text-slate-400">
                {t.noAccount}{' '}
                <Link
                  href="/register"
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                >
                  {t.register}
                </Link>
              </span>
            </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 flex items-center justify-center min-h-screen"><p className="text-slate-500">Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}
