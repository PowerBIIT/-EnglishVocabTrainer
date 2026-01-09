'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Volume2,
  Mic,
  Square,
  ChevronRight,
  Star,
  BookOpen,
  Info,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useVocabStore, useHydration } from '@/lib/store';
import { PhonemeType, PhonemeDrill } from '@/types';
import { cn, speak, XP_ACTIONS } from '@/lib/utils';
import { calculatePronunciationScore } from '@/lib/pronunciation';
import { phonemeDrills } from '@/data/phonemeDrills';
import { useLanguage } from '@/lib/i18n';
import { getLearningPair, getSpeechLocale } from '@/lib/languages';

type DrillState = 'select' | 'learn' | 'practice' | 'complete';

const DIFFICULTY_COLORS = {
  easy: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  hard: 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300',
};

const drillsCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Ćwiczenia fonemów',
    subtitle: 'Problematyczne dźwięki dla Polaków',
    intro:
      'Te ćwiczenia skupiają się na dźwiękach, które są najtrudniejsze dla osób mówiących po polsku. Każde ćwiczenie zawiera instrukcje, jak poprawnie wymawiać dźwięk.',
    learnTitle: 'Nauka wymowy',
    polishEquivalent: 'Polski odpowiednik:',
    commonMistake: 'Częsty błąd:',
    howTo: 'Jak wymawiać:',
    mouthPosition: 'Pozycja ust:',
    minimalPairs: 'Pary minimalne',
    minimalPairsDesc: 'Posłuchaj różnicy między podobnymi słowami:',
    startPractice: 'Rozpocznij ćwiczenie',
    practiceTitle: (symbol: string) => `${symbol} Ćwiczenie`,
    progressLabel: (current: number, total: number) => `${current} z ${total}`,
    positionLabel: (label: string) => `Pozycja: ${label}`,
    listenPronunciation: 'Posłuchaj wymowy',
    recordingActive: 'Mówię... Kliknij aby zakończyć',
    recordingIdle: 'Kliknij mikrofon i powiedz słówko',
    hintLabel: 'Wskazówka:',
    recognized: (text: string) => `Rozpoznano: "${text}"`,
    repeat: 'Powtórz',
    next: 'Dalej',
    finish: 'Zakończ',
    completeTitle: 'Ćwiczenie ukończone!',
    averageScore: (score: number) => `Średnia ocena: ${score.toFixed(1)}/10`,
    wordsLabel: 'Słowa',
    goodPronunciations: 'Dobre wymowy',
    chooseAnother: 'Wybierz inny fonem',
    repeatExercise: 'Powtórz ćwiczenie',
    backToPronunciation: 'Wróć do treningu wymowy',
    recognitionUnsupported: 'Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj w Chrome.',
    notAvailableTitle: 'Ćwiczenia fonemów są dostępne tylko dla profilu Polski → Angielski.',
    notAvailableDesc:
      'Zmień profil nauki w ustawieniach, aby korzystać z tych ćwiczeń.',
    backToTraining: 'Wróć do treningu wymowy',
  },
  en: {
    loading: 'Loading...',
    title: 'Phoneme drills',
    subtitle: 'Tricky sounds for Polish speakers',
    intro:
      'These drills focus on sounds that are hardest for Polish speakers. Each drill includes instructions on how to pronounce the sound.',
    learnTitle: 'Pronunciation guide',
    polishEquivalent: 'Polish equivalent:',
    commonMistake: 'Common mistake:',
    howTo: 'How to pronounce:',
    mouthPosition: 'Mouth position:',
    minimalPairs: 'Minimal pairs',
    minimalPairsDesc: 'Listen to the difference between similar words:',
    startPractice: 'Start practice',
    practiceTitle: (symbol: string) => `${symbol} Practice`,
    progressLabel: (current: number, total: number) => `${current} of ${total}`,
    positionLabel: (label: string) => `Position: ${label}`,
    listenPronunciation: 'Listen to pronunciation',
    recordingActive: 'Speaking... Click to stop',
    recordingIdle: 'Click the microphone and say the word',
    hintLabel: 'Hint:',
    recognized: (text: string) => `Recognized: "${text}"`,
    repeat: 'Repeat',
    next: 'Next',
    finish: 'Finish',
    completeTitle: 'Exercise complete!',
    averageScore: (score: number) => `Average score: ${score.toFixed(1)}/10`,
    wordsLabel: 'Words',
    goodPronunciations: 'Good pronunciations',
    chooseAnother: 'Choose another phoneme',
    repeatExercise: 'Repeat exercise',
    backToPronunciation: 'Back to pronunciation training',
    recognitionUnsupported: 'Your browser does not support speech recognition. Try Chrome.',
    notAvailableTitle: 'Phoneme drills are available only for the Polish → English profile.',
    notAvailableDesc:
      'Switch the learning profile in settings to use these drills.',
    backToTraining: 'Back to pronunciation training',
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Вправи фонемів',
    subtitle: 'Складні звуки для носіїв польської',
    intro:
      'Ці вправи зосереджені на звуках, які найважчі для носіїв польської. Кожна вправа містить інструкції, як правильно вимовляти звук.',
    learnTitle: 'Гід з вимови',
    polishEquivalent: 'Польський відповідник:',
    commonMistake: 'Поширена помилка:',
    howTo: 'Як вимовляти:',
    mouthPosition: 'Положення рота:',
    minimalPairs: 'Мінімальні пари',
    minimalPairsDesc: 'Послухай різницю між схожими словами:',
    startPractice: 'Почати вправу',
    practiceTitle: (symbol: string) => `${symbol} Вправа`,
    progressLabel: (current: number, total: number) => `${current} з ${total}`,
    positionLabel: (label: string) => `Позиція: ${label}`,
    listenPronunciation: 'Прослухай вимову',
    recordingActive: 'Говорю... Натисни, щоб зупинити',
    recordingIdle: 'Натисни мікрофон і скажи слово',
    hintLabel: 'Порада:',
    recognized: (text: string) => `Розпізнано: "${text}"`,
    repeat: 'Повторити',
    next: 'Далі',
    finish: 'Завершити',
    completeTitle: 'Вправа завершена!',
    averageScore: (score: number) => `Середня оцінка: ${score.toFixed(1)}/10`,
    wordsLabel: 'Слова',
    goodPronunciations: 'Добрі вимови',
    chooseAnother: 'Обери інший фонем',
    repeatExercise: 'Повторити вправу',
    backToPronunciation: 'Повернутися до тренування вимови',
    recognitionUnsupported: 'Твій браузер не підтримує розпізнавання мови. Спробуй Chrome.',
    notAvailableTitle: 'Вправи фонемів доступні лише для профілю Польська → Англійська.',
    notAvailableDesc:
      'Зміни профіль навчання в налаштуваннях, щоб користуватися цими вправами.',
    backToTraining: 'Повернутися до тренування вимови',
  },
} as const;

