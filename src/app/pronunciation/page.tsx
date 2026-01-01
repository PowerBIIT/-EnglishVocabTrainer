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
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useVocabStore, useHydration } from '@/lib/store';
import { VocabularyItem, PronunciationFocusMode, PhonemeType, PronunciationAttempt } from '@/types';
import { cn, speak, XP_ACTIONS } from '@/lib/utils';
import { calculatePronunciationScore } from '@/lib/pronunciation';
import { phonemeDrills } from '@/data/phonemeDrills';
import { useLanguage } from '@/lib/i18n';
import {
  getLearningPair,
  getNativeText,
  getSpeechLocale,
  getTargetText,
} from '@/lib/languages';

interface PronunciationResult {
  score: number;
  feedback: string;
  tip?: string;
  recognized: string;
  errorPhonemes?: string[];
  nativeInterference?: string;
}

type SessionState = 'setup' | 'practice' | 'complete';

const FOCUS_MODE_ICONS: Record<PronunciationFocusMode, LucideIcon> = {
  random: Shuffle,
  weak_words: TrendingDown,
  new_words: Sparkles,
  phoneme_specific: Target,
  review: RotateCcw,
};

const focusModeCopy = {
  pl: {
    random: { label: 'Losowe', desc: 'Losowe słowa z Twojego słownika' },
    weak_words: { label: 'Słabe słowa', desc: 'Słowa z niską oceną wymowy' },
    new_words: { label: 'Nowe słowa', desc: 'Słowa bez ćwiczenia wymowy' },
    phoneme_specific: { label: 'Konkretny fonem', desc: 'Ćwicz wybrany dźwięk' },
    review: { label: 'Powtórka', desc: 'Słowa wymagające powtórki' },
  },
  en: {
    random: { label: 'Random', desc: 'Random words from your library' },
    weak_words: { label: 'Weak words', desc: 'Words with low pronunciation scores' },
    new_words: { label: 'New words', desc: 'Words without pronunciation practice' },
    phoneme_specific: { label: 'Specific phoneme', desc: 'Practice a selected sound' },
    review: { label: 'Review', desc: 'Words that need review' },
  },
  uk: {
    random: { label: 'Випадкові', desc: 'Випадкові слова з твоєї бібліотеки' },
    weak_words: { label: 'Слабкі слова', desc: 'Слова з низькою оцінкою вимови' },
    new_words: { label: 'Нові слова', desc: 'Слова без тренування вимови' },
    phoneme_specific: { label: 'Конкретний фонем', desc: 'Тренуй вибраний звук' },
    review: { label: 'Повторення', desc: 'Слова, які потребують повторення' },
  },
} as const;

