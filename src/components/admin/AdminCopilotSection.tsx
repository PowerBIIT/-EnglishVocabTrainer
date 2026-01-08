'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
  AdminCopilotAction,
  AdminCopilotMessage,
  AdminCopilotResponse,
} from '@/types/adminCopilot';

const RANGE_OPTIONS = [7, 30, 90, 365] as const;
const TEXTAREA_LINE_HEIGHT = 24;
const TEXTAREA_PADDING = 20;
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

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
};

const copilotCopy = {
  pl: {
    title: 'Admin Copilot',
    description: 'Analiza uzycia, kosztow AI i konfiguracji w jednym miejscu.',
    rangeLabel: 'Zakres danych',
    rangeValue: (days: number) => `ostatnie ${days} dni`,
    rangeHint: (start: string, end: string, days: number) =>
      `Zakres: ${start} - ${end} (${days} dni)`,
    newSession: 'Nowa sesja',
    quickActions: 'Szybkie tematy',
    prompts: [
      {
        label: 'Koszty AI',
        build: (range: string) =>
          `Podsumuj koszty AI i top funkcje za ${range}.`,
      },
      {
        label: 'Limity AI',
        build: (range: string) =>
          `Sprawdz limity AI i zasugeruj zmiany dla ${range}.`,
      },
      {
        label: 'Ryzyka i bledy',
        build: (range: string) =>
          `Wykryj ryzyka i najczestsze bledy AI za ${range}.`,
      },
      {
        label: 'Overlay promptow',
        build: (_range: string) =>
          'Zaproponuj bezpieczne overlaye dla promptow, aby obnic koszty i utrzymac jakosc.',
      },
    ],
    emptyHint:
      'Zapytaj o analize uzycia, koszty, konfiguracje limitow lub overlaye promptow.',
    inputPlaceholder: 'Zapytaj o analize lub konfiguracje...',
    send: 'Wyslij',
    loading: 'Analizuje...',
    error: 'Nie udalo sie wyslac wiadomosci.',
    actionsTitle: 'Rekomendowane zmiany',
    actionConfig: 'Ustaw konfiguracje',
    actionModel: 'Zmien model',
    actionOverlay: 'Overlay promptu',
    actionApply: 'Zastosuj',
    actionApplied: 'Zastosowano',
    actionFailed: 'Nie udalo sie zapisac zmiany.',
    actionApplying: 'Zapisywanie...',
    actionReason: 'Uzasadnienie',
  },
  en: {
    title: 'Admin Copilot',
    description: 'Usage analysis, AI costs, and configuration in one place.',
    rangeLabel: 'Data range',
    rangeValue: (days: number) => `last ${days} days`,
    rangeHint: (start: string, end: string, days: number) =>
      `Range: ${start} - ${end} (${days} days)`,
    newSession: 'New session',
    quickActions: 'Quick topics',
    prompts: [
      {
        label: 'AI costs',
        build: (range: string) =>
          `Summarize AI costs and top features for ${range}.`,
      },
      {
        label: 'AI limits',
        build: (range: string) =>
          `Review AI limits and suggest changes for ${range}.`,
      },
      {
        label: 'Risks & errors',
        build: (range: string) =>
          `Find risks and most common AI errors for ${range}.`,
      },
      {
        label: 'Prompt overlays',
        build: (_range: string) =>
          'Suggest safe prompt overlays to reduce costs and maintain quality.',
      },
    ],
    emptyHint:
      'Ask about usage analysis, AI costs, limit configuration, or prompt overlays.',
    inputPlaceholder: 'Ask about analysis or configuration...',
    send: 'Send',
    loading: 'Analyzing...',
    error: 'Failed to send message.',
    actionsTitle: 'Recommended changes',
    actionConfig: 'Set configuration',
    actionModel: 'Change model',
    actionOverlay: 'Prompt overlay',
    actionApply: 'Apply',
    actionApplied: 'Applied',
    actionFailed: 'Failed to save changes.',
    actionApplying: 'Saving...',
    actionReason: 'Reason',
  },
} as const;

type ActionState = {
  status: 'idle' | 'applying' | 'applied' | 'error';
  error?: string;
};

const isCopilotResponse = (value: unknown): value is AdminCopilotResponse => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as AdminCopilotResponse;
  return (
    typeof payload.sessionId === 'string' &&
    typeof payload.reply === 'string'
  );
};

