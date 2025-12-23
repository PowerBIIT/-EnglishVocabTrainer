'use client';

import { useState, useEffect, useCallback } from 'react';
import { Volume2, Check, X, Clock, Trophy } from 'lucide-react';
import { VocabularyItem, QuizMode, QuizResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn, shuffleArray, speak, XP_ACTIONS } from '@/lib/utils';
import { useVocabStore } from '@/lib/store';
import { useLanguage } from '@/lib/i18n';
import {
  getLanguageLabel,
  getLearningPair,
  getNativeText,
  getSpeechLocale,
  getTargetText,
} from '@/lib/languages';

const quizCopy = {
  pl: {
    chooseTranslation: (label: string) => `Wybierz tłumaczenie ${label.toLowerCase()}`,
    typeTranslation: (label: string) =>
      `Wpisz tłumaczenie w języku ${label.toLowerCase()}`,
    listenAndChoose: (target: string, native: string) =>
      `Odsłuchaj słowo (${target.toLowerCase()}) i wybierz tłumaczenie ${native.toLowerCase()}`,
    typeAnswer: 'Wpisz odpowiedź...',
    check: 'Sprawdź',
    correctAnswer: 'Poprawna odpowiedź',
    questionLabel: (current: number, total: number) => `Pytanie ${current} z ${total}`,
    correctCount: (count: number) => `${count} poprawnych`,
    wrongCount: (count: number) => `${count} błędnych`,
    perfect: 'Perfekcyjnie!',
    allCorrect: 'Wszystkie odpowiedzi poprawne!',
    score: (value: number) => `Wynik: ${value}%`,
    scoreDetails: (correct: number, total: number) => `${correct} z ${total} poprawnych odpowiedzi`,
    finish: 'Zakończ',
    retryWrong: 'Powtórz błędne',
    review: 'Do powtórki:',
    yourAnswer: (answer: string) => `Twoja odpowiedź: ${answer || '(brak)'}`,
  },
  en: {
    chooseTranslation: (label: string) => `Choose the ${label} translation`,
    typeTranslation: (label: string) => `Type the ${label} translation`,
    listenAndChoose: (target: string, native: string) =>
      `Listen to a ${target} word and choose the ${native} translation`,
    typeAnswer: 'Type your answer...',
    check: 'Check',
    correctAnswer: 'Correct answer',
    questionLabel: (current: number, total: number) => `Question ${current} of ${total}`,
    correctCount: (count: number) => `${count} correct`,
    wrongCount: (count: number) => `${count} wrong`,
    perfect: 'Perfect!',
    allCorrect: 'All answers correct!',
    score: (value: number) => `Score: ${value}%`,
    scoreDetails: (correct: number, total: number) => `${correct} of ${total} correct`,
    finish: 'Finish',
    retryWrong: 'Retry wrong',
    review: 'Review:',
    yourAnswer: (answer: string) => `Your answer: ${answer || '(none)'}`,
  },
  uk: {
    chooseTranslation: (label: string) => `Обери переклад ${label.toLowerCase()}`,
    typeTranslation: (label: string) =>
      `Введи переклад мовою ${label.toLowerCase()}`,
    listenAndChoose: (target: string, native: string) =>
      `Прослухай слово (${target.toLowerCase()}) і обери переклад ${native.toLowerCase()}`,
    typeAnswer: 'Введи відповідь...',
    check: 'Перевірити',
    correctAnswer: 'Правильна відповідь',
    questionLabel: (current: number, total: number) => `Питання ${current} з ${total}`,
    correctCount: (count: number) => `${count} правильних`,
    wrongCount: (count: number) => `${count} помилкових`,
    perfect: 'Ідеально!',
    allCorrect: 'Усі відповіді правильні!',
    score: (value: number) => `Результат: ${value}%`,
    scoreDetails: (correct: number, total: number) => `${correct} з ${total} правильних відповідей`,
    finish: 'Завершити',
    retryWrong: 'Повторити помилки',
    review: 'До повторення:',
    yourAnswer: (answer: string) => `Твоя відповідь: ${answer || '(немає)'}`,
  },
} as const;

type QuizCopy = typeof quizCopy.pl;

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
  const language = useLanguage();
  const t = (quizCopy[language] ?? quizCopy.pl) as QuizCopy;
  const learning = useVocabStore((state) => state.settings.learning);
  const activePair = getLearningPair(learning.pairId);
  const targetLabel = getLanguageLabel(activePair.target, language);
  const nativeLabel = getLanguageLabel(activePair.native, language);

  const correctAnswer =
    mode === 'en_to_pl' || mode === 'listening' ? getNativeText(word) : getTargetText(word);
  const questionText = mode === 'en_to_pl' ? getTargetText(word) : getNativeText(word);
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
      speak(getTargetText(word), {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
        locale: getSpeechLocale(
          settings.learning.targetLanguage,
          settings.pronunciation.voice
        ),
      });
    }
  }, [
    mode,
    settings.general.sounds,
    settings.learning.targetLanguage,
    settings.pronunciation,
    word,
  ]);

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
    speak(getTargetText(word), {
      voice: settings.pronunciation.voice,
      speed: settings.pronunciation.speed,
      locale: getSpeechLocale(
        settings.learning.targetLanguage,
        settings.pronunciation.voice
      ),
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
              ? t.chooseTranslation(nativeLabel)
              : mode === 'pl_to_en'
              ? t.chooseTranslation(targetLabel)
              : mode === 'typing'
              ? t.typeTranslation(targetLabel)
              : t.listenAndChoose(targetLabel, nativeLabel)}
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
              placeholder={t.typeAnswer}
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
                {t.check}
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
              {t.correctAnswer}: <strong>{correctAnswer}</strong>
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
  const language = useLanguage();
  const t = (quizCopy[language] ?? quizCopy.pl) as QuizCopy;
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
        ? getNativeText(currentWord)
        : getTargetText(currentWord);

    const allAnswers =
      currentMode === 'en_to_pl' || currentMode === 'listening'
        ? words.map((w) => getNativeText(w))
        : words.map((w) => getTargetText(w));

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
          <span>{t.questionLabel(currentIndex + 1, words.length)}</span>
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
          {t.correctCount(results.filter((r) => r.correct).length)}
        </span>
        <span className="text-error-600 dark:text-error-400">
          <X size={16} className="inline mr-1" />
          {t.wrongCount(results.filter((r) => !r.correct).length)}
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
  const language = useLanguage();
  const t = (quizCopy[language] ?? quizCopy.pl) as QuizCopy;

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
              {t.perfect}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t.allCorrect}
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
              {t.score(percentage)}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t.scoreDetails(correctCount, results.length)}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-6 sm:flex-row sm:justify-center">
          <Button variant="secondary" onClick={onClose}>
            {t.finish}
          </Button>
          {wrongAnswers.length > 0 && (
            <Button onClick={onRetry}>{t.retryWrong}</Button>
          )}
        </div>
      </Card>

      {/* Wrong answers review */}
      {wrongAnswers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t.review}
          </h3>
          {wrongAnswers.map((item) => (
            <Card key={item!.questionId} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {getTargetText(item!.word)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {getNativeText(item!.word)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-error-500">
                    {t.yourAnswer(item!.userAnswer)}
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
