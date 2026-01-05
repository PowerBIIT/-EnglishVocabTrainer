'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, Mail, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MascotAvatar } from '@/components/mascot/MascotAvatar';
import { useLanguage, isAppLanguage, type AppLanguage } from '@/lib/i18n';
import { useHydration, useVocabStore } from '@/lib/store';

const registerCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Rejestracja',
    subtitle: 'Utwórz konto i zacznij naukę z Henio',
    emailLabel: 'Email',
    emailPlaceholder: 'twoj@email.com',
    passwordLabel: 'Hasło',
    passwordPlaceholder: 'Minimum 8 znaków',
    passwordConfirmLabel: 'Potwierdź hasło',
    passwordConfirmPlaceholder: 'Powtórz hasło',
    termsLabel: 'Akceptuję regulamin i politykę prywatności',
    ageLabel: 'Mam ukończone 16 lat',
    register: 'Zarejestruj się',
    registering: 'Rejestrowanie...',
    haveAccount: 'Masz już konto?',
    login: 'Zaloguj się',
    orGoogle: 'lub zaloguj się przez Google',
    success: 'Rejestracja zakończona!',
    successMessage: 'Sprawdź swoją skrzynkę email i kliknij link potwierdzający.',
    backToLogin: 'Wróć do logowania',
    passwordHint: 'Min. 8 znaków, litera i cyfra',
    // Waitlist copy
    waitlistTitle: 'Zapisz się na listę oczekujących',
    waitlistSubtitle: 'Obecnie liczba miejsc jest ograniczona. Zostaw email, a damy znać gdy zwolni się miejsce.',
    waitlistEmailLabel: 'Twój email',
    waitlistJoin: 'Zapisz się',
    waitlistJoining: 'Zapisywanie...',
    waitlistSuccess: 'Sprawdź skrzynkę email i potwierdź zapis klikając w link.',
    waitlistError: 'Nie udało się zapisać. Spróbuj ponownie.',
  },
  en: {
    loading: 'Loading...',
    title: 'Register',
    subtitle: 'Create an account and start learning with Henio',
    emailLabel: 'Email',
    emailPlaceholder: 'your@email.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Minimum 8 characters',
    passwordConfirmLabel: 'Confirm password',
    passwordConfirmPlaceholder: 'Repeat password',
    termsLabel: 'I accept the terms and privacy policy',
    ageLabel: 'I am at least 16 years old',
    register: 'Register',
    registering: 'Registering...',
    haveAccount: 'Already have an account?',
    login: 'Sign in',
    orGoogle: 'or sign in with Google',
    success: 'Registration complete!',
    successMessage: 'Check your email and click the confirmation link.',
    backToLogin: 'Back to login',
    passwordHint: 'Min. 8 chars, letter and number',
    // Waitlist copy
    waitlistTitle: 'Join the waitlist',
    waitlistSubtitle: 'Access is limited right now. Leave your email and we will notify you when a spot opens up.',
    waitlistEmailLabel: 'Your email',
    waitlistJoin: 'Join waitlist',
    waitlistJoining: 'Joining...',
    waitlistSuccess: 'Check your email and click the confirmation link.',
    waitlistError: 'Could not submit. Please try again.',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Реєстрація',
    subtitle: 'Створіть акаунт і почніть вчитися з Henio',
    emailLabel: 'Email',
    emailPlaceholder: 'ваш@email.com',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Мінімум 8 символів',
    passwordConfirmLabel: 'Підтвердіть пароль',
    passwordConfirmPlaceholder: 'Повторіть пароль',
    termsLabel: 'Я приймаю умови та політику конфіденційності',
    ageLabel: 'Мені щонайменше 16 років',
    register: 'Зареєструватися',
    registering: 'Реєстрація...',
    haveAccount: 'Вже маєте акаунт?',
    login: 'Увійти',
    orGoogle: 'або увійдіть через Google',
    success: 'Реєстрація завершена!',
    successMessage: 'Перевірте свою електронну пошту та натисніть посилання для підтвердження.',
    backToLogin: 'Повернутися до входу',
    passwordHint: 'Мін. 8 символів, літера і цифра',
    // Waitlist copy
    waitlistTitle: 'Приєднатися до списку очікування',
    waitlistSubtitle: "Зараз кількість місць обмежена. Залиште email і ми повідомимо, коли з'явиться місце.",
    waitlistEmailLabel: 'Ваш email',
    waitlistJoin: 'Приєднатися',
    waitlistJoining: 'Надсилаємо...',
    waitlistSuccess: 'Перевірте пошту та підтвердіть адресу.',
    waitlistError: 'Не вдалося надіслати. Спробуйте ще раз.',
  },
} as const;

type RegisterCopy = typeof registerCopy.pl;

const languageOptions = [
  { id: 'uk', label: 'UA', name: 'Українська', flagSrc: '/flags/ua.svg', flagEmoji: '🇺🇦' },
  { id: 'pl', label: 'PL', name: 'Polski', flagSrc: '/flags/pl.svg', flagEmoji: '🇵🇱' },
  { id: 'en', label: 'EN', name: 'English', flagSrc: '/flags/gb.svg', flagEmoji: '🇬🇧' },
] as const;

