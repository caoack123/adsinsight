/**
 * POST /api/ai/optimize-title
 *
 * Generates an optimised Google Shopping Product Title using a Claude model.
 * Auth priority:
 *   1. api_key in request body  → OpenRouter (from client Settings page)
 *   2. OPENROUTER_API_KEY env   → OpenRouter (server-side)
 *   3. ANTHROPIC_API_KEY env    → Anthropic SDK directly (legacy fallback)
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getAiCache, upsertAiCache } from '@/lib/db';

export interface OptimizeTitleRequest {
  current_title: string;
  brand: string;
  product_type: string;
  price: number;
  currency: string;
  ctr: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  top_search_terms: string[];
  rule_issues: {
    type: string;
    description_zh: string;
    severity: string;
  }[];
  // Optional overrides from client Settings
  api_key?: string;
  model?: string;
  // Optional — for caching
  account_id?: string;
  item_group_id?: string;
}

export interface OptimizeTitleResponse {
  suggested_title: string;
  reasoning: string;
  estimated_ctr_lift: string;
}

export async function POST(request: NextRequest) {
  let body: OptimizeTitleRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    current_title, brand, product_type, price, currency,
    ctr, impressions, clicks, conversions, cost,
    top_search_terms, rule_issues,
    api_key: clientKey, model: clientModel,
    account_id, item_group_id,
  } = body;

  // ── Cache lookup ───────────────────────────────────────────────────────────
  if (account_id && item_group_id) {
    const cached = await getAiCache({ account_id, entity_type: 'feed_product', entity_id: item_group_id }).catch(() => null);
    if (cached) return NextResponse.json(cached.result);
  }

  const openrouterKey = clientKey || process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openrouterKey && !anthropicKey) {
    return NextResponse.json(
      { error: '未配置 API Key。请在设置页填写 OpenRouter Key，或在服务器配置 OPENROUTER_API_KEY / ANTHROPIC_API_KEY。' },
      { status: 500 }
    );
  }

  const roas = cost > 0 ? ((conversions * price) / cost).toFixed(2) : 'N/A';

  const prompt = `你是一位专业的 Google Shopping 广告优化师，服务于中国跨境电商卖家（面向美国市场）。

## 任务
为以下产品优化 Google Shopping 的 Product Title（标题），提升 CTR 和 ROAS。

## 产品信息
- 当前标题: ${current_title}
- 品牌: ${brand}
- 产品类型: ${product_type}
- 价格: ${currency} ${price}

## 实际广告效果数据
- 曝光量: ${impressions.toLocaleString()}
- 点击量: ${clicks.toLocaleString()}
- CTR: ${(ctr * 100).toFixed(2)}%（行业均值约 1.5-3%）
- 花费: $${cost.toFixed(2)}
- 转化数: ${conversions}
- ROAS: ${roas}x

## 用户实际搜索词（已触发该商品的高频词）
${top_search_terms.map(t => `- "${t}"`).join('\n')}

## 规则检测到的问题
${rule_issues.length > 0
  ? rule_issues.map(i => `- [${i.severity.toUpperCase()}] ${i.description_zh}`).join('\n')
  : '- 无明显规则问题'}

## Google Shopping 标题优化原则（你必须遵循）
1. 结构: [品牌] - [核心产品词] | [关键属性1] | [关键属性2]
2. 品牌名放在最开头
3. 最重要的关键词（与搜索词匹配的）尽量前置
4. 包含颜色、材质、尺寸、场景等高搜索量的属性词
5. 去掉"Fashion"、"High Quality"等空洞词
6. 总长度控制在 150 字符以内，核心信息在前 70 字符
7. 不要重复词语
8. 标题必须是英文

## 输出格式（严格按照 JSON 返回，不要有其他文字）
{
  "suggested_title": "优化后的英文标题",
  "reasoning": "用中文解释为什么这样改，结合实际的 CTR/ROAS 数据说明问题所在，给出具体的优化逻辑。200-300字。",
  "estimated_ctr_lift": "基于当前 CTR 估算提升幅度，格式如 +15-25%"
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
    const result: OptimizeTitleResponse = JSON.parse(cleaned);

    // ── Save to cache ──────────────────────────────────────────────────────
    if (account_id && item_group_id) {
      await upsertAiCache({
        account_id,
        entity_type: 'feed_product',
        entity_id: item_group_id,
        model_used: clientModel || 'anthropic/claude-sonnet-4-5',
        result: result as unknown as Record<string, unknown>,
      }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[AI optimize-title]', err);
    return NextResponse.json(
      { error: 'AI generation failed', detail: String(err) },
      { status: 500 }
    );
  }
}
