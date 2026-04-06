'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import auctionDataRaw from '@/data/sample_auction_data.json';
import {
  AuctionData,
  getCompetitorTrend,
  getThreatLevel,
  getUniqueCampaignsForCompetitor,
} from '@/lib/auction-utils';
import { ThreatBadge } from '@/components/threat-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const auctionData = auctionDataRaw as AuctionData;

const METRICS = [
  { key: 'impression_share', label: 'Impression Share', color: '#3b82f6' },
  { key: 'overlap_rate', label: 'Overlap Rate', color: '#f59e0b' },
  { key: 'position_above_rate', label: 'Position Above Rate', color: '#ef4444' },
  { key: 'top_of_page_rate', label: 'Top of Page Rate', color: '#10b981' },
  { key: 'abs_top_of_page_rate', label: 'Abs. Top of Page', color: '#8b5cf6' },
  { key: 'outranking_share', label: 'Outranking Share', color: '#ec4899' },
];

function Sparkline({ trend, metricKey, color, label }: { trend: { week: string; values: Record<string, number> }[]; metricKey: string; color: string; label: string }) {
  const chartData = trend.map(t => ({
    week: t.week,
    value: parseFloat((t.values[metricKey] * 100).toFixed(1)),
  }));
  const latest = chartData[chartData.length - 1]?.value ?? 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
        <div className="text-xl font-bold">{latest.toFixed(1)}%</div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
              <XAxis dataKey="week" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                formatter={(v) => [`${v}%`, label]}
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 11 }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: rawDomain } = use(params);
  const domain = decodeURIComponent(rawDomain);

  const trend = useMemo(() => getCompetitorTrend(auctionData.data, domain), [domain]);
  const campaigns = useMemo(() => getUniqueCampaignsForCompetitor(auctionData.data, domain), [domain]);

  const latestTrend = trend[trend.length - 1];
  const threatLevel = latestTrend
    ? getThreatLevel(latestTrend.values.overlap_rate, latestTrend.values.position_above_rate)
    : 'Low';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-base font-semibold">{domain}</h1>
          <p className="text-xs text-muted-foreground">Competitor Deep Dive</p>
        </div>
        <ThreatBadge level={threatLevel} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Campaigns:</span>
        {campaigns.map(c => (
          <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {METRICS.map(m => (
          <Sparkline key={m.key} trend={trend} metricKey={m.key} color={m.color} label={m.label} />
        ))}
      </div>
    </div>
  );
}
