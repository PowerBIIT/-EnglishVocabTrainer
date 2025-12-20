'use client';

import { useState } from 'react';
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
import { PhonemeType, PhonemeDrill, DrillWord } from '@/types';
import { cn, speak, XP_ACTIONS } from '@/lib/utils';
import { phonemeDrills, getDrillByPhoneme } from '@/data/phonemeDrills';

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type DrillState = 'select' | 'learn' | 'practice' | 'complete';

const DIFFICULTY_COLORS = {
  easy: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  hard: 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300',
};

const DIFFICULTY_LABELS = {
  easy: 'Łatwy',
  medium: 'Średni',
  hard: 'Trudny',
};

export default function PhonemeDrillsPage() {
  const hydrated = useHydration();
  const [drillState, setDrillState] = useState<DrillState>('select');
  const [selectedDrill, setSelectedDrill] = useState<PhonemeDrill | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{ score: number; recognized: string } | null>(null);
  const [scores, setScores] = useState<number[]>([]);

  const settings = useVocabStore((state) => state.settings);
  const stats = useVocabStore((state) => state.stats);
  const addXp = useVocabStore((state) => state.addXp);
  const updatePhonemeMastery = useVocabStore((state) => state.updatePhonemeMastery);

  const currentWord = selectedDrill?.practiceWords[currentWordIndex];
  const progress = selectedDrill
    ? ((currentWordIndex + 1) / selectedDrill.practiceWords.length) * 100
    : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const handleSpeak = async (text: string) => {
    try {
      await speak(text, {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
      });
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const startRecording = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      alert('Twoja przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj w Chrome.');
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setResult(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      evaluatePronunciation(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setResult({ score: 0, recognized: '' });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const evaluatePronunciation = (spoken: string) => {
    if (!currentWord) return;

    const expected = currentWord.word.toLowerCase();
    const spokenClean = spoken.toLowerCase();

    // Simple similarity
    const similarity = calculateSimilarity(expected, spokenClean);
    const score = Math.round(similarity * 10);

    setResult({ score, recognized: spoken });
    setScores((prev) => [...prev, score]);

    if (selectedDrill && score >= 7) {
      updatePhonemeMastery(selectedDrill.phonemeType, score);
    }

    if (score >= 8) {
      addXp(XP_ACTIONS.pronunciation_good);
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1;

    const m = longer.length;
    const n = shorter.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (longer[i - 1] === shorter[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
        }
      }
    }
    return (m - dp[m][n]) / m;
  };

  const handleNext = () => {
    if (!selectedDrill) return;

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
        <p className="text-slate-500">Ładowanie...</p>
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
              Ćwiczenia fonemów
            </h1>
            <p className="text-sm text-slate-500">Problematyczne dźwięki dla Polaków</p>
          </div>
        </div>

        <Card className="p-4 bg-primary-50 dark:bg-primary-900/30">
          <div className="flex gap-3">
            <Info size={20} className="text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Te ćwiczenia skupiają się na dźwiękach, które są najtrudniejsze dla osób mówiących po
              polsku. Każde ćwiczenie zawiera instrukcje, jak poprawnie wymawiać dźwięk.
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
                          {drill.namePl}
                        </h3>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            DIFFICULTY_COLORS[drill.difficulty]
                          )}
                        >
                          {DIFFICULTY_LABELS[drill.difficulty]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{drill.commonMistake}</p>
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
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDrillState('select')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {selectedDrill.namePl}
            </h1>
            <p className="text-sm text-slate-500">Nauka wymowy</p>
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
                {selectedDrill.nameEn}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              {selectedDrill.polishEquivalent && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    Polski odpowiednik:
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {selectedDrill.polishEquivalent}
                  </p>
                </div>
              )}

              <div className="p-3 bg-error-50 dark:bg-error-900/30 rounded-lg">
                <p className="font-medium text-error-700 dark:text-error-300">Częsty błąd:</p>
                <p className="text-error-600 dark:text-error-400">{selectedDrill.commonMistake}</p>
              </div>

              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <p className="font-medium text-primary-700 dark:text-primary-300">Jak wymawiać:</p>
                <p className="text-primary-600 dark:text-primary-400">
                  {selectedDrill.instructionPl}
                </p>
              </div>

              <div className="p-3 bg-success-50 dark:bg-success-900/30 rounded-lg">
                <p className="font-medium text-success-700 dark:text-success-300">Pozycja ust:</p>
                <p className="text-success-600 dark:text-success-400">{selectedDrill.mouthTip}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Minimal pairs */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen size={18} />
              Pary minimalne
            </h3>
            <p className="text-sm text-slate-500">
              Posłuchaj różnicy między podobnymi słowami:
            </p>
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

        <Button onClick={() => setDrillState('practice')} className="w-full py-4 text-lg">
          <Mic size={24} className="mr-2" />
          Rozpocznij ćwiczenie
        </Button>
      </div>
    );
  }

  // PRACTICE PHASE
  if (drillState === 'practice' && selectedDrill && currentWord) {
    return (
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDrillState('learn')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {selectedDrill.phonemeSymbol} Ćwiczenie
            </h1>
            <p className="text-sm text-slate-500">
              {currentWordIndex + 1} z {selectedDrill.practiceWords.length}
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
              Pozycja: {currentWord.phonemePosition === 'initial' ? 'początek' : currentWord.phonemePosition === 'medial' ? 'środek' : 'koniec'}
            </span>

            <button
              onClick={() => handleSpeak(currentWord.word)}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <Volume2 size={20} />
              Posłuchaj wymowy
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            {!result ? (
              <div className="text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  {isRecording ? 'Mówię... Kliknij aby zakończyć' : 'Kliknij mikrofon i powiedz słówko'}
                </p>

                <button
                  onClick={isRecording ? () => setIsRecording(false) : startRecording}
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
                  💡 Pamiętaj: {selectedDrill.mouthTip}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex justify-center gap-1 mb-2">{getScoreStars(result.score)}</div>
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      result.score >= 8
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
                    Rozpoznano: "{result.recognized}"
                  </p>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setResult(null)} className="flex-1">
                    Powtórz
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    {currentWordIndex + 1 < selectedDrill.practiceWords.length ? 'Dalej' : 'Zakończ'}
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
            Ćwiczenie ukończone!
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            {selectedDrill.namePl} ({selectedDrill.phonemeSymbol})
          </p>
          <p className="text-slate-500 mb-4">Średnia ocena: {avgScore.toFixed(1)}/10</p>
          <div className="flex justify-center gap-2 mb-6">{getScoreStars(avgScore)}</div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">Słowa</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {selectedDrill.practiceWords.length}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">Dobre wymowy</p>
              <p className="text-xl font-bold text-success-500">
                {scores.filter((s) => s >= 8).length}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => setDrillState('select')}>Wybierz inny fonem</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentWordIndex(0);
                setScores([]);
                setResult(null);
                setDrillState('practice');
              }}
            >
              Powtórz ćwiczenie
            </Button>
            <Link href="/pronunciation">
              <Button variant="ghost" className="w-full">
                Wróć do treningu wymowy
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
