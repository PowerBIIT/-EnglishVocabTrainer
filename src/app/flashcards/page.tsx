'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Shuffle, Filter, Check } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FlashcardSession } from '@/components/flashcard/Flashcard';
import { useVocabStore, useHydration } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/i18n';

type SessionState = 'setup' | 'active' | 'complete';
const SESSION_COUNTS = [5, 10, 15, 20] as const;

const flashcardsCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Fiszki',
    subtitle: 'Wybierz zestaw lub kategorię i zacznij naukę',
    setTitle: 'Zestaw',
    categoryTitle: 'Kategoria',
    all: 'Wszystkie',
    unassigned: 'Bez zestawu',
    sessionSettings: 'Ustawienia sesji',
    change: 'Zmień',
    flashcardCount: 'Liczba fiszek',
    customCountLabel: 'Własna liczba',
    customCountPlaceholder: 'np. 12',
    wordOrder: 'Kolejność',
    orderRandom: 'Losowa',
    orderAlphabetical: 'Alfabetyczna',
    orderHardest: 'Najtrudniejsze',
    startSession: 'Rozpocznij sesję',
    tipTitle: 'Wskazówka',
    tipText:
      'Przeciągaj fiszki w prawo (umiem), w lewo (powtórz) lub w górę (trudne), aby szybciej się uczyć.',
    completeTitle: 'Gratulacje!',
    completeDesc: (count: number) => `Ukończyłeś sesję z ${count} fiszkami!`,
    newSession: 'Nowa sesja',
    goToQuiz: 'Przejdź do quizu',
    backToMenu: 'Wróć do menu',
  },
  en: {
    loading: 'Loading...',
    title: 'Flashcards',
    subtitle: 'Pick a set or category and start learning',
    setTitle: 'Set',
    categoryTitle: 'Category',
    all: 'All',
    unassigned: 'Unassigned',
    sessionSettings: 'Session settings',
    change: 'Change',
    flashcardCount: 'Flashcards',
    customCountLabel: 'Custom number',
    customCountPlaceholder: 'e.g. 12',
    wordOrder: 'Order',
    orderRandom: 'Random',
    orderAlphabetical: 'Alphabetical',
    orderHardest: 'Hardest first',
    startSession: 'Start session',
    tipTitle: 'Tip',
    tipText:
      'Swipe right (I know), left (repeat), or up (hard) to learn faster.',
    completeTitle: 'Great job!',
    completeDesc: (count: number) => `You finished a session with ${count} flashcards!`,
    newSession: 'New session',
    goToQuiz: 'Go to quiz',
    backToMenu: 'Back to menu',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Флешкарти',
    subtitle: 'Обери набір або категорію та почни навчання',
    setTitle: 'Набір',
    categoryTitle: 'Категорія',
    all: 'Усі',
    unassigned: 'Без набору',
    sessionSettings: 'Налаштування сесії',
    change: 'Змінити',
    flashcardCount: 'Кількість флешкарт',
    customCountLabel: 'Власна кількість',
    customCountPlaceholder: 'наприклад 12',
    wordOrder: 'Порядок',
    orderRandom: 'Випадковий',
    orderAlphabetical: 'Алфавітний',
    orderHardest: 'Найскладніші',
    startSession: 'Почати сесію',
    tipTitle: 'Порада',
    tipText:
      'Проведи картку вправо (знаю), вліво (повторити) або вгору (складне), щоб вчитися швидше.',
    completeTitle: 'Чудово!',
    completeDesc: (count: number) => `Ти завершив сесію з ${count} флешкартами!`,
    newSession: 'Нова сесія',
    goToQuiz: 'Перейти до квізу',
    backToMenu: 'Повернутися до меню',
  },
} as const;

type FlashcardsCopy = typeof flashcardsCopy.pl;

