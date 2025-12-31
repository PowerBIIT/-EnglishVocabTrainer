'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { AdminSubscription } from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

type SubscriptionManagementSectionProps = {
  subscriptions: AdminSubscription[];
  loading: boolean;
  error?: string | null;
  page: number;
  limit: number;
  total: number;
  filters: { status: string };
  onFiltersChange: (nextFilters: { status: string }) => void;
  onPageChange: (page: number) => void;
  onSync: (subscriptionId: string) => Promise<void>;
  onCancel: (subscriptionId: string) => Promise<void>;
};

const subscriptionCopy = {
  pl: {
    title: 'Zarządzanie subskrypcjami',
    description: 'Przeglądaj i zarządzaj subskrypcjami Stripe.',
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
    sync: 'Synchronizuj',
    cancel: 'Anuluj subskrypcję',
    close: 'Zamknij',
    details: 'Szczegóły',
    prev: 'Poprzednia',
    next: 'Następna',
    pageLabel: (page: number, totalPages: number, total: number) =>
      `Strona ${page} z ${totalPages} · ${total} subskrypcji`,
    detailsTitle: 'Szczegóły subskrypcji',
    cancelTitle: 'Anuluj subskrypcję',
    cancelConfirm:
      'Subskrypcja zostanie anulowana na koniec bieżącego okresu rozliczeniowego.',
    canceling: 'Anulowanie...',
    syncing: 'Synchronizacja...',
    toastSynced: 'Subskrypcja zsynchronizowana.',
    toastCanceled: 'Subskrypcja anulowana.',
    toastSyncFailed: 'Nie udało się zsynchronizować.',
    toastCancelFailed: 'Nie udało się anulować.',
    cancelPending: 'Anulowanie zaplanowane',
    trial: 'Trial',
    trialEnds: 'Trial kończy się',
    periodEnds: 'Okres kończy się',
    stripeId: 'Stripe ID',
    createdAt: 'Utworzono',
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
    sync: 'Sync',
    cancel: 'Cancel subscription',
    close: 'Close',
    details: 'Details',
    prev: 'Previous',
    next: 'Next',
    pageLabel: (page: number, totalPages: number, total: number) =>
      `Page ${page} of ${totalPages} · ${total} subscriptions`,
    detailsTitle: 'Subscription details',
    cancelTitle: 'Cancel subscription',
    cancelConfirm:
      'The subscription will be canceled at the end of the current billing period.',
    canceling: 'Canceling...',
    syncing: 'Syncing...',
    toastSynced: 'Subscription synced.',
    toastCanceled: 'Subscription canceled.',
    toastSyncFailed: 'Failed to sync.',
    toastCancelFailed: 'Failed to cancel.',
    cancelPending: 'Cancellation pending',
    trial: 'Trial',
    trialEnds: 'Trial ends',
    periodEnds: 'Period ends',
    stripeId: 'Stripe ID',
    createdAt: 'Created',
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
}: SubscriptionManagementSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? subscriptionCopy.pl : subscriptionCopy.en;
  const dateLocale = language === 'pl' ? 'pl-PL' : 'en-US';
  const [detailsSub, setDetailsSub] = useState<AdminSubscription | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminSubscription | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

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

  const handleSync = async (sub: AdminSubscription) => {
    setPendingSubId(sub.id);
    setToast(null);
    try {
      await onSync(sub.id);
      setToast({ type: 'success', message: t.toastSynced });
    } catch (syncError) {
      setToast({
        type: 'error',
        message: syncError instanceof Error ? syncError.message : t.toastSyncFailed,
      });
    } finally {
      setPendingSubId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCanceling(true);
    setPendingSubId(cancelTarget.id);
    setToast(null);
    try {
      await onCancel(cancelTarget.id);
      setToast({ type: 'success', message: t.toastCanceled });
      setCancelTarget(null);
    } catch (cancelError) {
      setToast({
        type: 'error',
        message: cancelError instanceof Error ? cancelError.message : t.toastCancelFailed,
      });
    } finally {
      setCanceling(false);
      setPendingSubId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    return t.statusLabels[status as StatusKey] ?? status;
  };

  const getStatusVariant = (status: string) => {
    return statusBadgeVariant[status as StatusKey] ?? 'info';
  };

  const formatPeriod = (sub: AdminSubscription) => {
    if (!sub.currentPeriodEnd) return '—';
    return formatDate(new Date(sub.currentPeriodEnd), dateLocale);
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
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.status}
            onChange={(event) => {
              onFiltersChange({ status: event.target.value });
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
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.columns.user}
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                  {sub.user.email ?? t.unknown}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.columns.status}
                  </p>
                  <div className="flex items-center gap-2">
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={pendingSubId === sub.id}
                  onClick={() => handleSync(sub)}
                >
                  {pendingSubId === sub.id ? t.syncing : t.sync}
                </Button>
                {sub.status !== 'CANCELED' && !sub.cancelAtPeriodEnd && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={pendingSubId === sub.id}
                    onClick={() => setCancelTarget(sub)}
                  >
                    {t.cancel}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setDetailsSub(sub)}
                >
                  {t.details}
                </Button>
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
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pendingSubId === sub.id}
                        onClick={() => handleSync(sub)}
                      >
                        {pendingSubId === sub.id ? t.syncing : t.sync}
                      </Button>
                      {sub.status !== 'CANCELED' && !sub.cancelAtPeriodEnd && (
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={pendingSubId === sub.id}
                          onClick={() => setCancelTarget(sub)}
                        >
                          {t.cancel}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailsSub(sub)}
                      >
                        {t.details}
                      </Button>
                    </div>
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
        open={Boolean(detailsSub)}
        onClose={() => setDetailsSub(null)}
        title={t.detailsTitle}
        description={detailsSub?.user.email ?? ''}
        actions={
          <Button variant="ghost" onClick={() => setDetailsSub(null)}>
            {t.close}
          </Button>
        }
      >
        {detailsSub && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.columns.status}
                </p>
                <Badge variant={getStatusVariant(detailsSub.status)}>
                  {getStatusLabel(detailsSub.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.columns.plan}
                </p>
                <p className="font-medium">
                  {t.planLabels[detailsSub.user.plan?.plan ?? 'FREE']}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {t.periodEnds}
                </p>
                <p>{formatPeriod(detailsSub)}</p>
              </div>
              {detailsSub.trialEnd && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {t.trialEnds}
                  </p>
                  <p>{formatDate(new Date(detailsSub.trialEnd), dateLocale)}</p>
                </div>
              )}
            </div>

            {detailsSub.cancelAtPeriodEnd && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-yellow-800 dark:text-yellow-200">
                {t.cancelPending}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t.stripeId}</p>
              <p className="font-mono text-xs break-all">
                {detailsSub.stripeSubscriptionId ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{t.createdAt}</p>
              <p>{formatDate(new Date(detailsSub.createdAt), dateLocale)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={t.cancelTitle}
        description={cancelTarget?.user.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={canceling}>
              {t.close}
            </Button>
            <Button variant="danger" onClick={handleCancel} disabled={canceling}>
              {canceling ? t.canceling : t.cancel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.cancelConfirm}</p>
      </Modal>
    </div>
  );
}
