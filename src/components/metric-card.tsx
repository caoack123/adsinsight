import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  highlight?: boolean;
}

export function MetricCard({ title, value, subtitle, trend, trendLabel, highlight }: MetricCardProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <Card className={cn('border-border', highlight && 'border-blue-500/50 bg-blue-950/20')}>
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {(subtitle || trend !== undefined) && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend !== undefined && (
              <span className={cn('flex items-center text-xs font-medium', trendPositive ? 'text-green-400' : trendNegative ? 'text-red-400' : 'text-muted-foreground')}>
                {trendPositive ? <TrendingUp size={11} className="mr-0.5" /> : trendNegative ? <TrendingDown size={11} className="mr-0.5" /> : <Minus size={11} className="mr-0.5" />}
                {trend > 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
              </span>
            )}
            {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
            {subtitle && !trendLabel && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
