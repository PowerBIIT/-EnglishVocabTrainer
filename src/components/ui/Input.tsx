'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition',
          'focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:text-slate-100',
          hasError
            ? 'border-error-300 focus:border-error-400 dark:border-error-500/60'
            : 'border-slate-200 focus:border-primary-300 dark:border-slate-700',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
