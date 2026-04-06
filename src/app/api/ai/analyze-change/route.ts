/**
 * POST /api/ai/analyze-change
 *
 * Analyses the performance impact of a Google Ads account change using a Claude model.
 * Auth priority:
 *   1. api_key in request body  → OpenRouter (from client Settings page)
 *   2. OPENROUTER_API_KEY env   → OpenRouter (server-side)
 *   3. ANTHROPIC_API_KEY env    → Anthropic SDK directly (legacy fallback)
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

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
  };
  performance_after: {
    window_days: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversions_value: number;
    roas: number;
  };
  delta: {
    impressions_delta: number;
    clicks_delta: number;
    ctr_delta: number;
    cost_delta: number;
    conversions_delta: number;
    roas_delta: number;
  };
  // Optional overrides from client Settings
  api_key?: string;
  model?: string;
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
};

export async function POST(request: NextRequest) {
  let body: AnalyzeChangeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { api_key: clientKey, model: clientModel } = body;
  const openrouterKey = clientKey || process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openrouterKey && !anthropicKey) {
    return NextResponse.json(
      { error: '未配置 API Key。请在设置页填写 OpenRouter Key，或在服务器配置 OPENROUTER_API_KEY / ANTHROPIC_API_KEY。' },
      { status: 500 }
    );
  }

  const { before, after, delta } = normalise(body);
  const changeLabel = CHANGE_TYPE_LABEL[body.change_type] ?? body.change_type;
  const isPaused = body.change_type.includes('PAUSED');

  const prompt = `你是一位资深的 Google Ads 优化师，服务于中国跨境电商卖家（面向美国市场）。

## 任务
分析以下账号操作变更对广告效果的影响，给出中文诊断。

## 变更信息
- 变更类型: ${changeLabel}
- 操作对象: ${body.resource_type} → "${body.resource_name}"
- 所属广告系列: ${body.campaign}${body.ad_group ? `\n- 广告组: ${body.ad_group}` : ''}
- 操作人: ${body.changed_by}
- 变更时间: ${new Date(body.timestamp).toLocaleString('zh-CN')}
- 变更内容: ${body.old_value ? `${body.old_value} → ${body.new_value}` : body.new_value ?? '（无具体值）'}

## 变更前效果（${before.window_days} 天）
| 指标 | 数值 |
|------|------|
| 曝光量 | ${before.impressions.toLocaleString()} |
| 点击量 | ${before.clicks.toLocaleString()} |
| CTR | ${(before.ctr * 100).toFixed(2)}% |
| 花费 | $${before.cost.toFixed(2)} |
| 转化数 | ${before.conversions.toFixed(1)} |
| 转化价值 | $${before.conversions_value.toFixed(2)} |
| ROAS | ${before.roas.toFixed(2)}x |
| 单次转化成本 | ${before.conversions > 0 ? '$' + (before.cost / before.conversions).toFixed(2) : 'N/A'} |

## 变更后效果（${after.window_days} 天，已换算为同等窗口对比）
| 指标 | 数值 | 变化 |
|------|------|------|
| 曝光量 | ${after.impressions.toLocaleString()} | ${fmt(delta.impressions_delta)} |
| 点击量 | ${after.clicks.toLocaleString()} | ${fmt(delta.clicks_delta)} |
| CTR | ${(after.ctr * 100).toFixed(2)}% | ${fmt(delta.ctr_delta * 100, 2)}pp |
| 花费 | $${after.cost.toFixed(2)} | $${fmt(delta.cost_delta)} |
| 转化数 | ${after.conversions.toFixed(1)} | ${fmt(delta.conversions_delta)} |
| ROAS | ${after.roas.toFixed(2)}x | ${fmt(delta.roas_delta)}x |
| 单次转化成本 | ${after.conversions > 0 ? '$' + (after.cost / after.conversions).toFixed(2) : 'N/A'} | — |

## 分析要求
1. 首先判断这次变更是正向（positive）、负向（negative）、中性（neutral）还是暂停操作（paused）
2. 结合变更类型和数据给出专业解释：
   - 数据变化的根本原因是什么？
   - 这个决策是否正确？
   - 如果是负向影响，建议如何调整？
   - 如果是正向，还有哪些可以进一步优化？
3. 语气像一个有 5 年经验的 Google Ads 顾问在给客户写诊断报告
4. 必须结合实际数字，不要泛泛而谈
5. ${isPaused ? '这是暂停操作，重点分析暂停是否合理，节省了多少浪费' : '重点分析变更前后的 ROAS 和转化效率变化'}

## 输出格式（严格按照 JSON 返回，不要有其他文字）
{
  "verdict": "positive | negative | neutral | paused",
  "verdict_reason_zh": "一句话总结，10字以内，如：ROAS 显著提升 / 出价过高浪费 / 效果持平",
  "insight_zh": "详细分析，150-250字，结合实际数据，给出明确的行动建议"
}`;

  try {
    let text: string;

    if (openrouterKey) {
      // ── OpenRouter ───────────────────────────────────────────────────────
      const model = clientModel || 'anthropic/claude-sonnet-4-5';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          'X-Title': 'AdInsight AI',
        },
        body: JSON.stringify({
          model,
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
    } else {
      // ── Anthropic SDK fallback ───────────────────────────────────────────
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
    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI analyze-change]', err);
    return NextResponse.json(
      { error: 'AI generation failed', detail: String(err) },
      { status: 500 }
    );
  }
}

function normalise(body: AnalyzeChangeRequest) {
  const before = body.performance_before;
  const after = body.performance_after;
  const scale = before.window_days / after.window_days;
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
    delta: body.delta,
  };
}

function fmt(n: number, decimals = 1): string {
  const s = n > 0 ? '+' : '';
  return `${s}${n.toFixed(decimals)}`;
}
