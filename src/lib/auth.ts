import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureUserPlan } from '@/lib/userPlan';
import { isAdminEmail } from '@/lib/access';
import { verifyPassword } from '@/lib/passwordAuth';

const isEnvEnabled = (value?: string) => value === 'true' || value === '1';
// E2E login requires explicit opt-in via E2E_LOGIN_ENABLED=true (set only in UAT)
const E2E_ENABLED =
  isEnvEnabled(process.env.E2E_LOGIN_ENABLED) &&
  (isEnvEnabled(process.env.E2E_TEST) ||
    isEnvEnabled(process.env.NEXT_PUBLIC_E2E_TEST));
const PLAN_SYNC_INTERVAL_MS = 60_000;

const providers: NextAuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    allowDangerousEmailAccountLinking: true,
  }),
  CredentialsProvider({
    id: 'credentials',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = credentials.email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // User not found or has no password (OAuth-only user)
      if (!user || !user.password) {
        return null;
      }

      // Verify password
      const isValid = await verifyPassword(credentials.password, user.password);
      if (!isValid) {
        return null;
      }

      // Check if email is verified
      if (!user.emailVerified) {
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      return user;
    },
  }),
];

if (E2E_ENABLED) {
  providers.push(
    CredentialsProvider({
      name: 'E2E',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const expectedPassword = process.env.E2E_TEST_PASSWORD;
        // SECURITY: Require explicit password, no default
        if (!expectedPassword) {
          console.error('E2E_TEST_PASSWORD not set');
          return null;
        }
        const email = credentials?.email?.trim() || 'e2e@local.test';
        const password = credentials?.password ?? '';

        if (password !== expectedPassword) {
          return null;
        }

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: email.split('@')[0] || 'E2E User',
            onboardingComplete: true,
            mascotSkin: 'explorer',
          },
        });

        return user;
      },
    })
  );
}

const shouldSyncPlan = (token: JWT) => {
  const lastSync = typeof token.planSyncedAt === 'number' ? token.planSyncedAt : 0;
  return !lastSync || Date.now() - lastSync > PLAN_SYNC_INTERVAL_MS;
};

const syncPlan = async (token: JWT, userId: string, email?: string | null) => {
  const plan = await ensureUserPlan(userId, email ?? undefined);
  token.plan = plan.plan;
  token.accessStatus = plan.accessStatus;
  token.isAdmin = isAdminEmail(email ?? undefined);
  token.planSyncedAt = Date.now();
};

const resolveEmail = (
  token: JWT,
  user?: { email?: string | null },
  session?: { user?: { email?: string | null } }
) => user?.email ?? token.email ?? session?.user?.email ?? null;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt',
    updateAge: 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const profileVerifiedRaw = (profile as { email_verified?: unknown })?.email_verified;
        const profileVerified =
          typeof profileVerifiedRaw === 'boolean' ? profileVerifiedRaw : false;

        // Block unverified Google accounts (and avoid unsafe account-linking scenarios).
        if (!profileVerified) {
          return false;
        }

        if (user?.id) {
          try {
            const existing = await prisma.user.findUnique({
              where: { id: user.id },
              select: { emailVerified: true, password: true, email: true },
            });

            // If this Google sign-in landed on an unverified credentials user, drop the password.
            // This prevents account takeover via "pre-registration" with someone else's email.
            if (!existing?.emailVerified) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  emailVerified: new Date(),
                  ...(existing?.password
                    ? {
                        password: null,
                        passwordResetToken: null,
                        passwordResetExpires: null,
                      }
                    : {}),
                },
              });
            }
          } catch (error) {
            console.error('Failed to sync Google user verification state:', error);
          }
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.onboardingComplete = (user as { onboardingComplete?: boolean }).onboardingComplete ?? false;
        token.mascotSkin = (user as { mascotSkin?: string }).mascotSkin ?? 'explorer';
        token.email = user.email;

        await syncPlan(token, user.id, user.email);
      } else {
        if (!token.userId && token.sub) {
          token.userId = token.sub;
        }

        const email = resolveEmail(token, user, session);
        if (email && token.email !== email) {
          token.email = email;
        }

        if (token.userId && (!token.plan || !token.accessStatus || shouldSyncPlan(token))) {
          await syncPlan(token, token.userId, email);
        }
      }

      if (trigger === 'update' && session) {
        if (typeof (session as { onboardingComplete?: boolean }).onboardingComplete === 'boolean') {
          token.onboardingComplete = (session as { onboardingComplete?: boolean }).onboardingComplete;
        }
        if ((session as { mascotSkin?: string }).mascotSkin) {
          token.mascotSkin = (session as { mascotSkin?: string }).mascotSkin;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
        session.user.mascotSkin = (token.mascotSkin as string) || 'explorer';
        session.user.plan = (token.plan as Plan) ?? 'FREE';
        session.user.accessStatus = (token.accessStatus as AccessStatus) ?? 'ACTIVE';
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
};
