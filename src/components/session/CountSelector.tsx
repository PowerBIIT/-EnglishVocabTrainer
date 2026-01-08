'use client';

import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';

type CountValue = number | 'all';

interface CountSelectorProps {
  value: CountValue;
  onChange: (value: CountValue) => void;
  allLabel: string;
  customLabel: string;
  customPlaceholder: string;
  options?: number[];
  minCustom?: number;
  className?: string;
  inputId?: string;
}

const DEFAULT_OPTIONS = [5, 10, 15, 20];

export function CountSelector({
  value,
  onChange,
  allLabel,
  customLabel,
  customPlaceholder,
  options = DEFAULT_OPTIONS,
  minCustom = 1,
  className,
  inputId,
}: CountSelectorProps) {
  const generatedId = useId();
  const resolvedId = inputId ?? `count-${generatedId}`;
  const [customValue, setCustomValue] = useState('');
  const isCustom = typeof value === 'number' && !options.includes(value);

  useEffect(() => {
    setCustomValue(isCustom ? String(value) : '');
  }, [isCustom, value]);

  const applyCustomValue = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return;
    const next = Math.max(parsed, minCustom);
    onChange(next);
    setCustomValue(String(next));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {options.map((count) => (
          <button
            key={count}
            onClick={() => onChange(count)}
            className={cn(
              'py-2 px-3 rounded-xl font-medium transition-all',
              value === count
                ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            )}
          >
            {count}
          </button>
        ))}
        <button
          onClick={() => onChange('all')}
          className={cn(
            'py-2 px-3 rounded-xl font-medium transition-all',
            value === 'all'
              ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/25'
              : 'bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
          )}
        >
          {allLabel}
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor={resolvedId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {customLabel}
        </label>
        <input
          id={resolvedId}
          type="number"
          inputMode="numeric"
          min={minCustom}
          placeholder={customPlaceholder}
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onBlur={() => applyCustomValue(customValue)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyCustomValue(customValue);
            }
          }}
          className={cn(
            'w-full sm:w-32 px-3 py-2 rounded-xl border bg-white/70 dark:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
            isCustom
              ? 'border-primary-300 dark:border-primary-500/60'
              : 'border-slate-200 dark:border-slate-600'
          )}
        />
      </div>
    </div>
  );
}
