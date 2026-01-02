'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Target, Shuffle, Clock, Keyboard, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuizSession, QuizResults } from '@/components/quiz/Quiz';
import { useVocabStore, useHydration } from '@/lib/store';
import { VocabularyItem, QuizMode, QuizResult } from '@/types';
import { cn, shuffleArray } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/i18n';
import { getLanguageLabel, getLearningPair } from '@/lib/languages';

type SessionState = 'setup' | 'active' | 'results';
type QuizModeOption = {
  id: QuizMode;
  label: string;
  icon: JSX.Element;
  description: string;
};

const quizPageCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Quiz',
    subtitle: 'Wybierz zestaw i sprawdź swoją wiedzę',
    modeTitle: 'Tryb quizu',
    setTitle: 'Zestaw',
    categoryTitle: 'Kategoria',
    all: 'Wszystkie',
    unassigned: 'Bez zestawu',
    change: 'Zmień',
    startQuiz: 'Rozpocznij quiz',
    quizResults: 'Wyniki quizu',
    quizWithMode: (label: string) => `Quiz - ${label}`,
    needFourWords: 'Potrzebujesz minimum 4 słówek aby rozpocząć quiz!',
    needFourWrong: 'Potrzebujesz minimum 4 błędnych odpowiedzi aby powtórzyć!',
    questionsLabel: (count: number | 'all') =>
      `${count === 'all' ? 'Wszystkie' : count} pytań`,
    modeTargetToNative: (target: string, native: string) => `${target} → ${native}`,
    modeTargetToNativeDesc: (target: string, native: string) =>
      `Słówko ${target.toLowerCase()}, wybierz tłumaczenie ${native.toLowerCase()}`,
    modeNativeToTarget: (native: string, target: string) => `${native} → ${target}`,
    modeNativeToTargetDesc: (native: string, target: string) =>
      `Słówko ${native.toLowerCase()}, wybierz tłumaczenie ${target.toLowerCase()}`,
    modeTyping: 'Wpisywanie',
    modeTypingDesc: (target: string) => `Wpisz tłumaczenie w języku ${target.toLowerCase()}`,
    modeListening: 'Słuchanie',
    modeListeningDesc: (target: string, native: string) =>
      `Odsłuchaj słowo (${target.toLowerCase()}) i wybierz tłumaczenie ${native.toLowerCase()}`,
    modeMixed: 'Mieszany',
    modeMixedDesc: 'Losowo wszystkie tryby',
  },
  en: {
    loading: 'Loading...',
    title: 'Quiz',
    subtitle: 'Pick a set and test your knowledge',
    modeTitle: 'Quiz mode',
    setTitle: 'Set',
    categoryTitle: 'Category',
    all: 'All',
    unassigned: 'Unassigned',
    change: 'Change',
    startQuiz: 'Start quiz',
    quizResults: 'Quiz results',
    quizWithMode: (label: string) => `Quiz - ${label}`,
    needFourWords: 'You need at least 4 words to start the quiz.',
    needFourWrong: 'You need at least 4 wrong answers to retry.',
    questionsLabel: (count: number | 'all') =>
      `${count === 'all' ? 'All' : count} questions`,
    modeTargetToNative: (target: string, native: string) => `${target} → ${native}`,
    modeTargetToNativeDesc: (target: string, native: string) =>
      `${target} word, choose the ${native} translation`,
    modeNativeToTarget: (native: string, target: string) => `${native} → ${target}`,
    modeNativeToTargetDesc: (native: string, target: string) =>
      `${native} word, choose the ${target} translation`,
    modeTyping: 'Typing',
    modeTypingDesc: (target: string) => `Type the ${target} translation`,
    modeListening: 'Listening',
    modeListeningDesc: (target: string, native: string) =>
      `Listen to a ${target} word and choose the ${native} translation`,
    modeMixed: 'Mixed',
    modeMixedDesc: 'Random all modes',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Квіз',
    subtitle: 'Обери набір і перевір свої знання',
    modeTitle: 'Режим квізу',
    setTitle: 'Набір',
    categoryTitle: 'Категорія',
    all: 'Усі',
    unassigned: 'Без набору',
    change: 'Змінити',
    startQuiz: 'Почати квіз',
    quizResults: 'Результати квізу',
    quizWithMode: (label: string) => `Квіз - ${label}`,
    needFourWords: 'Потрібно щонайменше 4 слова, щоб почати квіз!',
    needFourWrong: 'Потрібно щонайменше 4 помилки, щоб повторити!',
    questionsLabel: (count: number | 'all') =>
      `${count === 'all' ? 'Усі' : count} запитань`,
    modeTargetToNative: (target: string, native: string) => `${target} → ${native}`,
    modeTargetToNativeDesc: (target: string, native: string) =>
      `Слово ${target.toLowerCase()}, обери переклад ${native.toLowerCase()}`,
    modeNativeToTarget: (native: string, target: string) => `${native} → ${target}`,
    modeNativeToTargetDesc: (native: string, target: string) =>
      `Слово ${native.toLowerCase()}, обери переклад ${target.toLowerCase()}`,
    modeTyping: 'Введення',
    modeTypingDesc: (target: string) => `Введи переклад мовою ${target.toLowerCase()}`,
    modeListening: 'Слухання',
    modeListeningDesc: (target: string, native: string) =>
      `Прослухай слово (${target.toLowerCase()}) і обери переклад ${native.toLowerCase()}`,
    modeMixed: 'Змішаний',
    modeMixedDesc: 'Випадково всі режими',
  },
} as const;

type QuizPageCopy = typeof quizPageCopy.pl;

