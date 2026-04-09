/**
 * POST /api/ai/analyze-video
 *
 * Runs all 22 ABCD signals against a YouTube video using Gemini 2.0 Flash.
 * Gemini natively understands YouTube URLs — no download needed.
 *
 * Architecture note:
 * Rather than 22 separate API calls (slow + expensive), we send ONE request
 * with all questions in a structured JSON schema. Gemini processes the full
 * video once and answers all signals simultaneously.
 *
 * Required env var: GOOGLE_AI_API_KEY (from https://aistudio.google.com/)
 */

import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { getAiCache, upsertAiCache } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  SIGNAL_DEFINITIONS,
  type ABCDAnalysis,
  type CategoryRating,
  type CategoryScore,
  type SignalEvaluation,
  type SignalKey,
  type SignalResult,
} from '@/modules/video-abcd/schema';

export interface AnalyzeVideoRequest {
  youtube_url: string;
  video_id: string;
  brand_name: string;
  branded_products: string[];
  // Optional overrides from client Settings
  api_key?: string;
  model?: string;
  // Optional — if provided, result will be cached in Supabase
  account_id?: string;
}

// ─── Gemini response schema ───────────────────────────────────────────────────

// Gemini will return this shape for every signal
interface GeminiSignalResult {
  key: string;
  result: 'YES' | 'NO' | 'UNKNOWN';
  confidence: number;   // 0.0–1.0
  note_zh: string;      // Brief Chinese explanation, ≤30 chars
}

interface GeminiAnalysisResponse {
  signals: GeminiSignalResult[];
  top_strengths_zh: string[];    // 3 items
  top_improvements_zh: string[]; // 3 items
  summary_zh: string;            // 2–3 sentences
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function rateCategory(score: number): CategoryRating {
  if (score >= 70) return 'excellent';
  if (score >= 40) return 'might_improve';
  return 'needs_review';
}

function buildCategoryScore(
  category: 'A' | 'B' | 'C' | 'D',
  evaluations: SignalEvaluation[]
): CategoryScore {
  const defs = SIGNAL_DEFINITIONS.filter(d => d.category === category);
  const evals = evaluations.filter(e => defs.some(d => d.key === e.key));

  let totalWeight = 0;
  let earnedWeight = 0;
  let passed = 0;

  for (const def of defs) {
    const ev = evals.find(e => e.key === def.key);
    totalWeight += def.weight;
    if (ev?.result === 'YES') {
      earnedWeight += def.weight;
      passed++;
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    category,
    score,
    rating: rateCategory(score),
    signals_passed: passed,
    signals_total: defs.length,
    evaluations: evals,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: AnalyzeVideoRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { youtube_url, video_id, brand_name, branded_products, api_key: clientKey, model: clientModel, account_id } = body;

  // ── Cache lookup ───────────────────────────────────────────────────────────
  if (account_id) {
    const cached = await getAiCache({ account_id, entity_type: 'video_ad', entity_id: video_id }).catch(() => null);
    if (cached) return NextResponse.json(cached.result);
  }

  const apiKey = clientKey || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '未配置 Google AI Key。请在设置页填写，或配置服务器端 GOOGLE_AI_API_KEY。' },
      { status: 500 }
    );
  }
  const product_list = branded_products.join(', ');

  // ── Build the signal question block ────────────────────────────────────────
  const signalQuestions = SIGNAL_DEFINITIONS.map(def => ({
    key: def.key,
    category: def.category,
    question: def.gemini_question
      .replace('{brand_name}', brand_name)
      .replace('{product_list}', product_list),
  }));

