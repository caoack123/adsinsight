/**
 * GET /api/user/profile — returns the current user's role and basic info
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProfile } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const userId = session?.userId ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id:         profile.id,
    email:      profile.email,
    name:       profile.name,
    avatar_url: profile.avatar_url,
    role:       profile.role,
  });
}
