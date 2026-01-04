'use client';

import { useState } from 'react';
import { Volume2, ChevronLeft, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';
import { VocabularyItem, FlashcardAction } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, speak } from '@/lib/utils';
import { useVocabStore } from '@/lib/store';
import { getCategoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/i18n';
import {
  getNativeExample,
  getNativeText,
  getSpeechLocale,
  getTargetExample,
  getTargetText,
} from '@/lib/languages';

const flashcardCopy = {
  pl: {
    tapToReveal: 'Kliknij, aby zobaczyć tłumaczenie',
    progressLabel: (current: number, total: number) => `${current} z ${total}`,
    easy: 'Łatwe',
    medium: 'Średnie',
    hard: 'Trudne',
    repeat: 'Powtórz',
    difficult: 'Trudne',
    know: 'Umiem',
  },
  en: {
    tapToReveal: 'Tap to reveal the translation',
    progressLabel: (current: number, total: number) => `${current} of ${total}`,
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    repeat: 'Repeat',
    difficult: 'Hard',
    know: 'I know',
  },
  uk: {
    tapToReveal: 'Натисни, щоб побачити переклад',
    progressLabel: (current: number, total: number) => `${current} з ${total}`,
    easy: 'Легке',
    medium: 'Середнє',
    hard: 'Складне',
    repeat: 'Повторити',
    difficult: 'Складне',
    know: 'Знаю',
  },
} as const;

type FlashcardCopy = typeof flashcardCopy.pl;

interface FlashcardProps {
  item: VocabularyItem;
  onAction: (action: FlashcardAction) => void;
  showActions?: boolean;
}

export function Flashcard({ item, onAction, showActions = true }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const settings = useVocabStore((state) => state.settings);
  const language = useLanguage();
  const t = (flashcardCopy[language] ?? flashcardCopy.pl) as FlashcardCopy;

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings.general.sounds) return;
    try {
      await speak(getTargetText(item), {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
        locale: getSpeechLocale(
          settings.learning.targetLanguage,
          settings.pronunciation.voice
        ),
      });
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const handleAction = (action: FlashcardAction) => {
    const animClass =
      action === 'know'
        ? 'swipe-right'
        : action === 'repeat'
        ? 'swipe-left'
        : 'swipe-up';

    setAnimationClass(animClass);
    setIsAnimating(true);

    setTimeout(() => {
      setIsAnimating(false);
      setAnimationClass('');
      setIsFlipped(false);
      onAction(action);
    }, 300);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={cn(
          'flashcard-container w-full aspect-[3/4] cursor-pointer',
          animationClass
        )}
        onClick={() => !isAnimating && setIsFlipped(!isFlipped)}
      >
        <div className={cn('flashcard relative w-full h-full', isFlipped && 'flipped')}>
          {/* Front */}
          <Card
            variant="elevated"
            className="flashcard-front flex flex-col items-center justify-center p-6 border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-700 transition-colors"
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={handleSpeak}
                className="p-2 rounded-full bg-gradient-to-br from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5"
              >
                <Volume2 size={24} />
              </button>
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                {getTargetText(item)}
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-mono">
                {item.phonetic}
              </p>
            </div>

            <p className="absolute bottom-6 text-sm text-slate-400 dark:text-slate-500">
              {t.tapToReveal}
            </p>
          </Card>

          {/* Back */}
          <Card
            variant="gradient"
            className="flashcard-back flex flex-col items-center justify-center p-6"
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={handleSpeak}
                className="p-2 rounded-full bg-gradient-to-br from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5"
              >
                <Volume2 size={24} />
              </button>
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                {getNativeText(item)}
              </h2>

              {getTargetExample(item) && (
                <div className="mt-6 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-primary-100 dark:border-primary-800/50">
                  <p className="text-slate-700 dark:text-slate-300 italic">
                    "{getTargetExample(item)}"
                  </p>
                  {getNativeExample(item) && (
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                      "{getNativeExample(item)}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  item.difficulty === 'easy' &&
                    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                  item.difficulty === 'medium' &&
                    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                  item.difficulty === 'hard' &&
                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                )}
              >
                {item.difficulty === 'easy'
                  ? t.easy
                  : item.difficulty === 'medium'
                  ? t.medium
                  : t.hard}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                {getCategoryLabel(item.category, language)}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleAction('repeat')}
            className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:flex-none sm:min-w-[120px] sm:text-base"
          >
            <X size={18} className="shrink-0" />
            <span className="hidden min-[400px]:inline">{t.repeat}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAction('hard')}
            className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:flex-none sm:min-w-[120px] sm:text-base"
          >
            <AlertTriangle size={18} className="shrink-0" />
            <span className="hidden min-[400px]:inline">{t.difficult}</span>
          </Button>

          <Button
            variant="success"
            size="sm"
            onClick={() => handleAction('know')}
            className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:flex-none sm:min-w-[120px] sm:text-base"
          >
            <Check size={18} className="shrink-0" />
            <span className="hidden min-[400px]:inline">{t.know}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

interface FlashcardSessionProps {
  words: VocabularyItem[];
  onComplete: () => void;
}

export function FlashcardSession({ words, onComplete }: FlashcardSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatQueue, setRepeatQueue] = useState<VocabularyItem[]>([]);
  const language = useLanguage();
  const t = (flashcardCopy[language] ?? flashcardCopy.pl) as FlashcardCopy;
  const processFlashcardAction = useVocabStore((state) => state.processFlashcardAction);
  const addXp = useVocabStore((state) => state.addXp);
  const updateDailyMissionProgress = useVocabStore((state) => state.updateDailyMissionProgress);

  const allWords = [...words, ...repeatQueue];
  const currentWord = allWords[currentIndex];
  const progress = ((currentIndex + 1) / allWords.length) * 100;

  const handleAction = (action: FlashcardAction) => {
    processFlashcardAction(currentWord.id, action);

    if (action === 'know') {
      addXp(10);
      updateDailyMissionProgress('flashcards', 1);
    } else if (action === 'repeat') {
      setRepeatQueue((prev) => [...prev, currentWord]);
    }

    if (currentIndex + 1 >= allWords.length) {
      addXp(30); // Session complete bonus
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (!currentWord) {
    return null;
  }

  return (
    <div className="p-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
          <span>{t.progressLabel(currentIndex + 1, allWords.length)}</span>
          <span className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 via-blue-500 to-pink-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Flashcard item={currentWord} onAction={handleAction} />

      {/* Navigation hint - only on screens where button text is hidden */}
      <div className="flex min-[400px]:hidden justify-center gap-6 mt-6 text-slate-400 dark:text-slate-500 text-xs">
        <div className="flex items-center gap-1">
          <ChevronLeft size={14} />
          {t.repeat}
        </div>
        <div className="flex items-center gap-1">
          {t.difficult}
          <span className="rotate-90">
            <ChevronRight size={14} />
          </span>
        </div>
        <div className="flex items-center gap-1">
          {t.know}
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}
