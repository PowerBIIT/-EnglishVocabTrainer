'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type AdminConfigItem = {
  key: string;
  label: string;
  description: string;
  dataType: 'number' | 'list';
  defaultValue: string;
  value: string;
  source: 'db' | 'env' | 'default';
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  plan: {
    plan: 'FREE' | 'PRO';
    accessStatus: 'ACTIVE' | 'WAITLISTED' | 'SUSPENDED';
  } | null;
};

export type AdminStats = {
  meta: { period: string };
  users: {
    active: number;
    waitlisted: number;
    suspended: number;
    planBreakdown: { plan: string; accessStatus: string; count: number }[];
  };
  aiUsage: {
    global: { count: number; units: number; maxRequests: number; maxUnits: number };
    byPlan: {
      plan: string;
      count: number;
      units: number;
      maxRequests: number;
      maxUnits: number;
    }[];
    topUsers: { email: string; count: number; units: number }[];
  };
  costs: { estimatedMonthly: number; projectedEndOfMonth: number };
};

type UsersQuery = {
  page: number;
  limit: number;
  status: string;
  plan: string;
};

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store', ...options });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error ?? 'Request failed';
    throw new Error(message);
  }
  return response.json();
};

export function useAdminData(enabled: boolean = true) {
  const [config, setConfig] = useState<AdminConfigItem[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [usersQuery, setUsersQuery] = useState<UsersQuery>({
    page: 0,
    limit: 20,
    status: 'all',
    plan: 'all',
  });

  const buildUsersQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(usersQuery.page));
    params.set('limit', String(usersQuery.limit));
    if (usersQuery.status !== 'all') {
      params.set('status', usersQuery.status);
    }
    if (usersQuery.plan !== 'all') {
      params.set('plan', usersQuery.plan);
    }
    return params.toString();
  }, [usersQuery]);

  const loadConfig = useCallback(async () => {
    if (!enabled) return;
    setConfigLoading(true);
    setConfigError(null);
    try {
      const data = await fetchJson<{ config: AdminConfigItem[] }>('/api/admin/config');
      setConfig(data.config);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to load config');
    } finally {
      setConfigLoading(false);
    }
  }, [enabled]);

  const loadStats = useCallback(async () => {
    if (!enabled) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await fetchJson<AdminStats>('/api/admin/stats');
      setStats(data);
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, [enabled]);

  const loadUsers = useCallback(async () => {
    if (!enabled) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await fetchJson<{
        users: AdminUser[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/admin/users?${buildUsersQuery}`);
      setUsers(data.users);
      setUsersTotal(data.total);
      setUsersQuery((prev) => {
        if (prev.page === data.page && prev.limit === data.limit) {
          return prev;
        }
        return { ...prev, page: data.page, limit: data.limit };
      });
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [buildUsersQuery, enabled]);

  useEffect(() => {
    if (!enabled) return;
    loadConfig();
  }, [enabled, loadConfig]);

  useEffect(() => {
    if (!enabled) return;
    loadStats();
  }, [enabled, loadStats]);

  useEffect(() => {
    if (!enabled) return;
    loadUsers();
  }, [enabled, loadUsers]);

  const updateConfig = useCallback(
    async (updates: { key: string; value: string }[]) => {
      if (!enabled) return;
      await fetchJson('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      await loadConfig();
    },
    [enabled, loadConfig]
  );

  const updateUser = useCallback(
    async (userId: string, updates: { plan?: string; accessStatus?: string }) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await Promise.all([loadUsers(), loadStats()]);
    },
    [enabled, loadStats, loadUsers]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/users/${userId}`, { method: 'DELETE' });
      await Promise.all([loadUsers(), loadStats()]);
    },
    [enabled, loadStats, loadUsers]
  );

  return {
    config,
    configLoading,
    configError,
    stats,
    statsLoading,
    statsError,
    users,
    usersTotal,
    usersLoading,
    usersError,
    usersQuery,
    setUsersQuery,
    updateConfig,
    updateUser,
    deleteUser,
    refreshStats: loadStats,
    refreshUsers: loadUsers,
  };
}
