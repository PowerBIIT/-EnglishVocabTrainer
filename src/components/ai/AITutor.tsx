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
import { useLanguage } from '@/lib/i18n';
import { getLanguageLabel, getLearningPair, getSpeechLocale } from '@/lib/languages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const tutorCopy = {
  pl: {
    welcomeMessage: (targetLabel: string) =>
      `Cześć! Jestem Eva, Twój asystent do nauki ${targetLabel.toLowerCase()}.\n\nMogę Ci pomóc w następujących tematach:\n• Wyjaśnienie słówek krok po kroku\n• Wymowa i akcent\n• Wskazówki do nauki\n• Pytania o gramatykę\n\nO co chcesz zapytać?`,
    quickActions: [
      { icon: Lightbulb, label: 'Porada dnia', prompt: 'Daj mi poradę jak lepiej uczyć się słówek' },
      { icon: BookOpen, label: 'Wyjaśnij słówko', prompt: 'Wyjaśnij mi słówko: ' },
      { icon: HelpCircle, label: 'Jak wymówić?', prompt: 'Jak poprawnie wymówić słówko: ' },
    ],
    contextLabels: {
      level: 'Poziom użytkownika',
      xp: 'Łączne XP',
      vocabulary: 'Słówka w bibliotece',
      streak: 'Aktualna seria',
    },
    streakSuffix: 'dni',
    openTitle: 'Otwórz asystenta AI',
    headerTitle: 'Eva - AI Tutor',
    headerSubtitle: 'Twój asystent do nauki',
    speakTitle: (targetLabel: string) => `Wymów słowa w języku ${targetLabel.toLowerCase()}`,
    typing: 'Eva pisze...',
    quickActionsLabel: 'Szybkie akcje:',
    inputPlaceholder: 'Zapytaj o cokolwiek...',
    errorMessage:
      'Mam chwilowe problemy z połączeniem. Spróbuj ponownie za chwilę.\n\nUpewnij się, że klucz API jest skonfigurowany w .env.local.',
    rateLimitMessage: 'Wysyłasz zbyt wiele zapytań. Spróbuj ponownie za chwilę.',
    configMessage: 'Błąd konfiguracji AI. Sprawdź GEMINI_API_KEY w .env.local.',
    serviceMessage: 'Wystąpił błąd usługi AI. Spróbuj ponownie później.',
    limitMessage:
      'Wykorzystałeś limit AI na ten miesiąc. Spróbuj ponownie po odnowieniu limitu lub przejdź na plan Pro.',
    globalLimitMessage:
      'Globalny limit AI został osiągnięty. Spróbuj ponownie później.',
    waitlistMessage:
      'Twoje konto oczekuje na aktywację. AI będzie dostępne po przyznaniu dostępu.',
    suspendedMessage:
      'Twoje konto jest tymczasowo zawieszone. Skontaktuj się z administratorem.',
  },
  en: {
    welcomeMessage: (targetLabel: string) =>
      `Hi! I am Eva, your ${targetLabel} learning assistant.\n\nI can help with:\n• Explaining words step by step\n• Pronunciation and stress\n• Study tips\n• Grammar questions\n\nWhat would you like to ask?`,
    quickActions: [
      { icon: Lightbulb, label: 'Tip of the day', prompt: 'Give me a tip to learn vocabulary better' },
      { icon: BookOpen, label: 'Explain a word', prompt: 'Explain this word: ' },
      { icon: HelpCircle, label: 'How to pronounce?', prompt: 'How do I pronounce the word: ' },
    ],
    contextLabels: {
      level: 'User level',
      xp: 'Total XP',
      vocabulary: 'Words in library',
      streak: 'Current streak',
    },
    streakSuffix: 'days',
    openTitle: 'Open AI tutor',
    headerTitle: 'Eva - AI Tutor',
    headerSubtitle: 'Your learning companion',
    speakTitle: (targetLabel: string) => `Speak the ${targetLabel} words`,
    typing: 'Eva is typing...',
    quickActionsLabel: 'Quick actions:',
    inputPlaceholder: 'Ask anything...',
    errorMessage:
      'I am having connection issues. Please try again in a moment.\n\nMake sure the API key is configured in .env.local.',
    rateLimitMessage: 'Too many requests. Please try again in a moment.',
    configMessage: 'AI configuration error. Check GEMINI_API_KEY in .env.local.',
    serviceMessage: 'AI service error. Please try again later.',
    limitMessage:
      'You have reached your monthly AI limit. Try again after the reset or upgrade to Pro.',
    globalLimitMessage:
      'The global AI budget has been reached. Please try again later.',
    waitlistMessage:
      'Your account is on the waitlist. AI will be available once access is granted.',
    suspendedMessage: 'Your account is temporarily suspended. Contact support.',
  },
  uk: {
    welcomeMessage: (targetLabel: string) =>
      `Привіт! Я Ева, твій асистент для вивчення ${targetLabel.toLowerCase()}.\n\nМожу допомогти з:\n• Поясненням слів крок за кроком\n• Вимовою та наголосом\n• Порадами для навчання\n• Питаннями з граматики\n\nПро що хочеш запитати?`,
    quickActions: [
      { icon: Lightbulb, label: 'Порада дня', prompt: 'Дай пораду, як краще вчити слова' },
      { icon: BookOpen, label: 'Поясни слово', prompt: 'Поясни слово: ' },
      { icon: HelpCircle, label: 'Як вимовити?', prompt: 'Як правильно вимовити слово: ' },
    ],
    contextLabels: {
      level: 'Рівень користувача',
      xp: 'Загальний XP',
      vocabulary: 'Слів у бібліотеці',
      streak: 'Поточна серія',
    },
    streakSuffix: 'днів',
    openTitle: 'Відкрити AI асистента',
    headerTitle: 'Eva - AI Наставник',
    headerSubtitle: 'Твій помічник у навчанні',
    speakTitle: (targetLabel: string) => `Вимов слова ${targetLabel.toLowerCase()}`,
    typing: 'Ева пише...',
    quickActionsLabel: 'Швидкі дії:',
    inputPlaceholder: 'Запитай про що завгодно...',
    errorMessage:
      'Маю тимчасові проблеми з підключенням. Спробуй ще раз трохи пізніше.\n\nПереконайся, що ключ API налаштовано в .env.local.',
    rateLimitMessage: 'Занадто багато запитів. Спробуй ще раз трохи пізніше.',
    configMessage: 'Помилка налаштування AI. Перевір GEMINI_API_KEY в .env.local.',
    serviceMessage: 'Сталася помилка сервісу AI. Спробуй пізніше.',
    limitMessage:
      'Ви вичерпали місячний ліміт AI. Спробуйте після оновлення або перейдіть на Pro.',
    globalLimitMessage:
      'Глобальний ліміт AI вичерпано. Спробуйте пізніше.',
    waitlistMessage:
      'Ваш акаунт у списку очікування. AI буде доступний після надання доступу.',
    suspendedMessage:
      'Ваш акаунт тимчасово призупинений. Зверніться до адміністратора.',
  },
} as const;

