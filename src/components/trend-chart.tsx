'use client';

import { AuctionInsightRecord } from '@/lib/auction-utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartProps {
  data: AuctionInsightRecord[];
  competitors: string[];
  weeks: string[];
}

const COLORS: Record<string, string> = {
  you: '#3b82f6',
  c0: '#ef4444',
  c1: '#f59e0b',
  c2: '#10b981',
  c3: '#8b5cf6',
};

export function TrendChart({ data, competitors, weeks }: TrendChartProps) {
  const chartData = weeks.map(week => {
    const weekData: Record<string, number | string> = { week };
    competitors.forEach(c => {
      const rec = data.find(r => r.week === week && r.competitor === c);
      weekData[c] = rec ? parseFloat((rec.impression_share * 100).toFixed(1)) : 0;
    });
    return weekData;
  });

  const youKey = competitors.find(c => c.startsWith('You')) || '';
  const nonYou = competitors.filter(c => !c.startsWith('You'));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
          <Tooltip
            formatter={(val) => [`${val}%`, undefined]}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {youKey && (
            <Line
              key={youKey}
              type="monotone"
              dataKey={youKey}
              stroke={COLORS.you}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          {nonYou.map((c, i) => (
            <Line
              key={c}
              type="monotone"
              dataKey={c}
              stroke={COLORS[`c${i}`] || '#999'}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              strokeDasharray={i === 0 ? undefined : '4 2'}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
