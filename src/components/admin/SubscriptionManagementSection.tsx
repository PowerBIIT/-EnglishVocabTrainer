'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { AdminSubscription, SubscriptionEvent } from '@/hooks/useAdminData';
import type { AdminCoupon, AdminPrice } from '@/types/pricing';
import { useLanguage } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

type SubscriptionManagementSectionProps = {
  subscriptions: AdminSubscription[];
  loading: boolean;
  error?: string | null;
  page: number;
  limit: number;
  total: number;
  filters: { status: string; search: string };
  onFiltersChange: (nextFilters: { status: string; search: string }) => void;
  onPageChange: (page: number) => void;
  onSync: (subscriptionId: string) => Promise<void>;
  onCancel: (subscriptionId: string) => Promise<void>;
  onCancelImmediately: (subscriptionId: string) => Promise<void>;
  onExtendTrial: (subscriptionId: string, days: number) => Promise<void>;
  onReactivate: (subscriptionId: string) => Promise<void>;
  onPause: (subscriptionId: string) => Promise<void>;
  onResume: (subscriptionId: string) => Promise<void>;
  onApplyCoupon: (subscriptionId: string, couponId: string) => Promise<void>;
  onChangePlan: (subscriptionId: string, priceId: string) => Promise<void>;
  onRefund: (
    subscriptionId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ) => Promise<{ id: string; amount: number; currency: string; status: string }>;
  onGetHistory: (subscriptionId: string) => Promise<SubscriptionEvent[]>;
  onExport: (status?: string) => Promise<void>;
  coupons: AdminCoupon[];
  prices: AdminPrice[];
};

