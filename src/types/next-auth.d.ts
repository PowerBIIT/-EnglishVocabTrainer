import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      onboardingComplete: boolean;
      mascotSkin: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    onboardingComplete?: boolean;
    mascotSkin?: string;
  }
}
