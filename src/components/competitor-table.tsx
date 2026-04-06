'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuctionInsightRecord } from '@/lib/auction-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';

interface CompetitorTableProps {
  data: AuctionInsightRecord[];
}

type SortKey = keyof AuctionInsightRecord;
type SortHeaderProps = {
  col: SortKey;
  label: string;
  onSort: (key: SortKey) => void;
  activeKey: SortKey;
};

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function SortHeader({ col, label, onSort, activeKey }: SortHeaderProps) {
  return (
    <TableHead
      className="cursor-pointer select-none text-xs whitespace-nowrap hover:text-foreground"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className={cn('opacity-40', activeKey === col && 'opacity-100 text-blue-400')} />
      </span>
    </TableHead>
  );
}

export function CompetitorTable({ data }: CompetitorTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('impression_share');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const competitors = data.filter(r => !r.competitor.startsWith('You'));

  const sorted = [...competitors].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-xs">Competitor</TableHead>
            <SortHeader col="impression_share" label="Imp. Share" onSort={handleSort} activeKey={sortKey} />
            <SortHeader col="overlap_rate" label="Overlap" onSort={handleSort} activeKey={sortKey} />
            <SortHeader col="position_above_rate" label="Pos. Above" onSort={handleSort} activeKey={sortKey} />
            <SortHeader col="top_of_page_rate" label="Top of Page" onSort={handleSort} activeKey={sortKey} />
            <SortHeader col="abs_top_of_page_rate" label="Abs. Top" onSort={handleSort} activeKey={sortKey} />
            <SortHeader col="outranking_share" label="Outranking" onSort={handleSort} activeKey={sortKey} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(r => (
            <TableRow key={r.competitor} className="border-border hover:bg-accent/30">
              <TableCell className="font-medium text-sm">
                <Link href={`/competitor/${encodeURIComponent(r.competitor)}`} className="text-blue-400 hover:underline">
                  {r.competitor}
                </Link>
              </TableCell>
              <TableCell className="text-xs tabular-nums">{pct(r.impression_share)}</TableCell>
              <TableCell className="text-xs tabular-nums">{pct(r.overlap_rate)}</TableCell>
              <TableCell className={cn('text-xs tabular-nums font-medium', r.position_above_rate > 0.5 ? 'text-red-400' : 'text-foreground')}>
                {pct(r.position_above_rate)}
              </TableCell>
              <TableCell className="text-xs tabular-nums">{pct(r.top_of_page_rate)}</TableCell>
              <TableCell className="text-xs tabular-nums">{pct(r.abs_top_of_page_rate)}</TableCell>
              <TableCell className={cn('text-xs tabular-nums font-medium', r.outranking_share > 0.7 ? 'text-green-400' : 'text-foreground')}>
                {pct(r.outranking_share)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
