'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  className?: string;
};

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  actions,
  className,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-white/60 dark:border-slate-700 shadow-xl p-6',
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        {(title || description) && (
          <div className="mb-4 space-y-1">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="space-y-4">{children}</div>
        {actions && <div className="mt-6 flex justify-end gap-3">{actions}</div>}
      </div>
    </div>
  );
}