const subscriptionCopy = {
  pl: {
    title: 'Zarządzanie subskrypcjami',
    description: 'Przeglądaj i zarządzaj subskrypcjami Stripe.',
    searchPlaceholder: 'Szukaj po emailu lub nazwie...',
    export: 'Eksport CSV',
    filters: {
      statusAll: 'Wszystkie statusy',
    },
    columns: {
      user: 'Użytkownik',
      status: 'Status',
      plan: 'Plan',
      period: 'Okres',
      actions: 'Akcje',
    },
    loading: 'Ładowanie subskrypcji...',
    empty: 'Brak subskrypcji.',
    unknown: 'Nieznany',
    actions: {
      sync: 'Synchronizuj',
      cancel: 'Anuluj (koniec okresu)',
      cancelNow: 'Anuluj natychmiast',
      reactivate: 'Reaktywuj',
      extendTrial: 'Przedłuż trial',
      pause: 'Wstrzymaj',
      resume: 'Wznów',
      applyCoupon: 'Zastosuj kupon',
      changePlan: 'Zmień plan',
      refund: 'Zwrot',
      details: 'Szczegóły',
      history: 'Historia',
    },
    close: 'Zamknij',
    confirm: 'Potwierdź',
    prev: 'Poprzednia',
    next: 'Następna',
    pageLabel: (page: number, totalPages: number, total: number) =>
      `Strona ${page} z ${totalPages} · ${total} subskrypcji`,
    detailsTitle: 'Szczegóły subskrypcji',
    historyTitle: 'Historia subskrypcji',
    cancelTitle: 'Anuluj subskrypcję',
    cancelNowTitle: 'Anuluj natychmiast',
    cancelConfirm:
      'Subskrypcja zostanie anulowana na koniec bieżącego okresu rozliczeniowego.',
    cancelNowConfirm:
      'Subskrypcja zostanie anulowana NATYCHMIAST. Użytkownik straci dostęp od razu.',
    extendTrialTitle: 'Przedłuż trial',
    extendTrialLabel: 'Liczba dni',
    pauseTitle: 'Wstrzymaj subskrypcję',
    pauseConfirm: 'Subskrypcja zostanie wstrzymana. Płatności nie będą pobierane.',
    resumeTitle: 'Wznów subskrypcję',
    resumeConfirm: 'Subskrypcja zostanie wznowiona. Płatności będą pobierane normalnie.',
    applyCouponTitle: 'Zastosuj kupon',
    selectCoupon: 'Wybierz kupon',
    noCoupons: 'Brak dostępnych kuponów',
    changePlanTitle: 'Zmień plan',
    selectPrice: 'Wybierz cenę',
    noPrices: 'Brak dostępnych cen',
    refundTitle: 'Zwrot pieniędzy',
    refundAmount: 'Kwota (grosze)',
    refundAmountHint: 'Zostaw puste dla pełnego zwrotu',
    refundReason: 'Powód',
    refundReasons: {
      requested_by_customer: 'Na prośbę klienta',
      duplicate: 'Duplikat',
      fraudulent: 'Oszustwo',
    },
    processing: 'Przetwarzanie...',
    toastSynced: 'Subskrypcja zsynchronizowana.',
    toastCanceled: 'Subskrypcja anulowana.',
    toastReactivated: 'Subskrypcja reaktywowana.',
    toastExtended: 'Trial przedłużony.',
    toastPaused: 'Subskrypcja wstrzymana.',
    toastResumed: 'Subskrypcja wznowiona.',
    toastCouponApplied: 'Kupon zastosowany.',
    toastPlanChanged: 'Plan zmieniony.',
    toastRefunded: 'Zwrot wykonany.',
    toastFailed: 'Operacja nie powiodła się.',
    cancelPending: 'Anulowanie zaplanowane',
    paused: 'Wstrzymana',
    trial: 'Trial',
    trialEnds: 'Trial kończy się',
    periodEnds: 'Okres kończy się',
    stripeId: 'Stripe ID',
    createdAt: 'Utworzono',
    noHistory: 'Brak historii.',
    statusLabels: {
      INCOMPLETE: 'Niekompletna',
      INCOMPLETE_EXPIRED: 'Wygasła',
      TRIALING: 'Trial',
      ACTIVE: 'Aktywna',
      PAST_DUE: 'Zaległa',
      CANCELED: 'Anulowana',
      UNPAID: 'Nieopłacona',
      PAUSED: 'Wstrzymana',
    },
    planLabels: {
      FREE: 'Darmowy',
      PRO: 'Pro',
    },
  },
  en: {
    title: 'Subscription management',
    description: 'View and manage Stripe subscriptions.',
    searchPlaceholder: 'Search by email or name...',
    export: 'Export CSV',
    filters: {
      statusAll: 'All statuses',
    },
    columns: {
      user: 'User',
      status: 'Status',
      plan: 'Plan',
      period: 'Period',
      actions: 'Actions',
    },
    loading: 'Loading subscriptions...',
    empty: 'No subscriptions found.',
    unknown: 'Unknown',
    actions: {
      sync: 'Sync',
      cancel: 'Cancel (end of period)',
      cancelNow: 'Cancel immediately',
      reactivate: 'Reactivate',
      extendTrial: 'Extend trial',
      pause: 'Pause',
      resume: 'Resume',
      applyCoupon: 'Apply coupon',
      changePlan: 'Change plan',
      refund: 'Refund',
      details: 'Details',
      history: 'History',
    },
    close: 'Close',
    confirm: 'Confirm',
    prev: 'Previous',
    next: 'Next',
    pageLabel: (page: number, totalPages: number, total: number) =>
      `Page ${page} of ${totalPages} · ${total} subscriptions`,
    detailsTitle: 'Subscription details',
    historyTitle: 'Subscription history',
    cancelTitle: 'Cancel subscription',
    cancelNowTitle: 'Cancel immediately',
    cancelConfirm:
      'The subscription will be canceled at the end of the current billing period.',
    cancelNowConfirm:
      'The subscription will be canceled IMMEDIATELY. User will lose access right away.',
    extendTrialTitle: 'Extend trial',
    extendTrialLabel: 'Number of days',
    pauseTitle: 'Pause subscription',
    pauseConfirm: 'The subscription will be paused. Payments will not be collected.',
    resumeTitle: 'Resume subscription',
    resumeConfirm: 'The subscription will be resumed. Payments will be collected normally.',
    applyCouponTitle: 'Apply coupon',
    selectCoupon: 'Select coupon',
    noCoupons: 'No coupons available',
    changePlanTitle: 'Change plan',
    selectPrice: 'Select price',
    noPrices: 'No prices available',
    refundTitle: 'Refund',
    refundAmount: 'Amount (cents)',
    refundAmountHint: 'Leave empty for full refund',
    refundReason: 'Reason',
    refundReasons: {
      requested_by_customer: 'Requested by customer',
      duplicate: 'Duplicate',
      fraudulent: 'Fraudulent',
    },
    processing: 'Processing...',
    toastSynced: 'Subscription synced.',
    toastCanceled: 'Subscription canceled.',
    toastReactivated: 'Subscription reactivated.',
    toastExtended: 'Trial extended.',
    toastPaused: 'Subscription paused.',
    toastResumed: 'Subscription resumed.',
    toastCouponApplied: 'Coupon applied.',
    toastPlanChanged: 'Plan changed.',
    toastRefunded: 'Refund processed.',
    toastFailed: 'Operation failed.',
    cancelPending: 'Cancellation pending',
    paused: 'Paused',
    trial: 'Trial',
    trialEnds: 'Trial ends',
    periodEnds: 'Period ends',
    stripeId: 'Stripe ID',
    createdAt: 'Created',
    noHistory: 'No history.',
    statusLabels: {
      INCOMPLETE: 'Incomplete',
      INCOMPLETE_EXPIRED: 'Expired',
      TRIALING: 'Trialing',
      ACTIVE: 'Active',
      PAST_DUE: 'Past due',
      CANCELED: 'Canceled',
      UNPAID: 'Unpaid',
      PAUSED: 'Paused',
    },
    planLabels: {
      FREE: 'Free',
      PRO: 'Pro',
    },
  },
} as const;

