'use client';

import { useState, useEffect, useCallback } from 'react';
import { Volume2, Check, X, Clock, Trophy } from 'lucide-react';
import { VocabularyItem, QuizMode, QuizResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn, shuffleArray, speak, XP_ACTIONS } from '@/lib/utils';
import { useVocabStore } from '@/lib/store';

interface QuizQuestionProps {
  word: VocabularyItem;
  mode: QuizMode;
  options: string[];
  timeLimit: number | null;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
}

function QuizQuestion({
  word,
  mode,
  options,
  timeLimit,
  onAnswer,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const settings = useVocabStore((state) => state.settings);

  const correctAnswer = mode === 'en_to_pl' || mode === 'listening' ? word.pl : word.en;
  const questionText = mode === 'en_to_pl' ? word.en : word.pl;
  const isTyping = mode === 'typing';

  const handleTimeUp = useCallback(() => {
    if (!showResult) {
      setShowResult(true);
      setTimeout(() => {
        onAnswer('', false, timeLimit || 0);
      }, 1500);
    }
  }, [onAnswer, showResult, timeLimit]);

  // Timer effect
  useEffect(() => {
    if (!timeLimit || showResult) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleTimeUp, showResult, timeLimit]);

  // Auto-play for listening mode
  useEffect(() => {
    if (mode === 'listening' && settings.general.sounds) {
      speak(word.en, {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
      });
    }
  }, [mode, settings.general.sounds, settings.pronunciation, word.en]);

  const handleSelectAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setTimeout(() => {
      onAnswer(answer, isCorrect, timeSpent);
    }, 1500);
  };

  const handleTypedSubmit = () => {
    if (showResult) return;
    handleSelectAnswer(typedAnswer);
  };

  const handleSpeak = () => {
    if (!settings.general.sounds) return;
    speak(word.en, {
      voice: settings.pronunciation.voice,
      speed: settings.pronunciation.speed,
    });
  };

  return (
    <Card variant="elevated" className="w-full max-w-lg mx-auto">
      <CardContent className="p-6 space-y-6">
        {/* Timer */}
        {timeLimit && timeLeft !== null && (
          <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
            <Clock size={20} />
            <span
              className={cn(
                'text-xl font-bold',
                timeLeft <= 5 && 'text-error-500 animate-pulse'
              )}
            >
              {timeLeft}s
            </span>
          </div>
        )}

        {/* Question */}
        <div className="text-center space-y-4">
          {mode === 'listening' ? (
            <button
              onClick={handleSpeak}
              className="mx-auto p-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <Volume2 size={48} />
            </button>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {questionText}
              </h2>
              {mode === 'en_to_pl' && (
                <p className="text-slate-500 dark:text-slate-400 font-mono">
                  {word.phonetic}
                </p>
              )}
            </>
          )}

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === 'en_to_pl'
              ? 'Wybierz polskie tłumaczenie'
              : mode === 'pl_to_en'
              ? 'Wybierz angielskie tłumaczenie'
              : mode === 'typing'
              ? 'Wpisz angielskie tłumaczenie'
              : 'Posłuchaj i wybierz słówko'}
          </p>
        </div>

        {/* Answer options */}
        {isTyping ? (
          <div className="space-y-4">
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTypedSubmit()}
              placeholder="Wpisz odpowiedź..."
              disabled={showResult}
              className={cn(
                'w-full px-4 py-3 rounded-xl border-2 text-lg',
                'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                showResult &&
                  typedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
                  ? 'border-success-500 bg-success-50 dark:bg-success-900'
                  : showResult
                  ? 'border-error-500 bg-error-50 dark:bg-error-900'
                  : 'border-slate-200 dark:border-slate-700'
              )}
            />
            {!showResult && (
              <Button onClick={handleTypedSubmit} className="w-full" size="lg">
                Sprawdź
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {options.map((option) => {
              const isCorrect = option === correctAnswer;
              const isSelected = option === selectedAnswer;

              return (
                <button
                  key={option}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={showResult}
                  className={cn(
                    'px-4 py-3 rounded-xl border-2 text-left transition-all',
                    'hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900',
                    showResult && isCorrect
                      ? 'border-success-500 bg-success-50 dark:bg-success-900 answer-correct'
                      : showResult && isSelected && !isCorrect
                      ? 'border-error-500 bg-error-50 dark:bg-error-900 answer-wrong'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 dark:text-slate-100">{option}</span>
                    {showResult && isCorrect && (
                      <Check className="text-success-500" size={20} />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <X className="text-error-500" size={20} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Correct answer reveal */}
        {showResult && selectedAnswer !== correctAnswer && (
          <div className="p-4 bg-success-50 dark:bg-success-900 rounded-xl">
            <p className="text-sm text-success-700 dark:text-success-300">
              Poprawna odpowiedź: <strong>{correctAnswer}</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuizSessionProps {
  words: VocabularyItem[];
  mode: QuizMode;
  onComplete: (results: QuizResult[]) => void;
}

export function QuizSession({ words, mode, onComplete }: QuizSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [currentMode, setCurrentMode] = useState<QuizMode>(mode);
  const settings = useVocabStore((state) => state.settings);
  const updateProgress = useVocabStore((state) => state.updateProgress);
  const addXp = useVocabStore((state) => state.addXp);
  const updateDailyMissionProgress = useVocabStore((state) => state.updateDailyMissionProgress);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  // Generate options for current question
  const generateOptions = useCallback(() => {
    if (!currentWord) return [];

    const correctAnswer =
      currentMode === 'en_to_pl' || currentMode === 'listening'
        ? currentWord.pl
        : currentWord.en;

    const allAnswers =
      currentMode === 'en_to_pl' || currentMode === 'listening'
        ? words.map((w) => w.pl)
        : words.map((w) => w.en);

    const distractors = shuffleArray(
      allAnswers.filter((a) => a !== correctAnswer)
    ).slice(0, 3);

    return shuffleArray([correctAnswer, ...distractors]);
  }, [currentWord, currentMode, words]);

  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    if (mode === 'mixed') {
      const modes: QuizMode[] = ['en_to_pl', 'pl_to_en', 'typing', 'listening'];
      setCurrentMode(modes[Math.floor(Math.random() * modes.length)]);
    }
    setOptions(generateOptions());
  }, [currentIndex, mode, generateOptions]);

  const handleAnswer = (answer: string, correct: boolean, timeSpent: number) => {
    const result: QuizResult = {
      questionId: `${currentWord.id}-${currentIndex}`,
      vocabId: currentWord.id,
      correct,
      userAnswer: answer,
      timeSpent,
    };

    setResults((prev) => [...prev, result]);
    updateProgress(currentWord.id, correct);

    // Add XP
    if (correct) {
      const xp = settings.session.timeLimit ? XP_ACTIONS.correct_with_timer : XP_ACTIONS.correct_answer;
      addXp(xp);
      updateDailyMissionProgress('quiz', 1);

      // Check for streaks
      const streak = results.filter((r) => r.correct).length + 1;
      if (streak === 5) addXp(XP_ACTIONS.streak_5);
      if (streak === 10) addXp(XP_ACTIONS.streak_10);
    }

    // Move to next question or complete
    if (currentIndex + 1 >= words.length) {
      addXp(XP_ACTIONS.session_complete);
      setTimeout(() => {
        onComplete([...results, result]);
      }, 500);
    } else {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    }
  };

  if (!currentWord) {
    return null;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
          <span>
            Pytanie {currentIndex + 1} z {words.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Question */}
      <QuizQuestion
        key={`${currentWord.id}-${currentIndex}`}
        word={currentWord}
        mode={currentMode}
        options={options}
        timeLimit={settings.session.timeLimit}
        onAnswer={handleAnswer}
      />

      {/* Current score */}
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-success-600 dark:text-success-400">
          <Check size={16} className="inline mr-1" />
          {results.filter((r) => r.correct).length} poprawnych
        </span>
        <span className="text-error-600 dark:text-error-400">
          <X size={16} className="inline mr-1" />
          {results.filter((r) => !r.correct).length} błędnych
        </span>
      </div>
    </div>
  );
}

interface QuizResultsProps {
  results: QuizResult[];
  words: VocabularyItem[];
  onRetry: () => void;
  onClose: () => void;
}

export function QuizResults({ results, words, onRetry, onClose }: QuizResultsProps) {
  const correctCount = results.filter((r) => r.correct).length;
  const percentage = Math.round((correctCount / results.length) * 100);
  const isPerfect = percentage === 100;

  const wrongAnswers = results
    .filter((r) => !r.correct)
    .map((r) => {
      const word = words.find((w) => w.id === r.vocabId);
      return word ? { ...r, word } : null;
    })
    .filter(Boolean);

  return (
    <div className="p-4 space-y-6">
      <Card variant="elevated" className="text-center p-8">
        {isPerfect ? (
          <div className="space-y-4">
            <Trophy size={64} className="mx-auto text-amber-500" />
            <h2 className="text-2xl font-bold text-success-600 dark:text-success-400">
              Perfekcyjnie!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Wszystkie odpowiedzi poprawne!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Trophy
              size={64}
              className={cn(
                'mx-auto',
                percentage >= 80
                  ? 'text-amber-500'
                  : percentage >= 60
                  ? 'text-slate-400'
                  : 'text-slate-300'
              )}
            />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Wynik: {percentage}%
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {correctCount} z {results.length} poprawnych odpowiedzi
            </p>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Zakończ
          </Button>
          {wrongAnswers.length > 0 && (
            <Button onClick={onRetry}>Powtórz błędne</Button>
          )}
        </div>
      </Card>

      {/* Wrong answers review */}
      {wrongAnswers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Do powtórki:
          </h3>
          {wrongAnswers.map((item) => (
            <Card key={item!.questionId} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {item!.word.en}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item!.word.pl}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-error-500">
                    Twoja odpowiedź: {item!.userAnswer || '(brak)'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
