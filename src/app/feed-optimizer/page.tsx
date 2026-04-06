'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  feedOptimizerSummary,
  feedOptimizerAnalyses,
  getIssueTypeLabel,
  getScoreTone,
  getRoas,
} from '@/lib/feed-optimizer';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type SortKey = 'score' | 'ctr' | 'cost' | 'roas' | 'issues';
type SortDir = 'asc' | 'desc';

export default function FeedOptimizerPage() {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    return [...feedOptimizerAnalyses].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === 'score') { av = a.score; bv = b.score; }
      else if (sortKey === 'ctr') { av = a.product.ctr; bv = b.product.ctr; }
      else if (sortKey === 'cost') { av = a.product.cost; bv = b.product.cost; }
      else if (sortKey === 'roas') { av = getRoas(a.product); bv = getRoas(b.product); }
      else if (sortKey === 'issues') { av = a.issues.length; bv = b.issues.length; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
    <TableHead className="cursor-pointer select-none text-xs whitespace-nowrap hover:text-foreground" onClick={() => handleSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className={cn('opacity-40', sortKey === col && 'opacity-100 text-blue-400')} />
      </span>
    </TableHead>
  );

  const issueChartData = feedOptimizerSummary.top_issues.map(i => ({
    label: getIssueTypeLabel(i.type),
    count: i.count,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold">Feed 智能优化</h1>

      <div className="grid grid-cols-4 gap-3">
        <MetricCard title="产品总数" value={String(feedOptimizerSummary.total_products)} subtitle="已导入商品" />
        <MetricCard
          title="平均标题质量分"
          value={`${feedOptimizerSummary.avg_title_score}/100`}
          subtitle={feedOptimizerSummary.avg_title_score < 60 ? '需要优化' : feedOptimizerSummary.avg_title_score < 75 ? '尚可' : '良好'}
          highlight={feedOptimizerSummary.avg_title_score >= 75}
        />
        <MetricCard
          title="需要优化的产品"
          value={String(feedOptimizerSummary.products_need_attention)}
          subtitle="质量分 < 60"
        />
        <MetricCard
          title="预计整体 CTR 提升"
          value={feedOptimizerSummary.estimated_total_ctr_lift}
          subtitle="优化后估算"
          highlight
        />
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
                <SortTh col="score" label="质量分" />
                <SortTh col="ctr" label="CTR (点击率)" />
                <SortTh col="cost" label="花费 (USD)" />
                <SortTh col="roas" label="ROAS" />
                <SortTh col="issues" label="问题数" />
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
                        {a.product.product_type.split('>').pop()?.trim()}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={a.product.current_title}>
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
    </div>
  );
}
