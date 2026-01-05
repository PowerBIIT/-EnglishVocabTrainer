'use client';

import { useFullscreenPage } from '@/hooks/useFullscreenPage';
import { cn } from '@/lib/utils';

type FullscreenPageProps = {
  children: React.ReactNode;
  className?: string;
};

export function FullscreenPage({ children, className }: FullscreenPageProps) {
  useFullscreenPage();

  return (
    <div className={cn('fullscreen-shell flex flex-col min-h-0 overflow-hidden', className)}>
      {children}
    </div>
  );
}
