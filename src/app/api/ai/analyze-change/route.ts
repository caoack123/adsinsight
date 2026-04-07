/**
 * POST /api/ai/analyze-change
 *
 * Analyses the performance impact of a Google Ads account change using an AI model.
 * Auth priority:
 *   1. api_key in request body  → OpenRouter (from client Settings page)
 *   2. OPENROUTER_API_KEY env   → OpenRouter (server-side)
 *   3. ANTHROPIC_API_KEY env    → Anthropic SDK directly
 *   4. GOOGLE_AI_API_KEY env    → Google AI SDK (Gemini) — works if video analysis is configured
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getAiCache, upsertAiCache } from '@/lib/db';

export interface AnalyzeChangeRequest {
  change_type: string;
  resource_type: string;
  resource_name: string;
  campaign: string;
  ad_group: string | null;
  changed_by: string;
  timestamp: string;
  old_value: string | null;
  new_value: string | null;
  performance_before: {
    window_days: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversions_value: number;
    roas: number;
  } | null;
  performance_after: {
    window_days: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversions_value: number;
    roas: number;
  } | null;
  delta: {
    impressions_delta: number;
    clicks_delta: number;
    ctr_delta: number;
    cost_delta: number;
    conversions_delta: number;
    roas_delta: number;
  } | null;
  // Optional overrides from client Settings
  api_key?: string;
  model?: string;
  // Optional — for caching
  account_id?: string;
  change_id?: string;
}

export interface AnalyzeChangeResponse {
  verdict: 'positive' | 'negative' | 'neutral' | 'paused';
  verdict_reason_zh: string;
  insight_zh: string;
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  BIDDING_STRATEGY_CHANGED: '出价策略变更',
  BID_CHANGED: '出价调整',
  BUDGET_CHANGED: '预算调整',
  AD_PAUSED: '广告暂停',
  AD_ENABLED: '广告启用',
  CAMPAIGN_PAUSED: '广告系列暂停',
  CAMPAIGN_ENABLED: '广告系列启用',
  KEYWORD_ADDED: '关键词新增',
  KEYWORD_REMOVED: '关键词删除',
  KEYWORD_PAUSED: '关键词暂停',
  AD_GROUP_ADDED: '广告组新增',
  AD_GROUP_PAUSED: '广告组暂停',
  CAMPAIGN_UPDATED: '广告系列更新',
  AD_GROUP_UPDATED: '广告组更新',
  AD_UPDATED: '广告更新',
};

export async function POST(request: NextRequest) {
  let body: AnalyzeChangeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { api_key: clientKey, model: clientModel, account_id, change_id } = body;

  // ── Cache lookup ───────────────────────────────────────────────────────────
  if (account_id && change_id) {
    const cached = await getAiCache({ account_id, entity_type: 'change_record', entity_id: change_id }).catch(() => null);
    if (cached) return NextResponse.json(cached.result);
  }

  const openrouterKey = clientKey || process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY;

  if (!openrouterKey && !anthropicKey && !googleKey) {
    return NextResponse.json(
      { error: '未配置 AI API Key。请在设置页填写 OpenRouter Key，或在 Vercel 环境变量中配置 OPENROUTER_API_KEY / ANTHROPIC_API_KEY / GOOGLE_AI_API_KEY。' },
      { status: 500 }
    );
  }

  const changeLabel = CHANGE_TYPE_LABEL[body.change_type] ?? body.change_type.replace(/_/g, ' ');
  const isPaused = body.change_type.includes('PAUSED');

  // Parse change values for readability
  const oldVal = parseChangeVal(body.old_value);
  const newVal = parseChangeVal(body.new_value);

  // Build performance section based on data availability
  const { before, after, delta } = normalise(body);
  const perfSection = (before && after && delta) ? `
## 变更前效果（${before.window_days} 天均值）
| 指标 | 数值 |
|------|------|
| 曝光量 | ${before.impressions.toLocaleString()} |
| 点击量 | ${before.clicks.toLocaleString()} |
| CTR | ${(before.ctr * 100).toFixed(2)}% |
| 花费 | $${before.cost.toFixed(2)} |
| 转化数 | ${before.conversions.toFixed(1)} |
| ROAS | ${before.roas.toFixed(2)}x |

## 变更后效果（${after.window_days} 天，已换算同期对比）
| 指标 | 数值 | 变化 |
|------|------|------|
| 曝光量 | ${after.impressions.toLocaleString()} | ${fmt(delta.impressions_delta)} |
| 点击量 | ${after.clicks.toLocaleString()} | ${fmt(delta.clicks_delta)} |
| CTR | ${(after.ctr * 100).toFixed(2)}% | ${fmt(delta.ctr_delta * 100, 2)}pp |
| 花费 | $${after.cost.toFixed(2)} | $${fmt(delta.cost_delta)} |
| 转化数 | ${after.conversions.toFixed(1)} | ${fmt(delta.conversions_delta)} |
| ROAS | ${after.roas.toFixed(2)}x | ${fmt(delta.roas_delta)}x |` : `
## 效果数据
暂无采集到变更前后的效果快照。请仅基于变更类型和变更内容进行分析，给出专业判断。`;

  const prompt = `你是一位资深的 Google Ads 优化师，服务于中国跨境电商卖家（面向美国市场）。

## 任务
分析以下账号操作变更，给出中文专业诊断。

## 变更信息
- 变更类型: ${changeLabel}
- 所属广告系列: ${body.campaign}${body.ad_group ? `\n- 广告组: ${body.ad_group}` : ''}
- 操作人: ${body.changed_by}
- 变更时间: ${new Date(body.timestamp).toLocaleString('zh-CN')}
- 变更内容: ${oldVal && newVal ? `${oldVal} → ${newVal}` : newVal ?? oldVal ?? '（无具体值）'}
${perfSection}

## 分析要求
1. 首先判断这次变更是正向（positive）、负向（negative）、中性（neutral）还是暂停操作（paused）
2. 结合变更类型和数据给出专业解释：
   - 这个操作的意图是什么？
   - ${before && after ? '数据变化说明了什么？这个决策是否正确？' : '基于变更内容，预判可能的影响方向。'}
   - ${isPaused ? '暂停是否合理？' : '还有哪些可以进一步优化？'}
3. 语气像一个有 5 年经验的 Google Ads 顾问在给客户写诊断报告
4. ${before && after ? '必须结合实际数字，不要泛泛而谈' : '由于无历史效果数据，请基于变更类型给出一般性专业建议'}

## 输出格式（严格按照 JSON 返回，不要有其他文字）
{
  "verdict": "positive | negative | neutral | paused",
  "verdict_reason_zh": "一句话总结，10字以内，如：ROAS 显著提升 / 出价过高浪费 / 效果持平",
  "insight_zh": "详细分析，150-250字，结合实际数据（如有），给出明确的行动建议"
}`;

  try {
    let text: string;
    const selectedModel = clientModel || 'anthropic/claude-sonnet-4-5';
    const isGoogleModel = selectedModel.startsWith('google/');

    if (openrouterKey) {
      // ── OpenRouter (Claude or Google via OpenRouter) ─────────────────────
      const orModel = isGoogleModel ? selectedModel : selectedModel;
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          'X-Title': 'AdInsight AI',
        },
        body: JSON.stringify({
          model: orModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter ${res.status}: ${errText}`);
      }
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? '';
    } else if (googleKey && (isGoogleModel || !anthropicKey)) {
      // ── Google AI SDK (Gemini) ────────────────────────────────────────────
      const geminiModelName = isGoogleModel
        ? selectedModel.replace('google/', '')  // 'gemini-2.5-flash'
        : 'gemini-2.5-flash';
      const genAI = new GoogleGenerativeAI(googleKey);
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const result = await model.generateContent(prompt);
      text = result.response.text();
    } else {
      // ── Anthropic SDK fallback ────────────────────────────────────────────
      const client = new Anthropic({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      text = message.content[0].type === 'text' ? message.content[0].text : '';
    }

    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const result: AnalyzeChangeResponse = JSON.parse(cleaned);

    // ── Save to cache ──────────────────────────────────────────────────────
    if (account_id && change_id) {
      await upsertAiCache({
        account_id,
        entity_type: 'change_record',
        entity_id: change_id,
        model_used: selectedModel,
        result: result as unknown as Record<string, unknown>,
      }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI analyze-change]', err);
    return NextResponse.json(
      { error: 'AI 分析失败', detail: String(err) },
      { status: 500 }
    );
  }
}

function normalise(body: AnalyzeChangeRequest) {
  const before = body.performance_before;
  const after = body.performance_after;
  const delta = body.delta;
  if (!before || !after || !delta) return { before: null, after: null, delta: null };
  const scale = (before.window_days > 0 && after.window_days > 0) ? before.window_days / after.window_days : 1;
  return {
    before,
    after: {
      ...after,
      impressions: Math.round(after.impressions * scale),
      clicks: Math.round(after.clicks * scale),
      cost: after.cost * scale,
      conversions: after.conversions * scale,
      conversions_value: after.conversions_value * scale,
    },
    delta,
  };
}

function fmt(n: number, decimals = 1): string {
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(decimals)}`;
}

function parseChangeVal(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    const flat = flattenOne(obj);
    if (flat.status) return { ENABLED: '启用', PAUSED: '暂停', REMOVED: '删除' }[String(flat.status)] ?? String(flat.status);
    if (flat.cpcBidMicros != null) return `$${(Number(flat.cpcBidMicros) / 1e6).toFixed(2)} CPC`;
    if (flat.amountMicros != null) return `预算 $${(Number(flat.amountMicros) / 1e6).toFixed(2)}/天`;
    if (flat.targetRoas != null) {
      const v = typeof flat.targetRoas === 'object' ? (flat.targetRoas as Record<string, unknown>).targetRoas : flat.targetRoas;
      return `ROAS目标 ${(Number(v) * 100).toFixed(0)}%`;
    }
    if (flat.maximizeConversionValue != null) {
      const inner = flat.maximizeConversionValue as Record<string, unknown>;
      return `最大化转化价值${inner?.targetRoas ? ' ROAS ' + (Number(inner.targetRoas) * 100).toFixed(0) + '%' : ''}`;
    }
    if (flat.name != null) return String(flat.name).slice(0, 40);
    const keys = Object.keys(flat);
    if (keys.length > 0) {
      const v = flat[keys[0]];
      if (typeof v === 'string' || typeof v === 'number') return `${keys[0]}: ${v}`;
    }
    return raw.slice(0, 60);
  } catch {
    return raw.slice(0, 60);
  }
}

function flattenOne(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  const record = obj as Record<string, unknown>;
  const wrappers = ['campaign', 'adGroup', 'ad', 'campaignBudget', 'biddingStrategy', 'adGroupCriterion'];
  const keys = Object.keys(record);
  if (keys.length === 1 && wrappers.includes(keys[0])) {
    return flattenOne(record[keys[0]]);
  }
  return record;
}
