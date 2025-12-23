import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const requireAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
};
