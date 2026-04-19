'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getIssueTypeLabel,
  getScoreTone,
  getSeverityLabel,
  getRoas,
  getSearchCoverage,
} from '@/lib/feed-optimizer';
import { analyzeTitles } from '@/modules/feed-optimizer/processor';
import type { TitleAnalysis } from '@/modules/feed-optimizer/schema';
import type { OptimizeTitleResponse } from '@/app/api/ai/optimize-title/route';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Check, CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeedProductDetailPage({
  params,
}: {
  params: Promise<{ item_group_id: string }>;
}) {
  const { item_group_id } = use(params);
  const { settings, selectedAccountId } = useSettings();
  const { t, lang } = useI18n();

  const [analysis, setAnalysis] = useState<TitleAnalysis | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [aiResult, setAiResult] = useState<OptimizeTitleResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setPageLoading(true);
    fetch(`/api/data/feed?account_id=${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        const analyses = analyzeTitles(data.products ?? []);
        const found = analyses.find(a => a.product.item_group_id === item_group_id);
        setAnalysis(found ?? null);
      })
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, [item_group_id, selectedAccountId]);

  if (pageLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> {t('loading')}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-4">
        <Link href="/feed-optimizer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft size={14} /> {t('feed_back')}
        </Link>
        <p className="text-sm text-muted-foreground">{lang === 'en' ? 'Product not found (ID: ' : '找不到该产品（ID: '}{item_group_id}）。</p>
      </div>
    );
  }

  const { product, score, issues, suggested_title: hardcodedTitle, reasoning: hardcodedReasoning, estimated_ctr_lift: hardcodedLift } = analysis;
  const tone = getScoreTone(score);
  const roas = getRoas(product);

  // Use AI result if available, fallback to hardcoded
  const displayTitle = aiResult?.suggested_title ?? hardcodedTitle;
  const displayReasoning = aiResult?.reasoning ?? hardcodedReasoning;
  const displayLift = aiResult?.estimated_ctr_lift ?? hardcodedLift;
  const isAiGenerated = aiResult !== null;

  function handleCopy() {
    navigator.clipboard.writeText(displayTitle).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleGenerateAI() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/optimize-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_title: product.current_title,
          brand: product.brand,
          product_type: product.product_type,
          price: product.price,
          currency: product.currency,
          ctr: product.ctr,
          impressions: product.impressions,
          clicks: product.clicks,
          conversions: product.conversions,
          conversions_value: product.conversions_value,
          cost: product.cost,
          top_search_terms: product.top_search_terms,
          rule_issues: issues.map(i => ({
            type: i.type,
            description_zh: i.description_zh,
            severity: i.severity,
          })),
          ...(settings.openrouterApiKey && { api_key: settings.openrouterApiKey }),
          model: settings.feedOptimizerModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Unknown error');
      }
      const data: OptimizeTitleResponse = await res.json();
      setAiResult(data);
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 } as const;
  const sortedIssues = [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/feed-optimizer" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-base font-semibold">{(product.product_type ?? '').split('>').pop()?.trim() || product.item_group_id}</h1>
          <p className="text-xs text-muted-foreground">{product.item_group_id}</p>
        </div>
        <Badge variant="outline" className={cn('text-xs font-semibold px-1.5 ml-auto', tone.badgeClassName)}>
          {t('feed_score_label')} {score}/100
        </Badge>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Left: title analysis — 3 cols */}
        <div className="col-span-3 space-y-4">
          {/* Current title */}
          <Card className={cn('border', tone.borderClassName)}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{t('feed_current_title')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm leading-relaxed text-foreground">{product.current_title}</p>
            </CardContent>
          </Card>

          {/* Issues */}
          {sortedIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('feed_issues_found')}</p>
              {sortedIssues.map((issue, i) => (
                <div
                  key={i}
                  className={cn(
                    'border rounded px-3 py-2.5 flex items-start gap-2.5',
                    issue.severity === 'high' && 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-950/20',
                    issue.severity === 'medium' && 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20',
                    issue.severity === 'low' && 'border-border bg-card'
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{getIssueTypeLabel(issue.type)}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs px-1 py-0',
                          issue.severity === 'high' && 'border-red-400 text-red-600 dark:border-red-500/50 dark:text-red-400',
                          issue.severity === 'medium' && 'border-amber-400 text-amber-700 dark:border-amber-500/50 dark:text-amber-400',
                          issue.severity === 'low' && 'border-border text-muted-foreground'
                        )}
                      >
                        {getSeverityLabel(issue.severity, lang)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{issue.description_zh}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggested title */}
          <Card className="border-emerald-400 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/10">
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t('feed_ai_title')}</CardTitle>
                  {isAiGenerated && (
                    <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-700 dark:text-emerald-400 px-1.5">
                      {t('feed_live_generated')}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{t('feed_ctr_lift_prefix')} {displayLift}</span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-sm leading-relaxed text-foreground mb-3">{displayTitle}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-emerald-100 border border-emerald-400 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-700/30 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-700/50 transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? t('feed_copied_title') : t('feed_copy_title')}
                </button>
                <button
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading
                    ? <><Loader2 size={12} className="animate-spin" /> AI 生成中…</>
                    : <><Sparkles size={12} /> {isAiGenerated ? t('regenerate') : t('feed_generate_ai')}</>
                  }
                </button>
              </div>
              {aiError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {t('ai_failed_prefix')}{aiError}。{t('ai_key_hint')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Reasoning */}
          <Card className="border-border">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('feed_reasoning_title')}
                {isAiGenerated && <span className="ml-2 text-blue-400 font-normal normal-case">{t('feed_reasoning_badge')}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{displayReasoning}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: product info — 2 cols */}
        <div className="col-span-2 space-y-4">
          {/* Product image */}
          <Card className="border-border">
            <CardContent className="p-3">
              <div className="w-full aspect-square rounded bg-muted flex items-center justify-center text-xs text-muted-foreground mb-3 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image_url ?? ''}
                  alt={product.current_title ?? product.item_group_id}
                  className="w-full h-full object-contain rounded"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="absolute text-xs text-muted-foreground">{t('feed_product_image')}</span>
              </div>
              <p className="text-xs font-semibold text-foreground">{product.brand || '—'}</p>
              <p className="text-xs text-muted-foreground">{product.product_type || '—'}</p>
              <p className="text-sm font-bold mt-1">${(product.price || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Performance metrics */}
          <Card className="border-border">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{t('feed_performance')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: lang === 'en' ? 'Impressions' : '曝光量', value: product.impressions.toLocaleString() },
                  { label: lang === 'en' ? 'Clicks' : '点击量', value: product.clicks.toLocaleString() },
                  { label: 'CTR', value: `${(product.ctr * 100).toFixed(1)}%`, warn: product.ctr < 0.01 },
                  { label: lang === 'en' ? 'Spend' : '花费', value: `$${product.cost.toFixed(2)}` },
                  { label: lang === 'en' ? 'Conversions' : '转化数', value: product.conversions.toString() },
                  { label: 'ROAS', value: `${roas.toFixed(2)}x`, good: roas >= 2 },
                ].map(({ label, value, warn, good }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn('text-sm font-semibold tabular-nums', warn && 'text-red-600 dark:text-red-400', good && 'text-green-600 dark:text-green-400')}>{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top search terms */}
          <Card className="border-border">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{t('feed_search_terms_section')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {(product.top_search_terms ?? []).map(term => (
                  <Badge key={term} variant="outline" className="text-xs">{term}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search coverage analysis */}
          <Card className="border-border">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{t('feed_coverage_title')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {(product.top_search_terms ?? []).map(term => {
                const inCurrent = getSearchCoverage(term, product.current_title ?? '');
                const inSuggested = getSearchCoverage(term, displayTitle);
                return (
                  <div key={term} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">{term}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground w-8 text-right">{t('feed_coverage_current')}</span>
                      {inCurrent ? <CheckCircle2 size={13} className="text-green-600 dark:text-green-400" /> : <XCircle size={13} className="text-red-600 dark:text-red-400" />}
                      <span className="text-xs text-muted-foreground w-8 text-right">{t('feed_coverage_after')}</span>
                      {inSuggested ? <CheckCircle2 size={13} className="text-green-600 dark:text-green-400" /> : <XCircle size={13} className="text-red-600 dark:text-red-400" />}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
