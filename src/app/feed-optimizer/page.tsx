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
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TitleAnalysis, FeedOptimizerSummary } from '@/modules/feed-optimizer/schema';

type SortKey = 'score' | 'ctr' | 'cost' | 'roas' | 'issues';
type SortDir = 'asc' | 'desc';

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
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/feed?account_id=${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        const prods = data.products ?? [];
        const a = analyzeTitles(prods);
        setAnalyses(a);
        setSummary(computeSummary(a));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  const sorted = useMemo(() => {
    return [...analyses].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === 'score') { av = a.score; bv = b.score; }
      else if (sortKey === 'ctr') { av = a.product.ctr; bv = b.product.ctr; }
      else if (sortKey === 'cost') { av = a.product.cost; bv = b.product.cost; }
      else if (sortKey === 'roas') { av = getRoas(a.product); bv = getRoas(b.product); }
      else if (sortKey === 'issues') { av = a.issues.length; bv = b.issues.length; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [analyses, sortKey, sortDir]);

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
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">产品列表</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs pl-4">产品名称</TableHead>
                <TableHead className="text-xs max-w-xs">当前标题</TableHead>
                <SortTh col="score" label="质量分" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="ctr" label="CTR" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="cost" label="花费" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="roas" label="ROAS" sortKey={sortKey} onSort={handleSort} />
                <SortTh col="issues" label="问题数" sortKey={sortKey} onSort={handleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(a => {
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
                      <Badge variant="outline" className={cn('text-xs font-semibold px-1.5', tone.badgeClassName)}>
                        {a.score}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('text-xs tabular-nums', a.product.ctr < 0.01 && 'text-red-400')}>
                      {(a.product.ctr * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">${a.product.cost.toFixed(2)}</TableCell>
                    <TableCell className={cn('text-xs tabular-nums font-medium', roas >= 2 ? 'text-green-400' : roas < 1 ? 'text-red-400' : 'text-foreground')}>
                      {roas.toFixed(2)}x
                    </TableCell>
                    <TableCell>
                      <span className={cn('text-xs font-semibold', a.issues.length >= 4 ? 'text-red-400' : a.issues.length >= 2 ? 'text-amber-400' : 'text-muted-foreground')}>
                        {a.issues.length}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
