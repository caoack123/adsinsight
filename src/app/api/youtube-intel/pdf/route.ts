/**
 * POST /api/youtube-intel/pdf
 *
 * Accepts { report, meta } — generates a professional PDF using
 * @react-pdf/renderer (real text, searchable, proper page breaks).
 */
import { NextRequest } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer } = require('@react-pdf/renderer');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactPDF = require('@react-pdf/renderer');
import { createElement } from 'react';
import { YouTubeIntelPDF } from '@/lib/youtube-intel-pdf';
import type { YouTubeIntelReport, YouTubeIntelResponse } from '../route';

export const maxDuration = 30; // Vercel: allow up to 30s for font download + render

export async function POST(request: NextRequest) {
  let report: YouTubeIntelReport;
  let meta: YouTubeIntelResponse['meta'];

  try {
    const body = await request.json();
    report = body.report;
    meta   = body.meta;
    if (!report || !meta) throw new Error('Missing report or meta');
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
  }

  try {
    const element = createElement(YouTubeIntelPDF, { report, meta });
    // renderToBuffer returns a Node.js Buffer
    const buffer: Buffer = await (ReactPDF.renderToBuffer ?? renderToBuffer)(element);

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
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}
