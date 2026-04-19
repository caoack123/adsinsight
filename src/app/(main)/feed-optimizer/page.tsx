'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { analyzeTitles, computeSummary } from '@/modules/feed-optimizer/processor';
import { getIssueTypeLabel, getScoreTone, getRoas } from '@/lib/feed-optimizer';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Loader2, Search, Layers, List, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TitleAnalysis, FeedOptimizerSummary } from '@/modules/feed-optimizer/schema';

type SortKey = 'score' | 'ctr' | 'cost' | 'roas' | 'issues' | 'price' | 'cvr' | 'cpc';
type SortDir = 'asc' | 'desc';
type DateRange = '7d' | '14d' | '30d' | '90d' | '180d' | '365d';
const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: '7d',   label: '7d'   },
  { key: '14d',  label: '14d'  },
  { key: '30d',  label: '30d'  },
  { key: '90d',  label: '90d'  },
  { key: '180d', label: '180d' },
  { key: '365d', label: '365d' },
];

// Get metrics for a specific date range, falling back to product-level metrics
function getRangeMetrics(product: TitleAnalysis['product'], range: DateRange) {
  const rm = product.metrics_by_range?.[range];
  if (rm) return rm;
  // fallback: use the stored 30d metrics (primary)
  return {
    impressions: product.impressions,
    clicks: product.clicks,
    ctr: product.ctr,
    cost: product.cost,
    conversions: product.conversions,
    conversions_value: product.conversions_value,
  };
}

interface GroupRow {
  item_group_id: string;
  label: string;
  count: number;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversions_value: number;
  minScore: number;
  totalIssues: number;
  items: TitleAnalysis[];
  ctr: number;
  roas: number;
  cvr: number;
  cpc: number;
  priceMin: number;
  priceMax: number;
}

// ── Variant option detection ──────────────────────────────────────────────────
// Returns true if a slash-separated segment looks like a variant attribute
// (size code, color word, or any short ≤15-char / ≤2-word string)
const SIZES = new Set(['xs','s','m','l','xl','xxl','2xl','3xl','xxxl','os','one size','regular','slim','wide','petite','plus','free size','universal']);

function isVariantSegment(seg: string): boolean {
  const s = seg.trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (SIZES.has(lower)) return true;                          // exact size token
  if (/^\d{1,3}$/.test(lower)) return true;                  // numeric size: 32, 38, 10
  if (s.length <= 3) return true;                             // very short: "M", "XL", "EU"
  if (s.length <= 15 && s.split(/\s+/).length <= 2) return true; // "Sky Blue", "Dark Navy"
  return false;
}

// Extract parent product title by stripping variant suffixes.
// Handles three common Shopify/GMC patterns:
//  1. Pipe:  "Jacket - Unisex | Doorek Black / M"   → "Jacket - Unisex"
//  2. Slash: "Linen Dress / Ivory / S"               → "Linen Dress"
//  3. Slash: "Rain Jacket / FPA Cream White / M"     → "Rain Jacket"
function extractParentTitle(analysis: TitleAnalysis): string {
  const title = (analysis.product.current_title ?? '').trim();
  if (!title) return analysis.product.item_group_id;

  // Pattern 1: pipe separator (common for Doorek/snowoutfit style)
  const pipeIdx = title.indexOf(' | ');
  if (pipeIdx > 5) return title.slice(0, pipeIdx).trim();

  // Pattern 2: slash separator — strip trailing short segments from the right
  // Split on " / " (with spaces) so slashes inside words like "50/50" are safe
  const parts = title.split(' / ');
  if (parts.length >= 2) {
    let cutAt = parts.length;
    for (let i = parts.length - 1; i >= 1; i--) {
      if (isVariantSegment(parts[i])) {
        cutAt = i;
      } else {
        break; // stop as soon as a segment doesn't look like a variant option
      }
    }
    if (cutAt < parts.length) {
      return parts.slice(0, cutAt).join(' / ').trim();
    }
  }

  return title;
}

