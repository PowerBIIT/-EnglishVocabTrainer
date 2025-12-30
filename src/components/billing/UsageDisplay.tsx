'use client';

import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLanguage } from '@/lib/i18n';

const usageCopy = {
  pl: {
    title: 'Wykorzystanie AI',
    requests: 'Zapytan',
    remaining: 'Pozostalo',
    resetDate: 'Reset',
  },
  en: {
    title: 'AI Usage',
    requests: 'Requests',
    remaining: 'Remaining',
    resetDate: 'Resets',
  },
  uk: {
    title: 'Використання AI',
    requests: 'Запитів',
    remaining: 'Залишилось',
    resetDate: 'Скидання',
  },
};

interface UsageDisplayProps {
  used: number;
  limit: number;
  resetDate: string;
}

export function UsageDisplay({ used, limit, resetDate }: UsageDisplayProps) {
  const language = useLanguage();
  const t = usageCopy[language] ?? usageCopy.pl;
  const percentage = Math.min(100, (used / limit) * 100);
  const remaining = Math.max(0, limit - used);

  const getVariant = () => {
    if (percentage > 95) return 'danger';
    if (percentage > 80) return 'warning';
    return 'default';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(
      language === 'pl' ? 'pl-PL' : language === 'uk' ? 'uk-UA' : 'en-US',
      { day: 'numeric', month: 'short' }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-primary-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">
            {t.title}
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            {t.requests}: {used} / {limit}
          </span>
          <span className="text-slate-500">
            {t.remaining}: {remaining}
          </span>
        </div>
        <ProgressBar value={percentage} variant={getVariant()} />
        <p className="text-xs text-slate-400">
          {t.resetDate}: {formatDate(resetDate)}
        </p>
      </CardContent>
    </Card>
  );
}
