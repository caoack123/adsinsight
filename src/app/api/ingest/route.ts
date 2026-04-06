import { NextRequest, NextResponse } from 'next/server';

// For now, just log the received data and save to a local JSON file
// Later: write to Vercel Postgres

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validate token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== payload.client_token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Ingest] Module: ${payload.module}, Items: ${payload.data?.length}, Account: ${payload.account_name}`);

    // TODO: Save to Vercel Postgres
    // For now, just acknowledge
    return NextResponse.json({
      success: true,
      module: payload.module,
      items_received: payload.data?.length || 0,
    });

  } catch (error) {
    console.error('[Ingest] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
