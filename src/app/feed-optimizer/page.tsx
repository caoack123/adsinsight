'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import { analyzeTitles, computeSummary } from '@/modules/feed-optimizer/processor';
import { getIssueTypeLabel, getScoreTone, getRoas } from '@/lib/feed-optimizer';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Loader2, Search, Layers, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TitleAnalysis, FeedOptimizerSummary } from '@/modules/feed-optimizer/schema';

type SortKey = 'score' | 'ctr' | 'cost' | 'roas' | 'issues';
type SortDir = 'asc' | 'desc';

// Aggregate variants of the same product type into one row
function groupByProductType(analyses: TitleAnalysis[]) {
  const groups: Record<string, {
    label: string; count: number; cost: number; clicks: number;
    impressions: number; conversions: number; conversions_value: number;
    minScore: number; totalIssues: number; items: TitleAnalysis[];
  }> = {};
  for (const a of analyses) {
    const key = (a.product.product_type ?? '').split('>').pop()?.trim() || a.product.brand || a.product.item_group_id;
    if (!groups[key]) groups[key] = { label: key, count: 0, cost: 0, clicks: 0, impressions: 0, conversions: 0, conversions_value: 0, minScore: 100, totalIssues: 0, items: [] };
    const g = groups[key];
    g.count++;
    g.cost += a.product.cost;
    g.clicks += a.product.clicks;
    g.impressions += a.product.impressions;
    g.conversions += a.product.conversions;
    g.conversions_value += a.product.conversions_value ?? 0;
    g.minScore = Math.min(g.minScore, a.score);
    g.totalIssues += a.issues.length;
    g.items.push(a);
  }
  return Object.values(groups).map(g => ({
    ...g,
    ctr: g.impressions > 0 ? g.clicks / g.impressions : 0,
    roas: g.cost > 0 ? g.conversions_value / g.cost : 0,
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
  const [analyses, setAnalyses] = useState<TitleAnalysis[]>([]);
  const [summary, setSummary] = useState<FeedOptimizerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('cost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [exportedAt, setExportedAt] = useState<string | null>(null);

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
      if (sortKey === 'score') { av = a.score; bv = b.score; }
      else if (sortKey === 'ctr') { av = a.product.ctr; bv = b.product.ctr; }
      else if (sortKey === 'cost') { av = a.product.cost; bv = b.product.cost; }
      else if (sortKey === 'roas') { av = getRoas(a.product); bv = getRoas(b.product); }
      else if (sortKey === 'issues') { av = a.issues.length; bv = b.issues.length; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  const groupedRows = useMemo(() => {
    if (!grouped) return null;
    const g = groupByProductType(filtered);
    return [...g].sort((a, b) => {
      if (sortKey === 'score') return sortDir === 'asc' ? a.minScore - b.minScore : b.minScore - a.minScore;
      if (sortKey === 'ctr') return sortDir === 'asc' ? a.ctr - b.ctr : b.ctr - a.ctr;
      if (sortKey === 'cost') return sortDir === 'asc' ? a.cost - b.cost : b.cost - a.cost;
      if (sortKey === 'roas') return sortDir === 'asc' ? a.roas - b.roas : b.roas - a.roas;
      if (sortKey === 'issues') return sortDir === 'asc' ? a.totalIssues - b.totalIssues : b.totalIssues - a.totalIssues;
      return 0;
    });
  }, [filtered, grouped, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const issueChartData = summary?.top_issues.map(i => ({
    label: getIssueTypeLabel(i.type),
    count: i.count,
  })) ?? [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> 加载中...
      </div>
    );
  }

  if (!summary || analyses.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-base font-semibold">Feed 智能优化</h1>
        <p className="text-sm text-muted-foreground">
          {selectedAccountId === 'demo' ? '演示数据加载失败' : '该账户暂无 Feed 数据，请先运行 Google Ads 脚本同步数据。'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold">Feed 智能优化</h1>

      <div className="grid grid-cols-4 gap-3">
        <MetricCard title="产品总数" value={String(summary.total_products)} subtitle="已导入商品" />
        <MetricCard
          title="平均标题质量分"
          value={`${summary.avg_title_score}/100`}
          subtitle={summary.avg_title_score < 60 ? '需要优化' : summary.avg_title_score < 75 ? '尚可' : '良好'}
          highlight={summary.avg_title_score >= 75}
        />
        <MetricCard title="需要优化的产品" value={String(summary.products_need_attention)} subtitle="质量分 < 60" />
        <MetricCard title="预计整体 CTR 提升" value={summary.estimated_total_ctr_lift} subtitle="优化后估算" highlight />
      </div>

      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-sm font-semibold">产品列表</CardTitle>
            {exportedAt && (
              <span className="text-xs text-muted-foreground">
                数据周期：最近 30 天 · 同步于 {new Date(exportedAt).toLocaleDateString('zh-CN')}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索产品..."
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
                  grouped ? 'border-blue-500/60 bg-blue-950/30 text-blue-300' : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {grouped ? <Layers size={12} /> : <List size={12} />}
                {grouped ? '按产品聚合' : '按 SKU 展示'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs pl-4">{grouped ? '产品类型' : '产品名称'}</TableHead>
                {!grouped && <TableHead className="text-xs max-w-xs">当前标题</TableHead>}
                {grouped && <TableHead className="text-xs">SKU 数</TableHead>}
                <SortTh col="score" label={grouped ? '最低质量分' : '质量分'} sortKey={sortKey} onSort={handleSort} />
                <SortTh col="ctr" label="CTR" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="cost" label="花费" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="roas" label="ROAS" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="issues" label="问题数" sortKey={sortKey} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped && groupedRows ? groupedRows.map(g => {
                const tone = getScoreTone(g.minScore);
                return (
                  <TableRow key={g.label} className="border-border hover:bg-accent/30">
                    <TableCell className="text-sm font-medium pl-4 whitespace-nowrap text-foreground">{g.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.count} 个</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs font-semibold px-1.5', tone.badgeClassName)}>{g.minScore}</Badge>
                    </TableCell>
                    <TableCell className={cn('text-xs tabular-nums', g.ctr < 0.01 && 'text-red-400')}>{(g.ctr * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-xs tabular-nums">${g.cost.toFixed(2)}</TableCell>
                    <TableCell className={cn('text-xs tabular-nums font-medium', g.roas >= 2 ? 'text-green-400' : g.roas < 1 ? 'text-red-400' : 'text-foreground')}>{g.roas.toFixed(2)}x</TableCell>
                    <TableCell><span className={cn('text-xs font-semibold', g.totalIssues >= 4 ? 'text-red-400' : g.totalIssues >= 2 ? 'text-amber-400' : 'text-muted-foreground')}>{g.totalIssues}</span></TableCell>
                  </TableRow>
                );
              }) : sorted.map(a => {
                const tone = getScoreTone(a.score);
                const roas = getRoas(a.product);
                return (
                  <TableRow key={a.product.item_group_id} className="border-border hover:bg-accent/30">
                    <TableCell className="text-sm font-medium pl-4 whitespace-nowrap">
                      <Link href={`/feed-optimizer/${a.product.item_group_id}`} className="text-blue-400 hover:underline">
                        {(a.product.product_type ?? '').split('>').pop()?.trim() || a.product.brand || a.product.item_group_id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={a.product.current_title ?? undefined}>
                      {a.product.current_title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs font-semibold px-1.5', tone.badgeClassName)}>{a.score}</Badge>
                    </TableCell>
                    <TableCell className={cn('text-xs tabular-nums', a.product.ctr < 0.01 && 'text-red-400')}>{(a.product.ctr * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-xs tabular-nums">${a.product.cost.toFixed(2)}</TableCell>
                    <TableCell className={cn('text-xs tabular-nums font-medium', roas >= 2 ? 'text-green-400' : roas < 1 ? 'text-red-400' : 'text-foreground')}>{roas.toFixed(2)}x</TableCell>
                    <TableCell><span className={cn('text-xs font-semibold', a.issues.length >= 4 ? 'text-red-400' : a.issues.length >= 2 ? 'text-amber-400' : 'text-muted-foreground')}>{a.issues.length}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {(grouped ? groupedRows?.length === 0 : sorted.length === 0) && search && (
            <p className="text-xs text-muted-foreground text-center py-6">没有匹配「{search}」的产品</p>
          )}
        </CardContent>
      </Card>

      {issueChartData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">常见问题分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueChartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(v) => [`${v} 个产品`, '涉及产品数']}
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
