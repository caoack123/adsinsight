/**
 * GET  /api/admin/users        — list all registered users (admin only)
 * PATCH /api/admin/users?id=   — update a user's role (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllUserProfiles, getUserProfile, updateUserRole } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  const userId = session?.userId ?? null;
  if (!userId) return { userId: null, forbidden: true as const };

  const profile = await getUserProfile(userId);
  if (profile?.role !== 'admin') return { userId, forbidden: true as const };
  return { userId, forbidden: false as const };
}

export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const users = await getAllUserProfiles();
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { forbidden } = await requireAdmin();
  if (forbidden) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const targetId = request.nextUrl.searchParams.get('id');
  if (!targetId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const body = await request.json();
    const { role } = body;
    if (!['admin', 'standard', 'visitor'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    await updateUserRole(targetId, role);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