export default function FlashcardsPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (flashcardsCopy[language] ?? flashcardsCopy.pl) as FlashcardsCopy;
  const searchParams = useSearchParams();
  const setIdParam = searchParams.get('setId')?.trim() ?? '';
  const [appliedSetParam, setAppliedSetParam] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedSetId, setSelectedSetId] = useState<'all' | 'unassigned' | string>('all');
  const [sessionWords, setSessionWords] = useState<typeof vocabulary>([]);

  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const settings = useVocabStore((state) => state.settings);
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const sets = useVocabStore((state) => state.getActiveSets());
  const getNextReviewWords = useVocabStore((state) => state.getNextReviewWords);
  const updateStreak = useVocabStore((state) => state.updateStreak);
  const incrementSessionCount = useVocabStore((state) => state.incrementSessionCount);
  const [selectedFlashcardCount, setSelectedFlashcardCount] = useState<number | 'all'>(
    settings.session.flashcardCount
  );
  const [customFlashcardCount, setCustomFlashcardCount] = useState('');

  const setCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sets.forEach((set) => {
      counts[set.id] = 0;
    });
    vocabulary.forEach((word) => {
      const ids = word.setIds ?? [];
      ids.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [sets, vocabulary]);

  const unassignedCount = useMemo(
    () => vocabulary.filter((word) => (word.setIds ?? []).length === 0).length,
    [vocabulary]
  );

  const filterBySet = useCallback(
    (words: typeof vocabulary) => {
      if (selectedSetId === 'all') return words;
      if (selectedSetId === 'unassigned') {
        return words.filter((word) => (word.setIds ?? []).length === 0);
      }
      return words.filter((word) => (word.setIds ?? []).includes(selectedSetId));
    },
    [selectedSetId]
  );

  const categories = useMemo(() => {
    const filtered = filterBySet(vocabulary);
    return Array.from(new Set(filtered.map((word) => word.category)));
  }, [filterBySet, vocabulary]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (
      selectedSetId !== 'all' &&
      selectedSetId !== 'unassigned' &&
      !sets.some((set) => set.id === selectedSetId)
    ) {
      setSelectedSetId('all');
    }
  }, [selectedSetId, sets]);

  useEffect(() => {
    setSelectedFlashcardCount(settings.session.flashcardCount);
  }, [settings.session.flashcardCount]);

  const isCustomFlashcardCount =
    typeof selectedFlashcardCount === 'number' &&
    !SESSION_COUNTS.includes(
      selectedFlashcardCount as (typeof SESSION_COUNTS)[number]
    );

  useEffect(() => {
    setCustomFlashcardCount(
      isCustomFlashcardCount ? String(selectedFlashcardCount) : ''
    );
  }, [isCustomFlashcardCount, selectedFlashcardCount]);

  const applyCustomFlashcardCount = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return;
    const next = Math.max(parsed, 1);
    setSelectedFlashcardCount(next);
    setCustomFlashcardCount(String(next));
    updateSettings('session', { flashcardCount: next });
  };

  useEffect(() => {
    if (!hydrated || appliedSetParam) return;
    if (!setIdParam) {
      setAppliedSetParam(true);
      return;
    }
    // Check by id first, then by name (URL may contain either)
    const matchById = sets.find((set) => set.id === setIdParam);
    const matchByName = sets.find((set) => set.name === setIdParam);
    const match = matchById || matchByName;
    if (match) {
      setSelectedSetId(match.id);
    }
    setAppliedSetParam(true);
  }, [appliedSetParam, hydrated, setIdParam, sets]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [hydrated, sessionState]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filterBySet(vocabulary).forEach((word) => {
      counts[word.category] = (counts[word.category] || 0) + 1;
    });
    return counts;
  }, [filterBySet, vocabulary]);

  const filteredVocabularyCount = useMemo(
    () => filterBySet(vocabulary).length,
    [filterBySet, vocabulary]
  );
  const quizHref =
    selectedSetId !== 'all' && selectedSetId !== 'unassigned'
      ? `/quiz?setId=${encodeURIComponent(selectedSetId)}`
      : '/quiz';

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  const startSession = () => {
    const count = selectedFlashcardCount;
    let words = filterBySet(getNextReviewWords(count));

    if (selectedCategory !== 'all') {
      words = words.filter((w) => w.category === selectedCategory);
    }

    if (words.length === 0) {
      // If no words due for review, get some random words
      words = filterBySet(vocabulary)
        .filter((w) => selectedCategory === 'all' || w.category === selectedCategory)
        .sort(() => Math.random() - 0.5)
        .slice(0, typeof count === 'number' ? count : vocabulary.length);
    }

    setSessionWords(words);
    setSessionState('active');
  };

  const handleComplete = () => {
    updateStreak();
    incrementSessionCount();
    setSessionState('complete');
  };

  if (sessionState === 'active' && sessionWords.length > 0) {
    return (
      <div className="min-h-screen">
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => setSessionState('setup')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t.title}
          </h1>
        </div>

        <FlashcardSession words={sessionWords} onComplete={handleComplete} />
      </div>
    );
  }

  if (sessionState === 'complete') {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <Card variant="elevated" className="w-full max-w-md text-center p-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-success-50 dark:bg-success-900 flex items-center justify-center">
            <Check size={32} className="text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {t.completeTitle}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t.completeDesc(sessionWords.length)}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setSessionState('setup')}>
              {t.newSession}
            </Button>
            <Link href={quizHref}>
              <Button variant="secondary" className="w-full">
                {t.goToQuiz}
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                {t.backToMenu}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Set selection */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Filter size={18} />
            <span className="text-sm font-medium">{t.setTitle}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSetId('all')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedSetId === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              {t.all} ({vocabulary.length})
            </button>
            <button
              onClick={() => setSelectedSetId('unassigned')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedSetId === 'unassigned'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              {t.unassigned} ({unassignedCount})
            </button>
            {sets.map((set) => (
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  selectedSetId === set.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {set.name} ({setCounts[set.id] ?? 0})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category selection */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Filter size={18} />
            <span className="text-sm font-medium">{t.categoryTitle}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              )}
            >
              {t.all} ({filteredVocabularyCount})
            </button>
            {categories.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  {getCategoryLabel(cat, language)} ({count})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Session info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-primary-500" />
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {t.sessionSettings}
              </span>
            </div>
            <Link href="/profile#settings" className="text-sm text-primary-500">
              {t.change}
            </Link>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.flashcardCount}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {SESSION_COUNTS.map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setSelectedFlashcardCount(count);
                      updateSettings('session', { flashcardCount: count });
                    }}
                    className={cn(
                      'py-2 px-3 rounded-xl text-sm font-medium transition-colors',
                      selectedFlashcardCount === count
                        ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  {count}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedFlashcardCount('all');
                  updateSettings('session', { flashcardCount: 'all' });
                }}
                className={cn(
                  'py-2 px-3 rounded-xl text-sm font-medium transition-colors',
                  selectedFlashcardCount === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                )}
              >
                {t.all}
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                htmlFor="flashcards-custom-count"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                {t.customCountLabel}
              </label>
              <input
                id="flashcards-custom-count"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder={t.customCountPlaceholder}
                value={customFlashcardCount}
                onChange={(event) => setCustomFlashcardCount(event.target.value)}
                onBlur={() => applyCustomFlashcardCount(customFlashcardCount)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyCustomFlashcardCount(customFlashcardCount);
                  }
                }}
                className={cn(
                  'w-full sm:w-32 px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
                  isCustomFlashcardCount
                    ? 'border-primary-300 dark:border-primary-500/60'
                    : 'border-slate-200 dark:border-slate-600'
                )}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm">
            <p className="text-slate-500 dark:text-slate-400">{t.wordOrder}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {settings.session.wordOrder === 'random'
                ? t.orderRandom
                : settings.session.wordOrder === 'alphabetical'
                ? t.orderAlphabetical
                : t.orderHardest}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Start button */}
      <Button onClick={startSession} size="lg" className="w-full">
        <Shuffle size={20} className="mr-2" />
        {t.startSession}
      </Button>

      {/* Tips */}
      <Card className="bg-primary-50 dark:bg-primary-900 border-0">
        <CardContent className="p-4">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            <strong>{t.tipTitle}:</strong> {t.tipText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
