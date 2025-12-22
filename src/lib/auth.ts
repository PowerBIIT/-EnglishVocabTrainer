import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureUserPlan } from '@/lib/userPlan';
import { isAdminEmail } from '@/lib/access';

const providers: NextAuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  }),
];

if (process.env.E2E_TEST === 'true') {
  providers.push(
    CredentialsProvider({
      name: 'E2E',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const expectedPassword = process.env.E2E_TEST_PASSWORD ?? 'e2e';
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.onboardingComplete = (user as { onboardingComplete?: boolean }).onboardingComplete ?? false;
        token.mascotSkin = (user as { mascotSkin?: string }).mascotSkin ?? 'explorer';
        token.email = user.email;

        const plan = await ensureUserPlan(user.id, user.email);
        token.plan = plan.plan;
        token.accessStatus = plan.accessStatus;
        token.isAdmin = isAdminEmail(user.email);
      } else if (!token.plan && token.userId) {
        const plan = await ensureUserPlan(token.userId, token.email ?? undefined);
        token.plan = plan.plan;
        token.accessStatus = plan.accessStatus;
        token.isAdmin = isAdminEmail(token.email ?? undefined);
      }

      if (trigger === 'update' && session) {
        if (typeof (session as { onboardingComplete?: boolean }).onboardingComplete === 'boolean') {
          token.onboardingComplete = (session as { onboardingComplete?: boolean }).onboardingComplete;
        }
        if ((session as { mascotSkin?: string }).mascotSkin) {
          token.mascotSkin = (session as { mascotSkin?: string }).mascotSkin;
        }
        if ((session as { plan?: string }).plan) {
          token.plan = (session as { plan?: string }).plan;
        }
        if ((session as { accessStatus?: string }).accessStatus) {
          token.accessStatus = (session as { accessStatus?: string }).accessStatus;
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
