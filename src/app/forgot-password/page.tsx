'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n';
import { useHydration } from '@/lib/store';

const copy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Zapomniałeś hasła?',
    description:
      'Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła.',
    emailPlaceholder: 'Email',
    submit: 'Wyślij link',
    sending: 'Wysyłanie...',
    backToLogin: 'Powrót do logowania',
    successTitle: 'Email wysłany!',
    successDescription:
      'Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła. Sprawdź swoją skrzynkę odbiorczą.',
    errorGeneric: 'Wystąpił błąd. Spróbuj ponownie.',
  },
  en: {
    loading: 'Loading...',
    title: 'Forgot password?',
    description:
      "Enter your email address and we'll send you a password reset link.",
    emailPlaceholder: 'Email',
    submit: 'Send link',
    sending: 'Sending...',
    backToLogin: 'Back to login',
    successTitle: 'Email sent!',
    successDescription:
      'If an account with this email exists, we have sent a password reset link. Check your inbox.',
    errorGeneric: 'An error occurred. Please try again.',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Забули пароль?',
    description:
      'Введіть свою електронну адресу, і ми надішлемо вам посилання для скидання пароля.',
    emailPlaceholder: 'Email',
    submit: 'Надіслати посилання',
    sending: 'Надсилання...',
    backToLogin: 'Повернутися до входу',
    successTitle: 'Email надіслано!',
    successDescription:
      'Якщо акаунт з цією адресою існує, ми надіслали посилання для скидання пароля. Перевірте вхідні.',
    errorGeneric: 'Виникла помилка. Спробуйте ще раз.',
  },
};

type Copy = typeof copy.pl;

export default function ForgotPasswordPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (copy[language] ?? copy.pl) as Copy;

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), language }),
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
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                <ArrowLeft size={16} />
                {t.backToLogin}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {t.title}
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {t.description}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />

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
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? t.sending : t.submit}
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
