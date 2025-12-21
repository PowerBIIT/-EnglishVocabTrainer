'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Send,
  Check,
  X,
  Plus,
  Loader2,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useVocabStore, useHydration } from '@/lib/store';
import { LearningPairId, VocabularyItem } from '@/types';
import { cn, formatDate, generateId } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';
import { parseVocabularyInput } from '@/lib/parseVocabulary';
import { useLanguage } from '@/lib/i18n';
import { getLanguageLabel, getLearningPair, LEARNING_PAIR_SAMPLES } from '@/lib/languages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  words?: VocabularyItem[];
  timestamp: Date;
}

interface ParsedWord {
  target: string;
  phonetic: string;
  native: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  example_target?: string;
  example_native?: string;
  selected: boolean;
}

const normalizeParsedWord = (
  word: Partial<ParsedWord>
): Omit<ParsedWord, 'selected'> => ({
  target: word.target ?? '',
  native: word.native ?? '',
  phonetic: word.phonetic ?? '',
  difficulty: word.difficulty ?? 'medium',
  example_target: word.example_target,
  example_native: word.example_native,
});

const FALLBACK_WORDS: Record<LearningPairId, Omit<ParsedWord, 'selected'>[]> = {
  'pl-en': [
    { target: 'example', phonetic: '/ɪɡˈzɑːmpl/', native: 'przykład' },
    { target: 'word', phonetic: '/wɜːd/', native: 'słowo' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'uczyć się' },
  ],
  'de-en': [
    { target: 'example', phonetic: '/ɪɡˈzɑːmpl/', native: 'Beispiel' },
    { target: 'word', phonetic: '/wɜːd/', native: 'Wort' },
    { target: 'learn', phonetic: '/lɜːn/', native: 'lernen' },
  ],
  'uk-pl': [
    { target: 'przykład', phonetic: '', native: 'приклад' },
    { target: 'słowo', phonetic: '', native: 'слово' },
    { target: 'uczyć się', phonetic: '', native: 'вчитися' },
  ],
};

