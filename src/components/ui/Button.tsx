'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'primary' &&
            'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-md hover:-translate-y-0.5 active:translate-y-0',
          variant === 'secondary' &&
            'bg-white/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-white focus:ring-slate-400',
          variant === 'success' &&
            'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500 shadow-md hover:-translate-y-0.5 active:translate-y-0',
          variant === 'danger' &&
            'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 shadow-md hover:-translate-y-0.5 active:translate-y-0',
          variant === 'ghost' &&
            'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-none',
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-base',
          size === 'lg' && 'px-6 py-3 text-lg',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
