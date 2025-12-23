'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { useLanguage } from '@/lib/i18n';

type AiModelInfo = {
  id: string;
  label: string;
  status: 'stable' | 'preview' | 'experimental';
  description: string;
  bestFor: string;
};

type PromptPreview = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  effectivePrompt: string;
};

type AdminAiPayload = {
  activeModel: { value: string; source: 'db' | 'env' | 'default'; isKnown: boolean };
  defaultModel: string;
  models: AiModelInfo[];
  prompts: PromptPreview[];
  overlays: {
    global: string;
    byPrompt: Record<string, string>;
  };
};

const AUTO_OPTION = '__auto__';

const buildOverlayBlock = (globalOverlay: string, promptOverlay: string) => {
  const blocks: string[] = [];
  if (globalOverlay.trim()) {
    blocks.push(`Global admin guidance:\n${globalOverlay.trim()}`);
  }
  if (promptOverlay.trim()) {
    blocks.push(`Prompt-specific guidance:\n${promptOverlay.trim()}`);
  }
  if (blocks.length === 0) return '';
  return `Admin overlay (do not change output format or schema):\n${blocks.join('\n\n')}\n`;
};

const applyOverlayPreview = (
  basePrompt: string,
  globalOverlay: string,
  promptOverlay: string
) => {
  const overlayBlock = buildOverlayBlock(globalOverlay, promptOverlay);
  if (!overlayBlock) return basePrompt;
  const marker = 'Respond ONLY in JSON';
  const markerIndex = basePrompt.lastIndexOf(marker);
  if (markerIndex === -1) {
    return `${basePrompt}\n\n${overlayBlock}`;
  }
  return `${basePrompt.slice(0, markerIndex)}${overlayBlock}\n${basePrompt.slice(
    markerIndex
  )}`;
};

const aiModelCopy = {
  pl: {
    title: 'Modele AI',
    description:
      'Zarządzaj modelem Gemini używanym w aplikacji oraz sprawdzaj aktualne prompty.',
    activeLabel: 'Aktywny model',
    activeSource: 'Źródło',
    autoOption: 'Auto (env/domyślny)',
    selectLabel: 'Model dla API',
    detailTitle: 'Szczegóły modelu',
    globalOverlayTitle: 'Globalny overlay',
    globalOverlayDescription:
      'Dodawany do wszystkich promptów. Zachowaj format odpowiedzi (np. JSON).',
    overlayLabel: 'Overlay promptu',
    overlayPlaceholder: 'Np. Dodawaj więcej szkolnych przykładów.',
    promptPreviewLabel: 'Podgląd promptu',
    basePromptLabel: 'Bazowy prompt',
    effectivePromptLabel: 'Prompt z overlay',
    aiHelp: 'Pomoc AI',
    aiHelpTitle: 'Asystent admina',
    aiHelpDescription:
      'Opisz cel, a AI zaproponuje bezpieczny overlay do promptu.',
    aiHelpGoalLabel: 'Cel',
    aiHelpGoalPlaceholder: 'Np. Skróć odpowiedzi i trzymaj format JSON.',
    aiHelpGenerate: 'Generuj propozycję',
    aiHelpGenerating: 'Generuję...',
    aiHelpSuggestionLabel: 'Propozycja',
    aiHelpNotesLabel: 'Uwagi',
    aiHelpApply: 'Zastosuj',
    aiHelpClose: 'Zamknij',
    promptsTitle: 'Prompty',
    promptsDescription:
      'Bieżące treści promptów używanych przez aplikację (przykładowe wartości).',
    unknownModel: 'Model niestandardowy',
    defaultBadge: 'domyślny',
    save: 'Zapisz zmiany',
    saving: 'Zapisywanie...',
    toastSaved: 'Model AI zapisany.',
    toastFailed: 'Nie udało się zapisać modelu.',
    loading: 'Ładowanie konfiguracji AI...',
  },
  en: {
    title: 'AI models',
    description:
      'Manage the Gemini model used by the app and review the active prompts.',
    activeLabel: 'Active model',
    activeSource: 'Source',
    autoOption: 'Auto (env/default)',
    selectLabel: 'Model for API',
    detailTitle: 'Model details',
    globalOverlayTitle: 'Global overlay',
    globalOverlayDescription:
      'Applied to all prompts. Keep the required output format (e.g., JSON).',
    overlayLabel: 'Prompt overlay',
    overlayPlaceholder: 'e.g. Add more school-friendly examples.',
    promptPreviewLabel: 'Prompt preview',
    basePromptLabel: 'Base prompt',
    effectivePromptLabel: 'Prompt with overlay',
    aiHelp: 'AI help',
    aiHelpTitle: 'Admin assistant',
    aiHelpDescription:
      'Describe your goal and AI will suggest a safe overlay for the prompt.',
    aiHelpGoalLabel: 'Goal',
    aiHelpGoalPlaceholder: 'e.g. Keep answers concise and JSON-only.',
    aiHelpGenerate: 'Generate suggestion',
    aiHelpGenerating: 'Generating...',
    aiHelpSuggestionLabel: 'Suggestion',
    aiHelpNotesLabel: 'Notes',
    aiHelpApply: 'Apply',
    aiHelpClose: 'Close',
    promptsTitle: 'Prompts',
    promptsDescription:
      'Current prompt content used by the app (with sample values).',
    unknownModel: 'Custom model',
    defaultBadge: 'default',
    save: 'Save changes',
    saving: 'Saving...',
    toastSaved: 'AI model saved.',
    toastFailed: 'Failed to save AI model.',
    loading: 'Loading AI configuration...',
  },
} as const;

