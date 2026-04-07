import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceDaily } from '@/lib/db';

// ── Demo data generator ───────────────────────────────────────────────────────
function generateDemoData(days: number) {
  const result = [];
  const now = new Date('2026-04-07');
  // Seed for deterministic "random" values
  let seed = 42;
  function rand() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay(); // 0=Sun, 6=Sat — lower on weekends
    const weekMult = (dow === 0 || dow === 6) ? 0.65 : 1.0;
    // Slow upward trend over the year
    const trendMult = 0.7 + (days - i) / days * 0.6;

    const baseCost = (120 + rand() * 60) * weekMult * trendMult;
    const impressions = Math.round((8000 + rand() * 4000) * weekMult * trendMult);
    const clicks = Math.round(impressions * (0.010 + rand() * 0.006));
    const conversions = clicks * (0.025 + rand() * 0.025);
    const avgOrderValue = 75 + rand() * 60;
    const convValue = conversions * avgOrderValue;

    result.push({
      date: dateStr,
      cost: parseFloat(baseCost.toFixed(2)),
      impressions,
      clicks,
      ctr: impressions > 0 ? parseFloat((clicks / impressions).toFixed(4)) : 0,
      conversions: parseFloat(conversions.toFixed(2)),
      conversions_value: parseFloat(convValue.toFixed(2)),
      roas: baseCost > 0 ? parseFloat((convValue / baseCost).toFixed(2)) : 0,
      cpc: clicks > 0 ? parseFloat((baseCost / clicks).toFixed(2)) : 0,
      cvr: clicks > 0 ? parseFloat((conversions / clicks).toFixed(4)) : 0,
    });
  }
  return result;
}

// ── Aggregate raw DB rows by date ─────────────────────────────────────────────
function aggregateByDate(rows: Record<string, unknown>[]) {
  const byDate: Record<string, {
    date: string; cost: number; impressions: number; clicks: number;
    conversions: number; conversions_value: number;
  }> = {};

  for (const row of rows) {
    const d = String(row.date);
    if (!byDate[d]) byDate[d] = { date: d, cost: 0, impressions: 0, clicks: 0, conversions: 0, conversions_value: 0 };
    byDate[d].cost += Number(row.cost) || 0;
    byDate[d].impressions += Number(row.impressions) || 0;
    byDate[d].clicks += Number(row.clicks) || 0;
    byDate[d].conversions += Number(row.conversions) || 0;
    byDate[d].conversions_value += Number(row.conversions_value) || 0;
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      cost: parseFloat(d.cost.toFixed(2)),
      ctr: d.impressions > 0 ? parseFloat((d.clicks / d.impressions).toFixed(4)) : 0,
      cpc: d.clicks > 0 ? parseFloat((d.cost / d.clicks).toFixed(2)) : 0,
      roas: d.cost > 0 ? parseFloat((d.conversions_value / d.cost).toFixed(2)) : 0,
      cvr: d.clicks > 0 ? parseFloat((d.conversions / d.clicks).toFixed(4)) : 0,
    }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id') ?? 'demo';
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30'), 7), 365);

  if (accountId === 'demo') {
    return NextResponse.json({ data: generateDemoData(days) });
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];

    const rows = await getPerformanceDaily(accountId, startStr);
    if (rows.length === 0) {
      // No real data yet — return empty so UI shows "no data" state
      return NextResponse.json({ data: [], message: '暂无性能数据，请运行 Google Ads 脚本同步' });
    }
    return NextResponse.json({ data: aggregateByDate(rows as Record<string, unknown>[]) });
  } catch (err) {
    console.error('[/api/data/performance]', err);
    return NextResponse.json({ data: [], error: String(err) });
  }
}
