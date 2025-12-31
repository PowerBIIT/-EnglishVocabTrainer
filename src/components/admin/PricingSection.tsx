'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type {
  AdminPrice,
  AdminCoupon,
  AdminProduct,
  CreatePriceData,
  CreateCouponData,
  ActivePriceIds,
} from '@/types/pricing';
import { useLanguage } from '@/lib/i18n';

type PricingSectionProps = {
  prices: AdminPrice[];
  pricesLoading: boolean;
  pricesError: string | null;
  activePriceIds: ActivePriceIds;
  onCreatePrice: (data: CreatePriceData) => Promise<void>;
  onArchivePrice: (priceId: string) => Promise<void>;
  onSetActivePrice: (priceId: string, type: 'monthly' | 'annual') => Promise<void>;
  coupons: AdminCoupon[];
  couponsLoading: boolean;
  couponsError: string | null;
  onCreateCoupon: (data: CreateCouponData) => Promise<void>;
  onDeleteCoupon: (couponId: string) => Promise<void>;
  products: AdminProduct[];
  productsLoading: boolean;
};

const pricingCopy = {
  pl: {
    title: 'Zarządzanie cenami',
    description: 'Zarządzaj cenami i kuponami Stripe.',
    tabs: {
      prices: 'Ceny',
      coupons: 'Kupony',
    },
    prices: {
      createButton: 'Utwórz cenę',
      columns: {
        product: 'Produkt',
        amount: 'Kwota',
        interval: 'Okres',
        status: 'Status',
        activeFor: 'Aktywna dla',
        actions: 'Akcje',
      },
      loading: 'Ładowanie cen...',
      empty: 'Brak cen.',
      setMonthly: 'Ustaw jako miesięczną',
      setAnnual: 'Ustaw jako roczną',
      archive: 'Archiwizuj',
      archived: 'Zarchiwizowana',
      active: 'Aktywna',
      monthly: 'Miesięczna',
      annual: 'Roczna',
      month: 'miesiąc',
      year: 'rok',
      toastCreated: 'Cena utworzona.',
      toastArchived: 'Cena zarchiwizowana.',
      toastSetActive: 'Cena ustawiona jako aktywna.',
      toastError: 'Operacja nie powiodła się.',
    },
    coupons: {
      createButton: 'Utwórz kupon',
      columns: {
        name: 'Nazwa',
        discount: 'Zniżka',
        duration: 'Czas trwania',
        redemptions: 'Wykorzystania',
        status: 'Status',
        actions: 'Akcje',
      },
      loading: 'Ładowanie kuponów...',
      empty: 'Brak kuponów.',
      delete: 'Usuń',
      valid: 'Ważny',
      invalid: 'Nieważny',
      once: 'Jednorazowo',
      repeating: 'Powtarzający się',
      forever: 'Na zawsze',
      months: 'mies.',
      unlimited: 'Bez limitu',
      toastCreated: 'Kupon utworzony.',
      toastDeleted: 'Kupon usunięty.',
      toastError: 'Operacja nie powiodła się.',
    },
    createPriceModal: {
      title: 'Utwórz nową cenę',
      product: 'Produkt',
      selectProduct: 'Wybierz produkt',
      amount: 'Kwota (w groszach)',
      amountHint: 'Np. 2999 = 29.99 PLN',
      currency: 'Waluta',
      interval: 'Okres rozliczeniowy',
      nickname: 'Nazwa (opcjonalna)',
      create: 'Utwórz',
      creating: 'Tworzenie...',
      cancel: 'Anuluj',
    },
    createCouponModal: {
      title: 'Utwórz nowy kupon',
      name: 'Nazwa kuponu',
      discountType: 'Typ zniżki',
      percentage: 'Procentowa',
      fixedAmount: 'Kwotowa',
      percentOff: 'Procent zniżki',
      amountOff: 'Kwota zniżki (grosze)',
      currency: 'Waluta',
      duration: 'Czas trwania',
      durationInMonths: 'Liczba miesięcy',
      maxRedemptions: 'Maks. wykorzystań (opcjonalne)',
      create: 'Utwórz',
      creating: 'Tworzenie...',
      cancel: 'Anuluj',
    },
    confirmDelete: {
      title: 'Usuń kupon',
      message: 'Czy na pewno chcesz usunąć ten kupon?',
      confirm: 'Usuń',
      deleting: 'Usuwanie...',
      cancel: 'Anuluj',
    },
    processing: 'Przetwarzanie...',
  },
  en: {
    title: 'Pricing management',
    description: 'Manage Stripe prices and coupons.',
    tabs: {
      prices: 'Prices',
      coupons: 'Coupons',
    },
    prices: {
      createButton: 'Create price',
      columns: {
        product: 'Product',
        amount: 'Amount',
        interval: 'Interval',
        status: 'Status',
        activeFor: 'Active for',
        actions: 'Actions',
      },
      loading: 'Loading prices...',
      empty: 'No prices found.',
      setMonthly: 'Set as monthly',
      setAnnual: 'Set as annual',
      archive: 'Archive',
      archived: 'Archived',
      active: 'Active',
      monthly: 'Monthly',
      annual: 'Annual',
      month: 'month',
      year: 'year',
      toastCreated: 'Price created.',
      toastArchived: 'Price archived.',
      toastSetActive: 'Price set as active.',
      toastError: 'Operation failed.',
    },
    coupons: {
      createButton: 'Create coupon',
      columns: {
        name: 'Name',
        discount: 'Discount',
        duration: 'Duration',
        redemptions: 'Redemptions',
        status: 'Status',
        actions: 'Actions',
      },
      loading: 'Loading coupons...',
      empty: 'No coupons found.',
      delete: 'Delete',
      valid: 'Valid',
      invalid: 'Invalid',
      once: 'Once',
      repeating: 'Repeating',
      forever: 'Forever',
      months: 'months',
      unlimited: 'Unlimited',
      toastCreated: 'Coupon created.',
      toastDeleted: 'Coupon deleted.',
      toastError: 'Operation failed.',
    },
    createPriceModal: {
      title: 'Create new price',
      product: 'Product',
      selectProduct: 'Select product',
      amount: 'Amount (in cents)',
      amountHint: 'E.g. 2999 = 29.99 USD',
      currency: 'Currency',
      interval: 'Billing interval',
      nickname: 'Nickname (optional)',
      create: 'Create',
      creating: 'Creating...',
      cancel: 'Cancel',
    },
    createCouponModal: {
      title: 'Create new coupon',
      name: 'Coupon name',
      discountType: 'Discount type',
      percentage: 'Percentage',
      fixedAmount: 'Fixed amount',
      percentOff: 'Percent off',
      amountOff: 'Amount off (cents)',
      currency: 'Currency',
      duration: 'Duration',
      durationInMonths: 'Duration in months',
      maxRedemptions: 'Max redemptions (optional)',
      create: 'Create',
      creating: 'Creating...',
      cancel: 'Cancel',
    },
    confirmDelete: {
      title: 'Delete coupon',
      message: 'Are you sure you want to delete this coupon?',
      confirm: 'Delete',
      deleting: 'Deleting...',
      cancel: 'Cancel',
    },
    processing: 'Processing...',
  },
} as const;

