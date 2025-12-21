'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  Volume2,
  BookOpen,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVocabStore } from '@/lib/store';
import { cn, speak } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { icon: Lightbulb, label: 'Porada dnia', prompt: 'Daj mi poradę jak lepiej uczyć się słówek' },
  { icon: BookOpen, label: 'Wyjaśnij słówko', prompt: 'Wyjaśnij mi słówko: ' },
  { icon: HelpCircle, label: 'Jak wymówić?', prompt: 'Jak poprawnie wymówić słówko: ' },
];

export function AITutor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.vocabulary);
  const settings = useVocabStore((state) => state.settings);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: `Cześć! Jestem Eva, Twój asystent do nauki angielskiego.\n\nMogę Ci pomóc w następujących tematach:\n• Wyjaśnienie słówek krok po kroku\n• Wymowa i akcent\n• Wskazówki do nauki\n• Pytania o gramatykę\n\nO co chcesz zapytać?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const buildContext = () => {
    return `
Poziom użytkownika: ${stats.level}
Łączne XP: ${stats.totalXp}
Słówka w bibliotece: ${vocabulary.length}
Aktualna seria: ${stats.currentStreak} dni
    `.trim();
  };

  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setShowQuickActions(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          context: buildContext(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'Mam chwilowe problemy z połączeniem. Spróbuj ponownie za chwilę.\n\nUpewnij się, że klucz API jest skonfigurowany w .env.local.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string, needsInput: boolean = false) => {
    if (needsInput) {
      setInput(prompt);
      inputRef.current?.focus();
    } else {
      handleSend(prompt);
    }
  };

  const handleSpeakText = (text: string) => {
    if (!settings.general.sounds) return;
    // Extract English words from the text and speak them
    const englishPattern = /"([^"]+)"/g;
    const matches = text.match(englishPattern);
    if (matches && matches.length > 0) {
      const word = matches[0].replace(/"/g, '');
      speak(word);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
        title="Otwórz asystenta AI"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-6 w-[360px] h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-amber-400 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Eva - AI Tutor</h3>
            <p className="text-xs text-white/80">Twój asystent do nauki</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                'max-w-[85%] rounded-2xl px-4 py-3 relative group',
                message.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {message.role === 'assistant' && (
                <button
                  onClick={() => handleSpeakText(message.content)}
                  className="absolute -right-8 top-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary-600"
                  title="Wymów angielskie słowa"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary-500" />
                <span className="text-sm text-slate-500">Eva pisze...</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {showQuickActions && messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 text-center">Szybkie akcje:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  onClick={() =>
                    handleQuickAction(
                      action.prompt,
                      action.prompt.endsWith(': ')
                    )
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  <action.icon size={14} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Zapytaj o cokolwiek..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="bg-primary-600 hover:bg-primary-700 px-4"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
