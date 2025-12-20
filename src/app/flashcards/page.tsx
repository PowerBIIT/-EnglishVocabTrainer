'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Shuffle, Filter, Check } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FlashcardSession } from '@/components/flashcard/Flashcard';
import { useVocabStore, useHydration } from '@/lib/store';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';

type SessionState = 'setup' | 'active' | 'complete';

export default function FlashcardsPage() {
  const hydrated = useHydration();
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedSetId, setSelectedSetId] = useState<'all' | 'unassigned' | string>('all');
  const [sessionWords, setSessionWords] = useState<typeof vocabulary>([]);

  const vocabulary = useVocabStore((state) => state.vocabulary);
  const settings = useVocabStore((state) => state.settings);
  const sets = useVocabStore((state) => state.sets);
  const getNextReviewWords = useVocabStore((state) => state.getNextReviewWords);
  const updateStreak = useVocabStore((state) => state.updateStreak);
  const incrementSessionCount = useVocabStore((state) => state.incrementSessionCount);

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

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  const startSession = () => {
    const count = settings.session.flashcardCount;
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
            Fiszki
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
            Gratulacje!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Ukończyłeś sesję z {sessionWords.length} fiszkami!
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => setSessionState('setup')}>
              Nowa sesja
            </Button>
            <Link href="/quiz">
              <Button variant="secondary" className="w-full">
                Przejdź do quizu
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Wróć do menu
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
            Fiszki
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Wybierz zestaw lub kategorię i zacznij naukę
          </p>
        </div>
      </div>

      {/* Set selection */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Filter size={18} />
            <span className="text-sm font-medium">Zestaw</span>
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
              Wszystkie ({vocabulary.length})
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
              Bez zestawu ({unassignedCount})
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
            <span className="text-sm font-medium">Kategoria</span>
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
              Wszystkie ({filteredVocabularyCount})
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
                  {getCategoryLabel(cat)} ({count})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Session info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-primary-500" />
              <span className="font-medium text-slate-800 dark:text-slate-100">
                Ustawienia sesji
              </span>
            </div>
            <Link href="/profile#settings" className="text-sm text-primary-500">
              Zmień
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-slate-500 dark:text-slate-400">Liczba fiszek</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {settings.session.flashcardCount === 'all'
                  ? 'Wszystkie'
                  : settings.session.flashcardCount}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-slate-500 dark:text-slate-400">Kolejność</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {settings.session.wordOrder === 'random'
                  ? 'Losowa'
                  : settings.session.wordOrder === 'alphabetical'
                  ? 'Alfabetyczna'
                  : 'Najtrudniejsze'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start button */}
      <Button onClick={startSession} size="lg" className="w-full">
        <Shuffle size={20} className="mr-2" />
        Rozpocznij sesję
      </Button>

      {/* Tips */}
      <Card className="bg-primary-50 dark:bg-primary-900 border-0">
        <CardContent className="p-4">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            <strong>Wskazówka:</strong> Przeciągaj fiszki w prawo (umiem),
            w lewo (powtórz) lub w górę (trudne), aby szybciej się uczyć.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
