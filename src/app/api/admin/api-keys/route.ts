/**
 * GET /api/admin/api-keys
 * Returns the admin's API keys for standard users.
 * Standard users can use these keys but never see them.
 * Only accessible by logged-in standard or admin users.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserProfile, getAdminSettings } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const userId = session?.userId ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getUserProfile(userId);
  if (!profile || profile.role === 'visitor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminSettings = await getAdminSettings();
  if (!adminSettings) {
    return NextResponse.json({ error: 'Admin has not configured API keys yet' }, { status: 404 });
  }

  // Return only the key fields — never expose full settings blob to frontend
  return NextResponse.json({
    openrouterApiKey:   adminSettings.openrouterApiKey   ?? '',
    googleAiApiKey:     adminSettings.googleAiApiKey     ?? '',
    youtubeApiKey:      adminSettings.youtubeApiKey      ?? '',
    feedOptimizerModel: adminSettings.feedOptimizerModel,
    changeTrackerModel: adminSettings.changeTrackerModel,
    videoAbcdModel:     adminSettings.videoAbcdModel,
  });
}
