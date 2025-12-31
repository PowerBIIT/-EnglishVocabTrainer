'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AdminPrice,
  AdminCoupon,
  AdminProduct,
  CreatePriceData,
  CreateCouponData,
  ActivePriceIds,
} from '@/types/pricing';

export type AdminConfigItem = {
  key: string;
  label: string;
  description: string;
  dataType: 'number' | 'list' | 'string';
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

export type AdminSubscription = {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string | null;
    name: string | null;
    createdAt: string;
    plan: {
      plan: 'FREE' | 'PRO';
      accessStatus: 'ACTIVE' | 'WAITLISTED' | 'SUSPENDED';
    } | null;
  };
};

export type RevenueStats = {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  trialSubscribers: number;
  pastDueSubscribers: number;
  canceledSubscribers: number;
  trialConversionRate: number;
  churnRate: number;
  revenueByPeriod: Array<{
    period: string;
    newSubscribers: number;
    canceledSubscribers: number;
    activeAtEnd: number;
  }>;
};

type UsersQuery = {
  page: number;
  limit: number;
  status: string;
  plan: string;
};

type SubscriptionsQuery = {
  page: number;
  limit: number;
  status: string;
  search: string;
};

export type SubscriptionEvent = {
  id: string;
  type: string;
  created: number;
  description: string;
};

