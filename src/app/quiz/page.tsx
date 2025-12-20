'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Target, Shuffle, Clock, Keyboard, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuizSession, QuizResults } from '@/components/quiz/Quiz';
import { useVocabStore, useHydration } from '@/lib/store';
import { VocabularyItem, QuizMode, QuizResult } from '@/types';
import { cn, shuffleArray } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';

type SessionState = 'setup' | 'active' | 'results';

const quizModes: { id: QuizMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'en_to_pl',
    label: 'EN → PL',
    icon: <Target size={24} />,
    description: 'Słówko angielskie, wybierz polskie',
  },
  {
    id: 'pl_to_en',
    label: 'PL → EN',
    icon: <Target size={24} className="rotate-180" />,
    description: 'Słówko polskie, wybierz angielskie',
  },
  {
    id: 'typing',
    label: 'Wpisywanie',
    icon: <Keyboard size={24} />,
    description: 'Wpisz angielskie tłumaczenie',
  },
  {
    id: 'listening',
    label: 'Słuchanie',
    icon: <Volume2 size={24} />,
    description: 'Odsłuchaj i wybierz słówko',
  },
  {
    id: 'mixed',
    label: 'Mieszany',
    icon: <Shuffle size={24} />,
    description: 'Losowo wszystkie tryby',
  },
];

export default function QuizPage() {
  const hydrated = useHydration();
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [selectedMode, setSelectedMode] = useState<QuizMode>('en_to_pl');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedSetId, setSelectedSetId] = useState<'all' | 'unassigned' | string>('all');
  const [sessionWords, setSessionWords] = useState<VocabularyItem[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

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
    (words: VocabularyItem[]) => {
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

  const startQuiz = () => {
    const count = settings.session.quizQuestionCount;
    let words = filterBySet(getNextReviewWords(count));

    if (selectedCategory !== 'all') {
      words = words.filter((w) => w.category === selectedCategory);
    }

    if (words.length < 4) {
      // Need at least 4 words for quiz options
      words = filterBySet(vocabulary)
        .filter((w) => selectedCategory === 'all' || w.category === selectedCategory)
        .sort(() => Math.random() - 0.5);
    }

    const finalWords = words.slice(
      0,
      typeof count === 'number' ? count : words.length
    );

    if (finalWords.length < 4) {
      alert('Potrzebujesz minimum 4 słówek aby rozpocząć quiz!');
      return;
    }

    setSessionWords(shuffleArray(finalWords));
    setSessionState('active');
  };

  const handleComplete = (results: QuizResult[]) => {
    setQuizResults(results);
    updateStreak();
    incrementSessionCount();
    setSessionState('results');
  };

  const handleRetry = () => {
    // Retry with wrong answers only
    const wrongIds = quizResults.filter((r) => !r.correct).map((r) => r.vocabId);
    const wrongWords = vocabulary.filter((w) => wrongIds.includes(w.id));

    if (wrongWords.length >= 4) {
      setSessionWords(shuffleArray(wrongWords));
      setQuizResults([]);
      setSessionState('active');
    } else {
      alert('Potrzebujesz minimum 4 błędnych odpowiedzi aby powtórzyć!');
    }
  };

  if (sessionState === 'active') {
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
            Quiz - {quizModes.find((m) => m.id === selectedMode)?.label}
          </h1>
        </div>

        <QuizSession
          words={sessionWords}
          mode={selectedMode}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  if (sessionState === 'results') {
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
            Wyniki quizu
          </h1>
        </div>

        <QuizResults
          results={quizResults}
          words={sessionWords}
          onRetry={handleRetry}
          onClose={() => setSessionState('setup')}
        />
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
            Quiz
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Wybierz zestaw i sprawdź swoją wiedzę
          </p>
        </div>
      </div>

      {/* Quiz mode selection */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium text-slate-800 dark:text-slate-100">
            Tryb quizu
          </h3>
          <div className="grid gap-2">
            {quizModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  selectedMode === mode.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    selectedMode === mode.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  )}
                >
                  {mode.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {mode.label}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Set selection */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium text-slate-800 dark:text-slate-100">
            Zestaw
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSetId('all')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedSetId === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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
          <h3 className="font-medium text-slate-800 dark:text-slate-100">
            Kategoria
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              Wszystkie ({filteredVocabularyCount})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  selectedCategory === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                {getCategoryLabel(cat)} ({categoryCounts[cat] ?? 0})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings preview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Target size={16} />
                <span>
                  {settings.session.quizQuestionCount === 'all'
                    ? 'Wszystkie'
                    : settings.session.quizQuestionCount}{' '}
                  pytań
                </span>
              </div>
              {settings.session.timeLimit && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Clock size={16} />
                  <span>{settings.session.timeLimit}s</span>
                </div>
              )}
            </div>
            <Link href="/profile#settings" className="text-sm text-primary-500">
              Zmień
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Start button */}
      <Button onClick={startQuiz} size="lg" className="w-full">
        <Target size={20} className="mr-2" />
        Rozpocznij quiz
      </Button>
    </div>
  );
}
