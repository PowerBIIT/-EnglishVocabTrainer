'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import type { AdminConfigItem } from '@/hooks/useAdminData';

type ConfigSectionProps = {
  config: AdminConfigItem[];
  loading: boolean;
  error?: string | null;
  onSave: (updates: { key: string; value: string }[]) => Promise<void>;
};

export function ConfigSection({ config, loading, error, onSave }: ConfigSectionProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    config.forEach((item) => {
      nextDrafts[item.key] = item.value;
    });
    setDrafts(nextDrafts);
  }, [config]);

  const updates = useMemo(
    () =>
      config
        .filter((item) => drafts[item.key] !== item.value)
        .map((item) => ({ key: item.key, value: drafts[item.key] ?? '' })),
    [config, drafts]
  );

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      await onSave(updates);
      setToast({ type: 'success', message: 'Configuration saved.' });
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : 'Failed to save configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  const sourceVariant = (source: AdminConfigItem['source']) => {
    if (source === 'db') return 'info';
    if (source === 'env') return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Configuration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Update application limits and allowlist. Empty value resets to env/default.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || updates.length === 0 || loading}
        >
          {saving ? 'Saving...' : 'Save changes'}
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

      <div className="space-y-4">
        {loading && config.length === 0 ? (
          <div className="text-sm text-slate-500">Loading configuration...</div>
        ) : (
          config.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
                <Badge variant={sourceVariant(item.source)}>{item.source}</Badge>
              </div>
              <div className="mt-3">
                {item.dataType === 'list' ? (
                  <textarea
                    value={drafts[item.key] ?? ''}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [item.key]: event.target.value }))
                    }
                    placeholder={item.defaultValue}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                ) : (
                  <Input
                    value={drafts[item.key] ?? ''}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [item.key]: event.target.value }))
                    }
                    placeholder={item.defaultValue}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