function FlagIcon({ src, fallback }: { src: string; fallback: string }) {
  const [useFallback, setUseFallback] = useState(false);
  if (useFallback) return <span className="text-base">{fallback}</span>;
  return (
    <Image
      src={src}
      alt=""
      width={24}
      height={16}
      className="h-4 w-6 rounded-sm object-cover"
      onError={() => setUseFallback(true)}
      unoptimized
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const hydrated = useHydration();
  const language = useLanguage();
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const t = (registerCopy[language] ?? registerCopy.pl) as RegisterCopy;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [capacityChecked, setCapacityChecked] = useState(false);
  const [hasCapacity, setHasCapacity] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');

  // Check if there's capacity for new users
  useEffect(() => {
    const checkCapacity = async () => {
      try {
        const res = await fetch('/api/auth/check-capacity');
        if (res.ok) {
          const data = await res.json();
          setHasCapacity(data.hasCapacity);
        }
      } catch {
        // On error, assume capacity available
        setHasCapacity(true);
      } finally {
        setCapacityChecked(true);
      }
    };
    checkCapacity();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          passwordConfirm,
          termsAccepted,
          ageConfirmed,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(true);

      // Google Ads conversion tracking
      if (typeof window !== 'undefined' && window.gtag && process.env.NEXT_PUBLIC_GOOGLE_ADS_ID && process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID) {
        window.gtag('event', 'conversion', {
          'send_to': `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID}`,
        });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError('');
    setWaitlistLoading(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitlistEmail,
          language,
          source: 'register_page_capacity_full',
        }),
      });

      if (!response.ok) {
        setWaitlistError(t.waitlistError);
        return;
      }

      setWaitlistSuccess(true);
    } catch {
      setWaitlistError(t.waitlistError);
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (!hydrated || !capacityChecked) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  // Show waitlist form when no capacity available
  if (!hasCapacity) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-10 dark:opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          {/* Language selector */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-1 shadow-lg shadow-primary-500/10">
              {languageOptions.map((option) => {
                const isActive = option.id === language;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      updateSettings('general', { language: option.id as AppLanguage });
                      try {
                        window.localStorage.setItem('uiLanguage', option.id);
                      } catch {}
                    }}
                    title={option.name}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-md'
                        : 'text-slate-500 hover:text-primary-600'
                    }`}
                  >
                    <FlagIcon src={option.flagSrc} fallback={option.flagEmoji} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-6 sm:p-8 shadow-2xl shadow-primary-500/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-display bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                  {t.waitlistTitle}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t.waitlistSubtitle}
                </p>
              </div>
              <MascotAvatar skinId="explorer" size={56} />
            </div>

            {waitlistSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <Mail size={32} className="text-success-600" />
                </div>
                <p className="text-slate-600 dark:text-slate-300">{t.waitlistSuccess}</p>
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    {t.login}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.waitlistEmailLabel}
                  </label>
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {waitlistError && (
                  <div className="p-3 rounded-xl bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800">
                    <p className="text-sm text-error-600 dark:text-error-400">{waitlistError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={waitlistLoading}
                >
                  {waitlistLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      {t.waitlistJoining}
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} className="mr-2" />
                      {t.waitlistJoin}
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.haveAccount}{' '}
                <Link href="/login" className="text-primary-600 hover:underline font-medium">
                  {t.login}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-10 dark:opacity-20" />
        <div className="w-full max-w-md relative z-10">
          <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
              <Mail size={32} className="text-success-600" />
            </div>
            <h1 className="text-2xl font-display text-slate-900 dark:text-white mb-2">
              {t.success}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {t.successMessage}
            </p>
            <Link href="/login">
              <Button variant="gradient" className="w-full">
                {t.backToLogin}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-10 dark:opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Language selector */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-1 shadow-lg shadow-primary-500/10">
            {languageOptions.map((option) => {
              const isActive = option.id === language;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateSettings('general', { language: option.id as AppLanguage });
                    try {
                      window.localStorage.setItem('uiLanguage', option.id);
                    } catch {}
                  }}
                  title={option.name}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-primary-600'
                  }`}
                >
                  <FlagIcon src={option.flagSrc} fallback={option.flagEmoji} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-6 sm:p-8 shadow-2xl shadow-primary-500/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t.subtitle}
              </p>
            </div>
            <MascotAvatar skinId="explorer" size={56} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">{t.passwordHint}</p>
            </div>

            {/* Password Confirm */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.passwordConfirmLabel}
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={t.passwordConfirmPlaceholder}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Consent checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 transition-colors ${
                      termsAccepted
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {termsAccepted && <Check size={16} className="text-white m-auto" />}
                  </div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {t.termsLabel}{' '}
                  <Link href="/terms" className="text-primary-600 hover:underline">
                    (regulamin)
                  </Link>
                  {' '}
                  <Link href="/privacy" className="text-primary-600 hover:underline">
                    (prywatność)
                  </Link>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 transition-colors ${
                      ageConfirmed
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {ageConfirmed && <Check size={16} className="text-white m-auto" />}
                  </div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {t.ageLabel}
                </span>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800">
                <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isLoading || !termsAccepted || !ageConfirmed}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  {t.registering}
                </>
              ) : (
                <>
                  <UserPlus size={20} className="mr-2" />
                  {t.register}
                </>
              )}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.haveAccount}{' '}
              <Link href="/login" className="text-primary-600 hover:underline font-medium">
                {t.login}
              </Link>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t.orGoogle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