const statusVariant = (status: AiModelInfo['status']) => {
  if (status === 'stable') return 'success';
  if (status === 'preview') return 'warning';
  return 'info';
};

const sourceVariant = (source: AdminAiPayload['activeModel']['source']) => {
  if (source === 'db') return 'info';
  if (source === 'env') return 'warning';
  return 'default';
};

type AssistTarget =
  | { type: 'global'; label: string }
  | { type: 'prompt'; prompt: PromptPreview };

export function AiModelSection() {
  const language = useLanguage();
  const t = language === 'pl' ? aiModelCopy.pl : aiModelCopy.en;
  const [data, setData] = useState<AdminAiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [selectedModel, setSelectedModel] = useState(AUTO_OPTION);
  const [globalOverlay, setGlobalOverlay] = useState('');
  const [promptOverlays, setPromptOverlays] = useState<Record<string, string>>({});
  const [assistTarget, setAssistTarget] = useState<AssistTarget | null>(null);
  const [assistGoal, setAssistGoal] = useState('');
  const [assistSuggestion, setAssistSuggestion] = useState('');
  const [assistNotes, setAssistNotes] = useState('');
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/ai', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? t.toastFailed);
      }
      const payload = (await response.json()) as AdminAiPayload;
      setData(payload);
      setSelectedModel(payload.activeModel.source === 'db' ? payload.activeModel.value : AUTO_OPTION);
      setGlobalOverlay(payload.overlays?.global ?? '');
      setPromptOverlays(payload.overlays?.byPrompt ?? {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.toastFailed);
    } finally {
      setLoading(false);
    }
  }, [t.toastFailed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedInfo = useMemo(() => {
    if (!data) return null;
    const activeId =
      selectedModel === AUTO_OPTION ? data.activeModel.value : selectedModel;
    return data.models.find((model) => model.id === activeId) ?? null;
  }, [data, selectedModel]);

  const hasChanges = useMemo(() => {
    if (!data) return false;
    const normalize = (value?: string) => value?.trim() ?? '';
    const baseModel =
      data.activeModel.source === 'db' ? data.activeModel.value : AUTO_OPTION;
    if (selectedModel !== baseModel) return true;
    if (normalize(globalOverlay) !== normalize(data.overlays?.global)) return true;
    return data.prompts.some(
      (prompt) =>
        normalize(promptOverlays[prompt.id]) !==
        normalize(data.overlays?.byPrompt?.[prompt.id])
    );
  }, [data, globalOverlay, promptOverlays, selectedModel]);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const model = selectedModel === AUTO_OPTION ? '' : selectedModel;
      const response = await fetch('/api/admin/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          overlays: {
            global: globalOverlay,
            byPrompt: promptOverlays,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? t.toastFailed);
      }
      setToast({ type: 'success', message: t.toastSaved });
      await loadData();
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : t.toastFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const openAssist = (target: AssistTarget) => {
    setAssistTarget(target);
    setAssistGoal('');
    setAssistSuggestion('');
    setAssistNotes('');
    setAssistError(null);
  };

  const closeAssist = () => {
    setAssistTarget(null);
    setAssistGoal('');
    setAssistSuggestion('');
    setAssistNotes('');
    setAssistError(null);
    setAssistLoading(false);
  };

  const requestAssist = async () => {
    if (!assistTarget) return;
    setAssistLoading(true);
    setAssistError(null);
    setAssistSuggestion('');
    setAssistNotes('');
    try {
      const promptId =
        assistTarget.type === 'global' ? 'global' : assistTarget.prompt.id;
      const currentOverlay =
        assistTarget.type === 'global'
          ? globalOverlay
          : promptOverlays[assistTarget.prompt.id] ?? '';
      const response = await fetch('/api/admin/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId,
          goal: assistGoal,
          currentOverlay,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? t.toastFailed);
      }
      setAssistSuggestion(payload.suggestedOverlay ?? '');
      setAssistNotes(payload.notes ?? '');
    } catch (assistError) {
      setAssistError(
        assistError instanceof Error ? assistError.message : t.toastFailed
      );
    } finally {
      setAssistLoading(false);
    }
  };

  const applySuggestion = () => {
    if (!assistTarget || !assistSuggestion) return;
    if (assistTarget.type === 'global') {
      setGlobalOverlay(assistSuggestion);
    } else {
      setPromptOverlays((prev) => ({
        ...prev,
        [assistTarget.prompt.id]: assistSuggestion,
      }));
    }
    closeAssist();
  };

  if (loading && !data) {
    return <div className="text-sm text-slate-500">{t.loading}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.description}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || loading || !data || !hasChanges}
          className="w-full sm:w-auto"
        >
          {saving ? t.saving : t.save}
        </Button>
      </div>

      {toast && (
        <Toast
          variant={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {error && <Toast variant="error" message={error} />}

      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{t.activeLabel}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {data.activeModel.value}
                  </span>
                  {!data.activeModel.isKnown && (
                    <Badge variant="warning">{t.unknownModel}</Badge>
                  )}
                  {data.activeModel.value === data.defaultModel && (
                    <Badge variant="default">{t.defaultBadge}</Badge>
                  )}
                  <Badge variant={sourceVariant(data.activeModel.source)}>
                    {t.activeSource}: {data.activeModel.source}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    {t.selectLabel}
                  </label>
                  <Select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                  >
                    <option value={AUTO_OPTION}>{t.autoOption}</option>
                    {data.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.detailTitle}
                </h3>
                {selectedInfo ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(selectedInfo.status)}>
                        {selectedInfo.status}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedInfo.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedInfo.bestFor}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">{t.unknownModel}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t.globalOverlayTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.globalOverlayDescription}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    openAssist({ type: 'global', label: t.globalOverlayTitle })
                  }
                >
                  {t.aiHelp}
                </Button>
              </div>
              <textarea
                value={globalOverlay}
                onChange={(event) => setGlobalOverlay(event.target.value)}
                placeholder={t.overlayPlaceholder}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.promptsTitle}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.promptsDescription}
              </p>
            </div>
            <div className="space-y-3">
              {data.prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {prompt.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {prompt.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{prompt.id}</Badge>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openAssist({ type: 'prompt', prompt })}
                      >
                        {t.aiHelp}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-slate-400">
                      {t.overlayLabel}
                    </label>
                    <textarea
                      value={promptOverlays[prompt.id] ?? ''}
                      onChange={(event) =>
                        setPromptOverlays((prev) => ({
                          ...prev,
                          [prompt.id]: event.target.value,
                        }))
                      }
                      placeholder={t.overlayPlaceholder}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                  </div>
                  <details className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t.promptPreviewLabel}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {t.basePromptLabel}
                        </p>
                        <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">
                          {prompt.prompt}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {t.effectivePromptLabel}
                        </p>
                        <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">
                          {applyOverlayPreview(
                            prompt.prompt,
                            globalOverlay,
                            promptOverlays[prompt.id] ?? ''
                          )}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Modal
        open={Boolean(assistTarget)}
        onClose={closeAssist}
        title={
          assistTarget?.type === 'global'
            ? `${t.aiHelpTitle} · ${t.globalOverlayTitle}`
            : assistTarget?.type === 'prompt'
              ? `${t.aiHelpTitle} · ${assistTarget.prompt.label}`
              : t.aiHelpTitle
        }
        description={t.aiHelpDescription}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={closeAssist}>
              {t.aiHelpClose}
            </Button>
            <Button
              type="button"
              onClick={applySuggestion}
              disabled={!assistSuggestion || assistLoading}
            >
              {t.aiHelpApply}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">
            {t.aiHelpGoalLabel}
          </label>
          <textarea
            value={assistGoal}
            onChange={(event) => setAssistGoal(event.target.value)}
            placeholder={t.aiHelpGoalPlaceholder}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={requestAssist}
            disabled={assistLoading}
          >
            {assistLoading ? t.aiHelpGenerating : t.aiHelpGenerate}
          </Button>
        </div>

        {assistError && (
          <p className="text-sm text-error-600">{assistError}</p>
        )}

        {assistSuggestion && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {t.aiHelpSuggestionLabel}
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-3">
              <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">
                {assistSuggestion}
              </pre>
            </div>
            {assistNotes && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.aiHelpNotesLabel}: {assistNotes}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
