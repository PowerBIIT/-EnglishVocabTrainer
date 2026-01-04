'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

type ToastProps = {
  message: ReactNode;
  variant?: ToastVariant;
  onClose?: () => void;
};

export function Toast({ message, variant = 'info', onClose }: ToastProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm',
        variant === 'success' &&
          'border-success-100 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-900/30 dark:text-success-300',
        variant === 'error' && 'border-error-100 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-900/30 dark:text-error-300',
        variant === 'info' &&
          'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
      )}
    >
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
