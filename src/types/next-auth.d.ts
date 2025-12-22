import { DefaultSession } from 'next-auth';
import type { AccessStatus, Plan } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      onboardingComplete: boolean;
      mascotSkin: string;
      plan: Plan;
      accessStatus: AccessStatus;
      isAdmin: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    onboardingComplete?: boolean;
    mascotSkin?: string;
    plan?: Plan;
    accessStatus?: AccessStatus;
    isAdmin?: boolean;
    email?: string | null;
  }
}
