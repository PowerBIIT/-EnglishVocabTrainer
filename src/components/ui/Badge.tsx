'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'error';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        variant === 'default' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
        variant === 'success' && 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
        variant === 'warning' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        variant === 'info' && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        variant === 'error' && 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
        className
      )}
      {...props}
    />
  );
}
