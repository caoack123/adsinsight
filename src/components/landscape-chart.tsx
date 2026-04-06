'use client';

import { AuctionInsightRecord } from '@/lib/auction-utils';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LandscapeChartProps {
  data: AuctionInsightRecord[];
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: AuctionInsightRecord & { x: number; y: number; z: number } }[] }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded p-2 text-xs shadow-lg">
        <div className="font-semibold text-foreground mb-1">{d.competitor}</div>
        <div className="text-muted-foreground">Overlap: {(d.overlap_rate * 100).toFixed(0)}%</div>
        <div className="text-muted-foreground">Position Above: {(d.position_above_rate * 100).toFixed(0)}%</div>
        <div className="text-muted-foreground">Imp. Share: {(d.impression_share * 100).toFixed(0)}%</div>
      </div>
    );
  }
  return null;
};

export function LandscapeChart({ data }: LandscapeChartProps) {
  const competitors = data.filter(r => !r.competitor.startsWith('You'));
  const uniqueCompetitors = [...new Set(competitors.map(r => r.competitor))];

  const chartData = competitors.map(r => ({
    ...r,
    x: r.overlap_rate,
    y: r.position_above_rate,
    z: r.impression_share * 100 + 50,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, 1]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Overlap Rate', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={[0, 1]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Position Above Rate', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={chartData} r={8}>
            {chartData.map((entry, index) => {
              const colorIndex = uniqueCompetitors.indexOf(entry.competitor) % COLORS.length;
              return <Cell key={entry.competitor + index} fill={COLORS[colorIndex]} fillOpacity={0.8} />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        {uniqueCompetitors.map((c, i) => (
          <div key={c} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
