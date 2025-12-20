'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  Camera,
  Sparkles,
  Check,
  X,
  Plus,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useVocabStore } from '@/lib/store';
import { VocabularyItem } from '@/types';
import { cn, generateId } from '@/lib/utils';

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
  selected: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Cześć! Jestem Twoim asystentem do nauki słówek. Mogę:\n\n• Dodać słówka które wpiszesz (np. "breakfast - śniadanie, lunch - obiad")\n• Wygenerować słówka na wybrany temat (np. "Wygeneruj 10 słówek o podróżowaniu")\n• Zarządzać Twoją biblioteką słówek\n\nJak mogę Ci pomóc?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const vocabulary = useVocabStore((state) => state.vocabulary);
  const addVocabulary = useVocabStore((state) => state.addVocabulary);
  const getCategories = useVocabStore((state) => state.getCategories);

  const categories = getCategories();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate AI processing (in production, call Gemini API)
    await processMessage(input);
    setIsProcessing(false);
  };

  const processMessage = async (text: string) => {
    const lowerText = text.toLowerCase();

    // Check for generation request
    if (lowerText.includes('wygeneruj') || lowerText.includes('generate')) {
      const match = text.match(/(\d+)\s+słów/i) || text.match(/(\d+)\s+word/i);
      const count = match ? parseInt(match[1]) : 5;

      // Extract topic
      const topicMatch =
        text.match(/o\s+(\w+)/i) ||
        text.match(/about\s+(\w+)/i) ||
        text.match(/temat[:\s]+(\w+)/i);
      const topic = topicMatch ? topicMatch[1] : 'general';

      await generateWords(count, topic);
      return;
    }

    // Check for stats request
    if (
      lowerText.includes('ile mam') ||
      lowerText.includes('statystyki') ||
      lowerText.includes('pokaż słówka')
    ) {
      const statsMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Masz łącznie ${vocabulary.length} słówek w ${categories.length} kategoriach:\n\n${categories
          .map((cat) => {
            const count = vocabulary.filter((v) => v.category === cat).length;
            return `• ${cat}: ${count} słówek`;
          })
          .join('\n')}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, statsMessage]);
      return;
    }

    // Try to parse as vocabulary input
    const words = parseWordsFromText(text);

    if (words.length > 0) {
      setParsedWords(words.map((w) => ({ ...w, selected: true })));
      setSuggestedCategory(detectCategory(text) || 'Moje słówka');

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Znalazłem ${words.length} słówek! Zaznacz te, które chcesz dodać:`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      // Default response
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content:
          'Nie rozpoznałem słówek. Spróbuj wpisać w formacie:\n\n• "słowo - tłumaczenie"\n• "word1 - translation1, word2 - translation2"\n\nLub poproś mnie o wygenerowanie słówek na wybrany temat.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  const parseWordsFromText = (text: string): Omit<ParsedWord, 'selected'>[] => {
    const words: Omit<ParsedWord, 'selected'>[] = [];

    // Split by comma or newline
    const parts = text.split(/[,\n]+/);

    for (const part of parts) {
      // Match patterns like "word - translation" or "word = translation"
      const match = part.match(/([^-=]+)[-=](.+)/);
      if (match) {
        const en = match[1].trim();
        const pl = match[2].trim();

        if (en && pl) {
          words.push({
            en,
            phonetic: generatePhonetic(en),
            pl,
          });
        }
      }
    }

    return words;
  };

  const generatePhonetic = (word: string): string => {
    // Simple phonetic generation (in production, use proper IPA dictionary or AI)
    return `/${word.toLowerCase()}/`;
  };

  const detectCategory = (text: string): string | null => {
    const categories: Record<string, string[]> = {
      'Health Problems': ['health', 'zdrowie', 'choroba', 'ból'],
      Food: ['food', 'jedzenie', 'eating', 'kitchen', 'kuchnia'],
      Travel: ['travel', 'podróż', 'vacation', 'wakacje'],
      Collocations: ['collocation', 'kolokacja', 'phrase'],
    };

    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((kw) => lowerText.includes(kw))) {
        return category;
      }
    }
    return null;
  };

  const generateWords = async (count: number, topic: string) => {
    // Simulated word generation (in production, use Gemini API)
    const sampleWords: Record<string, Omit<ParsedWord, 'selected'>[]> = {
      travel: [
        { en: 'passport', phonetic: '/ˈpɑːspɔːt/', pl: 'paszport' },
        { en: 'luggage', phonetic: '/ˈlʌgɪʤ/', pl: 'bagaż' },
        { en: 'departure', phonetic: '/dɪˈpɑːtʃə/', pl: 'odlot' },
        { en: 'arrival', phonetic: '/əˈraɪvl/', pl: 'przylot' },
        { en: 'boarding pass', phonetic: '/ˈbɔːdɪŋ pɑːs/', pl: 'karta pokładowa' },
      ],
      food: [
        { en: 'breakfast', phonetic: '/ˈbrekfəst/', pl: 'śniadanie' },
        { en: 'lunch', phonetic: '/lʌntʃ/', pl: 'obiad' },
        { en: 'dinner', phonetic: '/ˈdɪnə/', pl: 'kolacja' },
        { en: 'delicious', phonetic: '/dɪˈlɪʃəs/', pl: 'pyszny' },
        { en: 'recipe', phonetic: '/ˈresɪpi/', pl: 'przepis' },
      ],
      general: [
        { en: 'important', phonetic: '/ɪmˈpɔːtənt/', pl: 'ważny' },
        { en: 'beautiful', phonetic: '/ˈbjuːtɪfl/', pl: 'piękny' },
        { en: 'interesting', phonetic: '/ˈɪntrəstɪŋ/', pl: 'interesujący' },
        { en: 'difficult', phonetic: '/ˈdɪfɪkəlt/', pl: 'trudny' },
        { en: 'wonderful', phonetic: '/ˈwʌndəfl/', pl: 'wspaniały' },
      ],
    };

    const words = sampleWords[topic.toLowerCase()] || sampleWords.general;
    const selectedWords = words.slice(0, count);

    setParsedWords(selectedWords.map((w) => ({ ...w, selected: true })));
    setSuggestedCategory(topic.charAt(0).toUpperCase() + topic.slice(1));

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: `Wygenerowałem ${selectedWords.length} słówek na temat "${topic}". Zaznacz te, które chcesz dodać:`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
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

    const newVocab: VocabularyItem[] = selectedWords.map((w) => ({
      id: generateId(),
      en: w.en,
      phonetic: w.phonetic,
      pl: w.pl,
      category: suggestedCategory || 'Moje słówka',
      difficulty: 'medium' as const,
      created_at: new Date(),
      source: 'manual' as const,
    }));

    addVocabulary(newVocab);
    setParsedWords([]);
    setSuggestedCategory('');

    const confirmMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: `Dodano ${selectedWords.length} słówek do kategorii "${suggestedCategory || 'Moje słówka'}"! 🎉\n\nCo jeszcze mogę dla Ciebie zrobić?`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };

  const cancelWords = () => {
    setParsedWords([]);
    setSuggestedCategory('');
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-primary-500" />
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Asystent AI
            </h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
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
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Kategoria: {suggestedCategory}
                </p>
                <input
                  type="text"
                  value={suggestedCategory}
                  onChange={(e) => setSuggestedCategory(e.target.value)}
                  className="text-sm px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-transparent"
                />
              </div>

              <div className="space-y-2">
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
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        word.selected
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-slate-300 dark:border-slate-600'
                      )}
                    >
                      {word.selected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {word.en}{' '}
                        <span className="text-slate-500 font-normal">
                          {word.phonetic}
                        </span>
                      </p>
                      <p className="text-sm text-slate-500">{word.pl}</p>
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
            <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={20} className="animate-spin text-primary-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Wpisz słówka lub zapytaj..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
  );
}