type TutorCopy = typeof tutorCopy.pl;

export function AITutor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const language = useLanguage();
  const t = (tutorCopy[language] ?? tutorCopy.pl) as TutorCopy;
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const settings = useVocabStore((state) => state.settings);
  const activePair = getLearningPair(settings.learning.pairId);
  const targetLabel = getLanguageLabel(activePair.target, language);

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
          content: t.welcomeMessage(targetLabel),
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, t, targetLabel]);

  const buildContext = () => {
    return `
${t.contextLabels.level}: ${stats.level}
${t.contextLabels.xp}: ${stats.totalXp}
${t.contextLabels.vocabulary}: ${vocabulary.length}
${t.contextLabels.streak}: ${stats.currentStreak} ${t.streakSuffix}
    `.trim();
  };

  const appendErrorCode = (message: string, code?: string) =>
    code ? `${message} (${code})` : message;

  const addAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
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
          targetLanguage: activePair.target,
          nativeLanguage: activePair.native,
          feedbackLanguage: settings.ai.feedbackLanguage,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCode = data?.error;
        if (errorCode === 'user_limit_reached') {
          addAssistantMessage(t.limitMessage);
          return;
        }
        if (errorCode === 'global_limit_reached') {
          addAssistantMessage(t.globalLimitMessage);
          return;
        }
        if (errorCode === 'waitlisted') {
          addAssistantMessage(t.waitlistMessage);
          return;
        }
        if (errorCode === 'suspended') {
          addAssistantMessage(t.suspendedMessage);
          return;
        }
        if (errorCode === 'rate_limited' || errorCode === 'ai_rate_limited') {
          addAssistantMessage(appendErrorCode(t.rateLimitMessage, errorCode));
          return;
        }
        if (
          errorCode === 'api_key_missing' ||
          errorCode === 'ai_invalid_key' ||
          errorCode === 'ai_permission_denied'
        ) {
          addAssistantMessage(appendErrorCode(t.configMessage, errorCode));
          return;
        }
        if (typeof errorCode === 'string' && errorCode.startsWith('ai_')) {
          addAssistantMessage(appendErrorCode(t.serviceMessage, errorCode));
          return;
        }
        throw new Error('Failed to get response');
      }

      if (!data?.response) {
        throw new Error('Invalid response');
      }

      addAssistantMessage(data.response);
    } catch (error) {
      addAssistantMessage(t.errorMessage);
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
    // Extract quoted words from the text and speak them
    const englishPattern = /"([^"]+)"/g;
    const matches = text.match(englishPattern);
    if (matches && matches.length > 0) {
      const word = matches[0].replace(/"/g, '');
      speak(word, {
        voice: settings.pronunciation.voice,
        speed: settings.pronunciation.speed,
        locale: getSpeechLocale(
          settings.learning.targetLanguage,
          settings.pronunciation.voice
        ),
      });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-amber-400 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
        title={t.openTitle}
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-6 w-[calc(100vw-2rem)] sm:w-[360px] h-[calc(100dvh-10rem)] sm:h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-amber-400 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-semibold">{t.headerTitle}</h3>
            <p className="text-xs text-white/80">{t.headerSubtitle}</p>
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
                  title={t.speakTitle(targetLabel)}
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
                <span className="text-sm text-slate-500">{t.typing}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {showQuickActions && messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 text-center">{t.quickActionsLabel}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {t.quickActions.map((action, index) => (
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
            placeholder={t.inputPlaceholder}
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
