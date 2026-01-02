'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n';
import { useHydration } from '@/lib/store';

const copy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Ustaw nowe hasło',
    description: 'Wprowadź nowe hasło dla swojego konta.',
    passwordPlaceholder: 'Nowe hasło',
    passwordConfirmPlaceholder: 'Potwierdź hasło',
    submit: 'Zmień hasło',
    saving: 'Zapisywanie...',
    backToLogin: 'Powrót do logowania',
    successTitle: 'Hasło zmienione!',
    successDescription:
      'Twoje hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.',
    signIn: 'Zaloguj się',
    invalidToken:
      'Link do resetowania hasła jest nieprawidłowy lub wygasł. Spróbuj ponownie.',
    requestNewLink: 'Poproś o nowy link',
    errorGeneric: 'Wystąpił błąd. Spróbuj ponownie.',
    passwordHint: 'Minimum 8 znaków, litera i cyfra',
  },
  en: {
    loading: 'Loading...',
    title: 'Set new password',
    description: 'Enter a new password for your account.',
    passwordPlaceholder: 'New password',
    passwordConfirmPlaceholder: 'Confirm password',
    submit: 'Change password',
    saving: 'Saving...',
    backToLogin: 'Back to login',
    successTitle: 'Password changed!',
    successDescription:
      'Your password has been changed successfully. You can now sign in.',
    signIn: 'Sign in',
    invalidToken:
      'The password reset link is invalid or has expired. Please try again.',
    requestNewLink: 'Request new link',
    errorGeneric: 'An error occurred. Please try again.',
    passwordHint: 'Minimum 8 characters, letter and number',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Встановити новий пароль',
    description: 'Введіть новий пароль для вашого акаунту.',
    passwordPlaceholder: 'Новий пароль',
    passwordConfirmPlaceholder: 'Підтвердіть пароль',
    submit: 'Змінити пароль',
    saving: 'Збереження...',
    backToLogin: 'Повернутися до входу',
    successTitle: 'Пароль змінено!',
    successDescription:
      'Ваш пароль успішно змінено. Тепер можете увійти.',
    signIn: 'Увійти',
    invalidToken:
      'Посилання для скидання пароля недійсне або застаріле. Спробуйте ще раз.',
    requestNewLink: 'Запросити нове посилання',
    errorGeneric: 'Виникла помилка. Спробуйте ще раз.',
    passwordHint: 'Мінімум 8 символів, літера та цифра',
  },
};

type Copy = typeof copy.pl;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (copy[language] ?? copy.pl) as Copy;

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          passwordConfirm,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t.errorGeneric);
        return;
      }

      setSuccess(true);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-10 dark:opacity-20" />

        <div className="w-full max-w-md relative z-10">
          <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-8 shadow-2xl shadow-primary-500/10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-error-600 dark:text-error-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300">{t.invalidToken}</p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              {t.requestNewLink}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-10 dark:opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-8 shadow-2xl shadow-primary-500/10">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {t.successTitle}
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                {t.successDescription}
              </p>
              <Link href="/login">
                <Button variant="gradient" size="lg" className="w-full">
                  {t.signIn}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {t.title}
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {t.description}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder={t.passwordConfirmPlaceholder}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.passwordHint}
                </p>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300 text-sm">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  variant="gradient"
                  className="w-full"
                  disabled={isLoading || !password || !passwordConfirm}
                >
                  {isLoading ? t.saving : t.submit}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                >
                  <ArrowLeft size={16} />
                  {t.backToLogin}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-4 flex items-center justify-center min-h-screen"><p className="text-slate-500">Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
