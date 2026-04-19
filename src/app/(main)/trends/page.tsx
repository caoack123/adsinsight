'use client';

import { useMemo } from 'react';
import auctionDataRaw from '@/data/sample_auction_data.json';
import { AuctionData, getAllWeeks, getYourData } from '@/lib/auction-utils';
import { TrendChart } from '@/components/trend-chart';
import { AIInsights } from '@/components/ai-insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const auctionData = auctionDataRaw as AuctionData;

export default function TrendsPage() {
  const allData = auctionData.data;
  const weeks = useMemo(() => getAllWeeks(allData), [allData]);

  const topCompetitors = useMemo(() => {
    const lastWeekData = allData.filter(r => r.week === weeks[weeks.length - 1]);
    const competitors = lastWeekData
      .filter(r => !r.competitor.startsWith('You'))
      .sort((a, b) => b.impression_share - a.impression_share)
      .slice(0, 3)
      .map(r => r.competitor);
    const you = getYourData(lastWeekData)[0]?.competitor || '';
    return [you, ...competitors].filter(Boolean);
  }, [allData, weeks]);

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold">Impression Share Trends</h1>
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Impression Share Over Time</CardTitle>
          <p className="text-xs text-muted-foreground">You + top 3 competitors by impression share</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <TrendChart data={allData} competitors={topCompetitors} weeks={weeks} />
        </CardContent>
      </Card>
      <AIInsights />
    </div>
  );
}
