import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { AccessStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAllowlistEmails, getAdminEmails, getMaxActiveUsers } from '@/lib/access';
import { getCurrentPeriod } from '@/lib/aiUsage';
import { getGlobalLimits } from '@/lib/plans';

const cardClass =
  'rounded-3xl bg-white/85 dark:bg-slate-800/80 shadow-sm border border-white/60 dark:border-slate-700 p-6';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    redirect('/');
  }

  const period = getCurrentPeriod();

  const [
    activeCount,
    waitlistedCount,
    suspendedCount,
    planBreakdown,
    globalUsage,
    waitlistedUsers,
  ] = await prisma.$transaction([
    prisma.userPlan.count({ where: { accessStatus: AccessStatus.ACTIVE } }),
    prisma.userPlan.count({ where: { accessStatus: AccessStatus.WAITLISTED } }),
    prisma.userPlan.count({ where: { accessStatus: AccessStatus.SUSPENDED } }),
    prisma.userPlan.groupBy({
      by: ['plan', 'accessStatus'],
      _count: { _all: true },
      orderBy: [{ plan: 'asc' }, { accessStatus: 'asc' }],
    }),
    prisma.globalUsage.findUnique({
      where: {
        period_feature: {
          period,
          feature: 'ai',
        },
      },
    }),
    prisma.user.findMany({
      where: { plan: { accessStatus: AccessStatus.WAITLISTED } },
      select: { email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    }),
  ]);

  const globalLimits = getGlobalLimits();
  const allowlist = getAllowlistEmails();
  const adminEmails = getAdminEmails();
  const maxActiveUsers = getMaxActiveUsers();

  return (
    <div className="min-h-screen px-6 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white">
          Admin panel
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Monitoring limits, access, and AI usage for the current period ({period}).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={cardClass}>
          <div className="text-sm text-slate-500">Active users</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">{activeCount}</div>
          <div className="text-xs text-slate-400 mt-1">
            Limit: {maxActiveUsers === Number.POSITIVE_INFINITY ? 'unlimited' : maxActiveUsers}
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-sm text-slate-500">Waitlisted</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">
            {waitlistedCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">Max shown: 50 emails</div>
        </div>
        <div className={cardClass}>
          <div className="text-sm text-slate-500">Suspended</div>
          <div className="text-3xl font-semibold text-slate-900 dark:text-white">
            {suspendedCount}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="text-sm text-slate-500">Global AI usage</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Requests: <span className="font-semibold">{globalUsage?.count ?? 0}</span> /{' '}
            {globalLimits.maxRequests === Number.POSITIVE_INFINITY
              ? 'unlimited'
              : globalLimits.maxRequests}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Units: <span className="font-semibold">{globalUsage?.units ?? 0}</span> /{' '}
            {globalLimits.maxUnits === Number.POSITIVE_INFINITY
              ? 'unlimited'
              : globalLimits.maxUnits}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-sm text-slate-500">Plan breakdown</div>
          <div className="mt-3 space-y-2">
            {planBreakdown.length === 0 ? (
              <div className="text-sm text-slate-500">No plan data yet.</div>
            ) : (
              planBreakdown.map((entry) => (
                <div
                  key={`${entry.plan}-${entry.accessStatus}`}
                  className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"
                >
                  <span>
                    {entry.plan} · {entry.accessStatus}
                  </span>
                  <span className="font-semibold">
                    {((entry._count as { _all?: number } | null)?._all ?? 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="text-sm text-slate-500">Waitlist emails</div>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {waitlistedUsers.length === 0 ? (
              <div>No waitlisted users.</div>
            ) : (
              waitlistedUsers.map((user) => (
                <div key={user.email ?? user.createdAt.toISOString()}>{user.email ?? 'Unknown email'}</div>
              ))
            )}
          </div>
        </div>
        <div className={cardClass}>
          <div className="text-sm text-slate-500">Access configuration</div>
          <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              Allowlist:{' '}
              <span className="font-semibold">
                {allowlist.length > 0 ? `${allowlist.length} emails` : 'open'}
              </span>
            </div>
            <div>
              Admins:{' '}
              <span className="font-semibold">
                {adminEmails.length > 0 ? adminEmails.join(', ') : 'not configured'}
              </span>
            </div>
            <div>
              Max active users:{' '}
              <span className="font-semibold">
                {maxActiveUsers === Number.POSITIVE_INFINITY ? 'unlimited' : maxActiveUsers}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Configure limits via environment variables (see README for details).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
