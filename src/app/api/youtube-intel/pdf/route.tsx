/**
 * POST /api/youtube-intel/pdf
 *
 * Generates a professional PDF using @react-pdf/renderer.
 * Real text — searchable, copyable, proper page breaks.
 *
 * @react-pdf/renderer is listed in next.config serverExternalPackages so webpack
 * doesn't bundle it; Node.js loads it natively, keeping its internal singletons intact.
 */
import { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { YouTubeIntelPDF } from '@/lib/youtube-intel-pdf';
import type { YouTubeIntelReport, YouTubeIntelResponse } from '../route';

export const maxDuration = 30; // allow up to 30 s on Vercel for font fetch + render

export async function POST(request: NextRequest) {
  let report: YouTubeIntelReport;
  let meta: YouTubeIntelResponse['meta'];

  try {
    const body = await request.json();
    report = body.report;
    meta   = body.meta;
    if (!report || !meta) throw new Error('Missing report or meta');
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }

  try {
    const buffer = await renderToBuffer(
      <YouTubeIntelPDF report={report} meta={meta} />
    );

    const safeQuery = meta.query.replace(/[^\w\u4e00-\u9fff]/g, '-').slice(0, 30);
    const filename  = `yt-intel-${safeQuery}-${meta.generated_at.split('T')[0]}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (e) {
    console.error('[PDF render error]', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
