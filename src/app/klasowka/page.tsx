'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Sparkles, Target } from 'lucide-react';
import { WordIntake } from '@/components/ai/WordIntake';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useHydration, useVocabStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import { getCategoryLabel } from '@/lib/categories';

const MIN_WORDS = 8;

const klasowkaCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Klasówka w 5 min',
    description: 'Wklej słówka lub wczytaj notatki. Wybierz i startuj quiz.',
    actions: ['Wklej słówka', 'Wczytaj zdjęcie', 'Wczytaj plik'],
    intakeTitle: 'Dodaj słówka',
    intakeSubtitle: (min: number) => `Minimum ${min} słówek, aby ruszyć dalej.`,
    summaryTitle: 'Zestaw gotowy',
    summarySubtitle: 'Sprawdź podsumowanie i startuj.',
    setLabel: 'Zestaw',
    wordCountLabel: 'Liczba słówek',
    categoryLabel: 'Kategoria',
    startQuiz: 'Start quizu',
    back: 'Wróć',
  },
  en: {
    loading: 'Loading...',
    title: 'Test in 5 minutes',
    description: 'Paste words or upload notes. Pick and start the quiz.',
    actions: ['Paste words', 'Upload a photo', 'Upload a file'],
    intakeTitle: 'Add words',
    intakeSubtitle: (min: number) => `Minimum ${min} words to continue.`,
    summaryTitle: 'Set ready',
    summarySubtitle: 'Review the summary and start.',
    setLabel: 'Set',
    wordCountLabel: 'Word count',
    categoryLabel: 'Category',
    startQuiz: 'Start quiz',
    back: 'Back',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Контрольна за 5 хв',
    description: 'Встав слова або завантаж нотатки. Обери і стартуй квіз.',
    actions: ['Встав слова', 'Завантаж фото', 'Завантаж файл'],
    intakeTitle: 'Додай слова',
    intakeSubtitle: (min: number) => `Мінімум ${min} слів, щоб продовжити.`,
    summaryTitle: 'Набір готовий',
    summarySubtitle: 'Перевір підсумок і стартуй.',
    setLabel: 'Набір',
    wordCountLabel: 'Кількість слів',
    categoryLabel: 'Категорія',
    startQuiz: 'Почати квіз',
    back: 'Назад',
  },
} as const;

type KlasowkaCopy = typeof klasowkaCopy.pl;

type Summary = {
  setId: string;
  setName: string;
  wordCount: number;
};

export default function KlasowkaPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (klasowkaCopy[language] ?? klasowkaCopy.pl) as KlasowkaCopy;
  const router = useRouter();
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [category, setCategory] = useState<string>('');

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  const handleWordsAdded = (payload: Summary) => {
    setSummary(payload);
    const setWords = vocabulary.filter((word) =>
      word.setIds?.includes(payload.setId)
    );
    if (setWords.length > 0 && setWords[0].category) {
      setCategory(setWords[0].category);
    }
  };

  const handleStartQuiz = () => {
    if (!summary) return;
    router.push(`/quiz?setId=${encodeURIComponent(summary.setId)}`);
  };

  const handleBack = () => {
    setSummary(null);
  };

  return (
    <div className="min-h-screen px-4 py-10 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Link
              href="/"
              className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              aria-label={t.back}
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="space-y-2">
              <h1 className="font-display text-3xl text-slate-900 dark:text-white">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {t.actions.map((action) => (
              <span
                key={action}
                className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/60 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                {action}
              </span>
            ))}
          </div>
        </header>

        {summary ? (
          <>
            <Card className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl">
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t.summaryTitle}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">
                      {summary.setName}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t.summarySubtitle}
                    </p>
                  </div>
                  <CheckCircle2 size={32} className="text-success-500" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t.setLabel}
                    </p>
                    <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                      {summary.setName}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t.wordCountLabel}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">
                      {summary.wordCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t.categoryLabel}
                    </p>
                    <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                      {getCategoryLabel(category, language)}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex flex-col gap-3 md:flex-row md:justify-end">
                  <Button variant="secondary" onClick={handleBack}>
                    {t.back}
                  </Button>
                  <Button size="lg" onClick={handleStartQuiz}>
                    <Target size={18} className="mr-2" />
                    {t.startQuiz}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
              <div className="flex gap-3 max-w-5xl mx-auto">
                <Button variant="secondary" onClick={handleBack} className="flex-1">
                  {t.back}
                </Button>
                <Button size="lg" onClick={handleStartQuiz} className="flex-1">
                  <Target size={18} className="mr-2" />
                  {t.startQuiz}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card className="rounded-3xl bg-white/80 dark:bg-slate-900/70 border border-white/50 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    {t.intakeTitle}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.intakeSubtitle(MIN_WORDS)}
                  </p>
                </div>
                <Sparkles className="text-primary-600" size={20} />
              </div>

              <WordIntake
                variant="onboarding"
                minWords={MIN_WORDS}
                onWordsAdded={handleWordsAdded}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
