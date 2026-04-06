import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

// Future API call structure (don't implement, just leave as comment):
// const insights = await analyzeAuctionInsights(auctionData);
// For now, hardcode the insights array

const HARDCODED_INSIGHTS = [
  "⚠️ New competitor alert: newplayer.com entered the auction in W11 and grew impression share from 8% to 22% in 2 weeks — monitor closely.",
  "📈 icebling.com has been steadily increasing position above rate (58% → 62%), suggesting they raised bids or improved Quality Score.",
  "📉 shinydirect.com is fading — impression share dropped from 15% to 5%, they may be reducing spend or pausing campaigns.",
  "🎯 Your impression share dropped from 45% to 38% over 3 weeks. Consider increasing bids on high-converting keywords to recover lost ground.",
];

export function AIInsights() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-yellow-400" />
          AI Insights
          <span className="text-xs text-muted-foreground font-normal ml-1">(hardcoded — replace with API call later)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ul className="space-y-2">
          {HARDCODED_INSIGHTS.map((insight, i) => (
            <li key={i} className="text-sm text-muted-foreground border-l-2 border-border pl-3 py-0.5 leading-relaxed">
              {insight}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
