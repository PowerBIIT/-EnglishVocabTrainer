'use client';

import { useState, useRef, useEffect } from 'react';
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
import { VocabularyItem } from '@/types';
import { cn, formatDate, generateId } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';
import { parseVocabularyInput } from '@/lib/parseVocabulary';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  words?: VocabularyItem[];
  timestamp: Date;
}

interface ParsedWord {
  en: string;
  phonetic: string;
  pl: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  example_en?: string;
  example_pl?: string;
  selected: boolean;
}

export default function ChatPage() {
  const NEW_SET_OPTION = '__new__';
  const hydrated = useHydration();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Witaj! Jestem Twoim asystentem AI do nauki słówek. Mogę:\n\n• Dodać słówka, które wpiszesz (np. \"breakfast - śniadanie\")\n• Wygenerować słówka na temat (np. \"Wygeneruj 10 słówek o sporcie\")\n• Wyciągnąć słówka ze zdjęcia notatek\n• Pokazać statystyki Twojej biblioteki\n\nJak mogę Ci pomóc?',
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

  const vocabulary = useVocabStore((state) => state.vocabulary);
  const addVocabulary = useVocabStore((state) => state.addVocabulary);
  const getCategories = useVocabStore((state) => state.getCategories);
  const createSet = useVocabStore((state) => state.createSet);
  const sets = useVocabStore((state) => state.sets);

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
        <p className="text-slate-500">Ładowanie...</p>
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
    const label = trimmed && trimmed.length > 0 ? trimmed : 'Nowy zestaw';
    return `${label} (${formatDate(new Date())})`;
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

    // Check for generation request
    if (lowerText.includes('wygeneruj') || lowerText.includes('generate') || lowerText.includes('podaj')) {
      const match = text.match(/(\d+)\s+słów/i) || text.match(/(\d+)\s+word/i);
      const count = match ? parseInt(match[1]) : 10;

      // Extract topic - more flexible matching
      const topicPatterns = [
        /o\s+([^\d]+?)(?:\s+poziom|\s+level|\s*$)/i,
        /about\s+(\w+)/i,
        /temat[:\s]+(\w+)/i,
        /na temat\s+(.+?)(?:\s+poziom|\s*$)/i,
      ];

      let topic = 'general';
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
    if (
      lowerText.includes('ile mam') ||
      lowerText.includes('statystyki') ||
      lowerText.includes('pokaż słówka') ||
      lowerText.includes('moje słówka')
    ) {
      addAssistantMessage(
        `Masz łącznie **${vocabulary.length}** słówek w **${categories.length}** kategoriach:\n\n${categories
          .map((cat) => {
            const count = vocabulary.filter((v) => v.category === cat).length;
            return `• ${getCategoryLabel(cat)}: ${count} słówek`;
          })
          .join('\n')}\n\nChcesz dodać więcej słówek?`
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
        body: JSON.stringify({ topic, count, level }),
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();

      if (data.words && data.words.length > 0) {
        setParsedWords(
          data.words.map((w: ParsedWord) => ({
            ...w,
            selected: true,
          }))
        );
        const finalTopic = data.topic || topic;
        setSuggestedCategory(finalTopic);
        setSuggestedSetName(buildSetName(finalTopic));
        setSelectedSetOption(NEW_SET_OPTION);

        addAssistantMessage(
          `Wygenerowałem **${data.words.length}** słówek na temat \"${topic}\" (poziom ${level}).\n\nZaznacz te, które chcesz dodać do biblioteki:`
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
    const fallbackWords: ParsedWord[] = [
      { en: 'example', phonetic: '/ɪɡˈzɑːmpl/', pl: 'przykład', selected: true },
      { en: 'word', phonetic: '/wɜːd/', pl: 'słowo', selected: true },
      { en: 'learn', phonetic: '/lɜːn/', pl: 'uczyć się', selected: true },
    ];

    setParsedWords(fallbackWords.slice(0, count));
    setSuggestedCategory(topic);
    setSuggestedSetName(buildSetName(topic));
    setSelectedSetOption(NEW_SET_OPTION);

    addAssistantMessage(
      `Użyłem lokalnych danych (brak klucza API).\n\nZnalazłem ${Math.min(count, fallbackWords.length)} przykładowych słówek. Skonfiguruj GEMINI_API_KEY w .env.local dla pełnej funkcjonalności.`
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
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.words && data.words.length > 0) {
            setParsedWords(data.words.map((w: ParsedWord) => ({ ...w, selected: true })));
            const category = data.category_suggestion || 'Moje słówka';
            setSuggestedCategory(category);
            setSuggestedSetName(buildSetName(category));
            setSelectedSetOption(NEW_SET_OPTION);
            addAssistantMessage(
              `Znalazłem **${data.words.length}** słówek. Dodałem poprawne transkrypcje fonetyczne.\n\nZaznacz te, które chcesz dodać:`
            );
            return;
          }
        }
      } catch (error) {
        console.error('Parse API error:', error);
      }

      // Fallback to local parsing
      setParsedWords(localWords.map((w) => ({ ...w, selected: true })));
      setSuggestedCategory('Moje słówka');
      setSuggestedSetName(buildSetName('Moje słówka'));
      setSelectedSetOption(NEW_SET_OPTION);
      addAssistantMessage(
        `Znalazłem **${localWords.length}** słówek. Zaznacz te, które chcesz dodać:`
      );
    } else {
      addAssistantMessage(
        'Nie rozpoznałem słówek. Spróbuj wpisać w formacie:\n\n• `słowo - tłumaczenie`\n• `word1 - translation1, word2 - translation2`\n\nLub napisz: **\"Wygeneruj 10 słówek o [temat]\"**'
      );
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
        content: `Przesłano zdjęcie: ${file.name}`,
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
            }),
          });

          if (!response.ok) {
            throw new Error('API error');
          }

          const data = await response.json();

          if (data.words && data.words.length > 0) {
            setParsedWords(data.words.map((w: ParsedWord) => ({ ...w, selected: true })));
            const category = data.category_suggestion || 'Ze zdjęcia';
            setSuggestedCategory(category);
            setSuggestedSetName(buildSetName(category));
            setSelectedSetOption(NEW_SET_OPTION);

            addAssistantMessage(
              `Znalazłem **${data.words.length}** słówek na zdjęciu.\n\n${data.notes ? `Uwagi: ${data.notes}\n\n` : ''}Zaznacz te, które chcesz dodać:`
            );
          } else {
            addAssistantMessage(
              'Nie udało się rozpoznać słówek na zdjęciu. Upewnij się, że notatki są czytelne i zawierają słówka angielskie z tłumaczeniami.'
            );
          }
        } catch (error) {
          console.error('Image extraction error:', error);
          addAssistantMessage(
            'Nie udało się przetworzyć zdjęcia. Upewnij się, że klucz API jest skonfigurowany w .env.local.'
          );
        }

        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      addAssistantMessage('Nie udało się wczytać pliku.');
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
        suggestedSetName.trim() || buildSetName(suggestedCategory || 'Nowy zestaw');
      const newSet = createSet(setLabel);
      targetSetId = newSet.id;
      targetSetName = newSet.name;
    }

    const newVocab: VocabularyItem[] = selectedWords.map((w) => ({
      id: generateId(),
      en: w.en,
      phonetic: w.phonetic,
      pl: w.pl,
      category: suggestedCategory || 'Moje słówka',
      setIds: [targetSetId],
      example_en: w.example_en,
      example_pl: w.example_pl,
      difficulty: w.difficulty || 'medium',
      created_at: new Date(),
      source: 'ai_generated' as const,
    }));

    addVocabulary(newVocab);
    setParsedWords([]);
    setSuggestedCategory('');
    setSuggestedSetName('');
    setSelectedSetOption(NEW_SET_OPTION);

    addAssistantMessage(
      `Dodano **${selectedWords.length}** słówek do zestawu \"${targetSetName}\" w kategorii \"${suggestedCategory || 'Moje słówka'}\".\n\nCo jeszcze mogę dla Ciebie zrobić?`
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
                Asystent AI
              </h1>
              <p className="text-xs text-slate-500">Powered by Gemini</p>
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
                    Zestaw:
                  </p>
                  <select
                    data-testid="set-selector"
                    value={selectedSetOption}
                    onChange={(e) => setSelectedSetOption(e.target.value)}
                    className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                  >
                    <option value={NEW_SET_OPTION}>Utwórz nowy zestaw</option>
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
                      Nazwa:
                    </p>
                    <input
                      type="text"
                      value={suggestedSetName}
                      onChange={(e) => setSuggestedSetName(e.target.value)}
                      className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                      placeholder="Nazwa zestawu"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px]">
                    Kategoria:
                  </p>
                  <input
                    type="text"
                    value={suggestedCategory}
                    onChange={(e) => setSuggestedCategory(e.target.value)}
                    className="text-sm px-3 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex-1"
                    placeholder="Nazwa kategorii"
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
                        {word.en}{' '}
                        <span className="text-slate-500 font-normal text-sm">
                          {word.phonetic}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500 truncate">{word.pl}</p>
                      {word.example_en && (
                        <p className="text-xs text-slate-400 italic mt-1 truncate">
                          "{word.example_en}"
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={cancelWords} className="flex-1">
                  <X size={18} className="mr-2" />
                  Anuluj
                </Button>
                <Button onClick={addSelectedWords} className="flex-1">
                  <Plus size={18} className="mr-2" />
                  Dodaj ({parsedWords.filter((w) => w.selected).length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 size={20} className="animate-spin text-primary-500" />
              <span className="text-sm text-slate-500">Przetwarzam...</span>
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
            <button
              onClick={() => setInput('Wygeneruj 10 słówek o podróżowaniu')}
              className="flex-shrink-0 px-3 py-1.5 bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full text-sm hover:bg-primary-100"
            >
              Podróże
            </button>
            <button
              onClick={() => setInput('Wygeneruj 10 słówek o jedzeniu')}
              className="flex-shrink-0 px-3 py-1.5 bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full text-sm hover:bg-primary-100"
            >
              Jedzenie
            </button>
            <button
              onClick={() => setInput('Wygeneruj 10 słówek o pracy')}
              className="flex-shrink-0 px-3 py-1.5 bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full text-sm hover:bg-primary-100"
            >
              Praca
            </button>
            <button
              onClick={() => setInput('Ile mam słówek?')}
              className="flex-shrink-0 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-sm hover:bg-slate-200"
            >
              Statystyki
            </button>
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
              title="Wczytaj zdjęcie notatek"
            >
              <ImageIcon size={20} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Wpisz słówka lub zapytaj..."
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
