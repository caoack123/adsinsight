'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
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

import type { TranslationKey } from '@/lib/i18n';

function cvBadge(cvr: number, clicks: number, t: (k: TranslationKey) => string) {
  if (clicks < 10) return <Badge variant="outline" className="text-xs text-muted-foreground">{t('st_badge_insufficient')}</Badge>;
  if (cvr === 0) return <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-400 dark:border-red-500/30">{t('st_badge_zero_conv')}</Badge>;
  if (cvr < 0.005) return <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400 dark:border-amber-500/30">{t('st_badge_low_conv')}</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">{(cvr * 100).toFixed(1)}%</Badge>;
}

export default function SearchTermsPage() {
  const { selectedAccountId } = useSettings();
  const { t } = useI18n();
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
        <Loader2 size={16} className="animate-spin" /> {t('loading')}
      </div>
    );
  }

  if (terms.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-base font-semibold">{t('search_terms_title')}</h1>
        <Card className="border-border">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">
              {selectedAccountId === 'demo'
                ? t('st_demo_no_data')
                : t('st_no_data')}
            </p>
            {selectedAccountId !== 'demo' && (
              <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground font-mono">
                <p className="font-semibold text-foreground mb-1">{t('st_setup_hint')}</p>
                <p>{t('st_setup_hint2')}</p>
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
        <h1 className="text-base font-semibold">{t('search_terms_title')}</h1>
        {syncedAt && (
          <span className="text-xs text-muted-foreground">
            {t('st_data_period')} {new Date(syncedAt).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">{t('st_total_terms')}</div>
            <div className="text-xl font-bold tabular-nums">{terms.length.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">{t('st_total_clicks')}</div>
            <div className="text-xl font-bold tabular-nums">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">{t('st_overall_cvr')}</div>
            <div className="text-xl font-bold tabular-nums">{(overallCvr * 100).toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-xs text-muted-foreground mb-1">{t('st_neg_candidates')}</div>
            <div className="text-xl font-bold tabular-nums text-amber-400">{negKeywords.length}</div>
            <div className="text-xs text-muted-foreground">{t('st_neg_hint')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Negative keywords export box */}
      {negKeywords.length > 0 && (
        <Card className="border-amber-400 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-amber-400">{t('st_suggested_neg')} ({negKeywords.length})</CardTitle>
              <button
                onClick={copyNegatives}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-500/40 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t('st_copied') : t('st_copy_list')}
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xs text-muted-foreground mb-2">{t('st_neg_desc')}</p>
            <div className="flex flex-wrap gap-1.5">
              {negKeywords.slice(0, 30).map(kw => (
                <span key={kw} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 font-mono">
                  {kw}
                </span>
              ))}
              {negKeywords.length > 30 && (
                <span className="text-xs text-muted-foreground self-center">+{negKeywords.length - 30} {t('st_more_suffix')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* N-gram table */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-sm font-semibold">{t('st_ngram_title')}</CardTitle>
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
              <span>{t('st_min_clicks')}</span>
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
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {t('st_show_neg_only')}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('st_search_placeholder')}
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
                {t('export_csv')}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs pl-4">{t('st_col_phrase')}</TableHead>
                <TableHead className="text-xs">{t('st_col_count')}</TableHead>
                <TableHead className="text-xs">{t('st_col_clicks')}</TableHead>
                <TableHead className="text-xs">{t('st_col_impressions')}</TableHead>
                <TableHead className="text-xs">{t('st_col_spend')}</TableHead>
                <TableHead className="text-xs">CPC</TableHead>
                <TableHead className="text-xs">{t('st_col_conversions')}</TableHead>
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
                  <TableCell>{cvBadge(g.cvr, g.clicks, t)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">{t('st_no_match')}</p>
          )}
          {filtered.length > 200 && (
            <p className="text-xs text-muted-foreground text-center py-3">{t('st_showing_top')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
