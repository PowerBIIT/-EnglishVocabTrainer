'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Mic,
  Volume2,
  Square,
  RotateCcw,
  ChevronRight,
  Star,
  Settings,
  Target,
  Flame,
  BarChart3,
  BookOpen,
  Shuffle,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useVocabStore, useHydration } from '@/lib/store';
import { VocabularyItem, PronunciationFocusMode, PhonemeType, PronunciationAttempt } from '@/types';
import { cn, speak, XP_ACTIONS } from '@/lib/utils';
import { phonemeDrills } from '@/data/phonemeDrills';

interface PronunciationResult {
  score: number;
  feedback: string;
  tip?: string;
  recognized: string;
  errorPhonemes?: string[];
  polishInterference?: string;
}

type SessionState = 'setup' | 'practice' | 'complete';

const FOCUS_MODE_LABELS: Record<
  PronunciationFocusMode,
  { label: string; icon: LucideIcon; desc: string }
> = {
  random: { label: 'Losowe', icon: Shuffle, desc: 'Losowe słowa z Twojego słownika' },
  weak_words: { label: 'Słabe słowa', icon: TrendingDown, desc: 'Słowa z niską oceną wymowy' },
  new_words: { label: 'Nowe słowa', icon: Sparkles, desc: 'Słowa bez ćwiczenia wymowy' },
  phoneme_specific: { label: 'Konkretny fonem', icon: Target, desc: 'Ćwicz wybrany dźwięk' },
  review: { label: 'Powtórka', icon: RotateCcw, desc: 'Słowa wymagające powtórki' },
};

const SESSION_LENGTHS = [5, 10, 15, 20] as const;