export type RefundResult = {
  id: string;
  amount: number;
  currency: string;
  status: string;
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

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [subscriptionsTotal, setSubscriptionsTotal] = useState(0);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [subscriptionsQuery, setSubscriptionsQuery] = useState<SubscriptionsQuery>({
    page: 0,
    limit: 20,
    status: 'all',
    search: '',
  });

  // Revenue stats state
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  // Pricing state
  const [prices, setPrices] = useState<AdminPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [activePriceIds, setActivePriceIds] = useState<ActivePriceIds>({
    monthly: '',
    annual: '',
  });

  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState<string | null>(null);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

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

  const buildSubscriptionsQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(subscriptionsQuery.page));
    params.set('limit', String(subscriptionsQuery.limit));
    if (subscriptionsQuery.status !== 'all') {
      params.set('status', subscriptionsQuery.status);
    }
    if (subscriptionsQuery.search) {
      params.set('search', subscriptionsQuery.search);
    }
    return params.toString();
  }, [subscriptionsQuery]);

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

  const loadSubscriptions = useCallback(async () => {
    if (!enabled) return;
    setSubscriptionsLoading(true);
    setSubscriptionsError(null);
    try {
      const data = await fetchJson<{
        subscriptions: AdminSubscription[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/admin/subscriptions?${buildSubscriptionsQuery}`);
      setSubscriptions(data.subscriptions);
      setSubscriptionsTotal(data.total);
      setSubscriptionsQuery((prev) => {
        if (prev.page === data.page && prev.limit === data.limit) {
          return prev;
        }
        return { ...prev, page: data.page, limit: data.limit };
      });
    } catch (error) {
      setSubscriptionsError(
        error instanceof Error ? error.message : 'Failed to load subscriptions'
      );
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [buildSubscriptionsQuery, enabled]);

  const loadRevenueStats = useCallback(async () => {
    if (!enabled) return;
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const data = await fetchJson<RevenueStats>('/api/admin/stats/revenue');
      setRevenueStats(data);
    } catch (error) {
      setRevenueError(
        error instanceof Error ? error.message : 'Failed to load revenue stats'
      );
    } finally {
      setRevenueLoading(false);
    }
  }, [enabled]);

  const loadPrices = useCallback(async () => {
    if (!enabled) return;
    setPricesLoading(true);
    setPricesError(null);
    try {
      const data = await fetchJson<{
        prices: AdminPrice[];
        activePriceIds: ActivePriceIds;
      }>('/api/admin/pricing/prices');
      setPrices(data.prices);
      setActivePriceIds(data.activePriceIds);
    } catch (error) {
      setPricesError(error instanceof Error ? error.message : 'Failed to load prices');
    } finally {
      setPricesLoading(false);
    }
  }, [enabled]);

  const loadCoupons = useCallback(async () => {
    if (!enabled) return;
    setCouponsLoading(true);
    setCouponsError(null);
    try {
      const data = await fetchJson<{ coupons: AdminCoupon[] }>(
        '/api/admin/pricing/coupons'
      );
      setCoupons(data.coupons);
    } catch (error) {
      setCouponsError(error instanceof Error ? error.message : 'Failed to load coupons');
    } finally {
      setCouponsLoading(false);
    }
  }, [enabled]);

  const loadProducts = useCallback(async () => {
    if (!enabled) return;
    setProductsLoading(true);
    try {
      const data = await fetchJson<{ products: AdminProduct[] }>(
        '/api/admin/pricing/products'
      );
      setProducts(data.products);
    } catch {
      // Products are optional, don't show error
    } finally {
      setProductsLoading(false);
    }
  }, [enabled]);

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

  useEffect(() => {
    if (!enabled) return;
    loadSubscriptions();
  }, [enabled, loadSubscriptions]);

  useEffect(() => {
    if (!enabled) return;
    loadRevenueStats();
  }, [enabled, loadRevenueStats]);

  useEffect(() => {
    if (!enabled) return;
    loadPrices();
  }, [enabled, loadPrices]);

  useEffect(() => {
    if (!enabled) return;
    loadCoupons();
  }, [enabled, loadCoupons]);

  useEffect(() => {
    if (!enabled) return;
    loadProducts();
  }, [enabled, loadProducts]);

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

  const syncSubscription = useCallback(
    async (subscriptionId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}/sync`, {
        method: 'POST',
      });
      await Promise.all([loadSubscriptions(), loadRevenueStats()]);
    },
    [enabled, loadSubscriptions, loadRevenueStats]
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'POST',
      });
      await Promise.all([loadSubscriptions(), loadRevenueStats(), loadStats()]);
    },
    [enabled, loadSubscriptions, loadRevenueStats, loadStats]
  );

  const cancelSubscriptionImmediately = useCallback(
    async (subscriptionId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });
      await Promise.all([loadSubscriptions(), loadRevenueStats(), loadStats()]);
    },
    [enabled, loadSubscriptions, loadRevenueStats, loadStats]
  );

  const extendTrial = useCallback(
    async (subscriptionId: string, days: number) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extendTrial', days }),
      });
      await loadSubscriptions();
    },
    [enabled, loadSubscriptions]
  );

  const reactivateSubscription = useCallback(
    async (subscriptionId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      });
      await loadSubscriptions();
    },
    [enabled, loadSubscriptions]
  );

  const pauseSubscription = useCallback(
    async (subscriptionId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });
      await loadSubscriptions();
    },
    [enabled, loadSubscriptions]
  );

  const resumeSubscription = useCallback(
    async (subscriptionId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });
      await loadSubscriptions();
    },
    [enabled, loadSubscriptions]
  );

  const applyCouponToSubscription = useCallback(
    async (subscriptionId: string, couponId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'applyCoupon', couponId }),
      });
      await loadSubscriptions();
    },
    [enabled, loadSubscriptions]
  );

  const changeSubscriptionPlan = useCallback(
    async (subscriptionId: string, priceId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePlan', priceId }),
      });
      await Promise.all([loadSubscriptions(), loadRevenueStats()]);
    },
    [enabled, loadSubscriptions, loadRevenueStats]
  );

  const refundSubscription = useCallback(
    async (
      subscriptionId: string,
      amount?: number,
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
    ): Promise<RefundResult> => {
      if (!enabled) throw new Error('Not enabled');
      const result = await fetchJson<{ success: boolean; refund: RefundResult }>(
        `/api/admin/subscriptions/${subscriptionId}/refund`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, reason }),
        }
      );
      return result.refund;
    },
    [enabled]
  );

  const getSubscriptionHistory = useCallback(
    async (subscriptionId: string): Promise<SubscriptionEvent[]> => {
      if (!enabled) return [];
      const result = await fetchJson<{ events: SubscriptionEvent[] }>(
        `/api/admin/subscriptions/${subscriptionId}/history`
      );
      return result.events;
    },
    [enabled]
  );

  const exportSubscriptions = useCallback(
    async (status?: string) => {
      if (!enabled) return;
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.set('status', status);
      }
      const url = `/api/admin/subscriptions/export?${params.toString()}`;
      window.open(url, '_blank');
    },
    [enabled]
  );

  // Pricing actions
  const createPrice = useCallback(
    async (data: CreatePriceData) => {
      if (!enabled) return;
      await fetchJson('/api/admin/pricing/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await loadPrices();
    },
    [enabled, loadPrices]
  );

  const archivePrice = useCallback(
    async (priceId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/pricing/prices/${priceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      });
      await loadPrices();
    },
    [enabled, loadPrices]
  );

  const setActivePrice = useCallback(
    async (priceId: string, type: 'monthly' | 'annual') => {
      if (!enabled) return;
      await fetchJson(`/api/admin/pricing/prices/${priceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: type }),
      });
      await Promise.all([loadPrices(), loadConfig()]);
    },
    [enabled, loadPrices, loadConfig]
  );

  const createCoupon = useCallback(
    async (data: CreateCouponData) => {
      if (!enabled) return;
      await fetchJson('/api/admin/pricing/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await loadCoupons();
    },
    [enabled, loadCoupons]
  );

  const deleteCoupon = useCallback(
    async (couponId: string) => {
      if (!enabled) return;
      await fetchJson(`/api/admin/pricing/coupons/${couponId}`, {
        method: 'DELETE',
      });
      await loadCoupons();
    },
    [enabled, loadCoupons]
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
    // Subscriptions
    subscriptions,
    subscriptionsTotal,
    subscriptionsLoading,
    subscriptionsError,
    subscriptionsQuery,
    setSubscriptionsQuery,
    syncSubscription,
    cancelSubscription,
    cancelSubscriptionImmediately,
    extendTrial,
    reactivateSubscription,
    pauseSubscription,
    resumeSubscription,
    applyCouponToSubscription,
    changeSubscriptionPlan,
    refundSubscription,
    getSubscriptionHistory,
    exportSubscriptions,
    refreshSubscriptions: loadSubscriptions,
    // Revenue
    revenueStats,
    revenueLoading,
    revenueError,
    refreshRevenue: loadRevenueStats,
    // Pricing
    prices,
    pricesLoading,
    pricesError,
    activePriceIds,
    refreshPrices: loadPrices,
    createPrice,
    archivePrice,
    setActivePrice,
    // Coupons
    coupons,
    couponsLoading,
    couponsError,
    refreshCoupons: loadCoupons,
    createCoupon,
    deleteCoupon,
    // Products
    products,
    productsLoading,
    refreshProducts: loadProducts,
  };
}