const chatCopy = {
  pl: {
    loading: 'Ładowanie...',
    welcomeMessage: (example: string) =>
      `Witaj! Jestem Twoim asystentem AI do nauki słówek. Mogę:\n\n• Dodać słówka, które wpiszesz (np. "${example}")\n• Wygenerować słówka na temat (np. "Wygeneruj 10 słówek o sporcie")\n• Wyciągnąć słówka ze zdjęcia notatek\n• Pokazać statystyki Twojej biblioteki\n\nJak mogę Ci pomóc?`,
    defaultCategory: 'Moje słówka',
    defaultSetLabel: 'Nowy zestaw',
    defaultTopic: 'ogólne',
    imageCategoryFallback: 'Ze zdjęcia',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `Masz łącznie **${wordCount}** słówek w **${categoryCount}** kategoriach:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} słówek`,
    statsOutro: 'Chcesz dodać więcej słówek?',
    generatedWords: (count: number, topic: string, level: string) =>
      `Wygenerowałem **${count}** słówek na temat "${topic}" (poziom ${level}).\n\nZaznacz te, które chcesz dodać do biblioteki:`,
    generatedFallback: (count: number, total: number) =>
      `Użyłem lokalnych danych (brak klucza API).\n\nZnalazłem ${Math.min(count, total)} przykładowych słówek. Skonfiguruj GEMINI_API_KEY w .env.local dla pełnej funkcjonalności.`,
    foundWordsWithPhonetics: (count: number) =>
      `Znalazłem **${count}** słówek. Dodałem poprawne transkrypcje fonetyczne.\n\nZaznacz te, które chcesz dodać:`,
    foundWords: (count: number) =>
      `Znalazłem **${count}** słówek. Zaznacz te, które chcesz dodać:`,
    parseHelp:
      'Nie rozpoznałem słówek. Spróbuj wpisać w formacie:\n\n• `słowo - tłumaczenie`\n• `word1 - translation1, word2 - translation2`\n\nLub napisz: **"Wygeneruj 10 słówek o [temat]"**',
    imageUploaded: (fileName: string) => `Przesłano zdjęcie: ${fileName}`,
    imageFound: (count: number, notes?: string) =>
      `Znalazłem **${count}** słówek na zdjęciu.\n\n${notes ? `Uwagi: ${notes}\n\n` : ''}Zaznacz te, które chcesz dodać:`,
    imageNoWords: (target: string, native: string) =>
      `Nie udało się rozpoznać słówek na zdjęciu. Upewnij się, że notatki są czytelne i zawierają słówka ${target.toLowerCase()} z tłumaczeniami ${native.toLowerCase()}.`,
    imageError:
      'Nie udało się przetworzyć zdjęcia. Upewnij się, że klucz API jest skonfigurowany w .env.local.',
    fileReadError: 'Nie udało się wczytać pliku.',
    addedWords: (count: number, setName: string, category: string) =>
      `Dodano **${count}** słówek do zestawu "${setName}" w kategorii "${category}".\n\nCo jeszcze mogę dla Ciebie zrobić?`,
    setLabel: 'Zestaw:',
    newSetOption: 'Utwórz nowy zestaw',
    setNameLabel: 'Nazwa:',
    setNamePlaceholder: 'Nazwa zestawu',
    categoryLabel: 'Kategoria:',
    categoryPlaceholder: 'Nazwa kategorii',
    cancel: 'Anuluj',
    add: (count: number) => `Dodaj (${count})`,
    processing: 'Przetwarzam...',
    quickActionsLabel: 'Szybkie akcje:',
    quickActions: [
      { label: 'Podróże', prompt: 'Wygeneruj 10 słówek o podróżowaniu' },
      { label: 'Jedzenie', prompt: 'Wygeneruj 10 słówek o jedzeniu' },
      { label: 'Praca', prompt: 'Wygeneruj 10 słówek o pracy' },
      { label: 'Statystyki', prompt: 'Ile mam słówek?' },
    ],
    imageButtonTitle: 'Wczytaj zdjęcie notatek',
    inputPlaceholder: 'Wpisz słówka lub zapytaj...',
    assistantTitle: 'Asystent AI',
    assistantSubtitle: 'Powered by Gemini',
  },
  en: {
    loading: 'Loading...',
    welcomeMessage: (example: string) =>
      `Hi! I am your AI vocabulary assistant. I can:\n\n• Add words you type (e.g. "${example}")\n• Generate words by topic (e.g. "Generate 10 words about sports")\n• Extract words from a photo of notes\n• Show stats from your library\n\nHow can I help?`,
    defaultCategory: 'My words',
    defaultSetLabel: 'New set',
    defaultTopic: 'general',
    imageCategoryFallback: 'From photo',
    statsIntro: (wordCount: number, categoryCount: number) =>
      `You have **${wordCount}** words across **${categoryCount}** categories:\n\n`,
    statsLine: (label: string, count: number) => `• ${label}: ${count} words`,
    statsOutro: 'Want to add more words?',
    generatedWords: (count: number, topic: string, level: string) =>
      `I generated **${count}** words about "${topic}" (level ${level}).\n\nSelect the ones you want to add to your library:`,
    generatedFallback: (count: number, total: number) =>
      `I used local data (no API key).\n\nFound ${Math.min(count, total)} sample words. Configure GEMINI_API_KEY in .env.local for full functionality.`,
    foundWordsWithPhonetics: (count: number) =>
      `I found **${count}** words. Added correct phonetics.\n\nSelect the ones you want to add:`,
    foundWords: (count: number) => `I found **${count}** words. Select the ones you want to add:`,
    parseHelp:
      'I could not recognize words. Try a format like:\n\n• `word - translation`\n• `word1 - translation1, word2 - translation2`\n\nOr type: **"Generate 10 words about [topic]"**',
    imageUploaded: (fileName: string) => `Uploaded image: ${fileName}`,
    imageFound: (count: number, notes?: string) =>
      `Found **${count}** words in the image.\n\n${notes ? `Notes: ${notes}\n\n` : ''}Select the ones you want to add:`,
    imageNoWords: (target: string, native: string) =>
      `Could not recognize words in the image. Make sure your notes are readable and include ${target.toLowerCase()} words with ${native.toLowerCase()} translations.`,
    imageError:
      'Could not process the image. Make sure GEMINI_API_KEY is configured in .env.local.',
    fileReadError: 'Could not read the file.',
    addedWords: (count: number, setName: string, category: string) =>
      `Added **${count}** words to set "${setName}" in category "${category}".\n\nWhat else can I do for you?`,
    setLabel: 'Set:',
    newSetOption: 'Create new set',
    setNameLabel: 'Name:',
    setNamePlaceholder: 'Set name',
    categoryLabel: 'Category:',
    categoryPlaceholder: 'Category name',
    cancel: 'Cancel',
    add: (count: number) => `Add (${count})`,
    processing: 'Working...',
    quickActionsLabel: 'Quick actions:',
    quickActions: [
      { label: 'Travel', prompt: 'Generate 10 words about travel' },
      { label: 'Food', prompt: 'Generate 10 words about food' },
      { label: 'Work', prompt: 'Generate 10 words about work' },
      { label: 'Stats', prompt: 'How many words do I have?' },
    ],
    imageButtonTitle: 'Upload notes photo',
    inputPlaceholder: 'Type words or ask...',
    assistantTitle: 'AI Assistant',
    assistantSubtitle: 'Powered by Gemini',
  },
} as const;