type DrillsCopy = typeof drillsCopy.pl;

const DIFFICULTY_LABELS = {
  pl: {
    easy: 'Łatwy',
    medium: 'Średni',
    hard: 'Trudny',
  },
  en: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  },
  uk: {
    easy: 'Легкий',
    medium: 'Середній',
    hard: 'Складний',
  },
} as const;

const POSITION_LABELS = {
  pl: {
    initial: 'początek',
    medial: 'środek',
    final: 'koniec',
  },
  en: {
    initial: 'beginning',
    medial: 'middle',
    final: 'end',
  },
  uk: {
    initial: 'початок',
    medial: 'середина',
    final: 'кінець',
  },
} as const;

export default function PhonemeDrillsPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (drillsCopy[language] ?? drillsCopy.pl) as DrillsCopy;
  const difficultyLabels = DIFFICULTY_LABELS[language] ?? DIFFICULTY_LABELS.pl;
  const positionLabels = POSITION_LABELS[language] ?? POSITION_LABELS.pl;
  const [drillState, setDrillState] = useState<DrillState>('select');
  const [selectedDrill, setSelectedDrill] = useState<PhonemeDrill | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{ score: number; recognized: string } | null>(null);
  const [scores, setScores] = useState<number[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionSessionRef = useRef(0);

  const settings = useVocabStore((state) => state.settings);
  const stats = useVocabStore((state) => state.stats);
  const addXp = useVocabStore((state) => state.addXp);
  const updatePhonemeMastery = useVocabStore((state) => state.updatePhonemeMastery);
  const activePair = getLearningPair(settings.learning.pairId);
  const isAvailable = activePair.native === 'pl' && activePair.target === 'en';
  const passingScore = settings.pronunciation.passingScore;

  const getDrillName = (drill: PhonemeDrill) =>
    language === 'en' ? drill.nameEn : drill.namePl;
  const getDrillPolishEquivalent = (drill: PhonemeDrill) =>
    language === 'en' ? drill.polishEquivalentEn : drill.polishEquivalent;
  const getDrillCommonMistake = (drill: PhonemeDrill) =>
    language === 'en' ? drill.commonMistakeEn : drill.commonMistake;
  const getDrillInstruction = (drill: PhonemeDrill) =>
    language === 'en' ? drill.instructionEn : drill.instructionPl;
  const getDrillMouthTip = (drill: PhonemeDrill) =>
    language === 'en' ? drill.mouthTipEn : drill.mouthTip;

  const currentWord = selectedDrill?.practiceWords[currentWordIndex];
  const progress = selectedDrill
    ? ((currentWordIndex + 1) / selectedDrill.practiceWords.length) * 100
    : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const handleSpeak = async (text: string) => {
    if (!settings.general.sounds) return;
    try {
      await speak(text, {
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

  const stopRecognition = useCallback(() => {
    recognitionSessionRef.current += 1;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort?.();
      } catch {
        // Ignore abort errors from stale sessions
      }
      try {
        recognition.stop?.();
      } catch {
        // Ignore stop errors from stale sessions
      }
    }
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionSessionRef.current += 1;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort?.();
        } catch {
          // Ignore abort errors from stale sessions
        }
        try {
          recognition.stop?.();
        } catch {
          // Ignore stop errors from stale sessions
        }
      }
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (drillState !== 'practice') {
      stopRecognition();
    }
  }, [drillState, stopRecognition]);

  const startRecording = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      alert(t.recognitionUnsupported);
      return;
    }

    stopRecognition();
    const sessionId = ++recognitionSessionRef.current;

    setResult(null);
    const recognition = new SpeechRecognitionApi();
    recognition.lang = getSpeechLocale(
      settings.learning.targetLanguage,
      settings.pronunciation.voice
    );
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      setIsRecording(true);
      setResult(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sessionId !== recognitionSessionRef.current) return;
      const transcript = event.results[0][0].transcript.trim();
      setIsRecording(false);
      recognition.stop();
      evaluatePronunciation(transcript);
    };

    recognition.onerror = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      setIsRecording(false);
      setResult({ score: 0, recognized: '' });
    };

    recognition.onend = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      console.error('[STT] Failed to start:', error);
      setIsRecording(false);
    }
  };

  const evaluatePronunciation = (spoken: string) => {
    if (!currentWord) return;

    const { score } = calculatePronunciationScore(
      currentWord.word,
      spoken,
      { language: settings.learning.targetLanguage }
    );

    setResult({ score, recognized: spoken });
    setScores((prev) => [...prev, score]);

    if (selectedDrill) {
      updatePhonemeMastery(selectedDrill.phonemeType, score);
    }

    if (score >= passingScore) {
      addXp(XP_ACTIONS.pronunciation_good);
    }
  };

  const handleNext = () => {
    if (!selectedDrill) return;

    stopRecognition();
    if (currentWordIndex + 1 < selectedDrill.practiceWords.length) {
      setCurrentWordIndex((prev) => prev + 1);
      setResult(null);
    } else {
      setDrillState('complete');
    }
  };

  const selectDrill = (drill: PhonemeDrill) => {
    setSelectedDrill(drill);
    setDrillState('learn');
    setCurrentWordIndex(0);
    setScores([]);
    setResult(null);
  };

  const getScoreStars = (score: number) => {
    const stars = Math.ceil(score / 3.33);
    return Array(3)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={20}
          className={cn(i < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
        />
      ));
  };

  const getMasteryLevel = (phoneme: PhonemeType): number => {
    return stats.phonemeMastery[phoneme] || 0;
  };

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900 flex items-center justify-center">
              <Info className="text-amber-500" size={28} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t.notAvailableTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.notAvailableDesc}
            </p>
            <Link href="/pronunciation">
              <Button>{t.backToTraining}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SELECT PHONEME
  if (drillState === 'select') {
    return (
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/pronunciation">
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {t.title}
            </h1>
            <p className="text-sm text-slate-500">{t.subtitle}</p>
          </div>
        </div>

        <Card className="p-4 bg-primary-50 dark:bg-primary-900/30">
          <div className="flex gap-3">
            <Info size={20} className="text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t.intro}
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          {phonemeDrills.map((drill) => {
            const mastery = getMasteryLevel(drill.phonemeType);
            return (
              <button
                key={drill.id}
                onClick={() => selectDrill(drill)}
                className="w-full text-left"
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-2xl font-mono font-bold text-primary-600 dark:text-primary-400">
                        {drill.phonemeSymbol}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                          {getDrillName(drill)}
                        </h3>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            DIFFICULTY_COLORS[drill.difficulty]
                          )}
                        >
                          {difficultyLabels[drill.difficulty]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{getDrillCommonMistake(drill)}</p>
                      {mastery > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success-500 rounded-full"
                              style={{ width: `${mastery}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{mastery}%</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // LEARN PHASE
  if (drillState === 'learn' && selectedDrill) {
    return (
      <>
        <div className="p-4 space-y-6 max-w-lg mx-auto pb-32 md:pb-36">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDrillState('select')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {getDrillName(selectedDrill)}
              </h1>
              <p className="text-sm text-slate-500">{t.learnTitle}</p>
            </div>
          </div>

          {/* Phoneme info */}
          <Card variant="elevated">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <span className="text-5xl font-mono font-bold text-primary-600 dark:text-primary-400">
                  {selectedDrill.phonemeSymbol}
                </span>
                <p className="text-lg text-slate-600 dark:text-slate-300 mt-2">
                  {getDrillName(selectedDrill)}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                {getDrillPolishEquivalent(selectedDrill) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {t.polishEquivalent}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {getDrillPolishEquivalent(selectedDrill)}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-error-50 dark:bg-error-900/30 rounded-lg">
                  <p className="font-medium text-error-700 dark:text-error-300">
                    {t.commonMistake}
                  </p>
                  <p className="text-error-600 dark:text-error-400">
                    {getDrillCommonMistake(selectedDrill)}
                  </p>
                </div>

                <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                  <p className="font-medium text-primary-700 dark:text-primary-300">
                    {t.howTo}
                  </p>
                  <p className="text-primary-600 dark:text-primary-400">
                    {getDrillInstruction(selectedDrill)}
                  </p>
                </div>

                <div className="p-3 bg-success-50 dark:bg-success-900/30 rounded-lg">
                  <p className="font-medium text-success-700 dark:text-success-300">
                    {t.mouthPosition}
                  </p>
                  <p className="text-success-600 dark:text-success-400">
                    {getDrillMouthTip(selectedDrill)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Minimal pairs */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen size={18} />
                {t.minimalPairs}
              </h3>
              <p className="text-sm text-slate-500">{t.minimalPairsDesc}</p>
              <div className="space-y-2">
                {selectedDrill.minimalPairs.slice(0, 3).map((pair, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <button
                        onClick={() => handleSpeak(pair.word1)}
                        className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <Volume2 size={16} />
                        <span className="font-medium">{pair.word1}</span>
                        <span className="text-xs text-slate-500">{pair.phonetic1}</span>
                      </button>
                      <p className="text-xs text-slate-500 ml-6">{pair.meaningPl1}</p>
                    </div>
                    <span className="text-slate-400 mx-2">vs</span>
                    <div className="flex-1 text-right">
                      <button
                        onClick={() => handleSpeak(pair.word2)}
                        className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline justify-end"
                      >
                        <span className="font-medium">{pair.word2}</span>
                        <span className="text-xs text-slate-500">{pair.phonetic2}</span>
                        <Volume2 size={16} />
                      </button>
                      <p className="text-xs text-slate-500 mr-6">{pair.meaningPl2}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="fixed left-0 right-0 md:left-24 bottom-[calc(var(--fullscreen-offset)+0.75rem)] z-40 px-4">
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg p-3">
              <Button
                variant="gradient"
                onClick={() => setDrillState('practice')}
                className="w-full py-4 text-lg shadow-xl shadow-primary-500/25"
              >
                <Mic size={24} className="mr-2" />
                {t.startPractice}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // PRACTICE PHASE
  if (drillState === 'practice' && selectedDrill && currentWord) {
    return (
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              stopRecognition();
              setDrillState('learn');
            }}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {t.practiceTitle(selectedDrill.phonemeSymbol)}
            </h1>
            <p className="text-sm text-slate-500">
              {t.progressLabel(currentWordIndex + 1, selectedDrill.practiceWords.length)}
            </p>
          </div>
        </div>

        <ProgressBar value={progress} size="sm" />

        <Card variant="elevated">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {currentWord.word}
            </h2>
            <p className="text-lg text-slate-500 font-mono">{currentWord.phonetic}</p>
            <p className="text-slate-600 dark:text-slate-400">{currentWord.meaningPl}</p>
            <span className="inline-block text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500">
              {t.positionLabel(positionLabels[currentWord.phonemePosition])}
            </span>

            <button
              onClick={() => handleSpeak(currentWord.word)}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <Volume2 size={20} />
              {t.listenPronunciation}
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            {!result ? (
              <div className="text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  {isRecording ? t.recordingActive : t.recordingIdle}
                </p>

                <button
                  onClick={isRecording ? stopRecognition : startRecording}
                  className={cn(
                    'mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all',
                    isRecording ? 'bg-error-500 animate-pulse' : 'bg-primary-500 hover:bg-primary-600'
                  )}
                >
                  {isRecording ? (
                    <Square size={32} className="text-white" />
                  ) : (
                    <Mic size={32} className="text-white" />
                  )}
                </button>

                <p className="text-sm text-primary-600 dark:text-primary-400">
                  {t.hintLabel} {getDrillMouthTip(selectedDrill)}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex justify-center gap-1 mb-2">{getScoreStars(result.score)}</div>
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      result.score >= passingScore
                        ? 'text-success-500'
                        : result.score >= 6
                        ? 'text-amber-500'
                        : 'text-error-500'
                    )}
                  >
                    {result.score}/10
                  </p>
                </div>

                {result.recognized && (
                  <p className="text-sm text-center text-slate-500">
                    {t.recognized(result.recognized)}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      stopRecognition();
                      setResult(null);
                    }}
                    className="flex-1"
                  >
                    {t.repeat}
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    {currentWordIndex + 1 < selectedDrill.practiceWords.length ? t.next : t.finish}
                    <ChevronRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // COMPLETE
  if (drillState === 'complete' && selectedDrill) {
    return (
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <Card variant="elevated" className="text-center p-8">
          <div className="text-6xl mb-4">
            <CheckCircle2 size={64} className="mx-auto text-success-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {t.completeTitle}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            {getDrillName(selectedDrill)} ({selectedDrill.phonemeSymbol})
          </p>
          <p className="text-slate-500 mb-4">{t.averageScore(avgScore)}</p>
          <div className="flex justify-center gap-2 mb-6">{getScoreStars(avgScore)}</div>

          <div className="grid grid-cols-1 gap-4 mb-6 text-left sm:grid-cols-2">
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">{t.wordsLabel}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {selectedDrill.practiceWords.length}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">{t.goodPronunciations}</p>
              <p className="text-xl font-bold text-success-500">
                {scores.filter((s) => s >= passingScore).length}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => setDrillState('select')}>{t.chooseAnother}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentWordIndex(0);
                setScores([]);
                setResult(null);
                setDrillState('practice');
              }}
            >
              {t.repeatExercise}
            </Button>
            <Link href="/pronunciation">
              <Button variant="ghost" className="w-full">
                {t.backToPronunciation}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
