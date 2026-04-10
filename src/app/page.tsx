'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { MODULE_REGISTRY } from '@/lib/modules';
import { analyzeTitles, computeSummary as computeFeedSummary } from '@/modules/feed-optimizer/processor';
import { annotateChanges, computeSummary as computeChangeSummary } from '@/modules/change-tracker/processor';
import { getScoreTone } from '@/lib/feed-optimizer';
import { getVerdictConfig } from '@/lib/change-tracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Video, Eye, Scale, History, ChevronRight, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const ICON_MAP: Record<string, React.ElementType> = { ShoppingBag, Video, Eye, Scale, History };

// ── Time range options ─────────────────────────────────────────────────────────
const TIME_RANGES = [
  { days: 7 },
  { days: 30 },
  { days: 90 },
  { days: 365 },
] as const;

function timeRangeLabel(days: number, lang: 'zh' | 'en'): string {
  return lang === 'en' ? `${days}d` : `${days}天`;
}

type DailyRow = {
  date: string; cost: number; impressions: number; clicks: number;
  ctr: number; conversions: number; conversions_value: number; roas: number;
  cpc: number; cvr: number;
};

// Group daily rows by week or month for cleaner charts when range > 30d
function groupData(rows: DailyRow[], days: number): { label: string; cost: number; roas: number; ctr: number; cpc: number; cvr: number }[] {
  if (days <= 30) {
    return rows.map(r => ({
      label: r.date.slice(5), // MM-DD
      cost: r.cost, roas: r.roas, ctr: +(r.ctr * 100).toFixed(2),
      cpc: r.cpc, cvr: +(r.cvr * 100).toFixed(2),
    }));
  }

  // Group by week (for 90d) or month (for 365d)
  const buckets: Record<string, { cost: number; conv_val: number; clicks: number; impressions: number; conversions: number }> = {};
  for (const r of rows) {
    const d = new Date(r.date);
    let key: string;
    if (days <= 90) {
      // Week key: year-week
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      key = startOfWeek.toISOString().split('T')[0].slice(5); // MM-DD of week start
    } else {
      key = r.date.slice(0, 7); // YYYY-MM
    }
    if (!buckets[key]) buckets[key] = { cost: 0, conv_val: 0, clicks: 0, impressions: 0, conversions: 0 };
    buckets[key].cost += r.cost;
    buckets[key].conv_val += r.conversions_value;
    buckets[key].clicks += r.clicks;
    buckets[key].impressions += r.impressions;
    buckets[key].conversions += r.conversions;
  }

  return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([label, b]) => ({
    label,
    cost: +b.cost.toFixed(2),
    roas: b.cost > 0 ? +(b.conv_val / b.cost).toFixed(2) : 0,
    ctr: b.impressions > 0 ? +((b.clicks / b.impressions) * 100).toFixed(2) : 0,
    cpc: b.clicks > 0 ? +(b.cost / b.clicks).toFixed(2) : 0,
    cvr: b.clicks > 0 ? +((b.conversions / b.clicks) * 100).toFixed(2) : 0,
  }));
}

// Compute period totals for KPI comparison
function periodTotals(rows: DailyRow[]) {
  const half = Math.floor(rows.length / 2);
  const prev = rows.slice(0, half);
  const curr = rows.slice(half);
  function agg(arr: DailyRow[]) {
    const cost = arr.reduce((s, r) => s + r.cost, 0);
    const clicks = arr.reduce((s, r) => s + r.clicks, 0);
    const impressions = arr.reduce((s, r) => s + r.impressions, 0);
    const conversions = arr.reduce((s, r) => s + r.conversions, 0);
    const conv_val = arr.reduce((s, r) => s + r.conversions_value, 0);
    return {
      cost, clicks, impressions, conversions, conv_val,
      roas: cost > 0 ? conv_val / cost : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cvr: clicks > 0 ? (conversions / clicks) * 100 : 0,
    };
  }
  return { curr: agg(curr), prev: agg(prev) };
}