export default function PronunciationPage() {
  const hydrated = useHydration();
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [isRecording, setIsRecording] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionWords, setSessionWords] = useState<VocabularyItem[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [selectedSetId, setSelectedSetId] = useState<'all' | 'unassigned' | string>('all');

  // Session config
  const [selectedLength, setSelectedLength] = useState<number>(10);
  const [selectedFocusMode, setSelectedFocusMode] = useState<PronunciationFocusMode>('random');
  const [selectedPhoneme, setSelectedPhoneme] = useState<PhonemeType | undefined>(undefined);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const settings = useVocabStore((state) => state.settings);
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.vocabulary);
  const sets = useVocabStore((state) => state.sets);
  const addXp = useVocabStore((state) => state.addXp);
  const addPronunciationAttempt = useVocabStore((state) => state.addPronunciationAttempt);
  const getNextPronunciationWords = useVocabStore((state) => state.getNextPronunciationWords);
  const updatePronunciationStreak = useVocabStore((state) => state.updatePronunciationStreak);
  const updatePhonemeMastery = useVocabStore((state) => state.updatePhonemeMastery);
  const completePronunciationSession = useVocabStore((state) => state.completePronunciationSession);
  const getWeakPronunciationWords = useVocabStore((state) => state.getWeakPronunciationWords);
  const updateDailyMissionProgress = useVocabStore((state) => state.updateDailyMissionProgress);

  const currentWord = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? ((currentIndex + 1) / sessionWords.length) * 100 : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

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

  const weakWordsCount = useMemo(
    () => filterBySet(getWeakPronunciationWords(100)).length,
    [filterBySet, getWeakPronunciationWords]
  );

  useEffect(() => {
    if (
      selectedSetId !== 'all' &&
      selectedSetId !== 'unassigned' &&
      !sets.some((set) => set.id === selectedSetId)
    ) {
      setSelectedSetId('all');
    }
  }, [selectedSetId, sets]);

  const startSession = () => {
    const words = getNextPronunciationWords(
      selectedLength,
      selectedFocusMode,
      selectedPhoneme,
      selectedSetId === 'all' ? undefined : selectedSetId
    );
    if (words.length === 0) {
      alert('Brak słów spełniających kryteria. Spróbuj innego trybu.');
      return;
    }
    setSessionWords(words);
    setCurrentIndex(0);
    setScores([]);
    setResult(null);
    setSessionState('practice');
  };

  const finishSession = useCallback(() => {
    updatePronunciationStreak();
    completePronunciationSession({
      sessionId: Date.now().toString(),
      startedAt: new Date(),
      completedAt: new Date(),
      focusMode: selectedFocusMode,
      targetPhoneme: selectedPhoneme,
      totalWords: sessionWords.length,
      averageScore: avgScore,
      attempts: [],
      xpEarned: scores.filter((s) => s >= 8).length * XP_ACTIONS.pronunciation_good,
    });
    setSessionState('complete');
  }, [
    avgScore,
    completePronunciationSession,
    scores,
    selectedFocusMode,
    selectedPhoneme,
    sessionWords.length,
    updatePronunciationStreak,
  ]);

  useEffect(() => {
    if (sessionState === 'practice' && currentIndex >= sessionWords.length && sessionWords.length > 0) {
      finishSession();
    }
  }, [currentIndex, finishSession, sessionState, sessionWords.length]);

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
      setRecordingStatus('Przeglądarka nie obsługuje rozpoznawania mowy. Użyj Chrome lub Edge.');
      return;
    }

    // Reset states
    setResult(null);
    setRecognizedText('');
    setRecordingStatus('Uruchamiam mikrofon...');

    const recognition = new SpeechRecognitionApi();

    // Configuration
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true; // Keep listening until we get a result

    let hasResult = false;
    let hasSpeechStarted = false;

    // Service started listening
    recognition.onstart = () => {
      console.log('[STT] Recognition service started');
      hasResult = false;
      hasSpeechStarted = false;
      setIsRecording(true);
      setRecordingStatus('Mikrofon aktywny - mów teraz.');
    };

    // Audio capture started (microphone is working)
    recognition.onaudiostart = () => {
      console.log('[STT] Audio capture started');
      setRecordingStatus('Nagrywam - powiedz słowo...');
    };

    // Sound detected (any sound, not necessarily speech)
    recognition.onsoundstart = () => {
      console.log('[STT] Sound detected');
    };

    // Speech detected
    recognition.onspeechstart = () => {
      console.log('[STT] Speech detected');
      hasSpeechStarted = true;
      setRecordingStatus('Słyszę Cię, mów dalej...');
    };

    // Speech ended
    recognition.onspeechend = () => {
      console.log('[STT] Speech ended');
      if (!hasResult) {
        setRecordingStatus('Przetwarzam...');
      }
    };

    // Result received
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const resultIndex = event.results.length - 1;
      const result = event.results[resultIndex];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      console.log('[STT] Result:', { transcript, isFinal, confidence: (confidence * 100).toFixed(1) + '%' });

      if (isFinal) {
        hasResult = true;
        setRecognizedText(transcript);
        setRecordingStatus(`Rozpoznano: "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
        setIsRecording(false);
        // Stop recognition after getting result
        recognition.stop();
        evaluatePronunciation(transcript.toLowerCase());
      } else {
        // Show interim result while speaking
        setRecordingStatus(`Rozpoznaje: "${transcript}"...`);
      }
    };

    // No match found
    recognition.onnomatch = () => {
      console.log('[STT] No match - speech not recognized');
      setRecordingStatus('Nie rozpoznano słowa. Spróbuj mówić wyraźniej.');
    };

    // Error occurred
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[STT] Error:', event.error);
      setIsRecording(false);
      hasResult = true;

      const errorMessages: Record<string, string> = {
        'no-speech': 'Nie wykryto mowy. Sprawdź czy mikrofon działa i mów głośno.',
        'audio-capture': 'Nie można uzyskać dostępu do mikrofonu. Sprawdź czy jest podłączony.',
        'not-allowed': 'Brak uprawnień do mikrofonu. Kliknij ikonę blokady w pasku adresu i zezwól.',
        'network': 'Błąd sieci. Rozpoznawanie wymaga internetu (używa serwerów Google).',
        'aborted': 'Nagrywanie przerwane.',
        'service-not-allowed': 'Usługa rozpoznawania mowy niedostępna.',
      };

      setRecordingStatus(errorMessages[event.error] || `Błąd: ${event.error}`);
    };

    // Recognition ended
    recognition.onend = () => {
      console.log('[STT] Recognition ended. hasResult:', hasResult, 'hasSpeechStarted:', hasSpeechStarted);
      setIsRecording(false);

      if (!hasResult) {
        if (hasSpeechStarted) {
          setRecordingStatus('Nie udało się rozpoznać. Spróbuj mówić wolniej i wyraźniej.');
        } else {
          // No speech was detected at all - likely microphone issue
          setRecordingStatus('Nie wykryto dźwięku. Sprawdź: 1) Czy mikrofon nie jest wyciszony 2) Czy Chrome używa właściwego mikrofonu (chrome://settings/content/microphone)');
          console.log('[STT] TIP: Check microphone at chrome://settings/content/microphone');
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      console.log('[STT] Recognition.start() called');
    } catch (error) {
      console.error('[STT] Failed to start:', error);
      setRecordingStatus('Nie udało się uruchomić rozpoznawania mowy');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const evaluatePronunciation = async (spoken: string) => {
    if (!currentWord) return;
    setIsProcessing(true);
    setRecordingStatus('Wysyłam do AI...');
    console.log('Evaluating pronunciation:', spoken, 'for word:', currentWord.en);

    try {
      const response = await fetch('/api/ai/evaluate-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected: currentWord.en,
          phonetic: currentWord.phonetic,
          spoken,
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      // If API returned fallback flag or error, use local evaluation
      if (data.fallback || data.error) {
        console.log('API fallback triggered:', data.error || 'No API key');
        setRecordingStatus('Używam lokalnej oceny...');
        evaluateLocally(spoken);
        return;
      }

      // Validate response has required fields
      if (typeof data.score !== 'number' || !data.feedback) {
        console.warn('Invalid API response structure:', data);
        setRecordingStatus('Nieprawidłowa odpowiedź API');
        evaluateLocally(spoken);
        return;
      }

      setRecordingStatus('Analiza gotowa.');

      const pronunciationResult: PronunciationResult = {
        score: data.score,
        feedback: data.feedback,
        tip: data.tip,
        recognized: spoken,
        errorPhonemes: data.errorPhonemes,
        polishInterference: data.polishInterference,
      };

      setResult(pronunciationResult);
      setScores((prev) => [...prev, data.score]);
      setRecordingStatus(''); // Clear status when showing result

      // Save attempt to history
      const attempt: PronunciationAttempt = {
        id: Date.now().toString(),
        vocab_id: currentWord.id,
        timestamp: new Date(),
        score: data.score,
        recognizedText: spoken,
        expectedWord: currentWord.en,
        errorPhonemes: data.errorPhonemes,
        aiTip: data.tip,
        phonemeType: selectedPhoneme,
      };
      addPronunciationAttempt(attempt);

      // Update phoneme mastery if practicing specific phoneme
      if (selectedPhoneme) {
        updatePhonemeMastery(selectedPhoneme, data.score);
      }

      if (data.score >= settings.pronunciation.passingScore) {
        addXp(XP_ACTIONS.pronunciation_good);
        updateDailyMissionProgress('pronunciation', 1);
      }
    } catch (error) {
      console.error('AI evaluation error:', error);
      evaluateLocally(spoken);
    }

    setIsProcessing(false);
  };

  const evaluateLocally = (spoken: string) => {
    if (!currentWord) return;

    const expected = currentWord.en.toLowerCase().replace(/^(a |an |the )/i, '');
    const spokenClean = spoken.toLowerCase().replace(/^(a |an |the )/i, '');

    const similarity = calculateSimilarity(expected, spokenClean);
    const score = Math.round(similarity * 10);

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

    if (expected.includes('th') && !spokenClean.includes('th')) {
      tip = 'Dźwięk "th" - włóż język między zęby i wydmuchuj powietrze.';
    }
    if (expected.includes('w') && spokenClean.replace('w', 'v') === expected.replace('w', 'v')) {
      tip = 'Dźwięk "w" - zaokrąglij usta jak do "u", nie wymawiaj jak "v".';
    }

    setResult({ score, feedback, tip, recognized: spoken });
    setScores((prev) => [...prev, score]);

    const attempt: PronunciationAttempt = {
      id: Date.now().toString(),
      vocab_id: currentWord.id,
      timestamp: new Date(),
      score,
      recognizedText: spoken,
      expectedWord: currentWord.en,
      phonemeType: selectedPhoneme,
    };
    addPronunciationAttempt(attempt);

    if (selectedPhoneme) {
      updatePhonemeMastery(selectedPhoneme, score);
    }

    if (score >= settings.pronunciation.passingScore) {
      addXp(XP_ACTIONS.pronunciation_good);
      updateDailyMissionProgress('pronunciation', 1);
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
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
      setRecordingStatus('');
      setRecognizedText('');
    } else {
      finishSession();
    }
  };

  const handleRetry = () => {
    setResult(null);
    setRecordingStatus('');
    setRecognizedText('');
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
          className={cn(i < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
        />
      ));
  };

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  // SETUP SCREEN
  if (sessionState === 'setup') {
    return (
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
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
            <p className="text-sm text-slate-500">Skonfiguruj sesję</p>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Flame size={18} />
              <span className="font-bold">{stats.pronunciationStreak || 0}</span>
            </div>
            <p className="text-xs text-slate-500">Streak</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-primary-500 mb-1">
              <BarChart3 size={18} />
              <span className="font-bold">{(stats.averagePronunciationScore || 0).toFixed(1)}</span>
            </div>
            <p className="text-xs text-slate-500">Średnia</p>
          </Card>
          <Card className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-success-500 mb-1">
              <BookOpen size={18} />
              <span className="font-bold">{stats.totalPronunciationSessions || 0}</span>
            </div>
            <p className="text-xs text-slate-500">Sesje</p>
          </Card>
        </div>

        {/* Session length */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings size={18} />
              Długość sesji
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {SESSION_LENGTHS.map((len) => (
                <button
                  key={len}
                  onClick={() => setSelectedLength(len)}
                  className={cn(
                    'py-2 px-3 rounded-lg font-medium transition-colors',
                    selectedLength === len
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  {len}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen size={18} />
              Zestaw
            </h3>
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

        {/* Focus mode */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Target size={18} />
              Tryb ćwiczeń
            </h3>
            <div className="space-y-2">
              {(Object.keys(FOCUS_MODE_LABELS) as PronunciationFocusMode[]).map((mode) => {
                const { label, icon: Icon, desc } = FOCUS_MODE_LABELS[mode];
                const isDisabled = mode === 'weak_words' && weakWordsCount === 0;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setSelectedFocusMode(mode);
                      if (mode !== 'phoneme_specific') {
                        setSelectedPhoneme(undefined);
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3',
                      selectedFocusMode === mode
                        ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500'
                        : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon size={20} className="text-primary-600 dark:text-primary-400" />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {label}
                        {mode === 'weak_words' && weakWordsCount > 0 && (
                          <span className="ml-2 text-sm text-error-500">({weakWordsCount})</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Phoneme selection (if phoneme_specific) */}
        {selectedFocusMode === 'phoneme_specific' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Wybierz fonem</h3>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {phonemeDrills.map((drill) => (
                  <button
                    key={drill.id}
                    onClick={() => setSelectedPhoneme(drill.phonemeType)}
                    className={cn(
                      'p-2 rounded-lg text-left transition-colors',
                      selectedPhoneme === drill.phonemeType
                        ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500'
                        : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <p className="font-mono text-lg">{drill.phonemeSymbol}</p>
                    <p className="text-xs text-slate-500">{drill.namePl}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start button */}
        <Button
          onClick={startSession}
          className="w-full py-4 text-lg"
          disabled={selectedFocusMode === 'phoneme_specific' && !selectedPhoneme}
        >
          <Mic size={24} className="mr-2" />
          Rozpocznij sesję
        </Button>

        {/* Link to phoneme drills */}
        <Link href="/pronunciation/drills">
          <Button variant="secondary" className="w-full">
            <BookOpen size={18} className="mr-2" />
            Ćwiczenia fonemów dla Polaków
          </Button>
        </Link>
      </div>
    );
  }

  // COMPLETE SCREEN
  if (sessionState === 'complete') {
    return (
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <Card variant="elevated" className="text-center p-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900 flex items-center justify-center">
            <Mic size={32} className="text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Sesja zakończona!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Średnia ocena: {avgScore.toFixed(1)}/10
          </p>
          <div className="flex justify-center gap-2 mb-6">{getScoreStars(avgScore)}</div>

          {/* Session stats */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">Słowa</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {sessionWords.length}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">Dobra wymowa</p>
              <p className="text-xl font-bold text-success-500">
                {scores.filter((s) => s >= 8).length}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">XP zdobyte</p>
              <p className="text-xl font-bold text-primary-500">
                +{scores.filter((s) => s >= 8).length * XP_ACTIONS.pronunciation_good}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
              <p className="text-sm text-slate-500">Streak wymowy</p>
              <p className="text-xl font-bold text-amber-500 flex items-center gap-1">
                <Flame size={20} />
                {stats.pronunciationStreak}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => setSessionState('setup')}>Nowa sesja</Button>
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

  // PRACTICE SCREEN
  if (!currentWord) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSessionState('setup')}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Trening wymowy
          </h1>
          <p className="text-sm text-slate-500">
            {currentIndex + 1} z {sessionWords.length} • {FOCUS_MODE_LABELS[selectedFocusMode].label}
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
                {isRecording ? 'Słucham... Powiedz słowo.' : 'Kliknij mikrofon i powiedz słowo.'}
              </p>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={cn(
                  'mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all',
                  isRecording ? 'bg-error-500 animate-pulse scale-110' : 'bg-primary-500 hover:bg-primary-600',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isRecording ? (
                  <Square size={32} className="text-white" />
                ) : (
                  <Mic size={32} className="text-white" />
                )}
              </button>

              {/* Status message */}
              {recordingStatus && !isProcessing && (
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {recordingStatus}
                </p>
              )}

              {/* Recognized text display */}
              {recognizedText && !isProcessing && (
                <div className="p-3 bg-success-50 dark:bg-success-900/30 rounded-lg">
                  <p className="text-sm text-success-700 dark:text-success-300">
                    Rozpoznano: <span className="font-bold">"{recognizedText}"</span>
                  </p>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    AI analizuje Twoją wymowę...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex justify-center gap-1 mb-2">{getScoreStars(result.score)}</div>
                <p className={cn('text-3xl font-bold', getScoreColor(result.score))}>
                  {result.score}/10
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl space-y-3">
                <p className="text-slate-800 dark:text-slate-100">{result.feedback}</p>
                {result.tip && (
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    Wskazówka: {result.tip}
                  </p>
                )}
                {result.errorPhonemes && result.errorPhonemes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500">Problematyczne dźwięki:</span>
                    {result.errorPhonemes.map((phoneme, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs font-mono bg-error-100 dark:bg-error-900 text-error-700 dark:text-error-300 rounded"
                      >
                        {phoneme}
                      </span>
                    ))}
                  </div>
                )}
                {result.polishInterference && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Wpływ polskiego: {result.polishInterference}
                  </p>
                )}
                {result.recognized && (
                  <p className="text-sm text-slate-500">Rozpoznano: "{result.recognized}"</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleRetry} className="flex-1">
                  <RotateCcw size={18} className="mr-2" />
                  Powtórz
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  {currentIndex + 1 < sessionWords.length ? 'Dalej' : 'Zakończ'}
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
              <span className="text-slate-600 dark:text-slate-400">Średnia ocena sesji:</span>
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
