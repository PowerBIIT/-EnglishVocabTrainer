'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  setValue: (nextValue: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within <Tabs>.');
  }
  return context;
};

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, children }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const activeValue = value ?? internalValue;

  const setValue = useCallback(
    (nextValue: string) => {
      if (!value) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );

  const contextValue = useMemo(
    () => ({ value: activeValue, setValue }),
    [activeValue, setValue]
  );

  return <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>;
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-2xl bg-white/80 dark:bg-slate-900/70 p-1 shadow-sm border border-white/60 dark:border-slate-700',
        className
      )}
    >
      {children}
    </div>
  );
}

type TabsTriggerProps = {
  value: string;
  children: ReactNode;
};

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const { value: activeValue, setValue } = useTabsContext();
  const isActive = activeValue === value;
  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={cn(
        'rounded-xl px-4 py-2 text-sm font-semibold transition',
        isActive
          ? 'bg-primary-600 text-white shadow'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
      )}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
}

type TabsContentProps = {
  value: string;
  children: ReactNode;
};

export function TabsContent({ value, children }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) return null;
  return <div className="mt-6">{children}</div>;
}
