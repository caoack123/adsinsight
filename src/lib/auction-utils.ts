export interface AuctionInsightRecord {
  campaign: string;
  competitor: string;
  impression_share: number;
  overlap_rate: number;
  position_above_rate: number;
  top_of_page_rate: number;
  abs_top_of_page_rate: number;
  outranking_share: number;
  week: string;
}

export interface AuctionData {
  client_token: string;
  date_range: string;
  exported_at: string;
  account_id: string;
  account_name: string;
  data: AuctionInsightRecord[];
}

export function getLatestWeekData(data: AuctionInsightRecord[]): AuctionInsightRecord[] {
  const weeks = [...new Set(data.map(r => r.week))].sort();
  const latestWeek = weeks[weeks.length - 1];
  return data.filter(r => r.week === latestWeek);
}

export function getPreviousWeekData(data: AuctionInsightRecord[]): AuctionInsightRecord[] {
  const weeks = [...new Set(data.map(r => r.week))].sort();
  if (weeks.length < 2) return [];
  const prevWeek = weeks[weeks.length - 2];
  return data.filter(r => r.week === prevWeek);
}

export function getYourData(data: AuctionInsightRecord[]): AuctionInsightRecord[] {
  return data.filter(r => r.competitor.startsWith('You'));
}

export function getWeekOverWeekChange(
  data: AuctionInsightRecord[],
  metric: keyof AuctionInsightRecord
): number {
  const latestWeek = getLatestWeekData(data);
  const prevWeek = getPreviousWeekData(data);
  const latestYou = getYourData(latestWeek)[0];
  const prevYou = getYourData(prevWeek)[0];
  if (!latestYou || !prevYou) return 0;
  return (latestYou[metric] as number) - (prevYou[metric] as number);
}

export function getBiggestThreat(data: AuctionInsightRecord[]): { competitor: string; threatScore: number } {
  const latest = getLatestWeekData(data);
  const competitors = latest.filter(r => !r.competitor.startsWith('You'));
  if (competitors.length === 0) return { competitor: 'None', threatScore: 0 };
  const scored = competitors.map(r => ({
    competitor: r.competitor,
    threatScore: r.overlap_rate * r.position_above_rate,
  }));
  return scored.sort((a, b) => b.threatScore - a.threatScore)[0];
}

export function getCompetitorTrend(
  data: AuctionInsightRecord[],
  competitor: string
): { week: string; values: Record<string, number> }[] {
  const filtered = data.filter(r => r.competitor === competitor);
  const sorted = [...filtered].sort((a, b) => a.week.localeCompare(b.week));
  return sorted.map(r => ({
    week: r.week,
    values: {
      impression_share: r.impression_share,
      overlap_rate: r.overlap_rate,
      position_above_rate: r.position_above_rate,
      top_of_page_rate: r.top_of_page_rate,
      abs_top_of_page_rate: r.abs_top_of_page_rate,
      outranking_share: r.outranking_share,
    },
  }));
}

export function filterByCampaign(
  data: AuctionInsightRecord[],
  campaign: string
): AuctionInsightRecord[] {
  if (campaign === 'all') return data;
  return data.filter(r => r.campaign === campaign);
}

export function getAllCampaigns(data: AuctionInsightRecord[]): string[] {
  return [...new Set(data.map(r => r.campaign))];
}

export function getAllWeeks(data: AuctionInsightRecord[]): string[] {
  return [...new Set(data.map(r => r.week))].sort();
}

export function getUniqueCampaignsForCompetitor(
  data: AuctionInsightRecord[],
  competitor: string
): string[] {
  return [...new Set(data.filter(r => r.competitor === competitor).map(r => r.campaign))];
}

export function getThreatLevel(overlap: number, positionAbove: number): 'Low' | 'Medium' | 'High' {
  const score = overlap * positionAbove;
  if (score >= 0.3) return 'High';
  if (score >= 0.15) return 'Medium';
  return 'Low';
}