type ChatCopy = typeof chatCopy.pl;

export default function ChatPage() {
  const NEW_SET_OPTION = '__new__';
  const hydrated = useHydration();
  const language = useLanguage();
  const t = (chatCopy[language] ?? chatCopy.pl) as ChatCopy;
  const settings = useVocabStore((state) => state.settings);
  const activePair = useMemo(() => getLearningPair(settings.learning.pairId), [settings.learning.pairId]);
  const targetLabel = getLanguageLabel(activePair.target, language);
  const nativeLabel = getLanguageLabel(activePair.native, language);
  const examplePair = LEARNING_PAIR_SAMPLES[activePair.id] ?? { target: 'word', native: 'translation' };
  const welcomeMessage = t.welcomeMessage(`${examplePair.target} - ${examplePair.native}`);
  const dateLocale = language === 'en' ? 'en-US' : 'pl-PL';
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: '1',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [suggestedSetName, setSuggestedSetName] = useState('');
  const [selectedSetOption, setSelectedSetOption] = useState(NEW_SET_OPTION);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const addVocabulary = useVocabStore((state) => state.addVocabulary);
  const getCategories = useVocabStore((state) => state.getCategories);
  const createSet = useVocabStore((state) => state.createSet);
  const sets = useVocabStore((state) => state.getActiveSets());

  const categories = getCategories();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedSetOption === NEW_SET_OPTION) return;
    if (!sets.some((set) => set.id === selectedSetOption)) {
      setSelectedSetOption(NEW_SET_OPTION);
    }
  }, [NEW_SET_OPTION, selectedSetOption, sets]);

  if (!hydrated) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  const addAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const buildSetName = (base?: string) => {
    const trimmed = base?.trim();
    const label = trimmed && trimmed.length > 0 ? trimmed : t.defaultSetLabel;
    return `${label} (${formatDate(new Date(), dateLocale)})`;
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setIsProcessing(true);

    await processMessage(messageText);
    setIsProcessing(false);
  };

  const processMessage = async (text: string) => {
    const lowerText = text.toLowerCase();
    const generationKeywords = ['wygeneruj', 'generate', 'podaj', 'create', 'give me'];
    const statsKeywords = [
      'ile mam',
      'statystyki',
      'pokaż słówka',
      'pokaz slowka',
      'moje słówka',
      'moje slowka',
      'how many',
      'stats',
      'show words',
      'my words',
      'vocabulary',
    ];

    // Check for generation request
    if (generationKeywords.some((keyword) => lowerText.includes(keyword))) {
      const match = text.match(/(\d+)\s+słów/i) || text.match(/(\d+)\s+word/i);
      const count = match ? parseInt(match[1]) : 10;

      // Extract topic - more flexible matching
      const topicPatterns = [
        /o\s+([^\d]+?)(?:\s+poziom|\s+level|\s*$)/i,
        /na temat\s+(.+?)(?:\s+poziom|\s+level|\s*$)/i,
        /temat[:\s]+(.+?)(?:\s+poziom|\s+level|\s*$)/i,
        /about\s+(.+?)(?:\s+level|\s*$)/i,
        /topic[:\s]+(.+?)(?:\s+level|\s*$)/i,
      ];

      let topic: string = t.defaultTopic;
      for (const pattern of topicPatterns) {
        const topicMatch = text.match(pattern);
        if (topicMatch) {
          topic = topicMatch[1].trim();
          break;
        }
      }

      // Extract level
      const levelMatch = text.match(/poziom\s*(A1|A2|B1|B2)/i) || text.match(/(A1|A2|B1|B2)/i);
      const level = levelMatch ? levelMatch[1].toUpperCase() : 'A2';

      await generateWordsWithAI(count, topic, level);
      return;
    }

    // Check for stats request
    if (statsKeywords.some((keyword) => lowerText.includes(keyword))) {
      const summaryIntro = t.statsIntro(vocabulary.length, categories.length);
      const categoryLines = categories
        .map((cat) => {
          const count = vocabulary.filter((v) => v.category === cat).length;
          return t.statsLine(getCategoryLabel(cat, language), count);
        })
        .join('\n');
      addAssistantMessage(
        `${summaryIntro}${categoryLines}\n\n${t.statsOutro}`
      );
      return;
    }

    // Try to parse as vocabulary input with AI
    await parseTextWithAI(text);
  };

  const generateWordsWithAI = async (count: number, topic: string, level: string) => {
    try {
      const response = await fetch('/api/ai/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          count,
          level,
          targetLanguage: activePair.target,
          nativeLanguage: activePair.native,
        }),
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();

      if (data.words && data.words.length > 0) {
        setParsedWords(
          data.words.map((w: ParsedWord) => ({
            ...normalizeParsedWord(w),
            selected: true,
          }))
        );
        const finalTopic = data.topic || topic;
        setSuggestedCategory(finalTopic);
        setSuggestedSetName(buildSetName(finalTopic));
        setSelectedSetOption(NEW_SET_OPTION);

        addAssistantMessage(
          t.generatedWords(data.words.length, topic, level)
        );
      } else {
        throw new Error('No words generated');
      }
    } catch (error) {
      console.error('Generate error:', error);
      // Fallback to local generation
      await generateWordsLocal(count, topic);
    }
  };

  const generateWordsLocal = async (count: number, topic: string) => {
    // Fallback mock data
    const fallbackWords = (FALLBACK_WORDS[activePair.id] ?? FALLBACK_WORDS['pl-en']).map(
      (word) => ({
        ...word,
        selected: true,
      })
    );

    setParsedWords(fallbackWords.slice(0, count));
    setSuggestedCategory(topic);
    setSuggestedSetName(buildSetName(topic));
    setSelectedSetOption(NEW_SET_OPTION);

    addAssistantMessage(
      t.generatedFallback(count, fallbackWords.length)
    );
  };

  const parseTextWithAI = async (text: string) => {
    // First try local parsing
    const localWords = parseVocabularyInput(text);

    if (localWords.length > 0) {
      // Use AI to enhance with phonetics
      try {
        const response = await fetch('/api/ai/parse-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            targetLanguage: activePair.target,
            nativeLanguage: activePair.native,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.words && data.words.length > 0) {
            setParsedWords(
              data.words.map((w: ParsedWord) => ({
                ...normalizeParsedWord(w),
                selected: true,
              }))
            );
            const category = data.category_suggestion || t.defaultCategory;
            setSuggestedCategory(category);
            setSuggestedSetName(buildSetName(category));
            setSelectedSetOption(NEW_SET_OPTION);
            addAssistantMessage(
              t.foundWordsWithPhonetics(data.words.length)
            );
            return;
          }
        }
      } catch (error) {
        console.error('Parse API error:', error);
      }

      // Fallback to local parsing
      setParsedWords(localWords.map((w) => ({ ...w, selected: true })));
      setSuggestedCategory(t.defaultCategory);
      setSuggestedSetName(buildSetName(t.defaultCategory));
      setSelectedSetOption(NEW_SET_OPTION);
      addAssistantMessage(t.foundWords(localWords.length));
    } else {
      addAssistantMessage(t.parseHelp);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    // Add user message about image
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'user',
        content: t.imageUploaded(file.name),
        timestamp: new Date(),
      },
    ]);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        try {
          const response = await fetch('/api/ai/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: file.type,
              targetLanguage: activePair.target,
              nativeLanguage: activePair.native,
            }),
          });

          if (!response.ok) {
            throw new Error('API error');
          }

          const data = await response.json();

          if (data.words && data.words.length > 0) {
            setParsedWords(
              data.words.map((w: ParsedWord) => ({
                ...normalizeParsedWord(w),
                selected: true,
              }))
            );
            const category = data.category_suggestion || t.imageCategoryFallback;
            setSuggestedCategory(category);
            setSuggestedSetName(buildSetName(category));
            setSelectedSetOption(NEW_SET_OPTION);

            addAssistantMessage(
              t.imageFound(data.words.length, data.notes)
            );
          } else {
            addAssistantMessage(t.imageNoWords(targetLabel, nativeLabel));
          }
        } catch (error) {
          console.error('Image extraction error:', error);
          addAssistantMessage(t.imageError);
        }

        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      addAssistantMessage(t.fileReadError);
      setIsProcessing(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleWord = (index: number) => {
    setParsedWords((prev) =>
      prev.map((w, i) => (i === index ? { ...w, selected: !w.selected } : w))
    );
  };

  const addSelectedWords = () => {
    const selectedWords = parsedWords.filter((w) => w.selected);

    if (selectedWords.length === 0) {
      return;
    }

    let targetSetId = '';
    let targetSetName = '';
    const existingSet = sets.find((set) => set.id === selectedSetOption);
    if (selectedSetOption !== NEW_SET_OPTION && existingSet) {
      targetSetId = existingSet.id;
      targetSetName = existingSet.name;
    } else {
      const setLabel =
        suggestedSetName.trim() || buildSetName(suggestedCategory || t.defaultSetLabel);
      const newSet = createSet(setLabel);
      targetSetId = newSet.id;
      targetSetName = newSet.name;
    }

    const newVocab: VocabularyItem[] = selectedWords.map((w) => ({
      id: generateId(),
      en: w.target,
      phonetic: w.phonetic,
      pl: w.native,
      category: suggestedCategory || t.defaultCategory,
      setIds: [targetSetId],
      example_en: w.example_target,
      example_pl: w.example_native,
      difficulty: w.difficulty || 'medium',
      created_at: new Date(),
      source: 'ai_generated' as const,
      languagePair: activePair.id,
    }));

    addVocabulary(newVocab);
    setParsedWords([]);
    setSuggestedCategory('');
    setSuggestedSetName('');
    setSelectedSetOption(NEW_SET_OPTION);

    addAssistantMessage(
      t.addedWords(
        selectedWords.length,
        targetSetName,
        suggestedCategory || t.defaultCategory
      )
    );
  };

  const cancelWords = () => {
    setParsedWords([]);
    setSuggestedCategory('');
    setSuggestedSetName('');
    setSelectedSetOption(NEW_SET_OPTION);
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Wand2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {t.assistantTitle}
              </h1>
              <p className="text-xs text-slate-500">{t.assistantSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Parsed words selection */}
        {parsedWords.length > 0 && (
          <Card className="mx-2">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                    {t.setLabel}
                  </p>
                  <select
                    data-testid="set-selector"
                    value={selectedSetOption}
                    onChange={(e) => setSelectedSetOption(e.target.value)}
                    className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                  >
                    <option value={NEW_SET_OPTION}>{t.newSetOption}</option>
                    {sets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedSetOption === NEW_SET_OPTION && (
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                      {t.setNameLabel}
                    </p>
                    <input
                      type="text"
                      value={suggestedSetName}
                      onChange={(e) => setSuggestedSetName(e.target.value)}
                      className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                      placeholder={t.setNamePlaceholder}
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                    {t.categoryLabel}
                  </p>
                  <input
                    type="text"
                    value={suggestedCategory}
                    onChange={(e) => setSuggestedCategory(e.target.value)}
                    className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                    placeholder={t.categoryPlaceholder}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedWords.map((word, index) => (
                  <button
                    key={index}
                    onClick={() => toggleWord(index)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                      word.selected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                        : 'border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        word.selected
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-slate-300 dark:border-slate-600'
                      )}
                    >
                      {word.selected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {word.target}{' '}
                        <span className="text-slate-500 font-normal text-sm">
                          {word.phonetic}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500 truncate">{word.native}</p>
                      {word.example_target && (
                        <p className="text-xs text-slate-400 italic mt-1 truncate">
                          "{word.example_target}"
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={cancelWords} className="flex-1">
                  <X size={18} className="mr-2" />
                  {t.cancel}
                </Button>
                <Button onClick={addSelectedWords} className="flex-1">
                  <Plus size={18} className="mr-2" />
                  {t.add(parsedWords.filter((w) => w.selected).length)}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 size={20} className="animate-spin text-primary-500" />
              <span className="text-sm text-slate-500">{t.processing}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 md:left-24 md:bottom-8 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Quick actions */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {t.quickActions.map((action, index) => {
              const isSecondary = index === t.quickActions.length - 1;
              return (
                <button
                  key={action.label}
                  onClick={() => setInput(action.prompt)}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-sm',
                    isSecondary
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      : 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400 hover:bg-primary-100'
                  )}
                >
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
              title={t.imageButtonTitle}
            >
              <ImageIcon size={20} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.inputPlaceholder}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="px-4"
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
