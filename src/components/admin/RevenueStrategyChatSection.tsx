'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { RevenueChatMessage } from '@/types/aiAnalytics';

const QUICK_PROMPTS = [
  { label: 'Reduce AI costs', prompt: 'How can I reduce AI costs while maintaining user experience?' },
  { label: 'Increase MRR', prompt: 'What strategies can help me increase MRR in the next 3 months?' },
  { label: 'Reduce churn', prompt: 'How can I reduce churn rate for my subscription service?' },
  { label: 'Pricing strategy', prompt: 'Should I adjust my pricing strategy? What would you recommend?' },
];
const TEXTAREA_LINE_HEIGHT = 24;
const TEXTAREA_PADDING = 16;
const CHAT_MIN_ROWS = 2;
const CHAT_MAX_ROWS = 6;

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

export function RevenueStrategyChatSection() {
  const [messages, setMessages] = useState<RevenueChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        return;
      }
      container.scrollTop = container.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    adjustTextareaHeight(inputRef.current, CHAT_MIN_ROWS, CHAT_MAX_ROWS);
  }, [input]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage: RevenueChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId || 'new',
      role: 'user',
      content: messageText.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/ai/revenue-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      const assistantMessage: RevenueChatMessage = {
        id: `assistant-${Date.now()}`,
        sessionId: data.sessionId,
        role: 'assistant',
        content: data.response,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const startNewSession = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Revenue Strategy Chat
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI-powered business analysis
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startNewSession}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            New session
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-6">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="text-sm">
                Ask about revenue optimization, pricing, or AI costs
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQuickPrompt(item.prompt)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end">
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight(inputRef.current, CHAT_MIN_ROWS, CHAT_MAX_ROWS);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about revenue strategy..."
              className="w-full px-4 py-2 pr-12 sm:pr-14 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
              disabled={loading}
              rows={CHAT_MIN_ROWS}
              style={{
                minHeight: getTextareaHeight(CHAT_MIN_ROWS),
                maxHeight: getTextareaHeight(CHAT_MAX_ROWS),
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              title="Send message"
              className="absolute bottom-2 right-2 h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
