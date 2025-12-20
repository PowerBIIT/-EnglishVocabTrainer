'use client';

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

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mic, Volume2, Play, Square, RotateCcw, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useVocabStore } from '@/lib/store';
import { VocabularyItem } from '@/types';
import { cn, speak, shuffleArray, XP_ACTIONS } from '@/lib/utils';

interface PronunciationResult {
  score: number;
  feedback: string;
  tip?: string;
  recognized: string;
}

export default function PronunciationPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionWords, setSessionWords] = useState<VocabularyItem[]>([]);
  const [scores, setScores] = useState<number[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const vocabulary = useVocabStore((state) => state.vocabulary);
  const settings = useVocabStore((state) => state.settings);
  const addXp = useVocabStore((state) => state.addXp);
  const updatePronunciationScore = useVocabStore(
    (state) => state.updatePronunciationScore
  );

  useEffect(() => {
    // Initialize session with random words
    const words = shuffleArray([...vocabulary]).slice(0, 10);
    setSessionWords(words);
  }, [vocabulary]);

  const currentWord = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? ((currentIndex + 1) / sessionWords.length) * 100 : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const handleSpeak = async () => {
    if (!currentWord) return;
    try {
      await speak(currentWord.en, {
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

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setResult({
        score: 0,
        feedback: 'Nie udało się rozpoznać mowy. Spróbuj ponownie.',
        recognized: '',
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const evaluatePronunciation = (spoken: string) => {
    if (!currentWord) return;
    setIsProcessing(true);

    // Simple pronunciation evaluation (in production, use AI API)
    const expected = currentWord.en.toLowerCase().replace(/^(a |an |the )/i, '');
    const spokenClean = spoken.toLowerCase().replace(/^(a |an |the )/i, '');

    // Calculate similarity score
    const similarity = calculateSimilarity(expected, spokenClean);
    const score = Math.round(similarity * 10);

    // Generate feedback based on score
    let feedback = '';
    let tip = '';

    if (score >= 9) {
      feedback = 'Doskonale! Wymowa praktycznie perfekcyjna!';
    } else if (score >= 7) {
      feedback = 'Bardzo dobrze! Drobne niedociągnięcia.';
      tip = 'Posłuchaj jeszcze raz wzorcowej wymowy.';
    } else if (score >= 5) {
      feedback = 'Nieźle, ale można lepiej.';
      tip = 'Zwróć uwagę na akcent i wyraźność.';
    } else {
      feedback = 'Wymaga więcej ćwiczeń.';
      tip = 'Posłuchaj wzorca i spróbuj powtórzyć sylaba po sylabie.';
    }

    // Check for common Polish learner mistakes
    if (expected.includes('th') && !spokenClean.includes('th')) {
      tip = 'Dźwięk "th" - włóż język między zęby i wydmuchuj powietrze.';
    }
    if (expected.includes('w') && spokenClean.replace('w', 'v') === expected.replace('w', 'v')) {
      tip = 'Dźwięk "w" - zaokrąglij usta jak do "u", nie wymawiaj jak "v".';
    }

    setResult({
      score,
      feedback,
      tip,
      recognized: spoken,
    });

    setScores((prev) => [...prev, score]);
    updatePronunciationScore(currentWord.id, score);

    if (score >= 8) {
      addXp(XP_ACTIONS.pronunciation_good);
    }

    setIsProcessing(false);
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  };

  const handleNext = () => {
    if (currentIndex + 1 < sessionWords.length) {
      setCurrentIndex((prev) => prev + 1);
      setResult(null);
    }
  };

  const handleRetry = () => {
    setResult(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success-500';
    if (score >= 6) return 'text-amber-500';
    return 'text-error-500';
  };

  const getScoreStars = (score: number) => {
    const stars = Math.ceil(score / 3.33);
    return Array(3)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={24}
          className={cn(
            i < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
          )}
        />
      ));
  };

  if (sessionWords.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <Card variant="elevated" className="text-center p-8">
          <div className="text-6xl mb-4">🎤</div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Sesja zakończona!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Średnia ocena: {avgScore.toFixed(1)}/10
          </p>
          <div className="flex justify-center gap-2 mb-6">{getScoreStars(avgScore)}</div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => { setCurrentIndex(0); setScores([]); setResult(null); }}>
              Nowa sesja
            </Button>
            <Link href="/">
              <Button variant="secondary" className="w-full">
                Wróć do menu
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Trening wymowy
          </h1>
          <p className="text-sm text-slate-500">
            {currentIndex + 1} z {sessionWords.length}
          </p>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar value={progress} size="sm" />

      {/* Word card */}
      <Card variant="elevated">
        <CardContent className="p-6 text-center space-y-4">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {currentWord.en}
          </h2>
          <p className="text-lg text-slate-500 font-mono">{currentWord.phonetic}</p>
          <p className="text-slate-600 dark:text-slate-400">{currentWord.pl}</p>

          {/* Listen button */}
          <button
            onClick={handleSpeak}
            className="mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
          >
            <Volume2 size={20} />
            Posłuchaj wymowy
          </button>
        </CardContent>
      </Card>

      {/* Recording section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {!result ? (
            <div className="text-center space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                {isRecording
                  ? 'Mówię... Kliknij aby zakończyć'
                  : 'Kliknij mikrofon i powiedz słówko'}
              </p>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  'mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all',
                  isRecording
                    ? 'bg-error-500 animate-pulse'
                    : 'bg-primary-500 hover:bg-primary-600'
                )}
              >
                {isRecording ? (
                  <Square size={32} className="text-white" />
                ) : (
                  <Mic size={32} className="text-white" />
                )}
              </button>

              {isProcessing && (
                <p className="text-sm text-slate-500">Analizuję wymowę...</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score */}
              <div className="text-center">
                <div className="flex justify-center gap-1 mb-2">
                  {getScoreStars(result.score)}
                </div>
                <p className={cn('text-3xl font-bold', getScoreColor(result.score))}>
                  {result.score}/10
                </p>
              </div>

              {/* Feedback */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl space-y-2">
                <p className="text-slate-800 dark:text-slate-100">{result.feedback}</p>
                {result.tip && (
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    💡 {result.tip}
                  </p>
                )}
                {result.recognized && (
                  <p className="text-sm text-slate-500">
                    Rozpoznano: "{result.recognized}"
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleRetry} className="flex-1">
                  <RotateCcw size={18} className="mr-2" />
                  Powtórz
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Dalej
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session stats */}
      {scores.length > 0 && (
        <Card className="bg-slate-50 dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Średnia ocena sesji:
              </span>
              <span className={cn('font-semibold', getScoreColor(avgScore))}>
                {avgScore.toFixed(1)}/10
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