// Aggregate variants by item_group_id (uses extractParentTitle for display label)
function groupByItemGroup(analyses: TitleAnalysis[], dateRange: DateRange): GroupRow[] {
  const groups: Record<string, GroupRow> = {};
  for (const a of analyses) {
    const key = a.product.item_group_id;
    if (!groups[key]) {
      groups[key] = {
        item_group_id: key,
        label: extractParentTitle(a),  // display label from title heuristic
        count: 0, cost: 0, clicks: 0, impressions: 0,
        conversions: 0, conversions_value: 0,
        minScore: 100, totalIssues: 0, items: [],
        ctr: 0, roas: 0, cvr: 0, cpc: 0,
        priceMin: a.product.price ?? 0, priceMax: a.product.price ?? 0,
      };
    }
    const g = groups[key];
    const rm = getRangeMetrics(a.product, dateRange);
    g.count++;
    g.cost += rm.cost;
    g.clicks += rm.clicks;
    g.impressions += rm.impressions;
    g.conversions += rm.conversions;
    g.conversions_value += rm.conversions_value;
    g.minScore = Math.min(g.minScore, a.score);
    g.totalIssues += a.issues.length;
    g.items.push(a);
    if ((a.product.price ?? 0) < g.priceMin) g.priceMin = a.product.price ?? 0;
    if ((a.product.price ?? 0) > g.priceMax) g.priceMax = a.product.price ?? 0;
  }
  return Object.values(groups).map(g => ({
    ...g,
    ctr: g.impressions > 0 ? g.clicks / g.impressions : 0,
    roas: g.cost > 0 ? g.conversions_value / g.cost : 0,
    cvr: g.clicks > 0 ? g.conversions / g.clicks : 0,
    cpc: g.clicks > 0 ? g.cost / g.clicks : 0,
  }));
}

const SortTh = ({ col, label, sortKey, onSort }: { col: SortKey; label: string; sortKey: SortKey; onSort: (k: SortKey) => void }) => (
  <TableHead className="cursor-pointer select-none text-xs whitespace-nowrap hover:text-foreground" onClick={() => onSort(col)}>
    <span className="flex items-center gap-1">
      {label}
      <ArrowUpDown size={11} className={cn('opacity-40', sortKey === col && 'opacity-100 text-blue-400')} />
    </span>
  </TableHead>
);

