'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import type { AdminUser } from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

type UserManagementSectionProps = {
  users: AdminUser[];
  loading: boolean;
  error?: string | null;
  page: number;
  limit: number;
  total: number;
  filters: { status: string; plan: string };
  onFiltersChange: (nextFilters: { status: string; plan: string }) => void;
  onPageChange: (page: number) => void;
  onUpdateUser: (userId: string, updates: { plan?: string; accessStatus?: string }) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  title?: string;
  description?: string;
  emptyMessage?: string;
  hideFilters?: boolean;
};

const userManagementCopy = {
  pl: {
    title: 'Zarządzanie użytkownikami',
    description: 'Zmieniaj status dostępu i plany.',
    filters: {
      statusAll: 'Wszystkie statusy',
      planAll: 'Wszystkie plany',
    },
    columns: {
      email: 'Email',
      plan: 'Plan',
      status: 'Status',
      created: 'Utworzono',
      actions: 'Akcje',
    },
    loading: 'Ładowanie użytkowników...',
    empty: 'Brak użytkowników.',
    unknown: 'Nieznany',
    grantAccess: 'Nadaj dostęp',
    suspend: 'Zawieś',
    delete: 'Usuń',
    edit: 'Edytuj',
    prev: 'Poprzednia',
    next: 'Następna',
    pageLabel: (page: number, totalPages: number, total: number) =>
      `Strona ${page} z ${totalPages} · ${total} użytkowników`,
    editTitle: 'Edytuj użytkownika',
    deleteTitle: 'Usuń użytkownika',
    cancel: 'Anuluj',
    save: 'Zapisz',
    saving: 'Zapisywanie...',
    deleting: 'Usuwanie...',
    deleteConfirm: 'To trwale usuwa konto użytkownika i wszystkie powiązane dane.',
    planLabel: 'Plan',
    statusLabel: 'Status',
    toastNoChanges: 'Brak zmian do zapisania.',
    toastUpdated: 'Użytkownik zaktualizowany.',
    toastAccessGranted: 'Nadano dostęp.',
    toastSuspended: 'Użytkownik zawieszony.',
    toastDeleted: 'Użytkownik usunięty.',
    toastUpdateFailed: 'Nie udało się zaktualizować użytkownika.',
    toastDeleteFailed: 'Nie udało się usunąć użytkownika.',
    statusLabels: {
      ACTIVE: 'Aktywny',
      WAITLISTED: 'Oczekuje',
      SUSPENDED: 'Zawieszony',
    },
    planLabels: {
      FREE: 'Darmowy',
      PRO: 'Pro',
    },
  },
  en: {
    title: 'User management',
    description: 'Manage access status and plan assignments.',
    filters: {
      statusAll: 'All statuses',
      planAll: 'All plans',
    },
    columns: {
      email: 'Email',
      plan: 'Plan',
      status: 'Status',
      created: 'Created',
      actions: 'Actions',
    },
    loading: 'Loading users...',
    empty: 'No users found.',
    unknown: 'Unknown',
    grantAccess: 'Grant access',
    suspend: 'Suspend',
    delete: 'Delete',
    edit: 'Edit',
    prev: 'Previous',
    next: 'Next',
    pageLabel: (page: number, totalPages: number, total: number) =>
      `Page ${page} of ${totalPages} · ${total} users`,
    editTitle: 'Edit user',
    deleteTitle: 'Delete user',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    deleting: 'Deleting...',
    deleteConfirm: 'This permanently removes the user account and all related data.',
    planLabel: 'Plan',
    statusLabel: 'Status',
    toastNoChanges: 'No changes to save.',
    toastUpdated: 'User updated.',
    toastAccessGranted: 'Access granted.',
    toastSuspended: 'User suspended.',
    toastDeleted: 'User deleted.',
    toastUpdateFailed: 'Failed to update user.',
    toastDeleteFailed: 'Failed to delete user.',
    statusLabels: {
      ACTIVE: 'Active',
      WAITLISTED: 'Waitlisted',
      SUSPENDED: 'Suspended',
    },
    planLabels: {
      FREE: 'Free',
      PRO: 'Pro',
    },
  },
} as const;

