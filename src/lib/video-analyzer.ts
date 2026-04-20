/**
 * Gemini-powered video analysis for the Social Video Library.
 *
 * YouTube  → fileData with YouTube URI (Gemini watches the video)
 * TikTok   → fetch bytes → upload to Gemini Files API → analyze → delete
 * Others   → text-only metadata analysis
 *
 * Key: always set responseMimeType:'application/json' so the model
 * returns raw JSON instead of markdown-wrapped JSON (which breaks JSON.parse).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface VideoAnalysis {
  summary:            string;
  hook_type:          string;
  hook_description:   string;
  format:             string;
  target_audience:    string;
  key_messages:       string[];
  emotional_triggers: string[];
  strengths:          string[];
  weaknesses:         string[];
  replication_score:  number;
  replication_notes:  string;
  tags:               string[];
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary:            { type: 'string' },
    hook_type:          { type: 'string' },
    hook_description:   { type: 'string' },
    format:             { type: 'string' },
    target_audience:    { type: 'string' },
    key_messages:       { type: 'array', items: { type: 'string' } },
    emotional_triggers: { type: 'array', items: { type: 'string' } },
    strengths:          { type: 'array', items: { type: 'string' } },
    weaknesses:         { type: 'array', items: { type: 'string' } },
    replication_score:  { type: 'number' },
    replication_notes:  { type: 'string' },
    tags:               { type: 'array', items: { type: 'string' } },
  },
  required: [
    'summary','hook_type','hook_description','format','target_audience',
    'key_messages','emotional_triggers','strengths','weaknesses',
    'replication_score','replication_notes','tags',
  ],
};

const ANALYSIS_PROMPT = `
You are an expert social media strategist and video content analyst.
Analyze this video and fill every field of the JSON schema.

Fields:
- summary: 2-3 sentence overview
- hook_type: one word from: question|shock|story|demo|challenge|trend|ugc|other
- hook_description: what happens in the first 3 seconds and why it grabs attention
- format: one of: tutorial|ugc|brand-ad|vlog|review|challenge|skit|product-demo|other
- target_audience: concise description of the intended viewer
- key_messages: 2-4 core messages the video communicates
- emotional_triggers: 1-3 emotions it evokes
- strengths: 2-4 things that work well
- weaknesses: 1-2 areas for improvement
- replication_score: integer 1-10 (how easy for a brand to replicate this style)
- replication_notes: one sentence on HOW a brand could adapt this
- tags: 4-6 relevant topic/style tags (no # prefix)

Use the same language (Chinese/English) as the video content.
`.trim();

// ── Upload non-YouTube video to Gemini Files API ──────────────────────────────

async function uploadToGeminiFiles(
  directUrl: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(directUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const mimeType = res.headers.get('content-type') ?? 'video/mp4';
    const bytes = new Uint8Array(await res.arrayBuffer());

    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'X-Goog-Upload-Command': 'upload, finalize',
          'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
          'X-Goog-Upload-Header-Content-Type': mimeType,
        },
        body: bytes,
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!uploadRes.ok) return null;
    const fileData = await uploadRes.json();
    return fileData.file?.uri ?? null;
  } catch {
    return null;
  }
}

async function deleteGeminiFile(fileUri: string, apiKey: string) {
  try {
    const name = fileUri.split('/files/')[1];
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${name}?key=${apiKey}`,
      { method: 'DELETE' },
    );
  } catch { /* best-effort */ }
}

// ── Robust JSON extraction (handles markdown fences or leading text) ───────────

function extractJson(raw: string): VideoAnalysis {
  // Strip markdown fences
  let s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Find the first { ... } block if there's extra text
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function analyzeVideo(opts: {
  platform:      string;
  url:           string;
  direct_url:    string | null;
  title:         string | null;
  author:        string | null;
  description:   string | null;
  view_count:    number | null;
  like_count:    number | null;
  comment_count: number | null;
  geminiApiKey:  string;
  geminiModel:   string;
}): Promise<VideoAnalysis> {
  const genAI = new GoogleGenerativeAI(opts.geminiApiKey);
  const model = genAI.getGenerativeModel(
    { model: opts.geminiModel },
    { apiVersion: 'v1beta' },
  );

  const contextBlock = [
    opts.title         && `Title: ${opts.title}`,
    opts.author        && `Creator: ${opts.author}`,
    opts.description   && `Description: ${opts.description}`,
    opts.view_count    && `Views: ${opts.view_count.toLocaleString()}`,
    opts.like_count    && `Likes: ${opts.like_count.toLocaleString()}`,
    opts.comment_count && `Comments: ${opts.comment_count.toLocaleString()}`,
  ].filter(Boolean).join('\n');

  // generationConfig forces JSON output — no markdown wrapping
  const generationConfig = {
    responseMimeType: 'application/json',
    responseSchema:   ANALYSIS_SCHEMA,
    temperature:      0.4,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  // ── Build request ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contents: any[];

  if (opts.platform === 'youtube') {
    // Gemini natively supports YouTube URIs in fileData
    contents = [{
      role: 'user',
      parts: [
        { text: `${ANALYSIS_PROMPT}\n\nMetadata:\n${contextBlock}` },
        { fileData: { mimeType: 'video/mp4', fileUri: opts.url } },
      ],
    }];
  } else if (opts.direct_url) {
    // Upload the video file to Gemini Files API first
    const fileUri = await uploadToGeminiFiles(opts.direct_url, opts.geminiApiKey);
    if (fileUri) {
      contents = [{
        role: 'user',
        parts: [
          { text: `${ANALYSIS_PROMPT}\n\nMetadata:\n${contextBlock}` },
          { fileData: { mimeType: 'video/mp4', fileUri } },
        ],
      }];
      setTimeout(() => deleteGeminiFile(fileUri, opts.geminiApiKey), 10_000);
    } else {
      // Fallback: metadata-only
      contents = [{ role: 'user', parts: [{ text: `${ANALYSIS_PROMPT}\n\nMetadata (no video available):\n${contextBlock}` }] }];
    }
  } else {
    // Metadata-only (Instagram, X, other)
    contents = [{ role: 'user', parts: [{ text: `${ANALYSIS_PROMPT}\n\nMetadata:\n${contextBlock}` }] }];
  }

  const result = await model.generateContent({ contents, generationConfig });
  const text = result.response.text();
  return extractJson(text);
}
