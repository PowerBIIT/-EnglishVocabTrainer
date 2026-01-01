'use client';

import { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/i18n';

type PriceData = {
  monthly: { id: string; unitAmount: number; currency: string };
  annual: { id: string; unitAmount: number; currency: string; savings: number };
  trialDays: number;
};

const pricingCopy = {
  pl: {
    title: 'Plan PRO',
    subtitle: 'Odblokuj pelny potencjal nauki',
    monthly: 'Miesiecznie',
    annual: 'Rocznie',
    save: 'Oszczedzasz',
    perMonth: '/mies',
    perYear: '/rok',
    trial: (days: number) => `${days} dni za darmo`,
    trialActive: 'Okres probny',
    features: [
      '600 zapytan AI miesiecznie',
      'Priorytetowa obsluga',
      'Zaawansowane statystyki',
      'Bez reklam',
    ],
    upgrade: 'Rozpocznij okres probny',
    manage: 'Zarzadzaj subskrypcja',
    loading: 'Ladowanie...',
    active: 'Aktywny',
    cancelPending: 'Anulowano (aktywny do konca okresu)',
  },
  en: {
    title: 'PRO Plan',
    subtitle: 'Unlock your full learning potential',
    monthly: 'Monthly',
    annual: 'Annual',
    save: 'Save',
    perMonth: '/mo',
    perYear: '/yr',
    trial: (days: number) => `${days} days free trial`,
    trialActive: 'Trial period',
    features: [
      '600 AI requests per month',
      'Priority support',
      'Advanced statistics',
      'Ad-free experience',
    ],
    upgrade: 'Start free trial',
    manage: 'Manage subscription',
    loading: 'Loading...',
    active: 'Active',
    cancelPending: 'Cancelled (active until period end)',
  },
  uk: {
    title: 'План PRO',
    subtitle: 'Розблокуй повний потенціал навчання',
    monthly: 'Щомісяця',
    annual: 'Щорічно',
    save: 'Економія',
    perMonth: '/міс',
    perYear: '/рік',
    trial: (days: number) => `${days} днів безкоштовно`,
    trialActive: 'Пробний період',
    features: [
      '600 AI запитів на місяць',
      'Пріоритетна підтримка',
      'Розширена статистика',
      'Без реклами',
    ],
    upgrade: 'Почати пробний період',
    manage: 'Керувати підпискою',
    loading: 'Завантаження...',
    active: 'Активний',
    cancelPending: 'Скасовано (активний до кінця періоду)',
  },
};

interface PricingSectionProps {
  currentPlan: 'FREE' | 'PRO';
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
  onUpgrade: (priceType: 'monthly' | 'annual') => Promise<void>;
  onManage: () => Promise<void>;
}

export function PricingSection({
  currentPlan,
  subscriptionStatus,
  cancelAtPeriodEnd,
  onUpgrade,
  onManage,
}: PricingSectionProps) {
  const language = useLanguage();
  const t = pricingCopy[language] ?? pricingCopy.pl;
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>(
    'monthly'
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/stripe/prices')
      .then((res) => res.json())
      .then(setPrices)
      .catch(console.error);
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await onUpgrade(selectedInterval);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (!prices) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="animate-spin mx-auto text-slate-400" size={24} />
          <p className="text-sm text-slate-500 mt-2">{t.loading}</p>
        </CardContent>
      </Card>
    );
  }

  const isPro = currentPlan === 'PRO';
  const isTrialing = subscriptionStatus === 'TRIALING';

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown size={20} className="text-amber-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">
            {t.title}
          </h2>
          {isPro && (
            <Badge variant={cancelAtPeriodEnd ? 'warning' : 'success'}>
              {cancelAtPeriodEnd
                ? t.cancelPending
                : isTrialing
                  ? t.trialActive
                  : t.active}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isPro && (
          <>
            {/* Interval Toggle */}
            <div className="flex justify-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setSelectedInterval('monthly')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedInterval === 'monthly'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.monthly}
              </button>
              <button
                onClick={() => setSelectedInterval('annual')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedInterval === 'annual'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{t.annual}</span>
                <span className="ml-1 text-xs text-success-600 dark:text-success-400">
                  -{prices.annual.savings}%
                </span>
              </button>
            </div>

            {/* Price Display */}
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">
                {formatPrice(
                  selectedInterval === 'monthly'
                    ? prices.monthly.unitAmount
                    : prices.annual.unitAmount,
                  prices.monthly.currency
                )}
              </span>
              <span className="text-slate-500 ml-1">
                {selectedInterval === 'monthly' ? t.perMonth : t.perYear}
              </span>
            </div>

            {/* Trial Badge */}
            <div className="flex justify-center">
              <Badge variant="info">
                <Sparkles size={14} className="mr-1" />
                {t.trial(prices.trialDays)}
              </Badge>
            </div>
          </>
        )}

        {/* Features */}
        <ul className="space-y-3">
          {t.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check
                size={16}
                className="text-success-500 dark:text-success-400 flex-shrink-0"
              />
              <span className="text-slate-600 dark:text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        {isPro ? (
          <Button
            variant="secondary"
            onClick={onManage}
            className="w-full"
          >
            {t.manage}
          </Button>
        ) : (
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                {t.loading}
              </>
            ) : (
              t.upgrade
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