export function UserManagementSection({
  users,
  loading,
  error,
  page,
  limit,
  total,
  filters,
  onFiltersChange,
  onPageChange,
  onUpdateUser,
  onDeleteUser,
  title,
  description,
  emptyMessage,
  hideFilters = false,
}: UserManagementSectionProps) {
  const language = useLanguage();
  const t = language === 'pl' ? userManagementCopy.pl : userManagementCopy.en;
  const dateLocale = language === 'pl' ? 'pl-PL' : 'en-US';
  const [activeUser, setActiveUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState('FREE');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const headerTitle = title ?? t.title;
  const headerDescription = description ?? t.description;
  const emptyStateMessage = emptyMessage ?? t.empty;

  const planOptions = [
    { value: 'all', label: t.filters.planAll },
    { value: 'FREE', label: t.planLabels.FREE },
    { value: 'PRO', label: t.planLabels.PRO },
  ];

  const statusOptions = [
    { value: 'all', label: t.filters.statusAll },
    { value: 'ACTIVE', label: t.statusLabels.ACTIVE },
    { value: 'WAITLISTED', label: t.statusLabels.WAITLISTED },
    { value: 'SUSPENDED', label: t.statusLabels.SUSPENDED },
  ];

  const openEditor = (user: AdminUser) => {
    setActiveUser(user);
    setEditPlan(user.plan?.plan ?? 'FREE');
    setEditStatus(user.plan?.accessStatus ?? 'ACTIVE');
  };

  const handleSave = async () => {
    if (!activeUser) return;
    const updates: { plan?: string; accessStatus?: string } = {};
    if (editPlan !== (activeUser.plan?.plan ?? 'FREE')) {
      updates.plan = editPlan;
    }
    if (editStatus !== (activeUser.plan?.accessStatus ?? 'ACTIVE')) {
      updates.accessStatus = editStatus;
    }
    if (Object.keys(updates).length === 0) {
      setToast({ type: 'error', message: t.toastNoChanges });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await onUpdateUser(activeUser.id, updates);
      setToast({ type: 'success', message: t.toastUpdated });
      setActiveUser(null);
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : t.toastUpdateFailed,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    user: AdminUser,
    nextStatus: 'ACTIVE' | 'WAITLISTED' | 'SUSPENDED'
  ) => {
    setPendingUserId(user.id);
    setToast(null);
    try {
      await onUpdateUser(user.id, { accessStatus: nextStatus });
      const message =
        nextStatus === 'ACTIVE'
          ? t.toastAccessGranted
          : nextStatus === 'SUSPENDED'
            ? t.toastSuspended
            : t.toastUpdated;
      setToast({ type: 'success', message });
    } catch (actionError) {
      setToast({
        type: 'error',
        message: actionError instanceof Error ? actionError.message : t.toastUpdateFailed,
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setPendingUserId(deleteTarget.id);
    setToast(null);
    try {
      await onDeleteUser(deleteTarget.id);
      setToast({ type: 'success', message: t.toastDeleted });
      setDeleteTarget(null);
    } catch (deleteError) {
      setToast({
        type: 'error',
        message: deleteError instanceof Error ? deleteError.message : t.toastDeleteFailed,
      });
    } finally {
      setDeleting(false);
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {headerTitle}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {headerDescription}
          </p>
        </div>
        {!hideFilters && (
          <div className="flex flex-wrap gap-3">
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
            <Select
              value={filters.plan}
              onChange={(event) => {
                onFiltersChange({ ...filters, plan: event.target.value });
                onPageChange(0);
              }}
            >
              {planOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          variant={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {error && <Toast variant="error" message={error} />}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t.columns.email}</th>
              <th className="px-4 py-3">{t.columns.plan}</th>
              <th className="px-4 py-3">{t.columns.status}</th>
              <th className="px-4 py-3">{t.columns.created}</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  {emptyStateMessage}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{user.email ?? t.unknown}</td>
                  <td className="px-4 py-3">
                    {t.planLabels[user.plan?.plan ?? 'FREE'] ?? (user.plan?.plan ?? 'FREE')}
                  </td>
                  <td className="px-4 py-3">
                    {t.statusLabels[user.plan?.accessStatus ?? 'ACTIVE'] ??
                      (user.plan?.accessStatus ?? 'ACTIVE')}
                  </td>
                  <td className="px-4 py-3">
                    {user.createdAt ? formatDate(new Date(user.createdAt), dateLocale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {user.plan?.accessStatus !== 'ACTIVE' && (
                        <Button
                          variant="success"
                          size="sm"
                          disabled={pendingUserId === user.id}
                          onClick={() => handleStatusChange(user, 'ACTIVE')}
                        >
                          {t.grantAccess}
                        </Button>
                      )}
                      {user.plan?.accessStatus !== 'SUSPENDED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pendingUserId === user.id}
                          onClick={() => handleStatusChange(user, 'SUSPENDED')}
                        >
                          {t.suspend}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={pendingUserId === user.id}
                        onClick={() => setDeleteTarget(user)}
                      >
                        {t.delete}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingUserId === user.id}
                        onClick={() => openEditor(user)}
                      >
                        {t.edit}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
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

      <Modal
        open={Boolean(activeUser)}
        onClose={() => setActiveUser(null)}
        title={t.editTitle}
        description={activeUser?.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setActiveUser(null)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t.saving : t.save}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              {t.planLabel}
            </label>
            <Select value={editPlan} onChange={(event) => setEditPlan(event.target.value)}>
              <option value="FREE">{t.planLabels.FREE}</option>
              <option value="PRO">{t.planLabels.PRO}</option>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              {t.statusLabel}
            </label>
            <Select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
              <option value="ACTIVE">{t.statusLabels.ACTIVE}</option>
              <option value="WAITLISTED">{t.statusLabels.WAITLISTED}</option>
              <option value="SUSPENDED">{t.statusLabels.SUSPENDED}</option>
            </Select>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t.deleteTitle}
        description={deleteTarget?.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t.cancel}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t.deleting : t.delete}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t.deleteConfirm}
        </p>
      </Modal>
    </div>
  );
}
