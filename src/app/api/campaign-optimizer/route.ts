/**
 * POST /api/campaign-optimizer
 *
 * Analyzes demo campaign performance data + recent changes,
 * returns AI-generated optimization suggestions and new campaign ideas.
 *
 * Uses Google AI (Gemini) with structured JSON output.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import campaignData from '@/data/campaign-optimizer.json';

// ─── Request / Response types ─────────────────────────────────────────────────

export interface CampaignOptimizerRequest {
  gemini_api_key?: string;
  model?:          string;
  lang?:           'zh' | 'en';
}

export type SuggestionType =
  | 'INCREASE_BUDGET'
  | 'DECREASE_BUDGET'
  | 'INCREASE_BID'
  | 'DECREASE_BID'
  | 'CHANGE_BIDDING_STRATEGY'
  | 'PAUSE_AD_GROUP'
  | 'PAUSE_CAMPAIGN'
  | 'ADD_NEGATIVE_KEYWORDS'
  | 'SCALE_UP'
  | 'RESTRUCTURE';

export type Priority = 'high' | 'medium' | 'low';

export interface OptimizationSuggestion {
  id:              string;
  type:            SuggestionType;
  priority:        Priority;
  campaign:        string;
  ad_group:        string | null;
  title:           string;
  rationale:       string;
  action:          string;            // What exactly to do
  current_value:   string | null;    // e.g. "$50/day"
  recommended_value: string | null;  // e.g. "$80/day"
  expected_impact: string;           // e.g. "+35% ROAS"
  risk_level:      'low' | 'medium' | 'high';
}

export interface NewCampaignIdea {
  id:              string;
  name:            string;
  type:            'SEARCH' | 'SHOPPING' | 'PERFORMANCE_MAX' | 'DISPLAY' | 'VIDEO';
  rationale:       string;
  opportunity:     string;           // Why this gap exists
  budget:          string;           // e.g. "$40/day"
  bidding_strategy: string;
  target_roas:     string | null;
  keywords:        string[];         // For search campaigns
  audience:        string | null;
  expected_monthly_revenue: string;
  confidence:      'high' | 'medium' | 'low';
}

export interface CampaignOptimizerResponse {
  account_health_score: number;      // 0–100
  health_label:         string;
  summary:              string;
  quick_wins_count:     number;
  monthly_revenue_at_risk: string;
  monthly_revenue_opportunity: string;
  optimization_suggestions: OptimizationSuggestion[];
  new_campaign_ideas:   NewCampaignIdea[];
  generated_at:         string;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: CampaignOptimizerRequest = {};
  try { body = await request.json(); } catch { /* empty body ok */ }

  const { gemini_api_key, model = 'gemini-2.5-flash', lang = 'zh' } = body;
  const aiKey = gemini_api_key?.trim() || process.env.GOOGLE_AI_API_KEY;

  if (!aiKey) {
    return NextResponse.json(
      { error: 'Google AI API key not configured. Set GOOGLE_AI_API_KEY or pass gemini_api_key.' },
      { status: 400 },
    );
  }

  // ── Build context string ──────────────────────────────────────────────────

  const langNote = lang === 'zh'
    ? 'Write ALL text fields (title, rationale, action, expected_impact, opportunity, etc.) in Simplified Chinese (简体中文). Only brand names, campaign names, and technical terms like "ROAS", "CPA", "CTR" may stay in English.'
    : 'Write all text fields in English.';

  const campaignSummary = campaignData.campaigns.map(c => {
    const adGroupLines = c.ad_groups.map(ag =>
      `  • ${ag.name}: clicks=${ag.metrics.clicks}, ROAS=${ag.metrics.roas.toFixed(2)}x, cost=$${ag.metrics.cost.toFixed(0)}, conv=${ag.metrics.conversions}, CPA=$${ag.metrics.cost_per_conversion.toFixed(0)}`
    ).join('\n');
    const termLines = c.top_search_terms.slice(0, 3).map(t =>
      `  • "${t.query}": clicks=${t.clicks}, ROAS=${t.roas.toFixed(2)}x, cost=$${t.cost.toFixed(0)}`
    ).join('\n');

    return `### ${c.name} [${c.type}]
Status: ${c.status} | Strategy: ${c.bidding_strategy}${c.target_roas ? ` (tROAS ${(c.target_roas * 100).toFixed(0)}%)` : ''}
Budget: $${c.daily_budget}/day
Metrics (30d): impressions=${c.metrics.impressions.toLocaleString()}, clicks=${c.metrics.clicks}, CTR=${(c.metrics.ctr * 100).toFixed(1)}%, cost=$${c.metrics.cost.toFixed(0)}, conversions=${c.metrics.conversions}, revenue=$${c.metrics.conversions_value.toFixed(0)}, ROAS=${c.metrics.roas.toFixed(2)}x, CPC=$${c.metrics.cpc.toFixed(2)}, CPA=$${c.metrics.cost_per_conversion.toFixed(0)}
${adGroupLines ? `Ad Groups:\n${adGroupLines}` : ''}
${termLines ? `Top Search Terms:\n${termLines}` : ''}`;
  }).join('\n\n');

  const recentChanges = campaignData.recent_changes.map(r =>
    `• [${r.date}] ${r.campaign}: ${r.action} → ${r.result}`
  ).join('\n');

  const totals = campaignData.account_totals;

  const prompt = `You are a senior Google Ads optimization consultant specializing in cross-border e-commerce (US market).

## ${langNote}

## Account Overview
- Account: ${campaignData.account_name}
- Period: ${campaignData.date_range}
- Total spend: $${totals.total_cost.toFixed(0)} | Total revenue: $${totals.total_conversions_value.toFixed(0)} | Blended ROAS: ${totals.total_roas.toFixed(2)}x | Conversions: ${totals.total_conversions}
- Target ROAS: 3.0x (breakeven: ~1.8x after COGS)

## Campaign Performance Data
${campaignSummary}

## Recent Account Changes
${recentChanges}

## Your Task
Analyze the account deeply and generate:

1. **optimization_suggestions** (6–10 items): Specific, actionable changes to EXISTING campaigns/ad groups.
   - Include at least 2 HIGH priority items (immediate action needed)
   - Focus on: budget reallocation from low-ROAS to high-ROAS, bid strategy changes, pausing waste
   - Be very specific: say exactly what number to change to, not vague advice
   - account_health_score: 0-100 reflecting overall account efficiency

2. **new_campaign_ideas** (3–4 items): Untapped opportunities based on search term gaps and top performers.
   - Look at what's working and what audiences/products are underserved
   - Provide realistic budget recommendations and concrete keyword ideas

Priorities:
- "Search - Generic Jewelry" has ROAS 0.61x — bleeding money, needs urgent action
- "Shopping - Ice Jewelry" / Snow Boots ad group has ROAS 5.49x — massive scale opportunity
- Brand campaign performing well but budget may be limited
- PMax is underperforming vs target (2.09x vs 2.5x target)

Generate the full analysis now. Be direct, specific, and data-driven.`;

  // ── Gemini structured output ──────────────────────────────────────────────

  try {
    const genAI = new GoogleGenerativeAI(aiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          required: [
            'account_health_score', 'health_label', 'summary',
            'quick_wins_count', 'monthly_revenue_at_risk', 'monthly_revenue_opportunity',
            'optimization_suggestions', 'new_campaign_ideas',
          ],
          properties: {
            account_health_score:         { type: SchemaType.NUMBER },
            health_label:                 { type: SchemaType.STRING },
            summary:                      { type: SchemaType.STRING },
            quick_wins_count:             { type: SchemaType.NUMBER },
            monthly_revenue_at_risk:      { type: SchemaType.STRING },
            monthly_revenue_opportunity:  { type: SchemaType.STRING },
            optimization_suggestions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                required: ['id','type','priority','campaign','title','rationale','action',
                           'expected_impact','risk_level'],
                properties: {
                  id:                { type: SchemaType.STRING },
                  type:              { type: SchemaType.STRING },
                  priority:          { type: SchemaType.STRING },
                  campaign:          { type: SchemaType.STRING },
                  ad_group:          { type: SchemaType.STRING },
                  title:             { type: SchemaType.STRING },
                  rationale:         { type: SchemaType.STRING },
                  action:            { type: SchemaType.STRING },
                  current_value:     { type: SchemaType.STRING },
                  recommended_value: { type: SchemaType.STRING },
                  expected_impact:   { type: SchemaType.STRING },
                  risk_level:        { type: SchemaType.STRING },
                },
              },
            },
            new_campaign_ideas: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                required: ['id','name','type','rationale','opportunity','budget',
                           'bidding_strategy','expected_monthly_revenue','confidence'],
                properties: {
                  id:                      { type: SchemaType.STRING },
                  name:                    { type: SchemaType.STRING },
                  type:                    { type: SchemaType.STRING },
                  rationale:               { type: SchemaType.STRING },
                  opportunity:             { type: SchemaType.STRING },
                  budget:                  { type: SchemaType.STRING },
                  bidding_strategy:        { type: SchemaType.STRING },
                  target_roas:             { type: SchemaType.STRING },
                  keywords:                { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  audience:                { type: SchemaType.STRING },
                  expected_monthly_revenue:{ type: SchemaType.STRING },
                  confidence:              { type: SchemaType.STRING },
                },
              },
            },
          },
        },
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as Omit<CampaignOptimizerResponse, 'generated_at'>;

    // Ensure IDs are present (Gemini may omit them)
    parsed.optimization_suggestions = parsed.optimization_suggestions.map((s, i) => ({
      ...s, id: s.id || `opt_${i + 1}`,
    }));
    parsed.new_campaign_ideas = parsed.new_campaign_ideas.map((c, i) => ({
      ...c, id: c.id || `new_${i + 1}`,
    }));

    return NextResponse.json({
      ...parsed,
      generated_at: new Date().toISOString(),
    } satisfies CampaignOptimizerResponse);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[campaign-optimizer]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
