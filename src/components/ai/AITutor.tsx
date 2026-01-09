'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  ArrowUp,
  Sparkles,
  Loader2,
  Volume2,
  BookOpen,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useVocabStore } from '@/lib/store';
import { speak } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { getLanguageLabel, getLearningPair, getSpeechLocale } from '@/lib/languages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TEXTAREA_LINE_HEIGHT = 24;
const TEXTAREA_PADDING = 20;
const TUTOR_MIN_ROWS = 2;
const TUTOR_MAX_ROWS = 6;

const getTextareaHeight = (rows: number) =>
  `${rows * TEXTAREA_LINE_HEIGHT + TEXTAREA_PADDING}px`;

const adjustTextareaHeight = (
  textarea: HTMLTextAreaElement | null,
  minRows: number,
  maxRows: number
) => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const minHeight = TEXTAREA_LINE_HEIGHT * minRows + TEXTAREA_PADDING;
  const maxHeight = TEXTAREA_LINE_HEIGHT * maxRows + TEXTAREA_PADDING;
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
};

const tutorCopy = {
  pl: {
    welcomeMessage: (targetLabel: string) =>
      `Cześć! Jestem Eva, Twój asystent do nauki ${targetLabel.toLowerCase()}.\n\nMogę Ci pomóc w następujących tematach:\n• Wyjaśnienie słówek krok po kroku\n• Wymowa i akcent\n• Wskazówki do nauki\n• Pytania o gramatykę\n\nO co chcesz zapytać?`,
    adminWelcomeMessage:
      'Cześć! Jestem asystentem admina. Pomagam w konfiguracji AI, promptach i diagnozowaniu problemów.\n\nOpisz, co chcesz usprawnić.',
    quickActions: [
      { icon: Lightbulb, label: 'Porada dnia', prompt: 'Daj mi poradę jak lepiej uczyć się słówek' },
      { icon: BookOpen, label: 'Wyjaśnij słówko', prompt: 'Wyjaśnij mi słówko: ' },
      { icon: HelpCircle, label: 'Jak wymówić?', prompt: 'Jak poprawnie wymówić słówko: ' },
    ],
    adminQuickActions: [
      {
        icon: Lightbulb,
        label: 'Ulepsz prompt',
        prompt: 'Zaproponuj overlay dla promptu generowania słówek.',
      },
      {
        icon: BookOpen,
        label: 'Test JSON',
        prompt: 'Jak dopilnować, aby odpowiedzi zawsze były poprawnym JSON?',
      },
      {
        icon: HelpCircle,
        label: 'Diagnoza błędu',
        prompt: 'Jak zdiagnozować błąd ai_model_not_found?',
      },
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
    adminHeaderSubtitle: 'Wsparcie konfiguracji AI',
    speakTitle: (targetLabel: string) => `Wymów słowa w języku ${targetLabel.toLowerCase()}`,
    typing: 'Eva pisze...',
    quickActionsLabel: 'Szybkie akcje:',
    inputPlaceholder: 'Zapytaj o cokolwiek...',
    sendLabel: 'Wyślij',
    adminInputPlaceholder: 'Zapytaj o konfigurację AI...',
    errorMessage:
      'Mam chwilowe problemy z połączeniem. Spróbuj ponownie za chwilę.\n\nUpewnij się, że klucz API jest skonfigurowany w .env.local.',
    rateLimitMessage: 'Wysyłasz zbyt wiele zapytań. Spróbuj ponownie za chwilę.',
    configMessage: 'Błąd konfiguracji AI. Sprawdź GEMINI_API_KEY w .env.local.',
    serviceMessage: 'Wystąpił błąd usługi AI. Spróbuj ponownie później.',
    limitMessage:
      'Wykorzystałeś limit AI na ten miesiąc. Spróbuj ponownie po odnowieniu limitu lub przejdź na plan Pro.',
    globalLimitMessage:
      'Globalny limit AI został osiągnięty. Spróbuj ponownie później.',
    costLimitMessage:
      'Osiągnięto twardy limit kosztów AI na ten miesiąc. Spróbuj ponownie po odnowieniu limitu.',
    waitlistMessage:
      'Twoje konto oczekuje na aktywację. AI będzie dostępne po przyznaniu dostępu.',
    suspendedMessage:
      'Twoje konto jest tymczasowo zawieszone. Skontaktuj się z administratorem.',
  },
  en: {
    welcomeMessage: (targetLabel: string) =>
      `Hi! I am Eva, your ${targetLabel} learning assistant.\n\nI can help with:\n• Explaining words step by step\n• Pronunciation and stress\n• Study tips\n• Grammar questions\n\nWhat would you like to ask?`,
    adminWelcomeMessage:
      'Hi! I am the admin assistant. I can help with AI configuration, prompt overlays, and issue diagnosis.\n\nDescribe what you want to improve.',
    quickActions: [
      { icon: Lightbulb, label: 'Tip of the day', prompt: 'Give me a tip to learn vocabulary better' },
      { icon: BookOpen, label: 'Explain a word', prompt: 'Explain this word: ' },
      { icon: HelpCircle, label: 'How to pronounce?', prompt: 'How do I pronounce the word: ' },
    ],
    adminQuickActions: [
      {
        icon: Lightbulb,
        label: 'Improve prompt',
        prompt: 'Suggest an overlay for the generate-words prompt.',
      },
      {
        icon: BookOpen,
        label: 'Keep JSON',
        prompt: 'How do we enforce JSON-only responses in prompts?',
      },
      {
        icon: HelpCircle,
        label: 'Diagnose error',
        prompt: 'How do we diagnose ai_model_not_found errors?',
      },
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
    adminHeaderSubtitle: 'AI configuration support',
    speakTitle: (targetLabel: string) => `Speak the ${targetLabel} words`,
    typing: 'Eva is typing...',
    quickActionsLabel: 'Quick actions:',
    inputPlaceholder: 'Ask anything...',
    sendLabel: 'Send',
    adminInputPlaceholder: 'Ask about AI configuration...',
    errorMessage:
      'I am having connection issues. Please try again in a moment.\n\nMake sure the API key is configured in .env.local.',
    rateLimitMessage: 'Too many requests. Please try again in a moment.',
    configMessage: 'AI configuration error. Check GEMINI_API_KEY in .env.local.',
    serviceMessage: 'AI service error. Please try again later.',
    limitMessage:
      'You have reached your monthly AI limit. Try again after the reset or upgrade to Pro.',
    globalLimitMessage:
      'The global AI budget has been reached. Please try again later.',
    costLimitMessage:
      'The monthly AI cost limit has been reached. Please try again after the reset.',
    waitlistMessage:
      'Your account is on the waitlist. AI will be available once access is granted.',
    suspendedMessage: 'Your account is temporarily suspended. Contact support.',
  },
  uk: {
    welcomeMessage: (targetLabel: string) =>
      `Привіт! Я Ева, твій асистент для вивчення ${targetLabel.toLowerCase()}.\n\nМожу допомогти з:\n• Поясненням слів крок за кроком\n• Вимовою та наголосом\n• Порадами для навчання\n• Питаннями з граматики\n\nПро що хочеш запитати?`,
    adminWelcomeMessage:
      'Привіт! Я асистент адміністратора. Допоможу з конфігурацією AI, оверлеями промптів і діагностикою проблем.\n\nОпиши, що треба покращити.',
    quickActions: [
      { icon: Lightbulb, label: 'Порада дня', prompt: 'Дай пораду, як краще вчити слова' },
      { icon: BookOpen, label: 'Поясни слово', prompt: 'Поясни слово: ' },
      { icon: HelpCircle, label: 'Як вимовити?', prompt: 'Як правильно вимовити слово: ' },
    ],
    adminQuickActions: [
      {
        icon: Lightbulb,
        label: 'Покращити промпт',
        prompt: 'Запропонуй оверлей для промпту генерації слів.',
      },
      {
        icon: BookOpen,
        label: 'JSON формат',
        prompt: 'Як забезпечити відповідь лише у форматі JSON?',
      },
      {
        icon: HelpCircle,
        label: 'Діагностика',
        prompt: 'Як діагностувати помилку ai_model_not_found?',
      },
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
    adminHeaderSubtitle: 'Підтримка AI конфігурації',
    speakTitle: (targetLabel: string) => `Вимов слова ${targetLabel.toLowerCase()}`,
    typing: 'Ева пише...',
    quickActionsLabel: 'Швидкі дії:',
    inputPlaceholder: 'Запитай про що завгодно...',
    sendLabel: 'Надіслати',
    adminInputPlaceholder: 'Запитай про конфігурацію AI...',
    errorMessage:
      'Маю тимчасові проблеми з підключенням. Спробуй ще раз трохи пізніше.\n\nПереконайся, що ключ API налаштовано в .env.local.',
    rateLimitMessage: 'Занадто багато запитів. Спробуй ще раз трохи пізніше.',
    configMessage: 'Помилка налаштування AI. Перевір GEMINI_API_KEY в .env.local.',
    serviceMessage: 'Сталася помилка сервісу AI. Спробуй пізніше.',
    limitMessage:
      'Ви вичерпали місячний ліміт AI. Спробуйте після оновлення або перейдіть на Pro.',
    globalLimitMessage:
      'Глобальний ліміт AI вичерпано. Спробуйте пізніше.',
    costLimitMessage:
      'Досягнуто місячного ліміту витрат на AI. Спробуйте після оновлення.',
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: session } = useSession();
  const isAdminMode = Boolean(session?.user?.isAdmin);
  const language = useLanguage();
  const t = (tutorCopy[language] ?? tutorCopy.pl) as TutorCopy;
  const stats = useVocabStore((state) => state.stats);
  const vocabulary = useVocabStore((state) => state.getActiveVocabulary());
  const settings = useVocabStore((state) => state.settings);
  const activePair = getLearningPair(settings.learning.pairId);
  const targetLabel = getLanguageLabel(activePair.target, language);
  const quickActions = isAdminMode ? t.adminQuickActions : t.quickActions;
  const inputPlaceholder = isAdminMode ? t.adminInputPlaceholder : t.inputPlaceholder;
  const headerSubtitle = isAdminMode ? t.adminHeaderSubtitle : t.headerSubtitle;

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        return;
      }
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    adjustTextareaHeight(inputRef.current, TUTOR_MIN_ROWS, TUTOR_MAX_ROWS);
  }, [input, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: isAdminMode ? t.adminWelcomeMessage : t.welcomeMessage(targetLabel),
          timestamp: new Date(),
        },
      ]);
    }
  }, [isAdminMode, isOpen, messages.length, t, targetLabel]);

  const buildContext = () => {
    const statsBlock = [
      `${t.contextLabels.level}: ${stats.level}`,
      `${t.contextLabels.xp}: ${stats.totalXp}`,
      `${t.contextLabels.vocabulary}: ${vocabulary.length}`,
      `${t.contextLabels.streak}: ${stats.currentStreak} ${t.streakSuffix}`,
    ].join('\n');

    const recentMessages = messages
      .filter((message, index) => !(index === 0 && message.role === 'assistant'))
      .slice(-6)
      .map(
        (message) =>
          `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`
      )
      .join('\n');

    const historyBlock = recentMessages ? `\n\nRecent chat:\n${recentMessages}` : '';
    return `${statsBlock}${historyBlock}`;
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
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
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
          adminMode: isAdminMode,
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
        if (errorCode === 'ai_cost_limit_reached') {
          addAssistantMessage(t.costLimitMessage);
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
    <div className="chat-shell chat-shell-elevated fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-6 w-[calc(100vw-2rem)] sm:w-[360px] h-[calc(100dvh-10rem)] sm:h-[500px] z-50 overflow-hidden">
      {/* Header */}
      <div className="chat-shell-header chat-shell-header-gradient">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="chat-shell-title font-semibold">{t.headerTitle}</h3>
            <p className="chat-shell-subtitle text-xs">{headerSubtitle}</p>
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            bubbleClassName="relative group"
          >
            <p className="chat-message-text">{message.content}</p>
            {message.role === 'assistant' && (
              <button
                onClick={() => handleSpeakText(message.content)}
                className="absolute -right-8 top-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-primary-600"
                title={t.speakTitle(targetLabel)}
              >
                <Volume2 size={16} />
              </button>
            )}
          </ChatMessage>
        ))}

        {isLoading && (
          <ChatMessage role="assistant" bubbleClassName="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-primary-500" />
            <span className="text-sm text-slate-500">{t.typing}</span>
          </ChatMessage>
        )}

        {/* Quick Actions */}
        {showQuickActions && messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 text-center">{t.quickActionsLabel}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map((action, index) => (
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

      </div>

      {/* Input */}
      <div className="chat-shell-footer p-4">
        <div className="flex items-end">
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight(inputRef.current, TUTOR_MIN_ROWS, TUTOR_MAX_ROWS);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={inputPlaceholder}
              className="chat-input px-4 py-2 pr-12 sm:pr-14 text-sm"
              disabled={isLoading}
              rows={TUTOR_MIN_ROWS}
              style={{
                minHeight: getTextareaHeight(TUTOR_MIN_ROWS),
                maxHeight: getTextareaHeight(TUTOR_MAX_ROWS),
              }}
            />
            <Button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label={t.sendLabel}
              title={t.sendLabel}
              className="chat-send absolute bottom-2 right-2 h-10 w-10 p-0"
            >
              <ArrowUp />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