const formatAmount = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });
  return formatter.format(amount / 100);
};

export function PricingSection({
  prices,
  pricesLoading,
  pricesError,
  activePriceIds,
  onCreatePrice,
  onArchivePrice,
  onSetActivePrice,
  coupons,
  couponsLoading,
  couponsError,
  onCreateCoupon,
  onDeleteCoupon,
  products,
  productsLoading,
}: PricingSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? pricingCopy.pl : pricingCopy.en;

  const [activeTab, setActiveTab] = useState<'prices' | 'coupons'>('prices');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Create Price Modal State
  const [showCreatePrice, setShowCreatePrice] = useState(false);
  const [priceForm, setPriceForm] = useState({
    productId: '',
    unitAmount: '',
    currency: 'pln',
    interval: 'month' as 'month' | 'year',
    nickname: '',
  });
  const [creatingPrice, setCreatingPrice] = useState(false);

  // Create Coupon Modal State
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    name: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    percentOff: '',
    amountOff: '',
    currency: 'pln',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: '',
    maxRedemptions: '',
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Delete Coupon Modal State
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<AdminCoupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState(false);

  const handleCreatePrice = async () => {
    if (!priceForm.productId || !priceForm.unitAmount) return;
    setCreatingPrice(true);
    setToast(null);
    try {
      await onCreatePrice({
        productId: priceForm.productId,
        unitAmount: parseInt(priceForm.unitAmount, 10),
        currency: priceForm.currency,
        interval: priceForm.interval,
        nickname: priceForm.nickname || undefined,
      });
      setToast({ type: 'success', message: t.prices.toastCreated });
      setShowCreatePrice(false);
      setPriceForm({
        productId: '',
        unitAmount: '',
        currency: 'pln',
        interval: 'month',
        nickname: '',
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : t.prices.toastError,
      });
    } finally {
      setCreatingPrice(false);
    }
  };

  const handleArchivePrice = async (priceId: string) => {
    setPendingId(priceId);
    setToast(null);
    try {
      await onArchivePrice(priceId);
      setToast({ type: 'success', message: t.prices.toastArchived });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : t.prices.toastError,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleSetActivePrice = async (priceId: string, type: 'monthly' | 'annual') => {
    setPendingId(priceId);
    setToast(null);
    try {
      await onSetActivePrice(priceId, type);
      setToast({ type: 'success', message: t.prices.toastSetActive });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : t.prices.toastError,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponForm.name) return;
    setCreatingCoupon(true);
    setToast(null);
    try {
      const data: CreateCouponData = {
        name: couponForm.name,
        duration: couponForm.duration,
      };
      if (couponForm.discountType === 'percentage' && couponForm.percentOff) {
        data.percentOff = parseInt(couponForm.percentOff, 10);
      } else if (couponForm.discountType === 'fixed' && couponForm.amountOff) {
        data.amountOff = parseInt(couponForm.amountOff, 10);
        data.currency = couponForm.currency;
      }
      if (couponForm.duration === 'repeating' && couponForm.durationInMonths) {
        data.durationInMonths = parseInt(couponForm.durationInMonths, 10);
      }
      if (couponForm.maxRedemptions) {
        data.maxRedemptions = parseInt(couponForm.maxRedemptions, 10);
      }
      await onCreateCoupon(data);
      setToast({ type: 'success', message: t.coupons.toastCreated });
      setShowCreateCoupon(false);
      setCouponForm({
        name: '',
        discountType: 'percentage',
        percentOff: '',
        amountOff: '',
        currency: 'pln',
        duration: 'once',
        durationInMonths: '',
        maxRedemptions: '',
      });
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : t.coupons.toastError,
      });
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteCouponTarget) return;
    setDeletingCoupon(true);
    setToast(null);
    try {
      await onDeleteCoupon(deleteCouponTarget.id);
      setToast({ type: 'success', message: t.coupons.toastDeleted });
      setDeleteCouponTarget(null);
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : t.coupons.toastError,
      });
    } finally {
      setDeletingCoupon(false);
    }
  };

  const getIntervalLabel = (interval: string | null) => {
    if (interval === 'month') return t.prices.month;
    if (interval === 'year') return t.prices.year;
    return interval ?? '—';
  };

  const getDurationLabel = (coupon: AdminCoupon) => {
    if (coupon.duration === 'once') return t.coupons.once;
    if (coupon.duration === 'forever') return t.coupons.forever;
    if (coupon.duration === 'repeating' && coupon.durationInMonths) {
      return `${coupon.durationInMonths} ${t.coupons.months}`;
    }
    return t.coupons.repeating;
  };

  const getDiscountLabel = (coupon: AdminCoupon) => {
    if (coupon.percentOff) return `${coupon.percentOff}%`;
    if (coupon.amountOff && coupon.currency) {
      return formatAmount(coupon.amountOff, coupon.currency);
    }
    return '—';
  };

  const getActiveBadges = (price: AdminPrice): BadgeVariant[] => {
    const badges: BadgeVariant[] = [];
    if (price.id === activePriceIds.monthly) badges.push('info');
    if (price.id === activePriceIds.annual) badges.push('success');
    return badges;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
        </div>
      </div>

      {toast && (
        <Toast variant={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'prices' | 'coupons')}>
        <TabsList>
          <TabsTrigger value="prices">{t.tabs.prices}</TabsTrigger>
          <TabsTrigger value="coupons">{t.tabs.coupons}</TabsTrigger>
        </TabsList>

        {/* Prices Tab */}
        <TabsContent value="prices">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreatePrice(true)} disabled={productsLoading}>
                {t.prices.createButton}
              </Button>
            </div>

            {pricesError && <Toast variant="error" message={pricesError} />}

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {pricesLoading ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 text-sm text-slate-500">
                  {t.prices.loading}
                </div>
              ) : prices.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 text-sm text-slate-500">
                  {t.prices.empty}
                </div>
              ) : (
                prices.map((price) => (
                  <div
                    key={price.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {price.productName || price.productId}
                        </p>
                        <p className="text-lg font-bold text-primary-600">
                          {formatAmount(price.unitAmount, price.currency)} / {getIntervalLabel(price.interval)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant={price.active ? 'success' : 'default'}>
                          {price.active ? t.prices.active : t.prices.archived}
                        </Badge>
                        {price.id === activePriceIds.monthly && (
                          <Badge variant="info">{t.prices.monthly}</Badge>
                        )}
                        {price.id === activePriceIds.annual && (
                          <Badge variant="success">{t.prices.annual}</Badge>
                        )}
                      </div>
                    </div>
                    {price.active && (
                      <div className="flex flex-wrap gap-2">
                        {price.id !== activePriceIds.monthly && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={pendingId === price.id}
                            onClick={() => handleSetActivePrice(price.id, 'monthly')}
                          >
                            {pendingId === price.id ? t.processing : t.prices.setMonthly}
                          </Button>
                        )}
                        {price.id !== activePriceIds.annual && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={pendingId === price.id}
                            onClick={() => handleSetActivePrice(price.id, 'annual')}
                          >
                            {pendingId === price.id ? t.processing : t.prices.setAnnual}
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={pendingId === price.id}
                          onClick={() => handleArchivePrice(price.id)}
                        >
                          {pendingId === price.id ? t.processing : t.prices.archive}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t.prices.columns.product}</th>
                    <th className="px-4 py-3">{t.prices.columns.amount}</th>
                    <th className="px-4 py-3">{t.prices.columns.interval}</th>
                    <th className="px-4 py-3">{t.prices.columns.status}</th>
                    <th className="px-4 py-3">{t.prices.columns.activeFor}</th>
                    <th className="px-4 py-3 text-right">{t.prices.columns.actions}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-200">
                  {pricesLoading ? (
                    <tr>
                      <td className="px-4 py-6" colSpan={6}>
                        {t.prices.loading}
                      </td>
                    </tr>
                  ) : prices.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6" colSpan={6}>
                        {t.prices.empty}
                      </td>
                    </tr>
                  ) : (
                    prices.map((price) => (
                      <tr key={price.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3">
                          {price.productName || price.productId}
                          {price.nickname && (
                            <span className="ml-2 text-xs text-slate-400">({price.nickname})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatAmount(price.unitAmount, price.currency)}
                        </td>
                        <td className="px-4 py-3">{getIntervalLabel(price.interval)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={price.active ? 'success' : 'default'}>
                            {price.active ? t.prices.active : t.prices.archived}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {price.id === activePriceIds.monthly && (
                              <Badge variant="info">{t.prices.monthly}</Badge>
                            )}
                            {price.id === activePriceIds.annual && (
                              <Badge variant="success">{t.prices.annual}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {price.active && (
                            <div className="flex flex-wrap justify-end gap-2">
                              {price.id !== activePriceIds.monthly && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={pendingId === price.id}
                                  onClick={() => handleSetActivePrice(price.id, 'monthly')}
                                >
                                  {pendingId === price.id ? t.processing : t.prices.setMonthly}
                                </Button>
                              )}
                              {price.id !== activePriceIds.annual && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={pendingId === price.id}
                                  onClick={() => handleSetActivePrice(price.id, 'annual')}
                                >
                                  {pendingId === price.id ? t.processing : t.prices.setAnnual}
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={pendingId === price.id}
                                onClick={() => handleArchivePrice(price.id)}
                              >
                                {pendingId === price.id ? t.processing : t.prices.archive}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateCoupon(true)}>{t.coupons.createButton}</Button>
            </div>

            {couponsError && <Toast variant="error" message={couponsError} />}

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {couponsLoading ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 text-sm text-slate-500">
                  {t.coupons.loading}
                </div>
              ) : coupons.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 text-sm text-slate-500">
                  {t.coupons.empty}
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {coupon.name || coupon.id}
                        </p>
                        <p className="text-lg font-bold text-primary-600">{getDiscountLabel(coupon)}</p>
                      </div>
                      <Badge variant={coupon.valid ? 'success' : 'error'}>
                        {coupon.valid ? t.coupons.valid : t.coupons.invalid}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {t.coupons.columns.duration}
                        </p>
                        <p>{getDurationLabel(coupon)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {t.coupons.columns.redemptions}
                        </p>
                        <p>
                          {coupon.timesRedeemed} /{' '}
                          {coupon.maxRedemptions ?? t.coupons.unlimited}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full"
                      onClick={() => setDeleteCouponTarget(coupon)}
                    >
                      {t.coupons.delete}
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t.coupons.columns.name}</th>
                    <th className="px-4 py-3">{t.coupons.columns.discount}</th>
                    <th className="px-4 py-3">{t.coupons.columns.duration}</th>
                    <th className="px-4 py-3">{t.coupons.columns.redemptions}</th>
                    <th className="px-4 py-3">{t.coupons.columns.status}</th>
                    <th className="px-4 py-3 text-right">{t.coupons.columns.actions}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-200">
                  {couponsLoading ? (
                    <tr>
                      <td className="px-4 py-6" colSpan={6}>
                        {t.coupons.loading}
                      </td>
                    </tr>
                  ) : coupons.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6" colSpan={6}>
                        {t.coupons.empty}
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 font-medium">{coupon.name || coupon.id}</td>
                        <td className="px-4 py-3">{getDiscountLabel(coupon)}</td>
                        <td className="px-4 py-3">{getDurationLabel(coupon)}</td>
                        <td className="px-4 py-3">
                          {coupon.timesRedeemed} / {coupon.maxRedemptions ?? t.coupons.unlimited}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={coupon.valid ? 'success' : 'error'}>
                            {coupon.valid ? t.coupons.valid : t.coupons.invalid}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteCouponTarget(coupon)}
                          >
                            {t.coupons.delete}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Price Modal */}
      <Modal
        open={showCreatePrice}
        onClose={() => setShowCreatePrice(false)}
        title={t.createPriceModal.title}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowCreatePrice(false)} disabled={creatingPrice}>
              {t.createPriceModal.cancel}
            </Button>
            <Button
              onClick={handleCreatePrice}
              disabled={creatingPrice || !priceForm.productId || !priceForm.unitAmount}
            >
              {creatingPrice ? t.createPriceModal.creating : t.createPriceModal.create}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createPriceModal.product}
            </label>
            <Select
              value={priceForm.productId}
              onChange={(e) => setPriceForm((prev) => ({ ...prev, productId: e.target.value }))}
            >
              <option value="">{t.createPriceModal.selectProduct}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createPriceModal.amount}
            </label>
            <Input
              type="number"
              value={priceForm.unitAmount}
              onChange={(e) => setPriceForm((prev) => ({ ...prev, unitAmount: e.target.value }))}
              placeholder="2999"
            />
            <p className="text-xs text-slate-400 mt-1">{t.createPriceModal.amountHint}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.createPriceModal.currency}
              </label>
              <Select
                value={priceForm.currency}
                onChange={(e) => setPriceForm((prev) => ({ ...prev, currency: e.target.value }))}
              >
                <option value="pln">PLN</option>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.createPriceModal.interval}
              </label>
              <Select
                value={priceForm.interval}
                onChange={(e) =>
                  setPriceForm((prev) => ({
                    ...prev,
                    interval: e.target.value as 'month' | 'year',
                  }))
                }
              >
                <option value="month">{t.prices.month}</option>
                <option value="year">{t.prices.year}</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createPriceModal.nickname}
            </label>
            <Input
              value={priceForm.nickname}
              onChange={(e) => setPriceForm((prev) => ({ ...prev, nickname: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>
      </Modal>

      {/* Create Coupon Modal */}
      <Modal
        open={showCreateCoupon}
        onClose={() => setShowCreateCoupon(false)}
        title={t.createCouponModal.title}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowCreateCoupon(false)} disabled={creatingCoupon}>
              {t.createCouponModal.cancel}
            </Button>
            <Button onClick={handleCreateCoupon} disabled={creatingCoupon || !couponForm.name}>
              {creatingCoupon ? t.createCouponModal.creating : t.createCouponModal.create}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createCouponModal.name}
            </label>
            <Input
              value={couponForm.name}
              onChange={(e) => setCouponForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="SUMMER20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createCouponModal.discountType}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={couponForm.discountType === 'percentage'}
                  onChange={() => setCouponForm((prev) => ({ ...prev, discountType: 'percentage' }))}
                />
                {t.createCouponModal.percentage}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={couponForm.discountType === 'fixed'}
                  onChange={() => setCouponForm((prev) => ({ ...prev, discountType: 'fixed' }))}
                />
                {t.createCouponModal.fixedAmount}
              </label>
            </div>
          </div>
          {couponForm.discountType === 'percentage' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.createCouponModal.percentOff}
              </label>
              <Input
                type="number"
                value={couponForm.percentOff}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, percentOff: e.target.value }))}
                placeholder="20"
                max={100}
                min={1}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.createCouponModal.amountOff}
                </label>
                <Input
                  type="number"
                  value={couponForm.amountOff}
                  onChange={(e) => setCouponForm((prev) => ({ ...prev, amountOff: e.target.value }))}
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.createCouponModal.currency}
                </label>
                <Select
                  value={couponForm.currency}
                  onChange={(e) => setCouponForm((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="pln">PLN</option>
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                </Select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createCouponModal.duration}
            </label>
            <Select
              value={couponForm.duration}
              onChange={(e) =>
                setCouponForm((prev) => ({
                  ...prev,
                  duration: e.target.value as 'once' | 'repeating' | 'forever',
                }))
              }
            >
              <option value="once">{t.coupons.once}</option>
              <option value="repeating">{t.coupons.repeating}</option>
              <option value="forever">{t.coupons.forever}</option>
            </Select>
          </div>
          {couponForm.duration === 'repeating' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.createCouponModal.durationInMonths}
              </label>
              <Input
                type="number"
                value={couponForm.durationInMonths}
                onChange={(e) =>
                  setCouponForm((prev) => ({ ...prev, durationInMonths: e.target.value }))
                }
                placeholder="3"
                min={1}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t.createCouponModal.maxRedemptions}
            </label>
            <Input
              type="number"
              value={couponForm.maxRedemptions}
              onChange={(e) =>
                setCouponForm((prev) => ({ ...prev, maxRedemptions: e.target.value }))
              }
              placeholder="100"
              min={1}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Coupon Confirmation Modal */}
      <Modal
        open={Boolean(deleteCouponTarget)}
        onClose={() => setDeleteCouponTarget(null)}
        title={t.confirmDelete.title}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteCouponTarget(null)}
              disabled={deletingCoupon}
            >
              {t.confirmDelete.cancel}
            </Button>
            <Button variant="danger" onClick={handleDeleteCoupon} disabled={deletingCoupon}>
              {deletingCoupon ? t.confirmDelete.deleting : t.confirmDelete.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.confirmDelete.message}</p>
      </Modal>
    </div>
  );
}
