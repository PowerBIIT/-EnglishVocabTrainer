'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient' | 'hero';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl',
          variant === 'default' &&
            'bg-white/85 dark:bg-slate-800/80 shadow-sm border border-white/60 dark:border-slate-700',
          variant === 'elevated' &&
            'bg-white/90 dark:bg-slate-800/90 shadow-lg hover:shadow-xl transition-shadow border border-white/60 dark:border-slate-700',
          variant === 'outlined' &&
            'bg-transparent border-2 border-slate-200 dark:border-slate-700',
          variant === 'glass' &&
            'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg',
          variant === 'gradient' &&
            'bg-gradient-to-br from-primary-500/10 via-blue-500/10 to-pink-500/10 border border-primary-200/50 dark:border-primary-700/50 shadow-md',
          variant === 'hero' &&
            'bg-gradient-to-br from-primary-600 via-blue-500 to-pink-500 text-white shadow-xl shadow-primary-500/25',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4 border-b border-slate-100 dark:border-slate-700', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4 border-t border-slate-100 dark:border-slate-700', className)}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';
