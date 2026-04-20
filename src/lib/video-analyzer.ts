/**
 * Gemini-powered video analysis for the Social Video Library.
 *
 * YouTube  → pass URL directly (Gemini supports YouTube natively)
 * TikTok   → fetch video bytes → upload to Gemini Files API → analyze → delete
 * Others   → text-only analysis from title/description/stats
 */
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export interface VideoAnalysis {
  summary:            string;
  hook_type:          string;       // e.g. "question" | "shock" | "story" | "demo" | "challenge"
  hook_description:   string;
  format:             string;       // e.g. "tutorial" | "ugc" | "brand-ad" | "vlog" | "review"
  target_audience:    string;
  key_messages:       string[];
  emotional_triggers: string[];
  strengths:          string[];
  weaknesses:         string[];
  replication_score:  number;       // 1-10
  replication_notes:  string;
  tags:               string[];
}

const ANALYSIS_PROMPT = `
You are an expert social media strategist and video content analyst.
Analyze this video and return a JSON object with the following fields:

{
  "summary": "2-3 sentence overview of the video content",
  "hook_type": "one word: question|shock|story|demo|challenge|trend|ugc|other",
  "hook_description": "what happens in the first 3 seconds and why it works",
  "format": "one of: tutorial|ugc|brand-ad|vlog|review|challenge|skit|product-demo|other",
  "target_audience": "concise description of who this is for",
  "key_messages": ["message 1", "message 2", "message 3"],
  "emotional_triggers": ["trigger 1", "trigger 2"],
  "strengths": ["what works well 1", "what works well 2", "what works well 3"],
  "weaknesses": ["what could be improved 1", "what could be improved 2"],
  "replication_score": 7,
  "replication_notes": "how a brand could replicate or adapt this style",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Be specific and actionable. Use the same language as the video (Chinese/English).
Return ONLY valid JSON, no markdown, no explanation.
`.trim();

// ── Upload a video URL to Gemini Files API (for non-YouTube) ──────────────────

async function uploadVideoForAnalysis(
  directUrl: string,
  geminiClient: GoogleGenerativeAI,
): Promise<string | null> {
  try {
    // Fetch the video bytes
    const response = await fetch(directUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return null;

    const buffer    = await response.arrayBuffer();
    const mimeType  = response.headers.get('content-type') ?? 'video/mp4';
    const bytes     = new Uint8Array(buffer);

    // Upload via Gemini Files API
    const fileManager = (geminiClient as unknown as { fileManager?: { uploadFile: Function } }).fileManager;
    if (!fileManager) return null;

    // Use the REST Files API directly since the JS SDK exposes it differently
    const apiKey = (geminiClient as unknown as { apiKey?: string }).apiKey ?? '';
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
    const fileName = fileUri.split('/').pop();
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`,
      { method: 'DELETE' },
    );
  } catch { /* best-effort */ }
}

// ── Main analysis function ────────────────────────────────────────────────────

export async function analyzeVideo(opts: {
  platform:     string;
  url:          string;
  direct_url:   string | null;
  title:        string | null;
  author:       string | null;
  description:  string | null;
  view_count:   number | null;
  like_count:   number | null;
  comment_count:number | null;
  geminiApiKey: string;
  geminiModel:  string;
}): Promise<VideoAnalysis> {
  const genAI = new GoogleGenerativeAI(opts.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: opts.geminiModel });

  const contextBlock = [
    opts.title        && `Title: ${opts.title}`,
    opts.author       && `Creator: ${opts.author}`,
    opts.description  && `Description: ${opts.description}`,
    opts.view_count   && `Views: ${opts.view_count.toLocaleString()}`,
    opts.like_count   && `Likes: ${opts.like_count.toLocaleString()}`,
    opts.comment_count && `Comments: ${opts.comment_count.toLocaleString()}`,
  ].filter(Boolean).join('\n');

  const parts: Part[] = [];

  if (opts.platform === 'youtube') {
    // Pass the YouTube URL directly in the text prompt.
    // The fileData / fileUri approach for YouTube is unreliable across Gemini versions;
    // including the URL in the prompt lets the model fetch it via its built-in YouTube tool.
    parts.push({
      text: `${ANALYSIS_PROMPT}\n\nYouTube video to analyze: ${opts.url}\n\nAdditional context:\n${contextBlock}`,
    });
  } else if (opts.direct_url) {
    // Upload the video to Gemini Files API
    const fileUri = await uploadVideoForAnalysis(opts.direct_url, genAI);
    if (fileUri) {
      parts.push({ text: ANALYSIS_PROMPT });
      parts.push({ text: `\nContext:\n${contextBlock}` });
      parts.push({ fileData: { mimeType: 'video/mp4', fileUri } });

      // Clean up file after analysis
      setTimeout(() => deleteGeminiFile(fileUri, opts.geminiApiKey), 5_000);
    } else {
      // Fallback: text-only
      parts.push({ text: `${ANALYSIS_PROMPT}\n\nContext (video unavailable, analyze from metadata only):\n${contextBlock}` });
    }
  } else {
    // Text-only analysis
    parts.push({ text: `${ANALYSIS_PROMPT}\n\nContext (no video available, analyze from metadata only):\n${contextBlock}` });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text().trim();

  // Strip possible markdown fences
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(json) as VideoAnalysis;
}
