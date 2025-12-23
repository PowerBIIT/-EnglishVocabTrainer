'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ConfigSection } from '@/components/admin/ConfigSection';
import { StatsSection } from '@/components/admin/StatsSection';
import { UserManagementSection } from '@/components/admin/UserManagementSection';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);

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
  } = useAdminData(isAdmin);

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, router, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-slate-500">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-slate-500">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
          Admin panel
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Manage access, configuration, and AI usage.</span>
          <Badge variant="info">{config.length} config keys</Badge>
        </div>
      </header>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
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
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatsSection stats={stats} loading={statsLoading} error={statsError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
