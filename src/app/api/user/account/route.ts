import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { confirm?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'Confirmation required. Send { confirm: true } to delete account.' },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete user - this will cascade delete:
  // - Account (OAuth tokens)
  // - Session
  // - UserState (vocabulary, settings)
  // - UserPlan
  // - UsageCounter
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({
    success: true,
    message: 'Account deleted successfully',
    deletedUserId: userId,
  });
}