  const prompt = `You are an expert Google Ads video creative analyst. You will watch the provided YouTube video and evaluate it against the ABCD framework used by Google for effective video advertising.

## Brand context
- Brand name: ${brand_name}
- Products: ${product_list}

## Your task
Evaluate ALL of the following ${signalQuestions.length} signals by watching the video carefully. For each signal:
- result: "YES" if the criterion is clearly met, "NO" if not, "UNKNOWN" only if the video is truly ambiguous
- confidence: your confidence level 0.0–1.0
- note_zh: a brief Chinese explanation (≤30 characters) of why you answered YES or NO

## Signals to evaluate:
${signalQuestions.map((s, i) => `${i + 1}. key="${s.key}" [Category ${s.category}]: ${s.question}`).join('\n')}

## After evaluating all signals, also provide:
- top_strengths_zh: array of exactly 3 strings (Chinese), each describing a specific thing this ad does well
- top_improvements_zh: array of exactly 3 strings (Chinese), each describing a specific concrete improvement
- summary_zh: 2–3 sentence overall assessment in Chinese, referencing actual timestamps or specific moments

Be specific and actionable. Reference actual seconds in the video when possible.`;

  // ── Gemini structured output schema ────────────────────────────────────────
  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      signals: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            key: { type: SchemaType.STRING },
            result: { type: SchemaType.STRING, enum: ['YES', 'NO', 'UNKNOWN'] },
            confidence: { type: SchemaType.NUMBER },
            note_zh: { type: SchemaType.STRING },
          },
          required: ['key', 'result', 'confidence', 'note_zh'],
        },
      },
      top_strengths_zh: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      top_improvements_zh: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      summary_zh: { type: SchemaType.STRING },
    },
    required: ['signals', 'top_strengths_zh', 'top_improvements_zh', 'summary_zh'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as Schema;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: clientModel || 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    // Pass video as YouTube URL — Gemini natively supports this
    const result = await model.generateContent([
      { text: prompt },
      {
        fileData: {
          mimeType: 'video/mp4',
          fileUri: youtube_url,
        },
      },
    ]);

    const raw: GeminiAnalysisResponse = JSON.parse(result.response.text());

    // ── Map raw results to typed SignalEvaluations ──────────────────────────
    const evaluations: SignalEvaluation[] = SIGNAL_DEFINITIONS.map(def => {
      const found = raw.signals.find(s => s.key === def.key);
      return {
        key: def.key as SignalKey,
        result: (found?.result ?? 'UNKNOWN') as SignalResult,
        confidence: found?.confidence ?? 0,
        note_zh: found?.note_zh,
      };
    });

    // ── Build per-category scores ───────────────────────────────────────────
    const categories: CategoryScore[] = (
      ['A', 'B', 'C', 'D'] as const
    ).map(cat => buildCategoryScore(cat, evaluations));

    const totalWeight = SIGNAL_DEFINITIONS.reduce((s, d) => s + d.weight, 0);
    const earnedWeight = SIGNAL_DEFINITIONS.reduce((sum, def) => {
      const ev = evaluations.find(e => e.key === def.key);
      return sum + (ev?.result === 'YES' ? def.weight : 0);
    }, 0);
    const overall_score = Math.round((earnedWeight / totalWeight) * 100);

    const analysis: ABCDAnalysis = {
      video_id,
      youtube_url,
      analyzed_at: new Date().toISOString(),
      overall_score,
      overall_rating: rateCategory(overall_score),
      categories,
      top_strengths_zh: raw.top_strengths_zh.slice(0, 3),
      top_improvements_zh: raw.top_improvements_zh.slice(0, 3),
      summary_zh: raw.summary_zh,
      model: 'gemini-2.0-flash',
    };

    // ── Save to cache ────────────────────────────────────────────────────────
    if (account_id) {
      await upsertAiCache({
        account_id,
        entity_type: 'video_ad',
        entity_id: video_id,
        model_used: clientModel || 'gemini-2.0-flash',
        result: analysis as unknown as Record<string, unknown>,
      }).catch(() => {});
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('[AI analyze-video]', err);
    return NextResponse.json(
      { error: 'Gemini analysis failed', detail: String(err) },
      { status: 500 }
    );
  }
}