export default function FeedOptimizerPage() {
  const { selectedAccountId } = useSettings();
  const { t, lang } = useI18n();
  const [analyses, setAnalyses] = useState<TitleAnalysis[]>([]);
  const [summary, setSummary] = useState<FeedOptimizerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('cost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/feed?account_id=${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        const prods = data.products ?? [];
        const a = analyzeTitles(prods);
        setAnalyses(a);
        setSummary(computeSummary(a));
        setExportedAt(data.exported_at ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return analyses;
    const q = search.toLowerCase();
    return analyses.filter(a =>
      (a.product.current_title ?? '').toLowerCase().includes(q) ||
      (a.product.product_type ?? '').toLowerCase().includes(q) ||
      (a.product.brand ?? '').toLowerCase().includes(q) ||
      a.product.item_group_id.toLowerCase().includes(q)
    );
  }, [analyses, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = 0, bv = 0;
      const arm = getRangeMetrics(a.product, dateRange);
      const brm = getRangeMetrics(b.product, dateRange);
      if (sortKey === 'score') { av = a.score; bv = b.score; }
      else if (sortKey === 'ctr') { av = arm.ctr; bv = brm.ctr; }
      else if (sortKey === 'cost') { av = arm.cost; bv = brm.cost; }
      else if (sortKey === 'roas') { av = arm.cost > 0 ? arm.conversions_value / arm.cost : 0; bv = brm.cost > 0 ? brm.conversions_value / brm.cost : 0; }
      else if (sortKey === 'issues') { av = a.issues.length; bv = b.issues.length; }
      else if (sortKey === 'price') { av = a.product.price; bv = b.product.price; }
      else if (sortKey === 'cvr') { av = arm.clicks > 0 ? arm.conversions / arm.clicks : 0; bv = brm.clicks > 0 ? brm.conversions / brm.clicks : 0; }
      else if (sortKey === 'cpc') { av = arm.clicks > 0 ? arm.cost / arm.clicks : 0; bv = brm.clicks > 0 ? brm.cost / brm.clicks : 0; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir, dateRange]);

  const groupedRows = useMemo(() => {
    if (!grouped) return null;
    const g = groupByItemGroup(filtered, dateRange);
    return [...g].sort((a, b) => {
      if (sortKey === 'score') return sortDir === 'asc' ? a.minScore - b.minScore : b.minScore - a.minScore;
      if (sortKey === 'ctr') return sortDir === 'asc' ? a.ctr - b.ctr : b.ctr - a.ctr;
      if (sortKey === 'cost') return sortDir === 'asc' ? a.cost - b.cost : b.cost - a.cost;
      if (sortKey === 'roas') return sortDir === 'asc' ? a.roas - b.roas : b.roas - a.roas;
      if (sortKey === 'issues') return sortDir === 'asc' ? a.totalIssues - b.totalIssues : b.totalIssues - a.totalIssues;
      if (sortKey === 'cvr') return sortDir === 'asc' ? a.cvr - b.cvr : b.cvr - a.cvr;
      if (sortKey === 'cpc') return sortDir === 'asc' ? a.cpc - b.cpc : b.cpc - a.cpc;
      if (sortKey === 'price') return sortDir === 'asc' ? a.priceMin - b.priceMin : b.priceMin - a.priceMin;
      return 0;
    });
  }, [filtered, grouped, sortKey, sortDir, dateRange]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const issueChartData = summary?.top_issues.map(i => ({
    label: getIssueTypeLabel(i.type),
    count: i.count,
  })) ?? [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> {t('loading')}
      </div>
    );
  }

  if (!summary || analyses.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-base font-semibold">{t('feed_title')}</h1>
        <p className="text-sm text-muted-foreground">
          {selectedAccountId === 'demo' ? t('feed_demo_fail') : t('feed_no_data')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold">{t('feed_title')}</h1>

      <div className="grid grid-cols-4 gap-3">
        <MetricCard title={t('feed_total_products')} value={String(summary.total_products)} subtitle={t('feed_imported')} />
        <MetricCard
          title={t('feed_avg_score')}
          value={`${summary.avg_title_score}/100`}
          subtitle={summary.avg_title_score < 60 ? t('feed_needs_opt') : summary.avg_title_score < 75 ? t('feed_quality_ok') : t('feed_quality_good')}
          highlight={summary.avg_title_score >= 75}
        />
        <MetricCard title={t('feed_needs_attention')} value={String(summary.products_need_attention)} subtitle={lang === 'en' ? 'Score < 60' : '质量分 < 60'} />
        <MetricCard title={t('feed_ctr_lift')} value={summary.estimated_total_ctr_lift} subtitle={lang === 'en' ? 'After optimization' : '优化后估算'} highlight />
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-sm font-semibold">{t('feed_product_list')}</CardTitle>
            {exportedAt && (
              <span className="text-xs text-muted-foreground">
                {t('feed_data_period')} {new Date(exportedAt).toLocaleDateString('zh-CN')}
              </span>
            )}
            {/* Date range selector */}
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
              {DATE_RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setDateRange(opt.key)}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs transition-colors',
                    dateRange === opt.key
                      ? 'bg-background text-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('feed_search_placeholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-6 pr-3 py-1 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                />
              </div>
              {/* Group toggle */}
              <button
                onClick={() => setGrouped(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors',
                  grouped ? 'border-blue-500 bg-blue-600 text-white' : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {grouped ? <Layers size={12} /> : <List size={12} />}
                {grouped ? t('feed_group_by_product') : t('feed_show_by_sku')}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs pl-4 w-8"></TableHead>
                <TableHead className="text-xs">{t('feed_col_name')}</TableHead>
                {grouped && <TableHead className="text-xs">{t('feed_col_sku_count')}</TableHead>}
                <SortTh col="price" label={t('feed_col_price')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="score" label={grouped ? t('feed_col_min_score') : t('feed_col_score')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="ctr" label={t('feed_col_ctr')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="cpc" label={t('feed_col_cpc')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="cvr" label={t('feed_col_cvr')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="cost" label={t('feed_col_cost')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="roas" label={t('feed_col_roas')} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="issues" label={t('feed_col_issues')} sortKey={sortKey} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped && groupedRows ? groupedRows.map(g => {
                const tone = getScoreTone(g.minScore);
                const isExpanded = expandedGroups.has(g.item_group_id);
                return (
                  <Fragment key={g.item_group_id}>
                    <TableRow
                      key={g.item_group_id}
                      className="border-border hover:bg-accent/30 cursor-pointer"
                      onClick={() => toggleGroup(g.item_group_id)}
                    >
                      <TableCell className="pl-4 py-2 w-8">
                        {isExpanded
                          ? <ChevronDown size={13} className="text-muted-foreground" />
                          : <ChevronRight size={13} className="text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap text-foreground max-w-xs truncate" title={g.label}>
                        {g.label}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{g.count}{lang === 'en' ? '' : ' 个'}</TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">
                        {g.priceMin === g.priceMax
                          ? `$${g.priceMin.toFixed(2)}`
                          : `$${g.priceMin.toFixed(0)}–${g.priceMax.toFixed(0)}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs font-semibold px-1.5', tone.badgeClassName)}>{g.minScore}</Badge>
                      </TableCell>
                      <TableCell className={cn('text-xs tabular-nums', g.ctr < 0.01 && 'text-red-600 dark:text-red-400')}>{(g.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-xs tabular-nums">{g.cpc > 0 ? `$${g.cpc.toFixed(2)}` : '—'}</TableCell>
                      <TableCell className="text-xs tabular-nums">{g.cvr > 0 ? `${(g.cvr * 100).toFixed(1)}%` : '—'}</TableCell>
                      <TableCell className="text-xs tabular-nums">${g.cost.toFixed(2)}</TableCell>
                      <TableCell className={cn('text-xs tabular-nums font-medium', g.roas >= 2 ? 'text-green-600 dark:text-green-400' : g.roas < 1 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>{g.roas.toFixed(2)}x</TableCell>
                      <TableCell><span className={cn('text-xs font-semibold', g.totalIssues >= 4 ? 'text-red-600 dark:text-red-400' : g.totalIssues >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{g.totalIssues}</span></TableCell>
                    </TableRow>
                    {isExpanded && g.items.map(a => {
                      const vtone = getScoreTone(a.score);
                      const vrm = getRangeMetrics(a.product, dateRange);
                      const vroas = vrm.cost > 0 ? vrm.conversions_value / vrm.cost : 0;
                      const vcvr = vrm.clicks > 0 ? vrm.conversions / vrm.clicks : 0;
                      const vcpc = vrm.clicks > 0 ? vrm.cost / vrm.clicks : 0;
                      return (
                        <TableRow key={a.product.item_id} className="border-border bg-muted/20 hover:bg-accent/20">
                          <TableCell className="pl-4 py-1.5"></TableCell>
                          <TableCell className="text-xs text-muted-foreground pl-5 max-w-xs truncate" title={a.product.current_title ?? undefined}>
                            <Link href={`/feed-optimizer/${a.product.item_group_id}`} className="text-blue-600 dark:text-blue-400 hover:underline" onClick={e => e.stopPropagation()}>
                              {a.product.current_title ?? a.product.item_id}
                            </Link>
                          </TableCell>
                          {/* empty SKU count cell */}
                          <TableCell />
                          <TableCell className="text-xs tabular-nums text-muted-foreground">${(a.product.price ?? 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs font-semibold px-1.5', vtone.badgeClassName)}>{a.score}</Badge>
                          </TableCell>
                          <TableCell className={cn('text-xs tabular-nums', vrm.ctr < 0.01 && 'text-red-600 dark:text-red-400')}>{(vrm.ctr * 100).toFixed(2)}%</TableCell>
                          <TableCell className="text-xs tabular-nums">{vcpc > 0 ? `$${vcpc.toFixed(2)}` : '—'}</TableCell>
                          <TableCell className="text-xs tabular-nums">{vcvr > 0 ? `${(vcvr * 100).toFixed(1)}%` : '—'}</TableCell>
                          <TableCell className="text-xs tabular-nums">${vrm.cost.toFixed(2)}</TableCell>
                          <TableCell className={cn('text-xs tabular-nums font-medium', vroas >= 2 ? 'text-green-600 dark:text-green-400' : vroas < 1 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>{vroas.toFixed(2)}x</TableCell>
                          <TableCell><span className={cn('text-xs font-semibold', a.issues.length >= 4 ? 'text-red-600 dark:text-red-400' : a.issues.length >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{a.issues.length}</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              }) : sorted.map(a => {
                const tone = getScoreTone(a.score);
                const rm = getRangeMetrics(a.product, dateRange);
                const roas = rm.cost > 0 ? rm.conversions_value / rm.cost : 0;
                const cvr = rm.clicks > 0 ? rm.conversions / rm.clicks : 0;
                const cpc = rm.clicks > 0 ? rm.cost / rm.clicks : 0;
                return (
                  <TableRow key={a.product.item_id ?? a.product.item_group_id} className="border-border hover:bg-accent/30">
                    <TableCell className="pl-4 py-2 w-8"></TableCell>
                    <TableCell className="text-sm font-medium max-w-xs truncate" title={a.product.current_title ?? undefined}>
                      <Link href={`/feed-optimizer/${a.product.item_group_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {a.product.current_title ?? a.product.item_group_id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">${(a.product.price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs font-semibold px-1.5', tone.badgeClassName)}>{a.score}</Badge>
                    </TableCell>
                    <TableCell className={cn('text-xs tabular-nums', rm.ctr < 0.01 && 'text-red-600 dark:text-red-400')}>{(rm.ctr * 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-xs tabular-nums">{cpc > 0 ? `$${cpc.toFixed(2)}` : '—'}</TableCell>
                    <TableCell className="text-xs tabular-nums">{cvr > 0 ? `${(cvr * 100).toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className="text-xs tabular-nums">${rm.cost.toFixed(2)}</TableCell>
                    <TableCell className={cn('text-xs tabular-nums font-medium', roas >= 2 ? 'text-green-600 dark:text-green-400' : roas < 1 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>{roas.toFixed(2)}x</TableCell>
                    <TableCell><span className={cn('text-xs font-semibold', a.issues.length >= 4 ? 'text-red-600 dark:text-red-400' : a.issues.length >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{a.issues.length}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {(grouped ? groupedRows?.length === 0 : sorted.length === 0) && search && (
            <p className="text-xs text-muted-foreground text-center py-6">{lang === 'en' ? `No products matching "${search}"` : `没有匹配「${search}」的产品`}</p>
          )}
        </CardContent>
      </Card>

      {issueChartData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">{t('feed_common_issues')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueChartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(v) => [lang === 'en' ? `${v} products` : `${v} 个产品`, lang === 'en' ? 'Affected products' : '涉及产品数']}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {issueChartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
