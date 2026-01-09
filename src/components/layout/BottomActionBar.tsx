'use client';

import { cn } from '@/lib/utils';

type BottomActionBarProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidthClassName?: string;
};

export function BottomActionBar({
  children,
  className,
  contentClassName,
  maxWidthClassName = 'max-w-2xl',
}: BottomActionBarProps) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 md:left-24 bottom-[calc(var(--fullscreen-offset)+0.75rem)] z-40 px-4',
        className
      )}
    >
      <div className={cn('mx-auto w-full', maxWidthClassName)}>
        <div
          className={cn(
            'rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-lg p-3',
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