export default function OverviewPage() {
  const { selectedAccountId } = useSettings();
  const { t, lang } = useI18n();

  const [feedSummary, setFeedSummary] = useState<ReturnType<typeof computeFeedSummary> | null>(null);
  const [changeSummary, setChangeSummary] = useState<ReturnType<typeof computeChangeSummary> | null>(null);
  const [videoSummary, setVideoSummary] = useState<{ total: number; analyzed: number; avgScore: number | null }>({ total: 0, analyzed: 0, avgScore: null });
  const [feedAlerts, setFeedAlerts] = useState<{ id: string; title: string; score: number; summary: string; estimatedCtrLift: string }[]>([]);
  const [changeAlerts, setChangeAlerts] = useState<{ id: string; resource: string; verdict: string; insight_zh: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Performance chart state
  const [perfDays, setPerfDays] = useState(30);
  const [perfData, setPerfData] = useState<DailyRow[]>([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<'cost' | 'roas' | 'ctr' | 'cpc' | 'cvr'>('cost');

  useEffect(() => {
    setLoading(true);
    const acct = selectedAccountId;

    Promise.all([
      fetch(`/api/data/feed?account_id=${acct}`).then(r => r.json()),
      fetch(`/api/data/changes?account_id=${acct}`).then(r => r.json()),
      fetch(`/api/data/videos?account_id=${acct}`).then(r => r.json()),
    ]).then(([feedData, changeData, videoData]) => {
      // Feed
      const analyses = analyzeTitles(feedData.products ?? []);
      const fs = computeFeedSummary(analyses);
      setFeedSummary(fs);
      setFeedAlerts(
        analyses
          .filter(a => a.score < 60)
          .sort((a, b) => a.score - b.score)
          .slice(0, 2)
          .map(a => ({
            id: a.product.item_group_id,
            title: a.product.current_title?.slice(0, 50) ?? a.product.item_group_id,
            score: a.score,
            summary: a.issues.map(i => i.description_zh).join('；'),
            estimatedCtrLift: a.estimated_ctr_lift ?? '+10-20%',
          }))
      );

      // Changes
      const changes = (changeData.changes ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        timestamp: c.changed_at ?? c.timestamp ?? new Date().toISOString(),
      }));
      const annotated = annotateChanges(changes);
      setChangeSummary(computeChangeSummary(annotated));
      setChangeAlerts(
        annotated
          .filter(a => a.delta.verdict === 'negative')
          .slice(0, 1)
          .map(a => ({
            id: a.change.change_id,
            resource: a.change.resource_name,
            verdict: a.delta.verdict,
            insight_zh: a.delta.insight_zh,
          }))
      );

      // Videos
      const videos = videoData.videos ?? [];
      const analyzed = videos.filter((v: Record<string, unknown>) => v.abcd_analysis || v.performance).length;
      const scores = videos
        .map((v: Record<string, unknown>) => (v.abcd_analysis as Record<string, unknown>)?.overall_score as number)
        .filter((s: unknown): s is number => typeof s === 'number');
      setVideoSummary({
        total: videos.length,
        analyzed,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null,
      });
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  // Fetch 2× the display period so we can compare curr vs prev half
  useEffect(() => {
    setPerfLoading(true);
    fetch(`/api/data/performance?account_id=${selectedAccountId}&days=${perfDays * 2}`)
      .then(r => r.json())
      .then(d => setPerfData(d.data ?? []))
      .catch(() => setPerfData([]))
      .finally(() => setPerfLoading(false));
  }, [selectedAccountId, perfDays]);

  const enabledModules = Object.entries(MODULE_REGISTRY).filter(([, m]) => m.enabled);
  const disabledModules = Object.entries(MODULE_REGISTRY).filter(([, m]) => !m.enabled);

  // Split at perfDays: recent half for chart & KPI, prior half for comparison
  const recentData = useMemo(() => perfData.slice(-perfDays), [perfData, perfDays]);
  const chartData = useMemo(() => groupData(recentData, perfDays), [recentData, perfDays]);
  const kpi = useMemo(() => perfData.length > 0 ? periodTotals(perfData) : null, [perfData]);

  const METRIC_CONFIG = {
    cost:  { label: lang === 'en' ? 'Spend ($)' : '消耗 ($)', color: '#60a5fa', format: (v: number) => `$${v.toFixed(2)}`, unit: '$' },
    roas:  { label: 'ROAS',                                   color: '#34d399', format: (v: number) => `${v.toFixed(2)}x`,  unit: 'x' },
    ctr:   { label: 'CTR (%)',                                color: '#f472b6', format: (v: number) => `${v.toFixed(2)}%`,  unit: '%' },
    cpc:   { label: 'CPC ($)',                                color: '#fb923c', format: (v: number) => `$${v.toFixed(2)}`,  unit: '$' },
    cvr:   { label: 'CVR (%)',                                color: '#a78bfa', format: (v: number) => `${v.toFixed(2)}%`,  unit: '%' },
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold">
          {selectedAccountId === 'demo' ? t('ov_demo_title') : t('ov_account_title')}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t('ov_subtitle')}</p>
      </div>

      {/* Quick Diagnosis */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-400" />
            {t('ov_quick_diag')}
            {loading && <Loader2 size={12} className="animate-spin text-muted-foreground ml-1" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {feedAlerts.map(alert => {
            const tone = getScoreTone(alert.score);
            return (
              <Link key={alert.id} href={`/feed-optimizer/${alert.id}`}
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-accent/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400">{t('ov_feed_badge')}</Badge>
                    <span className="text-xs font-semibold text-foreground truncate">{alert.title}</span>
                    <Badge variant="outline" className={cn('text-xs px-1.5 shrink-0', tone.badgeClassName)}>{alert.score}/100</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">{alert.summary}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
          {changeAlerts.map(alert => {
            const vc = getVerdictConfig(alert.verdict as Parameters<typeof getVerdictConfig>[0]);
            return (
              <Link key={alert.id} href="/change-tracker"
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-accent/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">{t('ov_change_badge')}</Badge>
                    <span className="text-xs font-semibold text-foreground truncate">{alert.resource}</span>
                    <Badge variant="outline" className={cn('text-xs px-1.5 shrink-0', vc.badgeClass)}>{vc.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{alert.insight_zh}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
          {!loading && feedAlerts.length === 0 && changeAlerts.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">{t('ov_no_issues')}</p>
          )}
        </CardContent>
      </Card>

      {/* Enabled modules */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{t('ov_enabled_modules')}</p>
        <div className="grid grid-cols-3 gap-3">
          {enabledModules.map(([key, mod]) => {
            const Icon = ICON_MAP[mod.icon] || ShoppingBag;
            return (
              <Link key={key} href={mod.path}>
                <Card className="border-blue-400/50 bg-blue-50 hover:bg-blue-100/80 dark:border-blue-500/30 dark:bg-blue-950/10 dark:hover:bg-blue-950/20 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} className="text-blue-400" />
                      <CardTitle className="text-sm font-semibold">{lang === 'en' ? mod.label_en : mod.label}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground">{lang === 'en' ? mod.description_en : mod.description}</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {key === 'feed-optimizer' && feedSummary && (
                      <div className="flex gap-4 mt-1">
                        <div><p className="text-xs text-muted-foreground">{t('ov_products')}</p><p className="text-lg font-bold">{feedSummary.total_products}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('ov_avg_score')}</p><p className={cn('text-lg font-bold', getScoreTone(feedSummary.avg_title_score).textClassName)}>{feedSummary.avg_title_score}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('ov_needs_opt')}</p><p className="text-lg font-bold text-amber-400">{feedSummary.products_need_attention}</p></div>
                      </div>
                    )}
                    {key === 'change-tracker' && changeSummary && (
                      <div className="flex gap-4 mt-1">
                        <div><p className="text-xs text-muted-foreground">{t('ov_total_changes')}</p><p className="text-lg font-bold">{changeSummary.total_changes}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('ov_positive')}</p><p className="text-lg font-bold text-green-600 dark:text-green-400">{changeSummary.positive_changes}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('ov_negative')}</p><p className="text-lg font-bold text-red-600 dark:text-red-400">{changeSummary.negative_changes}</p></div>
                      </div>
                    )}
                    {key === 'video-abcd' && (
                      <div className="flex gap-4 mt-1">
                        <div><p className="text-xs text-muted-foreground">{t('ov_videos')}</p><p className="text-lg font-bold">{videoSummary.total}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('ov_analyzed')}</p><p className="text-lg font-bold text-blue-400">{videoSummary.analyzed}</p></div>
                        <div><p className="text-xs text-muted-foreground">{t('ov_avg_score_v')}</p><p className="text-lg font-bold text-muted-foreground">{videoSummary.avgScore ?? '—'}</p></div>
                      </div>
                    )}
                    {loading && <div className="mt-2 h-8 bg-muted/30 rounded animate-pulse" />}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Account Performance Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" />
              {t('ov_perf_title')}
              {perfLoading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
            </CardTitle>
            {/* Time range tabs */}
            <div className="flex gap-1">
              {TIME_RANGES.map(tr => (
                <button
                  key={tr.days}
                  onClick={() => setPerfDays(tr.days)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded border transition-colors',
                    perfDays === tr.days
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:bg-accent/20'
                  )}
                >
                  {timeRangeLabel(tr.days, lang)}
                </button>
              ))}
            </div>
          </div>
          {/* Metric selector */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {(Object.entries(METRIC_CONFIG) as [keyof typeof METRIC_CONFIG, (typeof METRIC_CONFIG)[keyof typeof METRIC_CONFIG]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded transition-colors',
                  activeMetric === key ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {/* KPI comparison row */}
          {kpi && (
            <div className="grid grid-cols-5 gap-2 mb-4 px-2">
              {([
                { key: 'cost',  label: t('ov_spend_label'),  curr: kpi.curr.cost,  prev: kpi.prev.cost,  fmt: (v: number) => `$${v.toFixed(0)}`,  higherIsBad: true },
                { key: 'roas',  label: 'ROAS',  curr: kpi.curr.roas,  prev: kpi.prev.roas,  fmt: (v: number) => `${v.toFixed(2)}x`,  higherIsBad: false },
                { key: 'cpc',   label: 'CPC',   curr: kpi.curr.cpc,   prev: kpi.prev.cpc,   fmt: (v: number) => `$${v.toFixed(2)}`,  higherIsBad: true },
                { key: 'ctr',   label: 'CTR',   curr: kpi.curr.ctr,   prev: kpi.prev.ctr,   fmt: (v: number) => `${v.toFixed(2)}%`,  higherIsBad: false },
                { key: 'cvr',   label: 'CVR',   curr: kpi.curr.cvr,   prev: kpi.prev.cvr,   fmt: (v: number) => `${v.toFixed(2)}%`,  higherIsBad: false },
              ] as const).map(({ key, label, curr, prev, fmt, higherIsBad }) => {
                const delta = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                const isUp = delta > 0.5;
                const isDown = delta < -0.5;
                const isGood = higherIsBad ? isDown : isUp;
                const isBad = higherIsBad ? isUp : isDown;
                return (
                  <div key={key} className={cn(
                    'rounded p-2 border',
                    activeMetric === key ? 'border-blue-400 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/20' : 'border-border bg-card/50'
                  )}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold tabular-nums">{fmt(curr)}</p>
                    {Math.abs(delta) > 0.5 && (
                      <div className={cn(
                        'flex items-center gap-0.5 text-xs',
                        isGood && 'text-green-600 dark:text-green-400',
                        isBad && 'text-red-600 dark:text-red-400',
                        !isGood && !isBad && 'text-muted-foreground'
                      )}>
                        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart */}
          {recentData.length === 0 && !perfLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
              {t('ov_no_perf')} {perfDays} {t('ov_trend_suffix')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={METRIC_CONFIG[activeMetric].color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={METRIC_CONFIG[activeMetric].color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => METRIC_CONFIG[activeMetric].unit === '$' ? `$${v}` : `${v}${METRIC_CONFIG[activeMetric].unit}`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px' }}
                  formatter={(value) => [METRIC_CONFIG[activeMetric].format(Number(value ?? 0)), METRIC_CONFIG[activeMetric].label]}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={METRIC_CONFIG[activeMetric].color}
                  strokeWidth={1.5}
                  fill="url(#perfGrad)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Coming soon */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{t('ov_coming_soon')}</p>
        <div className="grid grid-cols-3 gap-3">
          {disabledModules.map(([key, mod]) => {
            const Icon = ICON_MAP[mod.icon] || ShoppingBag;
            return (
              <Card key={key} className="border-border opacity-50 cursor-not-allowed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className="text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold text-muted-foreground">{lang === 'en' ? mod.label_en : mod.label}</CardTitle>
                    <Badge variant="outline" className="text-xs ml-auto border-border text-muted-foreground">{t('ov_coming_soon')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{lang === 'en' ? mod.description_en : mod.description}</p>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
