'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ConfigSection } from '@/components/admin/ConfigSection';
import { AiModelSection } from '@/components/admin/AiModelSection';
import { StatsSection } from '@/components/admin/StatsSection';
import { UserManagementSection } from '@/components/admin/UserManagementSection';
import { SubscriptionManagementSection } from '@/components/admin/SubscriptionManagementSection';
import { PricingSection } from '@/components/admin/PricingSection';
import { AiAnalyticsSection } from '@/components/admin/AiAnalyticsSection';
import { BehaviorAnalyticsSection } from '@/components/admin/BehaviorAnalyticsSection';
import { RevenueStrategyChatSection } from '@/components/admin/RevenueStrategyChatSection';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAdminData } from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';
import { useVocabStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type AdminTab =
  | 'config'
  | 'ai'
  | 'users'
  | 'requests'
  | 'subscriptions'
  | 'pricing'
  | 'stats'
  | 'ai-analytics'
  | 'behavior';

const adminCopy = {
  pl: {
    title: 'Panel admina',
    subtitle: 'Zarządzaj dostępem, konfiguracją i użyciem AI.',
    loading: 'Ładowanie panelu admina...',
    accessDenied: 'Brak dostępu.',
    configKeys: (count: number) => `${count} kluczy konfiguracji`,
    languageLabel: 'Język',
    tabs: {
      config: 'Konfiguracja',
      ai: 'Modele AI',
      users: 'Użytkownicy',
      requests: 'Zgłoszenia',
      subscriptions: 'Subskrypcje',
      pricing: 'Cennik',
      stats: 'Statystyki',
      'ai-analytics': 'AI Analytics',
      behavior: 'Zachowania',
    },
    requestsTitle: 'Zgłoszenia',
    requestsDescription: 'Użytkownicy oczekujący na dostęp.',
    requestsEmpty: 'Brak zgłoszeń.',
  },
  en: {
    title: 'Admin panel',
    subtitle: 'Manage access, configuration, and AI usage.',
    loading: 'Loading admin panel...',
    accessDenied: 'Access denied.',
    configKeys: (count: number) => `${count} config keys`,
    languageLabel: 'Language',
    tabs: {
      config: 'Configuration',
      ai: 'AI models',
      users: 'Users',
      requests: 'Requests',
      subscriptions: 'Subscriptions',
      pricing: 'Pricing',
      stats: 'Statistics',
      'ai-analytics': 'AI Analytics',
      behavior: 'Behavior',
    },
    requestsTitle: 'Requests',
    requestsDescription: 'Users waiting for access.',
    requestsEmpty: 'No requests.',
  },
} as const;

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const [activeTab, setActiveTab] = useState<AdminTab>('config');
  const savedUsersState = useRef({ status: 'all', plan: 'all', page: 0, search: '' });
  const language = useLanguage();
  const t = language === 'pl' ? adminCopy.pl : adminCopy.en;
  const updateSettings = useVocabStore((state) => state.updateSettings);
  const selectedLanguage = language === 'pl' ? 'pl' : 'en';

  const setLanguage = (nextLanguage: 'pl' | 'en') => {
    if (nextLanguage === selectedLanguage) return;
    updateSettings('general', { language: nextLanguage });
    try {
      window.localStorage.setItem('uiLanguage', nextLanguage);
      window.localStorage.setItem('pendingLanguage', nextLanguage);
    } catch (error) {
      console.warn('Unable to store language preference.', error);
    }
  };

  const {
    config,
    configLoading,
    configError,
    stats,
    statsLoading,
    statsError,
    activeUsage,
    activeUsageLoading,
    activeUsageError,
    activeUsageQuery,
    setActiveUsageQuery,
    users,
    usersTotal,
    usersLoading,
    usersError,
    usersQuery,
    setUsersQuery,
    updateConfig,
    updateUser,
    deleteUser,
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
    exportActiveUsage,
    // Revenue
    revenueStats,
    revenueLoading,
    revenueError,
    // Pricing
    prices,
    pricesLoading,
    pricesError,
    activePriceIds,
    createPrice,
    archivePrice,
    setActivePrice,
    coupons,
    couponsLoading,
    couponsError,
    createCoupon,
    deleteCoupon,
    products,
    productsLoading,
  } = useAdminData(isAdmin);

  const handleTabChange = (value: string) => {
    const nextTab = value as AdminTab;
    if (nextTab === 'requests') {
      savedUsersState.current = {
        status: usersQuery.status,
        plan: usersQuery.plan,
        page: usersQuery.page,
        search: usersQuery.search,
      };
      setUsersQuery((prev) => ({
        ...prev,
        status: 'WAITLISTED',
        plan: 'all',
        page: 0,
        search: '',
      }));
    } else if (activeTab === 'requests') {
      setUsersQuery((prev) => ({
        ...prev,
        ...savedUsersState.current,
      }));
    }
    setActiveTab(nextTab);
  };

  const handleActiveUserFocus = (user: { id: string; email: string | null; name: string | null }) => {
    const search = user.email ?? user.id ?? user.name ?? '';
    setActiveTab('users');
    setUsersQuery((prev) => ({
      ...prev,
      status: 'all',
      plan: 'all',
      page: 0,
      search,
    }));
  };

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, router, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-slate-500">{t.loading}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-slate-500">{t.accessDenied}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
            {t.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{t.subtitle}</span>
            <Badge variant="info">{t.configKeys(config.length)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {t.languageLabel}
          </span>
          <div className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-slate-900/70 p-1 shadow-sm border border-white/60 dark:border-slate-700">
            {(['pl', 'en'] as const).map((option) => {
              const isActive = selectedLanguage === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition',
                    isActive
                      ? 'bg-primary-600 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  )}
                  aria-pressed={isActive}
                >
                  {option.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full flex-wrap justify-start md:w-auto md:flex-nowrap">
          <TabsTrigger value="config">{t.tabs.config}</TabsTrigger>
          <TabsTrigger value="ai">{t.tabs.ai}</TabsTrigger>
          <TabsTrigger value="users">{t.tabs.users}</TabsTrigger>
          <TabsTrigger value="requests">{t.tabs.requests}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t.tabs.subscriptions}</TabsTrigger>
          <TabsTrigger value="pricing">{t.tabs.pricing}</TabsTrigger>
          <TabsTrigger value="stats">{t.tabs.stats}</TabsTrigger>
          <TabsTrigger value="ai-analytics">{t.tabs['ai-analytics']}</TabsTrigger>
          <TabsTrigger value="behavior">{t.tabs.behavior}</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigSection
            config={config}
            loading={configLoading}
            error={configError}
            onSave={updateConfig}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AiModelSection />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementSection
            users={users}
            loading={usersLoading}
            error={usersError}
            page={usersQuery.page}
            limit={usersQuery.limit}
            total={usersTotal}
            filters={{
              status: usersQuery.status,
              plan: usersQuery.plan,
              search: usersQuery.search,
            }}
            onFiltersChange={(nextFilters) =>
              setUsersQuery((prev) => ({
                ...prev,
                ...nextFilters,
                page: 0,
              }))
            }
            onPageChange={(nextPage) =>
              setUsersQuery((prev) => ({
                ...prev,
                page: nextPage,
              }))
            }
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
          />
        </TabsContent>

        <TabsContent value="requests">
          <UserManagementSection
            users={users}
            loading={usersLoading}
            error={usersError}
            page={usersQuery.page}
            limit={usersQuery.limit}
            total={usersTotal}
            filters={{
              status: usersQuery.status,
              plan: usersQuery.plan,
              search: usersQuery.search,
            }}
            onFiltersChange={(nextFilters) =>
              setUsersQuery((prev) => ({
                ...prev,
                ...nextFilters,
                page: 0,
              }))
            }
            onPageChange={(nextPage) =>
              setUsersQuery((prev) => ({
                ...prev,
                page: nextPage,
              }))
            }
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
            title={t.requestsTitle}
            description={t.requestsDescription}
            emptyMessage={t.requestsEmpty}
            hideFilters
          />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionManagementSection
            subscriptions={subscriptions}
            loading={subscriptionsLoading}
            error={subscriptionsError}
            page={subscriptionsQuery.page}
            limit={subscriptionsQuery.limit}
            total={subscriptionsTotal}
            filters={{ status: subscriptionsQuery.status, search: subscriptionsQuery.search }}
            onFiltersChange={(nextFilters) =>
              setSubscriptionsQuery((prev) => ({
                ...prev,
                ...nextFilters,
                page: 0,
              }))
            }
            onPageChange={(nextPage) =>
              setSubscriptionsQuery((prev) => ({
                ...prev,
                page: nextPage,
              }))
            }
            onSync={syncSubscription}
            onCancel={cancelSubscription}
            onCancelImmediately={cancelSubscriptionImmediately}
            onExtendTrial={extendTrial}
            onReactivate={reactivateSubscription}
            onPause={pauseSubscription}
            onResume={resumeSubscription}
            onApplyCoupon={applyCouponToSubscription}
            onChangePlan={changeSubscriptionPlan}
            onRefund={refundSubscription}
            onGetHistory={getSubscriptionHistory}
            onExport={exportSubscriptions}
            coupons={coupons}
            prices={prices}
          />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingSection
            prices={prices}
            pricesLoading={pricesLoading}
            pricesError={pricesError}
            activePriceIds={activePriceIds}
            onCreatePrice={createPrice}
            onArchivePrice={archivePrice}
            onSetActivePrice={setActivePrice}
            coupons={coupons}
            couponsLoading={couponsLoading}
            couponsError={couponsError}
            onCreateCoupon={createCoupon}
            onDeleteCoupon={deleteCoupon}
            products={products}
            productsLoading={productsLoading}
          />
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <StatsSection
                stats={stats}
                loading={statsLoading}
                error={statsError}
                activeUsage={activeUsage}
                activeUsageLoading={activeUsageLoading}
                activeUsageError={activeUsageError}
                activeUsageQuery={activeUsageQuery}
                onActiveUsageQueryChange={setActiveUsageQuery}
                onExportActiveUsage={exportActiveUsage}
                onOpenUser={handleActiveUserFocus}
                revenueStats={revenueStats}
                revenueLoading={revenueLoading}
                revenueError={revenueError}
              />
            </div>
            <div className="lg:col-span-1">
              <RevenueStrategyChatSection />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai-analytics">
          <AiAnalyticsSection />
        </TabsContent>

        <TabsContent value="behavior">
          <BehaviorAnalyticsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
