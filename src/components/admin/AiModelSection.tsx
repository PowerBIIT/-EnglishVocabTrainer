'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
};

type AdminAiPayload = {
  activeModel: { value: string; source: 'db' | 'env' | 'default'; isKnown: boolean };
  defaultModel: string;
  models: AiModelInfo[];
  prompts: PromptPreview[];
};

const AUTO_OPTION = '__auto__';

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

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const model = selectedModel === AUTO_OPTION ? '' : selectedModel;
      const response = await fetch('/api/admin/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
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
          disabled={saving || loading || !data}
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
                <details
                  key={prompt.id}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {prompt.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {prompt.description}
                      </p>
                    </div>
                    <Badge variant="info">{prompt.id}</Badge>
                  </summary>
                  <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
                    <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">
                      {prompt.prompt}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
