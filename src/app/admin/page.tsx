'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ConfigSection } from '@/components/admin/ConfigSection';
import { StatsSection } from '@/components/admin/StatsSection';
import { UserManagementSection } from '@/components/admin/UserManagementSection';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAdminData } from '@/hooks/useAdminData';
import { useLanguage } from '@/lib/i18n';

type AdminTab = 'config' | 'users' | 'requests' | 'stats';

const adminCopy = {
  pl: {
    title: 'Panel admina',
    subtitle: 'Zarządzaj dostępem, konfiguracją i użyciem AI.',
    loading: 'Ładowanie panelu admina...',
    accessDenied: 'Brak dostępu.',
    configKeys: (count: number) => `${count} kluczy konfiguracji`,
    tabs: {
      config: 'Konfiguracja',
      users: 'Użytkownicy',
      requests: 'Zgłoszenia',
      stats: 'Statystyki',
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
    tabs: {
      config: 'Configuration',
      users: 'Users',
      requests: 'Requests',
      stats: 'Statistics',
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
  const savedUsersState = useRef({ status: 'all', plan: 'all', page: 0 });
  const language = useLanguage();
  const t = language === 'pl' ? adminCopy.pl : adminCopy.en;

  const {
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
  } = useAdminData(isAdmin);

  const handleTabChange = (value: string) => {
    const nextTab = value as AdminTab;
    if (nextTab === 'requests') {
      savedUsersState.current = {
        status: usersQuery.status,
        plan: usersQuery.plan,
        page: usersQuery.page,
      };
      setUsersQuery((prev) => ({
        ...prev,
        status: 'WAITLISTED',
        plan: 'all',
        page: 0,
      }));
    } else if (activeTab === 'requests') {
      setUsersQuery((prev) => ({
        ...prev,
        ...savedUsersState.current,
      }));
    }
    setActiveTab(nextTab);
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
      <header className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
          {t.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>{t.subtitle}</span>
          <Badge variant="info">{t.configKeys(config.length)}</Badge>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="config">{t.tabs.config}</TabsTrigger>
          <TabsTrigger value="users">{t.tabs.users}</TabsTrigger>
          <TabsTrigger value="requests">{t.tabs.requests}</TabsTrigger>
          <TabsTrigger value="stats">{t.tabs.stats}</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigSection
            config={config}
            loading={configLoading}
            error={configError}
            onSave={updateConfig}
          />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementSection
            users={users}
            loading={usersLoading}
            error={usersError}
            page={usersQuery.page}
            limit={usersQuery.limit}
            total={usersTotal}
            filters={{ status: usersQuery.status, plan: usersQuery.plan }}
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
            filters={{ status: usersQuery.status, plan: usersQuery.plan }}
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

        <TabsContent value="stats">
          <StatsSection stats={stats} loading={statsLoading} error={statsError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
