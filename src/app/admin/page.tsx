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
import { useVocabStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type AdminTab = 'config' | 'users' | 'requests' | 'stats';

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
    languageLabel: 'Language',
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
