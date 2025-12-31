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
        variant === 'success' && 'bg-success-100 text-success-600',
        variant === 'warning' && 'bg-amber-100 text-amber-700',
        variant === 'info' && 'bg-primary-100 text-primary-700',
        variant === 'error' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        className
      )}
      {...props}
    />
  );
}
