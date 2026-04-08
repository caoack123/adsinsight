'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/context/settings-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Search, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchTerm {
  search_term: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversions_value: number;
  ctr: number;
  cvr: number;
}

interface Ngram {
  term: string;
  n: number;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  cvr: number;
  cpc: number;
  termCount: number; // how many search terms contain this ngram
}

const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of',
  'with', 'by', 'from', 'up', 'is', 'it', 'its', 'as', 'be', 'was', 'are',
  '的', '了', '和', '与', '在', '是', '有', '这', '个', '一', '不', '我', '你', '他']);

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function buildNgrams(terms: SearchTerm[], n: 1 | 2 | 3): Ngram[] {
  const map = new Map<string, { clicks: number; impressions: number; cost: number; conversions: number; termCount: number }>();

  for (const t of terms) {
    const tokens = tokenize(t.search_term);
    const seen = new Set<string>();
    for (let i = 0; i <= tokens.length - n; i++) {
      const gram = tokens.slice(i, i + n).join(' ');
      if (!gram.trim()) continue;
      if (!map.has(gram)) map.set(gram, { clicks: 0, impressions: 0, cost: 0, conversions: 0, termCount: 0 });
      const entry = map.get(gram)!;
      entry.clicks += t.clicks;
      entry.impressions += t.impressions;
      entry.cost += t.cost;
      entry.conversions += t.conversions;
      if (!seen.has(gram)) { entry.termCount++; seen.add(gram); }
    }
  }

  return Array.from(map.entries())
    .map(([term, d]) => ({
      term,
      n,
      clicks: d.clicks,
      impressions: d.impressions,
      cost: d.cost,
      conversions: d.conversions,
      cvr: d.clicks > 0 ? d.conversions / d.clicks : 0,
      cpc: d.clicks > 0 ? d.cost / d.clicks : 0,
      termCount: d.termCount,
    }))
    .filter(g => g.clicks >= 5) // minimum threshold
    .sort((a, b) => b.clicks - a.clicks);
}

function cvBadge(cvr: number, clicks: number) {
  if (clicks < 10) return <Badge variant="outline" className="text-xs text-muted-foreground">数据不足</Badge>;
  if (cvr === 0) return <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">零转化</Badge>;
  if (cvr < 0.005) return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">低转化</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">{(cvr * 100).toFixed(1)}%</Badge>;
}