export function AdminCopilotSection() {
  const language = useLanguage();
  const t = language === 'en' ? copilotCopy.en : copilotCopy.pl;
  const [messages, setMessages] = useState<AdminCopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const range = useMemo(() => buildRange(rangeDays), [rangeDays]);

  const rangeLabel = useMemo(
    () => t.rangeValue(rangeDays),
    [rangeDays, t]
  );

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

  const resetSession = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setActionState({});
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage: AdminCopilotMessage = {
      id: `user-${Date.now()}`,
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
      const response = await fetch('/api/admin/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          sessionId,
          language,
          range,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | AdminCopilotResponse
        | { error?: string }
        | null;

      if (!response.ok || !isCopilotResponse(payload)) {
        const errorPayload = payload as { error?: string } | null;
        const errorMessage =
          errorPayload && typeof errorPayload.error === 'string'
            ? errorPayload.error
            : t.error;
        throw new Error(errorMessage);
      }

      setSessionId(payload.sessionId);

      const assistantMessage: AdminCopilotMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload.reply,
        createdAt: new Date().toISOString(),
        actions: payload.actions ?? [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
      setMessages((prev) => prev.filter((message) => message.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const applyAction = async (action: AdminCopilotAction, actionKey: string) => {
    setActionState((prev) => ({ ...prev, [actionKey]: { status: 'applying' } }));
    setToast(null);

    try {
      if (action.type === 'set_config') {
        const response = await fetch('/api/admin/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: [{ key: action.key, value: action.value }],
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? t.actionFailed);
        }
      }

      if (action.type === 'set_model') {
        const response = await fetch('/api/admin/ai', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: action.model }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? t.actionFailed);
        }
      }

      if (action.type === 'set_overlay') {
        if (action.scope === 'prompt' && !action.promptId) {
          throw new Error(t.actionFailed);
        }
        const overlayPayload =
          action.scope === 'global'
            ? { overlays: { global: action.overlay } }
            : {
                overlays: {
                  byPrompt: {
                    [action.promptId ?? '']: action.overlay,
                  },
                },
              };

        const response = await fetch('/api/admin/ai', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overlayPayload),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? t.actionFailed);
        }
      }

      setActionState((prev) => ({ ...prev, [actionKey]: { status: 'applied' } }));
      setToast({ type: 'success', message: t.actionApplied });
    } catch (applyError) {
      setActionState((prev) => ({
        ...prev,
        [actionKey]: {
          status: 'error',
          error: applyError instanceof Error ? applyError.message : t.actionFailed,
        },
      }));
      setToast({
        type: 'error',
        message: applyError instanceof Error ? applyError.message : t.actionFailed,
      });
    }
  };

  const renderActionDetails = (action: AdminCopilotAction) => {
    if (action.type === 'set_config') {
      return (
        <>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.actionConfig}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {action.key} {'->'} {action.value}
          </p>
        </>
      );
    }
    if (action.type === 'set_model') {
      return (
        <>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.actionModel}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{action.model}</p>
        </>
      );
    }
    return (
      <>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t.actionOverlay}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {action.scope === 'global'
            ? 'global'
            : `prompt: ${action.promptId ?? 'unknown'}`}
        </p>
        <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-2">
          <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">
            {action.overlay}
          </pre>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.description}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            {t.rangeLabel}
          </label>
          <div className="w-44">
            <Select
              value={rangeDays}
              onChange={(event) =>
                setRangeDays(Number(event.target.value) as (typeof RANGE_OPTIONS)[number])
              }
            >
              {RANGE_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days}d
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-slate-400">
            {t.rangeHint(range.start, range.end, rangeDays)}
          </p>
        </div>
      </div>

      {toast && (
        <Toast
          variant={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 flex flex-col h-[640px]">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rangeLabel}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={resetSession}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {t.newSession}
            </button>
          )}
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center gap-4">
              <p className="text-sm text-slate-400">{t.emptyHint}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {t.quickActions}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {t.prompts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => sendMessage(item.build(rangeLabel))}
                    className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {t.actionsTitle}
                        </p>
                        <div className="space-y-2">
                          {message.actions.map((action, index) => {
                            const actionKey = `${message.id}-${index}`;
                            const state = actionState[actionKey]?.status ?? 'idle';
                            const isApplying = state === 'applying';
                            const isApplied = state === 'applied';
                            const actionError = actionState[actionKey]?.error;

                            return (
                              <div
                                key={actionKey}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-3 space-y-2"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    {renderActionDetails(action)}
                                    {action.reason && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t.actionReason}: {action.reason}
                                      </p>
                                    )}
                                    {actionError && (
                                      <p className="text-xs text-error-600">{actionError}</p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isApplied ? 'success' : 'secondary'}
                                    disabled={isApplying || isApplied}
                                    onClick={() => applyAction(action, actionKey)}
                                  >
                                    {isApplied
                                      ? t.actionApplied
                                      : isApplying
                                        ? t.actionApplying
                                        : t.actionApply}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm text-slate-500">
                    {t.loading}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="px-4 pb-2">
            <Toast variant="error" message={error} />
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                adjustTextareaHeight(inputRef.current, CHAT_MIN_ROWS, CHAT_MAX_ROWS);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={t.inputPlaceholder}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none overflow-hidden"
              disabled={loading}
              maxLength={2000}
              rows={CHAT_MIN_ROWS}
              style={{
                minHeight: getTextareaHeight(CHAT_MIN_ROWS),
                maxHeight: getTextareaHeight(CHAT_MAX_ROWS),
              }}
            />
            <Button type="submit" disabled={!input.trim() || loading}>
              {t.send}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