const pronunciationCopy = {
  pl: {
    loading: 'Ładowanie...',
    title: 'Trening wymowy',
    setupSubtitle: 'Skonfiguruj sesję',
    statsStreak: 'Streak',
    statsAverage: 'Średnia',
    statsSessions: 'Sesje',
    progressLabel: (current: number, total: number) => `${current} z ${total}`,
    sessionLength: 'Długość sesji',
    setLabel: 'Zestaw',
    allSets: (count: number) => `Wszystkie (${count})`,
    unassigned: (count: number) => `Bez zestawu (${count})`,
    focusMode: 'Tryb ćwiczeń',
    selectPhoneme: 'Wybierz fonem',
    startSession: 'Rozpocznij sesję',
    phonemeDrills: 'Ćwiczenia fonemów (angielski)',
    sessionComplete: 'Sesja zakończona!',
    averageScore: (score: number) => `Średnia ocena: ${score.toFixed(1)}/10`,
    readinessTitle: 'Gotowość do kartkówki',
    readinessDelta: (delta: string) => `Zmiana ${delta}`,
    aiSummaryTitle: 'AI podsumowanie',
    aiSummaryAction: 'Podsumuj z AI',
    aiSummaryLoading: 'AI podsumowuje...',
    aiSummaryGood: 'Wymowa jest stabilna.',
    aiSummaryNeedsWork: 'Wymowa jeszcze nie jest stabilna.',
    aiSummaryTipWeak: (words: string) => `Powtórz: ${words}.`,
    aiSummaryTipMaintain: 'Rytm: 5 słów dziennie.',
    aiSummaryTipListen: 'Odsłuchaj wzorzec.',
    wordsLabel: 'Słowa',
    goodPronunciation: 'Dobra wymowa',
    xpEarned: 'XP zdobyte',
    pronunciationStreak: 'Streak wymowy',
    newSession: 'Nowa sesja',
    backToMenu: 'Wróć do menu',
    listenPronunciation: 'Posłuchaj wymowy',
    recordingPromptIdle: 'Kliknij mikrofon i powiedz słowo.',
    recordingPromptActive: 'Słucham... Powiedz słowo.',
    recognizedLabel: (text: string) => `Rozpoznano: "${text}"`,
    aiAnalyzing: 'AI analizuje Twoją wymowę...',
    hintLabel: 'Wskazówka:',
    errorPhonemes: 'Problematyczne dźwięki:',
    polishInterference: 'Wpływ języka ojczystego:',
    repeat: 'Powtórz',
    next: 'Dalej',
    finish: 'Zakończ',
    sessionAverageLabel: 'Średnia ocena sesji:',
    noWordsAlert: 'Brak słów spełniających kryteria. Spróbuj innego trybu.',
    recognitionUnsupported:
      'Przeglądarka nie obsługuje rozpoznawania mowy. Użyj Chrome lub Edge.',
    status: {
      startingMic: 'Uruchamiam mikrofon...',
      micActive: 'Mikrofon aktywny - mów teraz.',
      recording: 'Nagrywam - powiedz słowo...',
      hearing: 'Słyszę Cię, mów dalej...',
      processing: 'Przetwarzam...',
      recognized: (text: string, confidence: number) =>
        `Rozpoznano: "${text}" (${confidence}%)`,
      recognizing: (text: string) => `Rozpoznaje: "${text}"...`,
      noMatch: 'Nie rozpoznano słowa. Spróbuj mówić wyraźniej.',
      errorMessages: {
        'no-speech': 'Nie wykryto mowy. Sprawdź czy mikrofon działa i mów głośno.',
        'audio-capture': 'Nie można uzyskać dostępu do mikrofonu. Sprawdź czy jest podłączony.',
        'not-allowed':
          'Brak uprawnień do mikrofonu. Kliknij ikonę blokady w pasku adresu i zezwól.',
        network: 'Błąd sieci. Rozpoznawanie wymaga internetu (używa serwerów Google).',
        aborted: 'Nagrywanie przerwane.',
        'service-not-allowed': 'Usługa rozpoznawania mowy niedostępna.',
      },
      errorFallback: (error: string) => `Błąd: ${error}`,
      noResultSpeech: 'Nie udało się rozpoznać. Spróbuj mówić wolniej i wyraźniej.',
      noResultSound:
        'Nie wykryto dźwięku. Sprawdź: 1) Czy mikrofon nie jest wyciszony 2) Czy Chrome używa właściwego mikrofonu (chrome://settings/content/microphone)',
      startFailed: 'Nie udało się uruchomić rozpoznawania mowy',
      aiSending: 'Wysyłam do AI...',
      aiFallback: 'Używam lokalnej oceny...',
      aiLimitReached: 'Limit AI wyczerpany. Używam lokalnej oceny...',
      aiGlobalLimitReached: 'Globalny limit AI osiągnięty. Używam lokalnej oceny...',
      aiInvalid: 'Nieprawidłowa odpowiedź API',
      aiDone: 'Analiza gotowa.',
    },
    localFeedback: {
      excellent: 'Doskonale! Wymowa praktycznie perfekcyjna!',
      good: 'Bardzo dobrze! Drobne niedociągnięcia.',
      goodTip: 'Posłuchaj jeszcze raz wzorcowej wymowy.',
      ok: 'Nieźle, ale można lepiej.',
      okTip: 'Zwróć uwagę na akcent i wyraźność.',
      needsWork: 'Wymaga więcej ćwiczeń.',
      needsWorkTip: 'Posłuchaj wzorca i spróbuj powtórzyć sylaba po sylabie.',
      tipTh: 'Dźwięk "th" - włóż język między zęby i wydmuchuj powietrze.',
      tipW: 'Dźwięk "w" - zaokrąglij usta jak do "u", nie wymawiaj jak "v".',
    },
  },
  en: {
    loading: 'Loading...',
    title: 'Pronunciation training',
    setupSubtitle: 'Configure session',
    statsStreak: 'Streak',
    statsAverage: 'Average',
    statsSessions: 'Sessions',
    progressLabel: (current: number, total: number) => `${current} of ${total}`,
    sessionLength: 'Session length',
    setLabel: 'Set',
    allSets: (count: number) => `All (${count})`,
    unassigned: (count: number) => `Unassigned (${count})`,
    focusMode: 'Practice mode',
    selectPhoneme: 'Choose phoneme',
    startSession: 'Start session',
    phonemeDrills: 'Phoneme drills (English)',
    sessionComplete: 'Session complete!',
    averageScore: (score: number) => `Average score: ${score.toFixed(1)}/10`,
    readinessTitle: 'Test readiness',
    readinessDelta: (delta: string) => `Change ${delta}`,
    aiSummaryTitle: 'AI summary',
    aiSummaryAction: 'Summarize with AI',
    aiSummaryLoading: 'AI summarizing...',
    aiSummaryGood: 'Your pronunciation is stable.',
    aiSummaryNeedsWork: 'Pronunciation isn’t stable yet.',
    aiSummaryTipWeak: (words: string) => `Repeat: ${words}.`,
    aiSummaryTipMaintain: 'Rhythm: 5 words a day.',
    aiSummaryTipListen: 'Listen to the model.',
    wordsLabel: 'Words',
    goodPronunciation: 'Good pronunciations',
    xpEarned: 'XP earned',
    pronunciationStreak: 'Pronunciation streak',
    newSession: 'New session',
    backToMenu: 'Back to menu',
    listenPronunciation: 'Listen to pronunciation',
    recordingPromptIdle: 'Click the microphone and say the word.',
    recordingPromptActive: 'Listening... Say the word.',
    recognizedLabel: (text: string) => `Recognized: "${text}"`,
    aiAnalyzing: 'AI is analyzing your pronunciation...',
    hintLabel: 'Tip:',
    errorPhonemes: 'Trouble sounds:',
    polishInterference: 'Native language influence:',
    repeat: 'Repeat',
    next: 'Next',
    finish: 'Finish',
    sessionAverageLabel: 'Session average score:',
    noWordsAlert: 'No words match the criteria. Try another mode.',
    recognitionUnsupported:
      'Speech recognition is not supported. Use Chrome or Edge.',
    status: {
      startingMic: 'Starting microphone...',
      micActive: 'Microphone active - speak now.',
      recording: 'Recording - say the word...',
      hearing: 'I can hear you, keep speaking...',
      processing: 'Processing...',
      recognized: (text: string, confidence: number) =>
        `Recognized: "${text}" (${confidence}%)`,
      recognizing: (text: string) => `Recognizing: "${text}"...`,
      noMatch: 'Word not recognized. Try speaking more clearly.',
      errorMessages: {
        'no-speech': 'No speech detected. Check your microphone and speak loudly.',
        'audio-capture': 'Cannot access the microphone. Check if it is connected.',
        'not-allowed':
          'Microphone permission denied. Click the lock icon in the address bar and allow it.',
        network:
          'Network error. Recognition requires internet (Google servers).',
        aborted: 'Recording aborted.',
        'service-not-allowed': 'Speech recognition service is not available.',
      },
      errorFallback: (error: string) => `Error: ${error}`,
      noResultSpeech: 'Could not recognize. Try speaking slower and clearer.',
      noResultSound:
        'No sound detected. Check: 1) Microphone not muted 2) Chrome uses the correct microphone (chrome://settings/content/microphone)',
      startFailed: 'Could not start speech recognition',
      aiSending: 'Sending to AI...',
      aiFallback: 'Using local evaluation...',
      aiLimitReached: 'AI limit reached. Using local evaluation...',
      aiGlobalLimitReached: 'Global AI limit reached. Using local evaluation...',
      aiInvalid: 'Invalid API response',
      aiDone: 'Analysis ready.',
    },
    localFeedback: {
      excellent: 'Excellent! Pronunciation is nearly perfect!',
      good: 'Very good! Minor issues.',
      goodTip: 'Listen to the reference pronunciation once more.',
      ok: 'Not bad, but it can be better.',
      okTip: 'Pay attention to stress and clarity.',
      needsWork: 'Needs more practice.',
      needsWorkTip: 'Listen to the model and repeat syllable by syllable.',
      tipTh: 'Sound "th": place your tongue between your teeth and blow air.',
      tipW: 'Sound "w": round your lips like "u", do not pronounce as "v".',
    },
  },
  uk: {
    loading: 'Завантаження...',
    title: 'Тренування вимови',
    setupSubtitle: 'Налаштуй сесію',
    statsStreak: 'Серія',
    statsAverage: 'Середня',
    statsSessions: 'Сесії',
    progressLabel: (current: number, total: number) => `${current} з ${total}`,
    sessionLength: 'Тривалість сесії',
    setLabel: 'Набір',
    allSets: (count: number) => `Усі (${count})`,
    unassigned: (count: number) => `Без набору (${count})`,
    focusMode: 'Режим тренування',
    selectPhoneme: 'Обери фонем',
    startSession: 'Почати сесію',
    phonemeDrills: 'Вправи фонемів (англійська)',
    sessionComplete: 'Сесію завершено!',
    averageScore: (score: number) => `Середня оцінка: ${score.toFixed(1)}/10`,
    readinessTitle: 'Готовність до контрольної',
    readinessDelta: (delta: string) => `Зміна ${delta}`,
    aiSummaryTitle: 'AI підсумок',
    aiSummaryAction: 'Підсумуй з AI',
    aiSummaryLoading: 'AI підсумовує...',
    aiSummaryGood: 'Вимова стабільна.',
    aiSummaryNeedsWork: 'Вимова ще нестабільна.',
    aiSummaryTipWeak: (words: string) => `Повтори: ${words}.`,
    aiSummaryTipMaintain: 'Ритм: 5 слів на день.',
    aiSummaryTipListen: 'Послухай зразок.',
    wordsLabel: 'Слова',
    goodPronunciation: 'Добра вимова',
    xpEarned: 'XP отримано',
    pronunciationStreak: 'Серія вимови',
    newSession: 'Нова сесія',
    backToMenu: 'Повернутися до меню',
    listenPronunciation: 'Прослухай вимову',
    recordingPromptIdle: 'Натисни мікрофон і скажи слово.',
    recordingPromptActive: 'Слухаю... Скажи слово.',
    recognizedLabel: (text: string) => `Розпізнано: "${text}"`,
    aiAnalyzing: 'AI аналізує твою вимову...',
    hintLabel: 'Порада:',
    errorPhonemes: 'Проблемні звуки:',
    polishInterference: 'Вплив рідної мови:',
    repeat: 'Повторити',
    next: 'Далі',
    finish: 'Завершити',
    sessionAverageLabel: 'Середня оцінка сесії:',
    noWordsAlert: 'Немає слів, що відповідають критеріям. Спробуй інший режим.',
    recognitionUnsupported:
      'Браузер не підтримує розпізнавання мови. Використай Chrome або Edge.',
    status: {
      startingMic: 'Запускаю мікрофон...',
      micActive: 'Мікрофон активний — говори.',
      recording: 'Записую — скажи слово...',
      hearing: 'Чую тебе, говори далі...',
      processing: 'Обробляю...',
      recognized: (text: string, confidence: number) =>
        `Розпізнано: "${text}" (${confidence}%)`,
      recognizing: (text: string) => `Розпізнаю: "${text}"...`,
      noMatch: 'Слово не розпізнано. Спробуй говорити чіткіше.',
      errorMessages: {
        'no-speech': 'Мову не виявлено. Перевір мікрофон і говори голосніше.',
        'audio-capture': 'Немає доступу до мікрофона. Перевір, чи він підключений.',
        'not-allowed':
          'Немає дозволу на мікрофон. Натисни значок замка в адресному рядку та дозволь доступ.',
        network:
          'Помилка мережі. Розпізнавання потребує інтернету (сервери Google).',
        aborted: 'Запис перервано.',
        'service-not-allowed': 'Сервіс розпізнавання мови недоступний.',
      },
      errorFallback: (error: string) => `Помилка: ${error}`,
      noResultSpeech: 'Не вдалося розпізнати. Спробуй говорити повільніше і чіткіше.',
      noResultSound:
        'Звук не виявлено. Перевір: 1) чи не вимкнено мікрофон 2) чи Chrome використовує правильний мікрофон (chrome://settings/content/microphone)',
      startFailed: 'Не вдалося запустити розпізнавання мови',
      aiSending: 'Надсилаю в AI...',
      aiFallback: 'Використовую локальну оцінку...',
      aiLimitReached: 'Ліміт AI вичерпано. Використовую локальну оцінку...',
      aiGlobalLimitReached: 'Глобальний ліміт AI вичерпано. Використовую локальну оцінку...',
      aiInvalid: 'Некоректна відповідь API',
      aiDone: 'Аналіз готовий.',
    },
    localFeedback: {
      excellent: 'Чудово! Вимова майже ідеальна!',
      good: 'Дуже добре! Є дрібні неточності.',
      goodTip: 'Послухай зразкову вимову ще раз.',
      ok: 'Непогано, але можна краще.',
      okTip: 'Зверни увагу на наголос і чіткість.',
      needsWork: 'Потрібно більше практики.',
      needsWorkTip: 'Послухай зразок і повторюй по складах.',
      tipTh: 'Звук "th" — висунь язик між зубами і видувай повітря.',
      tipW: 'Звук "w" — округли губи як для "у", не вимовляй як "v".',
    },
  },
} as const;