export default function SearchTermsPage() {
  const { selectedAccountId } = useSettings();
  const [terms, setTerms] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [ngramN, setNgramN] = useState<1 | 2 | 3>(2);
  const [minClicks, setMinClicks] = useState(10);
  const [showNegOnly, setShowNegOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/search-terms?account_id=${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        setTerms(data.terms ?? []);
        setSyncedAt(data.synced_at ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  const ngrams = useMemo(() => buildNgrams(terms, ngramN), [terms, ngramN]);

  const filtered = useMemo(() => {
    let result = ngrams.filter(g => g.clicks >= minClicks);
    if (showNegOnly) result = result.filter(g => g.cvr < 0.005);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g => g.term.includes(q));
    }
    return result;
  }, [ngrams, minClicks, showNegOnly, search]);

  const negKeywords = useMemo(() =>
    filtered.filter(g => g.cvr < 0.005 && g.clicks >= 20).map(g => g.term),
    [filtered]
  );

  function copyNegatives() {
    navigator.clipboard.writeText(negKeywords.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportCSV() {
    const header = 'N-Gram,N,Clicks,Impressions,Cost,Conversions,CVR,CPC,TermCount';
    const rows = filtered.map(g =>
      `"${g.term}",${g.n},${g.clicks},${g.impressions},${g.cost.toFixed(2)},${g.conversions.toFixed(2)},${(g.cvr * 100).toFixed(2)}%,$${g.cpc.toFixed(2)},${g.termCount}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngram-analysis-${ngramN}gram.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> 加载中...
      </div>
    );
  }

  if (terms.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-base font-semibold">搜索词 N-Gram 分析</h1>
        <Card className="border-border">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">
              {selectedAccountId === 'demo'
                ? '演示账户不含搜索词数据。'
                : '该账户暂无搜索词数据。请在 Google Ads 脚本中添加搜索词导出并重新运行。'}
            </p>
            {selectedAccountId !== 'demo' && (
              <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground font-mono">
                <p className="font-semibold text-foreground mb-1">需要先运行一次包含搜索词导出的脚本</p>
                <p>前往「安装脚本」页面，复制最新版本脚本并在 Google Ads 中运行。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalClicks = terms.reduce((s, t) => s + t.clicks, 0);
  const totalConversions = terms.reduce((s, t) => s + t.conversions, 0);
  const overallCvr = totalClicks > 0 ? totalConversions / totalClicks : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">搜索词 N-Gram 分析</h1>
        {syncedAt && (
          <span className="text-xs text-muted-foreground">
            数据周期：最近 90 天 · 同步于 {new Date(syncedAt).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">搜索词总数</div>
            <div className="text-xl font-bold tabular-nums">{terms.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">总点击数</div>
            <div className="text-xl font-bold tabular-nums">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">整体 CVR</div>
            <div className="text-xl font-bold tabular-nums">{(overallCvr * 100).toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">潜在否定词</div>
            <div className="text-xl font-bold tabular-nums text-amber-400">{negKeywords.length}</div>
            <div className="text-xs text-muted-foreground">CVR=0 且点击≥20</div>
          </CardContent>
        </Card>
      </div>

      {/* Negative keywords export box */}
      {negKeywords.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-amber-400">建议否定关键词（{negKeywords.length} 个）</CardTitle>
              <button
                onClick={copyNegatives}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-500/40 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? '已复制' : '复制列表'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xs text-muted-foreground mb-2">以下词汇产生了较多点击但零转化，建议添加为否定关键词：</p>
            <div className="flex flex-wrap gap-1.5">
              {negKeywords.slice(0, 30).map(kw => (
                <span key={kw} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 font-mono">
                  {kw}
                </span>
              ))}
              {negKeywords.length > 30 && (
                <span className="text-xs text-muted-foreground self-center">+{negKeywords.length - 30} 个</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* N-gram table */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-sm font-semibold">N-Gram 分析</CardTitle>
            {/* N selector */}
            <div className="flex rounded border border-border overflow-hidden text-xs">
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setNgramN(n)}
                  className={cn(
                    'px-2.5 py-1 transition-colors',
                    ngramN === n ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {n}-gram
                </button>
              ))}
            </div>
            {/* Min clicks */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>最低点击：</span>
              <select
                value={minClicks}
                onChange={e => setMinClicks(Number(e.target.value))}
                className="bg-muted border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none"
              >
                {[5, 10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {/* Zero-conversion filter */}
            <button
              onClick={() => setShowNegOnly(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors',
                showNegOnly
                  ? 'border-amber-500/60 bg-amber-950/30 text-amber-300'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              仅显示低转化
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索词..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-6 pr-3 py-1 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                />
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download size={12} />
                导出 CSV
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs pl-4">词组</TableHead>
                <TableHead className="text-xs">出现次数</TableHead>
                <TableHead className="text-xs">点击数</TableHead>
                <TableHead className="text-xs">展示数</TableHead>
                <TableHead className="text-xs">花费</TableHead>
                <TableHead className="text-xs">CPC</TableHead>
                <TableHead className="text-xs">转化</TableHead>
                <TableHead className="text-xs">CVR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(g => (
                <TableRow key={g.term} className={cn('border-border hover:bg-accent/30', g.cvr === 0 && g.clicks >= 20 && 'bg-amber-500/5')}>
                  <TableCell className="text-sm pl-4 font-mono">{g.term}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{g.termCount}</TableCell>
                  <TableCell className="text-xs tabular-nums font-medium">{g.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{g.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-xs tabular-nums">${g.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">${g.cpc.toFixed(2)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{g.conversions.toFixed(1)}</TableCell>
                  <TableCell>{cvBadge(g.cvr, g.clicks)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">无符合条件的词组</p>
          )}
          {filtered.length > 200 && (
            <p className="text-xs text-muted-foreground text-center py-3">仅显示前 200 条，导出 CSV 获取完整数据</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