type StatusKey = keyof (typeof subscriptionCopy)['en']['statusLabels'];

const statusBadgeVariant: Record<StatusKey, BadgeVariant> = {
  INCOMPLETE: 'warning',
  INCOMPLETE_EXPIRED: 'error',
  TRIALING: 'info',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'error',
  UNPAID: 'error',
  PAUSED: 'warning',
};

type ModalType =
  | 'details'
  | 'history'
  | 'cancel'
  | 'cancelNow'
  | 'extendTrial'
  | 'pause'
  | 'resume'
  | 'applyCoupon'
  | 'changePlan'
  | 'refund';

export function SubscriptionManagementSection({
  subscriptions,
  loading,
  error,
  page,
  limit,
  total,
  filters,
  onFiltersChange,
  onPageChange,
  onSync,
  onCancel,
  onCancelImmediately,
  onExtendTrial,
  onReactivate,
  onPause,
  onResume,
  onApplyCoupon,
  onChangePlan,
  onRefund,
  onGetHistory,
  onExport,
  coupons,
  prices,
}: SubscriptionManagementSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? subscriptionCopy.pl : subscriptionCopy.en;
  const dateLocale = language === 'pl' ? 'pl-PL' : 'en-US';

  const [selectedSub, setSelectedSub] = useState<AdminSubscription | null>(null);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [extendDays, setExtendDays] = useState(7);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [selectedPriceId, setSelectedPriceId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState<'duplicate' | 'fraudulent' | 'requested_by_customer'>('requested_by_customer');
  const [history, setHistory] = useState<SubscriptionEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Search debounce
  const [searchInput, setSearchInput] = useState(filters.search);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const statusOptions = [
    { value: 'all', label: t.filters.statusAll },
    { value: 'ACTIVE', label: t.statusLabels.ACTIVE },
    { value: 'TRIALING', label: t.statusLabels.TRIALING },
    { value: 'PAST_DUE', label: t.statusLabels.PAST_DUE },
    { value: 'CANCELED', label: t.statusLabels.CANCELED },
    { value: 'UNPAID', label: t.statusLabels.UNPAID },
    { value: 'PAUSED', label: t.statusLabels.PAUSED },
    { value: 'INCOMPLETE', label: t.statusLabels.INCOMPLETE },
  ];

  const activeCoupons = useMemo(
    () => coupons.filter((c) => c.valid),
    [coupons]
  );

  const activePrices = useMemo(
    () => prices.filter((p) => p.active),
    [prices]
  );

  const openModal = useCallback((sub: AdminSubscription, type: ModalType) => {
    setSelectedSub(sub);
    setModalType(type);
    if (type === 'extendTrial') setExtendDays(7);
    if (type === 'applyCoupon') setSelectedCouponId(activeCoupons[0]?.id ?? '');
    if (type === 'changePlan') setSelectedPriceId(activePrices[0]?.id ?? '');
    if (type === 'refund') {
      setRefundAmount('');
      setRefundReason('requested_by_customer');
    }
    if (type === 'history') {
      setHistoryLoading(true);
      setHistory([]);
      onGetHistory(sub.id)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeCoupons, activePrices, onGetHistory]);

  const closeModal = useCallback(() => {
    setSelectedSub(null);
    setModalType(null);
  }, []);

  const handleAction = async (
    action: () => Promise<void>,
    successMessage: string
  ) => {
    setProcessing(true);
    setToast(null);
    try {
      await action();
      setToast({ type: 'success', message: successMessage });
      closeModal();
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : t.toastFailed,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSync = (sub: AdminSubscription) =>
    handleAction(() => onSync(sub.id), t.toastSynced);

  const handleSearchSubmit = () => {
    onFiltersChange({ ...filters, search: searchInput });
    onPageChange(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const getStatusLabel = (status: string) =>
    t.statusLabels[status as StatusKey] ?? status;

  const getStatusVariant = (status: string) =>
    statusBadgeVariant[status as StatusKey] ?? 'info';

  const formatPeriod = (sub: AdminSubscription) => {
    if (!sub.currentPeriodEnd) return '—';
    return formatDate(new Date(sub.currentPeriodEnd), dateLocale);
  };

  const formatTimestamp = (ts: number) =>
    formatDate(new Date(ts * 1000), dateLocale);

  // Determine which actions are available for a subscription
  const getAvailableActions = (sub: AdminSubscription) => {
    const actions: { key: string; label: string; onClick: () => void; danger?: boolean }[] = [];

    actions.push({ key: 'sync', label: t.actions.sync, onClick: () => handleSync(sub) });
    actions.push({ key: 'details', label: t.actions.details, onClick: () => openModal(sub, 'details') });
    actions.push({ key: 'history', label: t.actions.history, onClick: () => openModal(sub, 'history') });

    if (sub.status === 'TRIALING') {
      actions.push({ key: 'extendTrial', label: t.actions.extendTrial, onClick: () => openModal(sub, 'extendTrial') });
    }

    if (sub.cancelAtPeriodEnd) {
      actions.push({ key: 'reactivate', label: t.actions.reactivate, onClick: () => openModal(sub, 'resume') });
    }

    if (sub.status === 'PAUSED') {
      actions.push({ key: 'resume', label: t.actions.resume, onClick: () => openModal(sub, 'resume') });
    } else if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
      actions.push({ key: 'pause', label: t.actions.pause, onClick: () => openModal(sub, 'pause') });
    }

    if (activeCoupons.length > 0 && (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) {
      actions.push({ key: 'applyCoupon', label: t.actions.applyCoupon, onClick: () => openModal(sub, 'applyCoupon') });
    }

    if (activePrices.length > 1 && (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) {
      actions.push({ key: 'changePlan', label: t.actions.changePlan, onClick: () => openModal(sub, 'changePlan') });
    }

    if (sub.status !== 'CANCELED') {
      actions.push({ key: 'refund', label: t.actions.refund, onClick: () => openModal(sub, 'refund') });
    }

    if (sub.status !== 'CANCELED' && !sub.cancelAtPeriodEnd) {
      actions.push({ key: 'cancel', label: t.actions.cancel, onClick: () => openModal(sub, 'cancel'), danger: true });
      actions.push({ key: 'cancelNow', label: t.actions.cancelNow, onClick: () => openModal(sub, 'cancelNow'), danger: true });
    }

    return actions;
  };

  const renderActionMenu = (sub: AdminSubscription) => {
    const actions = getAvailableActions(sub);
    return (
      <div className="relative group">
        <Button variant="secondary" size="sm">
          ⋮
        </Button>
        <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block min-w-[180px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={action.onClick}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                action.danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onExport(filters.status)}>
          {t.export}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-[400px]">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1"
            />
            <Button variant="secondary" size="sm" onClick={handleSearchSubmit}>
              🔍
            </Button>
          </div>
        </div>
        <Select
          value={filters.status}
          onChange={(event) => {
            onFiltersChange({ ...filters, status: event.target.value });
            onPageChange(0);
          }}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {toast && (
        <Toast variant={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      {error && <Toast variant="error" message={error} />}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 text-sm text-slate-500 dark:text-slate-400">
            {t.loading}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 text-sm text-slate-500 dark:text-slate-400">
            {t.empty}
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.columns.user}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                    {sub.user.email ?? t.unknown}
                  </p>
                </div>
                {renderActionMenu(sub)}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.columns.status}
                  </p>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={getStatusVariant(sub.status)}>
                      {getStatusLabel(sub.status)}
                    </Badge>
                    {sub.cancelAtPeriodEnd && (
                      <Badge variant="warning">{t.cancelPending}</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.columns.plan}
                  </p>
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    {t.planLabels[sub.user.plan?.plan ?? 'FREE']}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.periodEnds}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">{formatPeriod(sub)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t.columns.user}</th>
              <th className="px-4 py-3">{t.columns.status}</th>
              <th className="px-4 py-3">{t.columns.plan}</th>
              <th className="px-4 py-3">{t.columns.period}</th>
              <th className="px-4 py-3 text-right">{t.columns.actions}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-200">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  {t.loading}
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  {t.empty}
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{sub.user.email ?? t.unknown}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(sub.status)}>
                        {getStatusLabel(sub.status)}
                      </Badge>
                      {sub.cancelAtPeriodEnd && (
                        <Badge variant="warning">{t.cancelPending}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.planLabels[sub.user.plan?.plan ?? 'FREE']}
                  </td>
                  <td className="px-4 py-3">{formatPeriod(sub)}</td>
                  <td className="px-4 py-3 text-right">
                    {renderActionMenu(sub)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>{t.pageLabel(page + 1, totalPages, total)}</span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            {t.prev}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page + 1 >= totalPages}
          >
            {t.next}
          </Button>
        </div>
      </div>

      {/* Details Modal */}
      <Modal
        open={modalType === 'details' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.detailsTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <Button variant="ghost" onClick={closeModal}>
            {t.close}
          </Button>
        }
      >
        {selectedSub && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.columns.status}
                </p>
                <Badge variant={getStatusVariant(selectedSub.status)}>
                  {getStatusLabel(selectedSub.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.columns.plan}
                </p>
                <p className="font-medium">
                  {t.planLabels[selectedSub.user.plan?.plan ?? 'FREE']}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.periodEnds}
                </p>
                <p>{formatPeriod(selectedSub)}</p>
              </div>
              {selectedSub.trialEnd && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.trialEnds}
                  </p>
                  <p>{formatDate(new Date(selectedSub.trialEnd), dateLocale)}</p>
                </div>
              )}
            </div>

            {selectedSub.cancelAtPeriodEnd && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-yellow-800 dark:text-yellow-200">
                {t.cancelPending}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t.stripeId}</p>
              <p className="font-mono text-xs break-all">
                {selectedSub.stripeSubscriptionId ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t.createdAt}</p>
              <p>{formatDate(new Date(selectedSub.createdAt), dateLocale)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal
        open={modalType === 'history' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.historyTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <Button variant="ghost" onClick={closeModal}>
            {t.close}
          </Button>
        }
      >
        <div className="space-y-2 text-sm max-h-[400px] overflow-y-auto">
          {historyLoading ? (
            <p className="text-slate-500">{t.loading}</p>
          ) : history.length === 0 ? (
            <p className="text-slate-500">{t.noHistory}</p>
          ) : (
            history.map((event) => (
              <div
                key={event.id}
                className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <span>{event.description}</span>
                <span className="text-xs text-slate-400">{formatTimestamp(event.created)}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={modalType === 'cancel' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.cancelTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedSub &&
                handleAction(() => onCancel(selectedSub.id), t.toastCanceled)
              }
              disabled={processing}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.cancelConfirm}</p>
      </Modal>

      {/* Cancel Now Modal */}
      <Modal
        open={modalType === 'cancelNow' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.cancelNowTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedSub &&
                handleAction(() => onCancelImmediately(selectedSub.id), t.toastCanceled)
              }
              disabled={processing}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{t.cancelNowConfirm}</p>
      </Modal>

      {/* Extend Trial Modal */}
      <Modal
        open={modalType === 'extendTrial' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.extendTrialTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                selectedSub &&
                handleAction(
                  () => onExtendTrial(selectedSub.id, extendDays),
                  t.toastExtended
                )
              }
              disabled={processing}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.extendTrialLabel}
          </label>
          <Input
            type="number"
            min={1}
            max={90}
            value={extendDays}
            onChange={(e) => setExtendDays(Number(e.target.value))}
          />
        </div>
      </Modal>

      {/* Pause Modal */}
      <Modal
        open={modalType === 'pause' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.pauseTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                selectedSub &&
                handleAction(() => onPause(selectedSub.id), t.toastPaused)
              }
              disabled={processing}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.pauseConfirm}</p>
      </Modal>

      {/* Resume Modal (also handles reactivate) */}
      <Modal
        open={modalType === 'resume' && Boolean(selectedSub)}
        onClose={closeModal}
        title={selectedSub?.cancelAtPeriodEnd ? t.actions.reactivate : t.resumeTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                selectedSub &&
                handleAction(
                  () =>
                    selectedSub.cancelAtPeriodEnd
                      ? onReactivate(selectedSub.id)
                      : onResume(selectedSub.id),
                  selectedSub.cancelAtPeriodEnd ? t.toastReactivated : t.toastResumed
                )
              }
              disabled={processing}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.resumeConfirm}</p>
      </Modal>

      {/* Apply Coupon Modal */}
      <Modal
        open={modalType === 'applyCoupon' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.applyCouponTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                selectedSub &&
                selectedCouponId &&
                handleAction(
                  () => onApplyCoupon(selectedSub.id, selectedCouponId),
                  t.toastCouponApplied
                )
              }
              disabled={processing || !selectedCouponId}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        {activeCoupons.length === 0 ? (
          <p className="text-sm text-slate-500">{t.noCoupons}</p>
        ) : (
          <div className="space-y-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t.selectCoupon}
            </label>
            <Select
              value={selectedCouponId}
              onChange={(e) => setSelectedCouponId(e.target.value)}
            >
              {activeCoupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.name ?? coupon.id} ({coupon.percentOff ? `${coupon.percentOff}%` : `${(coupon.amountOff ?? 0) / 100} PLN`})
                </option>
              ))}
            </Select>
          </div>
        )}
      </Modal>

      {/* Change Plan Modal */}
      <Modal
        open={modalType === 'changePlan' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.changePlanTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                selectedSub &&
                selectedPriceId &&
                handleAction(
                  () => onChangePlan(selectedSub.id, selectedPriceId),
                  t.toastPlanChanged
                )
              }
              disabled={processing || !selectedPriceId}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        {activePrices.length === 0 ? (
          <p className="text-sm text-slate-500">{t.noPrices}</p>
        ) : (
          <div className="space-y-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t.selectPrice}
            </label>
            <Select
              value={selectedPriceId}
              onChange={(e) => setSelectedPriceId(e.target.value)}
            >
              {activePrices.map((price) => (
                <option key={price.id} value={price.id}>
                  {price.productName} - {((price.unitAmount ?? 0) / 100).toFixed(2)} {price.currency?.toUpperCase()}/{price.interval}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal
        open={modalType === 'refund' && Boolean(selectedSub)}
        onClose={closeModal}
        title={t.refundTitle}
        description={selectedSub?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={processing}>
              {t.close}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!selectedSub) return;
                setProcessing(true);
                setToast(null);
                try {
                  const amount = refundAmount ? Number(refundAmount) : undefined;
                  await onRefund(selectedSub.id, amount, refundReason);
                  setToast({ type: 'success', message: t.toastRefunded });
                  closeModal();
                } catch (err) {
                  setToast({
                    type: 'error',
                    message: err instanceof Error ? err.message : t.toastFailed,
                  });
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
            >
              {processing ? t.processing : t.confirm}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t.refundAmount}
            </label>
            <Input
              type="number"
              min={0}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={t.refundAmountHint}
            />
            <p className="text-xs text-slate-400">{t.refundAmountHint}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t.refundReason}
            </label>
            <Select
              value={refundReason}
              onChange={(e) =>
                setRefundReason(e.target.value as 'duplicate' | 'fraudulent' | 'requested_by_customer')
              }
            >
              <option value="requested_by_customer">{t.refundReasons.requested_by_customer}</option>
              <option value="duplicate">{t.refundReasons.duplicate}</option>
              <option value="fraudulent">{t.refundReasons.fraudulent}</option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