type PronunciationCopy = typeof pronunciationCopy.pl;

const SESSION_LENGTHS = [5, 10, 15, 20] as const;

export default function PronunciationPage() {
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (pronunciationCopy[language] ?? pronunciationCopy.pl) as PronunciationCopy;
  const searchParams = useSearchParams();
  const setIdParam = searchParams.get('setId')?.trim() ?? '';
  const focusParam = searchParams.get('focus')?.trim() ?? '';
  const lengthParam = searchParams.get('length')?.trim() ?? '';
  const focusModes = focusModeCopy[language] ?? focusModeCopy.pl;
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
  const [appliedParams, setAppliedParams] = useState(false);
  const [readinessSnapshot, setReadinessSnapshot] = useState<{
    readiness: number;
    delta: number;
  } | null>(null);
  const [aiSummary, setAiSummary] = useState<{ summary: string; tips: string[] } | null>(null);
  const [aiSummaryStatus, setAiSummaryStatus] = useState<'idle' | 'loading'>('idle');

  // Session config
  const [selectedLength, setSelectedLength] = useState<number>(10);
  const [selectedFocusMode, setSelectedFocusMode] = useState<PronunciationFocusMode>('random');
  const [selectedPhoneme, setSelectedPhoneme] = useState<PhonemeType | undefined>(undefined);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionSessionRef = useRef(0);

  const settings = useVocabStore((state) => state.settings);
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const sets = useVocabStore((state) => state.getActiveSets());
  const addXp = useVocabStore((state) => state.addXp);
  const addPronunciationAttempt = useVocabStore((state) => state.addPronunciationAttempt);
  const getNextPronunciationWords = useVocabStore((state) => state.getNextPronunciationWords);
  const updatePronunciationStreak = useVocabStore((state) => state.updatePronunciationStreak);
  const updatePhonemeMastery = useVocabStore((state) => state.updatePhonemeMastery);
  const completePronunciationSession = useVocabStore((state) => state.completePronunciationSession);
  const getWeakPronunciationWords = useVocabStore((state) => state.getWeakPronunciationWords);
  const updateDailyMissionProgress = useVocabStore((state) => state.updateDailyMissionProgress);

  const activePair = useMemo(() => getLearningPair(settings.learning.pairId), [settings.learning.pairId]);
  const isEnglishTarget = settings.learning.targetLanguage === 'en';
  const enablePhonemeDrills = isEnglishTarget && settings.learning.nativeLanguage === 'pl';
  const passingScore = settings.pronunciation.passingScore;

  const currentWord = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? ((currentIndex + 1) / sessionWords.length) * 100 : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const availableFocusModes = useMemo(
    () =>
      (Object.keys(FOCUS_MODE_ICONS) as PronunciationFocusMode[]).filter(
        (mode) => enablePhonemeDrills || mode !== 'phoneme_specific'
      ),
    [enablePhonemeDrills]
  );

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

  const buildSummaryWords = () =>
    sessionWords.map((word, index) => ({
      word: getTargetText(word),
      phonetic: word.phonetic,
      score: typeof scores[index] === 'number' ? scores[index] : null,
    }));

  const buildLocalSummary = () => {
    const summaryWords = buildSummaryWords().filter(
      (item) => typeof item.score === 'number'
    ) as Array<{ word: string; score: number }>;
    const weakWords = summaryWords
      .filter((item) => item.score < passingScore)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map((item) => item.word);
    const summary =
      avgScore >= passingScore ? t.aiSummaryGood : t.aiSummaryNeedsWork;
    const tips = [
      weakWords.length > 0
        ? t.aiSummaryTipWeak(weakWords.join(', '))
        : t.aiSummaryTipMaintain,
      t.aiSummaryTipListen,
    ];

    return { summary, tips };
  };

  const requestAiSummary = async () => {
    if (aiSummaryStatus === 'loading' || sessionWords.length === 0) return;
    setAiSummaryStatus('loading');
    try {
      const response = await fetch('/api/ai/pronunciation-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          averageScore: avgScore,
          passingScore,
          focusMode: selectedFocusMode,
          targetLanguage: activePair.target,
          nativeLanguage: activePair.native,
          feedbackLanguage: settings.ai.feedbackLanguage,
          words: buildSummaryWords(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.summary) {
        setAiSummary({
          summary: String(data.summary).trim(),
          tips: Array.isArray(data.tips)
            ? data.tips.filter((tip: unknown) => typeof tip === 'string').slice(0, 2)
            : [],
        });
      } else {
        setAiSummary(buildLocalSummary());
      }
    } catch (error) {
      console.error('AI summary error:', error);
      setAiSummary(buildLocalSummary());
    } finally {
      setAiSummaryStatus('idle');
    }
  };

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

  useEffect(() => {
    if (!hydrated || appliedParams) return;

    if (focusParam && availableFocusModes.includes(focusParam as PronunciationFocusMode)) {
      setSelectedFocusMode(focusParam as PronunciationFocusMode);
    }

    const parsedLength = Number.parseInt(lengthParam, 10);
    if (SESSION_LENGTHS.includes(parsedLength as typeof SESSION_LENGTHS[number])) {
      setSelectedLength(parsedLength);
    }

    if (!setIdParam) {
      setAppliedParams(true);
      return;
    }

    if (setIdParam === 'unassigned') {
      setSelectedSetId('unassigned');
      setAppliedParams(true);
      return;
    }

    if (sets.length === 0) {
      return;
    }

    const exists = sets.some((set) => set.id === setIdParam);
    setSelectedSetId(exists ? setIdParam : 'all');
    setAppliedParams(true);
  }, [
    appliedParams,
    availableFocusModes,
    focusParam,
    hydrated,
    lengthParam,
    setIdParam,
    sets,
  ]);

  useEffect(() => {
    if (!enablePhonemeDrills && selectedFocusMode === 'phoneme_specific') {
      setSelectedFocusMode('random');
      setSelectedPhoneme(undefined);
    }
  }, [enablePhonemeDrills, selectedFocusMode]);

  const startSession = () => {
    const words = getNextPronunciationWords(
      selectedLength,
      selectedFocusMode,
      selectedPhoneme,
      selectedSetId === 'all' ? undefined : selectedSetId
    );
    if (words.length === 0) {
      alert(t.noWordsAlert);
      return;
    }
    setSessionWords(words);
    setCurrentIndex(0);
    setScores([]);
    setResult(null);
    setRecognizedText('');
    setRecordingStatus('');
    setReadinessSnapshot(null);
    setAiSummary(null);
    setAiSummaryStatus('idle');
    setSessionState('practice');
  };

  const stopRecognition = useCallback((clearStatus = false) => {
    recognitionSessionRef.current += 1;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onaudiostart = null;
      recognition.onsoundstart = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onresult = null;
      recognition.onnomatch = null;
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
    if (clearStatus) {
      setRecordingStatus('');
      setIsProcessing(false);
      setRecognizedText('');
    }
  }, []);

  useEffect(() => {
    return () => {
      recognitionSessionRef.current += 1;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onstart = null;
        recognition.onaudiostart = null;
        recognition.onsoundstart = null;
        recognition.onspeechstart = null;
        recognition.onspeechend = null;
        recognition.onresult = null;
        recognition.onnomatch = null;
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

  const finishSession = useCallback(() => {
    stopRecognition(true);
    const readinessPercent = Math.min(100, Math.max(0, Math.round(avgScore * 10)));
    const previousReadiness = Math.min(
      100,
      Math.max(0, Math.round((stats.averagePronunciationScore || 0) * 10))
    );
    setReadinessSnapshot({
      readiness: readinessPercent,
      delta: readinessPercent - previousReadiness,
    });
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
      xpEarned: scores.filter((s) => s >= passingScore).length * XP_ACTIONS.pronunciation_good,
    });
    setSessionState('complete');
  }, [
    avgScore,
    completePronunciationSession,
    passingScore,
    scores,
    selectedFocusMode,
    selectedPhoneme,
    sessionWords.length,
    stats.averagePronunciationScore,
    stopRecognition,
    updatePronunciationStreak,
  ]);

  useEffect(() => {
    if (sessionState === 'practice' && currentIndex >= sessionWords.length && sessionWords.length > 0) {
      finishSession();
    }
  }, [currentIndex, finishSession, sessionState, sessionWords.length]);

  const handleSpeak = async () => {
    if (!currentWord) return;
    if (!settings.general.sounds) return;
    try {
      await speak(getTargetText(currentWord), {
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

  const startRecording = () => {
    if (isProcessing) return;
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setRecordingStatus(t.recognitionUnsupported);
      return;
    }

    stopRecognition();
    const sessionId = ++recognitionSessionRef.current;

    // Reset states
    setResult(null);
    setRecognizedText('');
    setRecordingStatus(t.status.startingMic);

    const recognition = new SpeechRecognitionApi();

    // Configuration
    recognition.lang = getSpeechLocale(
      settings.learning.targetLanguage,
      settings.pronunciation.voice
    );
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let hasResult = false;
    let hasSpeechStarted = false;

    // Service started listening
    recognition.onstart = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] Recognition service started');
      hasResult = false;
      hasSpeechStarted = false;
      setIsRecording(true);
      setRecordingStatus(t.status.micActive);
    };

    // Audio capture started (microphone is working)
    recognition.onaudiostart = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] Audio capture started');
      setRecordingStatus(t.status.recording);
    };

    // Sound detected (any sound, not necessarily speech)
    recognition.onsoundstart = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] Sound detected');
    };

    // Speech detected
    recognition.onspeechstart = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] Speech detected');
      hasSpeechStarted = true;
      setRecordingStatus(t.status.hearing);
    };

    // Speech ended
    recognition.onspeechend = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] Speech ended');
      if (!hasResult) {
        setRecordingStatus(t.status.processing);
      }
    };

    // Result received
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (sessionId !== recognitionSessionRef.current) return;
      const resultIndex = event.results.length - 1;
      const result = event.results[resultIndex];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      console.log('[STT] Result:', { transcript, isFinal, confidence: (confidence * 100).toFixed(1) + '%' });

      if (isFinal) {
        hasResult = true;
        setRecognizedText(transcript);
        const confidencePercent = Math.round(confidence * 100);
        setRecordingStatus(t.status.recognized(transcript, confidencePercent));
        setIsRecording(false);
        // Stop recognition after getting result
        recognition.stop();
        evaluatePronunciation(transcript);
      } else {
        // Show interim result while speaking
        setRecordingStatus(t.status.recognizing(transcript));
      }
    };

    // No match found
    recognition.onnomatch = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] No match - speech not recognized');
      setRecordingStatus(t.status.noMatch);
    };

    // Error occurred
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.error('[STT] Error:', event.error);
      setIsRecording(false);
      hasResult = true;

      const errorMessages: Record<string, string> = t.status.errorMessages;

      setRecordingStatus(errorMessages[event.error] || t.status.errorFallback(event.error));
    };

    // Recognition ended
    recognition.onend = () => {
      if (sessionId !== recognitionSessionRef.current) return;
      console.log('[STT] Recognition ended. hasResult:', hasResult, 'hasSpeechStarted:', hasSpeechStarted);
      setIsRecording(false);

      if (!hasResult) {
        if (hasSpeechStarted) {
          setRecordingStatus(t.status.noResultSpeech);
        } else {
          // No speech was detected at all - likely microphone issue
          setRecordingStatus(t.status.noResultSound);
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
      setRecordingStatus(t.status.startFailed);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    stopRecognition();
  };

  const buildAiStatus = (message: string, code?: string) =>
    code ? `${message} (${code})` : message;

  const evaluatePronunciation = async (spoken: string) => {
    if (!currentWord) return;
    setIsProcessing(true);
    setRecordingStatus(t.status.aiSending);
    console.log('Evaluating pronunciation:', spoken, 'for word:', getTargetText(currentWord));

    try {
      const response = await fetch('/api/ai/evaluate-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected: getTargetText(currentWord),
          phonetic: currentWord.phonetic,
          spoken,
          nativeLanguage: activePair.native,
          targetLanguage: activePair.target,
          feedbackLanguage: settings.ai.feedbackLanguage,
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      // If API returned fallback flag or error, use local evaluation
      if (data.error === 'user_limit_reached') {
        setRecordingStatus(buildAiStatus(t.status.aiLimitReached, data.error));
        evaluateLocally(spoken);
        return;
      }
      if (data.error === 'global_limit_reached') {
        setRecordingStatus(buildAiStatus(t.status.aiGlobalLimitReached, data.error));
        evaluateLocally(spoken);
        return;
      }
      if (data.fallback || data.error) {
        console.log('API fallback triggered:', data.error || 'No API key');
        setRecordingStatus(buildAiStatus(t.status.aiFallback, data.error));
        evaluateLocally(spoken);
        return;
      }

      // Validate response has required fields
      if (typeof data.score !== 'number' || !data.feedback) {
        console.warn('Invalid API response structure:', data);
        setRecordingStatus(t.status.aiInvalid);
        evaluateLocally(spoken);
        return;
      }

      setRecordingStatus(t.status.aiDone);

      const pronunciationResult: PronunciationResult = {
        score: data.score,
        feedback: data.feedback,
        tip: data.tip,
        recognized: spoken,
        errorPhonemes: data.errorPhonemes,
        nativeInterference: data.nativeInterference,
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
        expectedWord: getTargetText(currentWord),
        errorPhonemes: data.errorPhonemes,
        aiTip: data.tip,
        phonemeType: selectedPhoneme,
      };
      addPronunciationAttempt(attempt);

      // Update phoneme mastery if practicing specific phoneme
      if (selectedPhoneme) {
        updatePhonemeMastery(selectedPhoneme, data.score);
      }

      if (data.score >= passingScore) {
        addXp(XP_ACTIONS.pronunciation_good);
        updateDailyMissionProgress('pronunciation', 1);
      }
    } catch (error) {
      console.error('AI evaluation error:', error);
      evaluateLocally(spoken);
    } finally {
      setIsProcessing(false);
    }
  };

  const evaluateLocally = (spoken: string) => {
    if (!currentWord) return;

    const { score, expectedNormalized, spokenNormalized } = calculatePronunciationScore(
      getTargetText(currentWord),
      spoken,
      { language: settings.learning.targetLanguage }
    );

    let feedback = '';
    let tip = '';

    if (score >= 9) {
      feedback = t.localFeedback.excellent;
    } else if (score >= 7) {
      feedback = t.localFeedback.good;
      tip = t.localFeedback.goodTip;
    } else if (score >= 5) {
      feedback = t.localFeedback.ok;
      tip = t.localFeedback.okTip;
    } else {
      feedback = t.localFeedback.needsWork;
      tip = t.localFeedback.needsWorkTip;
    }

    if (isEnglishTarget) {
      if (expectedNormalized.includes('th') && !spokenNormalized.includes('th')) {
        tip = t.localFeedback.tipTh;
      }
      if (
        expectedNormalized.includes('w') &&
        spokenNormalized.replace('w', 'v') === expectedNormalized.replace('w', 'v')
      ) {
        tip = t.localFeedback.tipW;
      }
    }

    setResult({ score, feedback, tip, recognized: spoken });
    setScores((prev) => [...prev, score]);

    const attempt: PronunciationAttempt = {
      id: Date.now().toString(),
      vocab_id: currentWord.id,
      timestamp: new Date(),
      score,
      recognizedText: spoken,
      expectedWord: getTargetText(currentWord),
      phonemeType: selectedPhoneme,
    };
    addPronunciationAttempt(attempt);

    if (selectedPhoneme) {
      updatePhonemeMastery(selectedPhoneme, score);
    }

    if (score >= passingScore) {
      addXp(XP_ACTIONS.pronunciation_good);
      updateDailyMissionProgress('pronunciation', 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < sessionWords.length) {
      stopRecognition(true);
      setCurrentIndex((prev) => prev + 1);
      setResult(null);
      setRecordingStatus('');
      setRecognizedText('');
    } else {
      finishSession();
    }
  };

  const handleRetry = () => {
    stopRecognition(true);
    setResult(null);
    setRecordingStatus('');
    setRecognizedText('');
  };

  const getScoreColor = (score: number) => {
    if (score >= passingScore) return 'text-success-500';
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
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  // SETUP SCREEN
  if (sessionState === 'setup') {
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
            <div className="flex-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <p className="text-sm text-slate-500">{t.setupSubtitle}</p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card variant="glass" className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Flame size={14} className="text-white" />
                </div>
                <span className="font-bold text-amber-500">{stats.pronunciationStreak || 0}</span>
              </div>
              <p className="text-xs text-slate-500">{t.statsStreak}</p>
            </Card>
            <Card variant="glass" className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <BarChart3 size={14} className="text-white" />
                </div>
                <span className="font-bold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">{(stats.averagePronunciationScore || 0).toFixed(1)}</span>
              </div>
              <p className="text-xs text-slate-500">{t.statsAverage}</p>
            </Card>
            <Card variant="glass" className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <BookOpen size={14} className="text-white" />
                </div>
                <span className="font-bold text-success-500">{stats.totalPronunciationSessions || 0}</span>
              </div>
              <p className="text-xs text-slate-500">{t.statsSessions}</p>
            </Card>
          </div>

          {/* Session length */}
          <Card variant="glass">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg">
                  <Settings size={14} className="text-white" />
                </div>
                {t.sessionLength}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SESSION_LENGTHS.map((len) => (
                  <button
                    key={len}
                    onClick={() => setSelectedLength(len)}
                    className={cn(
                      'py-2 px-3 rounded-xl font-medium transition-all',
                      selectedLength === len
                        ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                        : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                    )}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <BookOpen size={14} className="text-white" />
                </div>
                {t.setLabel}
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
                  {t.allSets(vocabulary.length)}
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
                  {t.unassigned(unassignedCount)}
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

          {/* Focus mode */}
          <Card variant="glass">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <Target size={14} className="text-white" />
                </div>
                {t.focusMode}
              </h3>
              <div className="space-y-2">
                {availableFocusModes.map((mode) => {
                  const { label, desc } = focusModes[mode];
                  const Icon = FOCUS_MODE_ICONS[mode];
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
                        'w-full p-3 rounded-xl text-left transition-all flex items-center gap-3',
                        selectedFocusMode === mode
                          ? 'bg-gradient-to-br from-primary-50 to-pink-50 dark:from-primary-900/40 dark:to-pink-900/40 ring-2 ring-primary-500 shadow-lg shadow-primary-500/20'
                          : 'bg-white/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                        selectedFocusMode === mode
                          ? 'bg-gradient-to-br from-primary-500 to-pink-500 shadow-lg shadow-primary-500/30'
                          : 'bg-slate-100 dark:bg-slate-600'
                      )}>
                        <Icon size={18} className={selectedFocusMode === mode ? 'text-white' : 'text-slate-600 dark:text-slate-300'} />
                      </div>
                      <div>
                        <p className={cn(
                          'font-medium',
                          selectedFocusMode === mode
                            ? 'bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent'
                            : 'text-slate-800 dark:text-slate-100'
                        )}>
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
          {enablePhonemeDrills && selectedFocusMode === 'phoneme_specific' && (
            <Card variant="glass">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <Target size={14} className="text-white" />
                  </div>
                  {t.selectPhoneme}
                </h3>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto sm:grid-cols-3">
                  {phonemeDrills.map((drill) => (
                    <button
                      key={drill.id}
                      onClick={() => setSelectedPhoneme(drill.phonemeType)}
                      className={cn(
                        'p-3 rounded-xl text-left transition-all',
                        selectedPhoneme === drill.phonemeType
                          ? 'bg-gradient-to-br from-primary-50 to-pink-50 dark:from-primary-900/40 dark:to-pink-900/40 ring-2 ring-primary-500 shadow-lg shadow-primary-500/20'
                          : 'bg-white/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700'
                      )}
                    >
                      <p className={cn(
                        'font-mono text-xl',
                        selectedPhoneme === drill.phonemeType
                          ? 'bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent'
                          : 'text-slate-800 dark:text-slate-100'
                      )}>{drill.phonemeSymbol}</p>
                      <p className="text-xs text-slate-500">
                        {language === 'en' ? drill.nameEn : drill.namePl}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start button */}
          <Button
            variant="gradient"
            onClick={startSession}
            className="w-full py-4 text-lg shadow-xl shadow-primary-500/25"
            disabled={selectedFocusMode === 'phoneme_specific' && !selectedPhoneme}
          >
            <Mic size={24} className="mr-2" />
            {t.startSession}
          </Button>

          {/* Link to phoneme drills */}
          {enablePhonemeDrills && (
            <Link href="/pronunciation/drills">
              <Button variant="secondary" className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800">
                <BookOpen size={18} className="mr-2" />
                {t.phonemeDrills}
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // COMPLETE SCREEN
  if (sessionState === 'complete') {
    const readinessPercent =
      readinessSnapshot?.readiness ?? Math.min(100, Math.max(0, Math.round(avgScore * 10)));
    const readinessDelta = readinessSnapshot?.delta ?? 0;
    const readinessDeltaLabel = `${readinessDelta >= 0 ? '+' : ''}${readinessDelta}%`;
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 opacity-5 dark:opacity-10" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 p-4 space-y-6 max-w-2xl mx-auto">
          <Card variant="glass" className="text-center p-8">
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 via-blue-500 to-pink-500 flex items-center justify-center shadow-xl shadow-primary-500/30">
              <Mic size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent mb-2">
              {t.sessionComplete}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {t.averageScore(avgScore)}
            </p>
            <div className="flex justify-center gap-2 mb-6">{getScoreStars(avgScore)}</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              <span className="font-semibold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                {t.readinessTitle}
              </span>{' '}
              {readinessPercent}% ·{' '}
              <span
                className={cn(
                  'font-semibold',
                  readinessDelta >= 0
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-error-600 dark:text-error-400'
                )}
              >
                {t.readinessDelta(readinessDeltaLabel)}
              </span>
            </p>

            {aiSummary ? (
              <div className="text-left mb-6 p-4 rounded-xl bg-gradient-to-br from-primary-50/50 to-pink-50/50 dark:from-primary-900/20 dark:to-pink-900/20 border border-primary-100 dark:border-primary-800">
                <p className="text-xs uppercase tracking-wide bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent font-semibold">
                  {t.aiSummaryTitle}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {aiSummary.summary}
                </p>
                {aiSummary.tips.length > 0 && (
                  <ul className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    {aiSummary.tips.map((tip, index) => (
                      <li key={`${tip}-${index}`} className="flex gap-2">
                        <span className="text-primary-400">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex justify-center mb-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestAiSummary}
                  disabled={aiSummaryStatus === 'loading'}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm"
                >
                  {aiSummaryStatus === 'loading'
                    ? t.aiSummaryLoading
                    : t.aiSummaryAction}
                </Button>
              </div>
            )}

            {/* Session stats */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
                    <BookOpen size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {sessionWords.length}
                </p>
                <p className="text-xs text-slate-500">{t.wordsLabel}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <Star size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-success-500">
                  {scores.filter((s) => s >= passingScore).length}
                </p>
                <p className="text-xs text-slate-500">{t.goodPronunciation}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <Sparkles size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent">
                  +{scores.filter((s) => s >= passingScore).length * XP_ACTIONS.pronunciation_good}
                </p>
                <p className="text-xs text-slate-500">{t.xpEarned}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Flame size={14} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  {stats.pronunciationStreak}
                </p>
                <p className="text-xs text-slate-500">{t.pronunciationStreak}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="gradient"
                className="shadow-xl shadow-primary-500/25"
                onClick={() => {
                  stopRecognition(true);
                  setAiSummary(null);
                  setAiSummaryStatus('idle');
                  setReadinessSnapshot(null);
                  setSessionState('setup');
                }}
              >
                {t.newSession}
              </Button>
              <Link href="/">
                <Button variant="secondary" className="w-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800">
                  {t.backToMenu}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // PRACTICE SCREEN
  if (!currentWord) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
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
          <button
            onClick={() => {
              stopRecognition(true);
              setSessionState('setup');
            }}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 shadow-lg shadow-primary-500/10 transition-all"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-sm text-slate-500">
              {t.progressLabel(currentIndex + 1, sessionWords.length)} • {focusModes[selectedFocusMode].label}
            </p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar value={progress} size="sm" />

        {/* Word card */}
        <Card variant="glass">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-blue-500 to-pink-500 bg-clip-text text-transparent">
              {getTargetText(currentWord)}
            </h2>
            <p className="text-lg text-slate-500 font-mono">{currentWord.phonetic}</p>
            <p className="text-slate-600 dark:text-slate-400">{getNativeText(currentWord)}</p>

            <button
              onClick={handleSpeak}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-pink-100 dark:from-primary-900/50 dark:to-pink-900/50 text-primary-600 dark:text-primary-400 hover:from-primary-200 hover:to-pink-200 dark:hover:from-primary-900 dark:hover:to-pink-900 transition-all shadow-lg shadow-primary-500/10"
            >
              <Volume2 size={20} />
              {t.listenPronunciation}
            </button>
          </CardContent>
        </Card>

        {/* Recording section */}
        <Card variant="glass">
          <CardContent className="p-6 space-y-4">
            {!result ? (
              <div className="text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                  {isRecording ? t.recordingPromptActive : t.recordingPromptIdle}
                </p>

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={cn(
                    'mx-auto w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl',
                    isRecording
                      ? 'bg-gradient-to-br from-error-500 to-rose-600 animate-pulse scale-110 shadow-error-500/40'
                      : 'bg-gradient-to-br from-primary-500 via-blue-500 to-pink-500 hover:scale-105 shadow-primary-500/40',
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
                  <div className="p-3 bg-gradient-to-br from-success-50 to-cyan-50 dark:from-success-900/30 dark:to-cyan-900/30 rounded-xl border border-success-200 dark:border-success-800">
                    <p className="text-sm text-success-700 dark:text-success-300">
                      {t.recognizedLabel(recognizedText)}
                    </p>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-primary-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gradient-to-r from-primary-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gradient-to-r from-primary-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-sm bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent font-medium">
                      {t.aiAnalyzing}
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

                <div className="p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/50 dark:border-slate-700/50 space-y-3">
                  <p className="text-slate-800 dark:text-slate-100">{result.feedback}</p>
                  {result.tip && (
                    <p className="text-sm bg-gradient-to-r from-primary-600 to-pink-500 bg-clip-text text-transparent font-medium">
                      {t.hintLabel} {result.tip}
                    </p>
                  )}
                  {result.errorPhonemes && result.errorPhonemes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500">{t.errorPhonemes}</span>
                      {result.errorPhonemes.map((phoneme, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs font-mono bg-gradient-to-r from-error-100 to-rose-100 dark:from-error-900/50 dark:to-rose-900/50 text-error-700 dark:text-error-300 rounded-lg"
                        >
                          {phoneme}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.nativeInterference && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t.polishInterference} {result.nativeInterference}
                    </p>
                  )}
                  {result.recognized && (
                    <p className="text-sm text-slate-500">
                      {t.recognizedLabel(result.recognized)}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleRetry} className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                    <RotateCcw size={18} className="mr-2" />
                    {t.repeat}
                  </Button>
                  <Button variant="gradient" onClick={handleNext} className="flex-1 shadow-lg shadow-primary-500/25">
                    {currentIndex + 1 < sessionWords.length ? t.next : t.finish}
                    <ChevronRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session stats */}
        {scores.length > 0 && (
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t.sessionAverageLabel}</span>
                <span className={cn('font-semibold', getScoreColor(avgScore))}>
                  {avgScore.toFixed(1)}/10
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
