'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import type { AdminUser } from '@/hooks/useAdminData';
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
};

const planOptions = [
  { value: 'all', label: 'All plans' },
  { value: 'FREE', label: 'FREE' },
  { value: 'PRO', label: 'PRO' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'WAITLISTED', label: 'WAITLISTED' },
  { value: 'SUSPENDED', label: 'SUSPENDED' },
];

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
}: UserManagementSectionProps) {
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
      setToast({ type: 'error', message: 'No changes to save.' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await onUpdateUser(activeUser.id, updates);
      setToast({ type: 'success', message: 'User updated.' });
      setActiveUser(null);
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : 'Failed to update user.',
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
          ? 'Access granted.'
          : nextStatus === 'SUSPENDED'
            ? 'User suspended.'
            : 'User updated.';
      setToast({ type: 'success', message });
    } catch (actionError) {
      setToast({
        type: 'error',
        message: actionError instanceof Error ? actionError.message : 'Failed to update user.',
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
      setToast({ type: 'success', message: 'User deleted.' });
      setDeleteTarget(null);
    } catch (deleteError) {
      setToast({
        type: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Failed to delete user.',
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
            User management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage access status and plan assignments.
          </p>
        </div>
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-200">
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{user.email ?? 'Unknown'}</td>
                  <td className="px-4 py-3">{user.plan?.plan ?? 'FREE'}</td>
                  <td className="px-4 py-3">{user.plan?.accessStatus ?? 'ACTIVE'}</td>
                  <td className="px-4 py-3">
                    {user.createdAt ? formatDate(new Date(user.createdAt)) : '—'}
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
                          Grant access
                        </Button>
                      )}
                      {user.plan?.accessStatus !== 'SUSPENDED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pendingUserId === user.id}
                          onClick={() => handleStatusChange(user, 'SUSPENDED')}
                        >
                          Suspend
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={pendingUserId === user.id}
                        onClick={() => setDeleteTarget(user)}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingUserId === user.id}
                        onClick={() => openEditor(user)}
                      >
                        Edit
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
        <span>
          Page {page + 1} of {totalPages} · {total} users
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page + 1 >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(activeUser)}
        onClose={() => setActiveUser(null)}
        title="Edit user"
        description={activeUser?.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setActiveUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Plan</label>
            <Select value={editPlan} onChange={(event) => setEditPlan(event.target.value)}>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">Status</label>
            <Select value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="WAITLISTED">WAITLISTED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </Select>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        description={deleteTarget?.email ?? ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This permanently removes the user account and all related data.
        </p>
      </Modal>
    </div>
  );
}