export default function QuizPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (quizPageCopy[language] ?? quizPageCopy.pl) as QuizPageCopy;
  const searchParams = useSearchParams();
  const setIdParam = searchParams.get('setId')?.trim() ?? '';
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [selectedMode, setSelectedMode] = useState<QuizMode>('en_to_pl');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedSetId, setSelectedSetId] = useState<'all' | 'unassigned' | string>('all');
  const [sessionWords, setSessionWords] = useState<VocabularyItem[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [appliedSetParam, setAppliedSetParam] = useState(false);

  const learning = useVocabStore((state) => state.settings.learning);
  const activePair = useMemo(() => getLearningPair(learning.pairId), [learning.pairId]);
  const targetLabel = getLanguageLabel(activePair.target, language);
  const nativeLabel = getLanguageLabel(activePair.native, language);

  const quizModes = useMemo<QuizModeOption[]>(
    () => [
      {
        id: 'en_to_pl',
        label: t.modeTargetToNative(targetLabel, nativeLabel),
        icon: <Target size={24} />,
        description: t.modeTargetToNativeDesc(targetLabel, nativeLabel),
      },
      {
        id: 'pl_to_en',
        label: t.modeNativeToTarget(nativeLabel, targetLabel),
        icon: <Target size={24} className="rotate-180" />,
        description: t.modeNativeToTargetDesc(nativeLabel, targetLabel),
      },
      {
        id: 'typing',
        label: t.modeTyping,
        icon: <Keyboard size={24} />,
        description: t.modeTypingDesc(targetLabel),
      },
      {
        id: 'listening',
        label: t.modeListening,
        icon: <Volume2 size={24} />,
        description: t.modeListeningDesc(targetLabel, nativeLabel),
      },
      {
        id: 'mixed',
        label: t.modeMixed,
        icon: <Shuffle size={24} />,
        description: t.modeMixedDesc,
      },
    ],
    [nativeLabel, t, targetLabel]
  );

  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const settings = useVocabStore((state) => state.settings);
  const sets = useVocabStore((state) => state.getActiveSets());
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
    if (!hydrated || appliedSetParam) return;
    if (!setIdParam) {
      setAppliedSetParam(true);
      return;
    }
    if (sets.length === 0) {
      return;
    }
    const exists = sets.some((set) => set.id === setIdParam);
    setSelectedSetId(exists ? setIdParam : 'all');
    setAppliedSetParam(true);
  }, [appliedSetParam, hydrated, setIdParam, sets]);

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
        <p className="text-slate-500">{t.loading}</p>
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
      alert(t.needFourWords);
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
      alert(t.needFourWrong);
    }
  };

  if (sessionState === 'active') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-5 dark:opacity-10" />

        <div className="relative z-10 p-4 flex items-center gap-4">
          <button
            onClick={() => setSessionState('setup')}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 shadow-lg shadow-primary-500/10 transition-all"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
            {t.quizWithMode(quizModes.find((m) => m.id === selectedMode)?.label ?? '')}
          </h1>
        </div>

        <div className="relative z-10">
          <QuizSession
            words={sessionWords}
            mode={selectedMode}
            onComplete={handleComplete}
          />
        </div>
      </div>
    );
  }

  if (sessionState === 'results') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-5 dark:opacity-10" />

        <div className="relative z-10 p-4 flex items-center gap-4">
          <button
            onClick={() => setSessionState('setup')}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 shadow-lg shadow-primary-500/10 transition-all"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
            {t.quizResults}
          </h1>
        </div>

        <div className="relative z-10">
          <QuizResults
            results={quizResults}
            words={sessionWords}
            onRetry={handleRetry}
            onClose={() => setSessionState('setup')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-5 dark:opacity-10" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl" />

      <div className="relative z-10 p-4 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 shadow-lg shadow-primary-500/10 transition-all">
              <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Quiz mode selection */}
        <Card variant="glass">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
              {t.modeTitle}
            </h3>
            <div className="grid gap-2">
              {quizModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    selectedMode === mode.id
                      ? 'border-transparent bg-gradient-to-br from-primary-50 to-pink-50 dark:from-primary-900/40 dark:to-pink-900/40 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 bg-white/50 dark:bg-slate-800/50'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-xl transition-all',
                      selectedMode === mode.id
                        ? 'bg-gradient-to-br from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {mode.icon}
                  </div>
                  <div>
                    <p className={cn(
                      'font-medium',
                      selectedMode === mode.id
                        ? 'bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent'
                        : 'text-slate-800 dark:text-slate-100'
                    )}>
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
        <Card variant="glass">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
              {t.setTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSetId('all')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedSetId === 'all'
                    ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                {t.all} ({vocabulary.length})
              </button>
              <button
                onClick={() => setSelectedSetId('unassigned')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedSetId === 'unassigned'
                    ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                {t.unassigned} ({unassignedCount})
              </button>
              {sets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => setSelectedSetId(set.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    selectedSetId === set.id
                      ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  )}
                >
                  {set.name} ({setCounts[set.id] ?? 0})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category selection */}
        <Card variant="glass">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
              {t.categoryTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                {t.all} ({filteredVocabularyCount})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  )}
                >
                  {getCategoryLabel(cat, language)} ({categoryCounts[cat] ?? 0})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings preview */}
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Target size={14} className="text-white" />
                  </div>
                  <span>
                    {t.questionsLabel(settings.session.quizQuestionCount)}
                  </span>
                </div>
                {settings.session.timeLimit && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Clock size={14} className="text-white" />
                    </div>
                    <span>{settings.session.timeLimit}s</span>
                  </div>
                )}
              </div>
              <Link href="/profile#settings" className="text-sm font-medium bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                {t.change}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Start button */}
        <Button variant="gradient" onClick={startQuiz} size="lg" className="w-full">
          <Target size={20} className="mr-2" />
          {t.startQuiz}
        </Button>
      </div>
    </div>
  );
}
