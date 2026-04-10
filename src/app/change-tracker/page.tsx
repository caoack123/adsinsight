'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSettings } from '@/context/settings-context';
import {
  CHANGE_TYPE_LABEL,
  formatChangeDate,
  formatChangeDateShort,
  getVerdictConfig,
  fmtDelta,
  fmtRoas,
} from '@/lib/change-tracker';
import { annotateChanges, computeSummary } from '@/modules/change-tracker/processor';
import type { AnnotatedChange } from '@/modules/change-tracker/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCard } from '@/components/metric-card';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import type { AnalyzeChangeResponse } from '@/app/api/ai/analyze-change/route';
import { useI18n } from '@/context/i18n-context';

const CHANGE_TYPE_LABEL_EN: Record<string, string> = {
  BIDDING_STRATEGY_CHANGED: 'Bidding Strategy Changed',
  BID_CHANGED: 'Bid Adjusted',
  BUDGET_CHANGED: 'Budget Adjusted',
  AD_PAUSED: 'Ad Paused',
  AD_ENABLED: 'Ad Enabled',
  CAMPAIGN_PAUSED: 'Campaign Paused',
  CAMPAIGN_ENABLED: 'Campaign Enabled',
  KEYWORD_ADDED: 'Keyword Added',
  KEYWORD_REMOVED: 'Keyword Removed',
  KEYWORD_PAUSED: 'Keyword Paused',
  AD_GROUP_ADDED: 'Ad Group Added',
  AD_GROUP_PAUSED: 'Ad Group Paused',
};

/** Flatten one level of nesting: {"campaign":{"status":"PAUSED"}} → {"status":"PAUSED"} */
function flattenChangeObj(obj: Record<string, unknown>): Record<string, unknown> {
  const wrappers = ['campaign', 'adGroup', 'ad', 'adGroupCriterion', 'campaignCriterion', 'biddingStrategy', 'campaignBudget'];
  const keys = Object.keys(obj);
  if (keys.length === 1 && wrappers.includes(keys[0])) {
    const inner = obj[keys[0]];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return flattenChangeObj(inner as Record<string, unknown>);
    }
  }
  return obj;
}

/** Try to parse a JSON old/new value into a human-readable string */
function parseChangeValue(raw: string | null, lang: 'zh' | 'en' = 'zh'): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return String(raw).slice(0, 60);
    const obj = flattenChangeObj(parsed as Record<string, unknown>);

    // Status changes
    if (obj.status !== undefined) {
      const m: Record<string, string> = lang === 'en'
        ? { ENABLED: 'Enabled', PAUSED: 'Paused', REMOVED: 'Removed' }
        : { ENABLED: '启用', PAUSED: '暂停', REMOVED: '删除' };
      return m[String(obj.status)] || String(obj.status);
    }
    // Bid / budget in micros
    if (obj.cpcBidMicros !== undefined) return `$${(Number(obj.cpcBidMicros) / 1_000_000).toFixed(2)} CPC`;
    if (obj.cpvBidMicros !== undefined) return `$${(Number(obj.cpvBidMicros) / 1_000_000).toFixed(4)} CPV`;
    if (obj.amountMicros !== undefined) return `${lang === 'en' ? 'Budget' : '预算'} $${(Number(obj.amountMicros) / 1_000_000).toFixed(2)}/天`;
    if (obj.targetCpaMicros !== undefined) return `${lang === 'en' ? 'Target CPA' : '目标CPA'} $${(Number(obj.targetCpaMicros) / 1_000_000).toFixed(2)}`;
    // Target ROAS — can be nested {"targetRoas":{"targetRoas": 3.2}} or flat {"targetRoas": 3.2}
    if (obj.targetRoas !== undefined) {
      const v = obj.targetRoas;
      const num = typeof v === 'number' ? v
        : (v && typeof v === 'object' && 'targetRoas' in (v as object)) ? Number((v as Record<string, unknown>).targetRoas)
        : Number(v);
      return `${lang === 'en' ? 'ROAS Target' : 'ROAS目标'} ${(num * 100).toFixed(0)}%`;
    }
    // Maximize conversion value with target ROAS
    if (obj.maximizeConversionValue !== undefined) {
      const inner = obj.maximizeConversionValue as Record<string, unknown>;
      if (inner?.targetRoas !== undefined) return `${lang === 'en' ? 'Max Conv. Value ROAS' : '最大化转化价值 ROAS'} ${(Number(inner.targetRoas) * 100).toFixed(0)}%`;
      return lang === 'en' ? 'Maximize Conv. Value' : '最大化转化价值';
    }
    // Bidding strategy type
    if (obj.biddingStrategyType !== undefined) return String(obj.biddingStrategyType);
    if (obj.type !== undefined) return String(obj.type);
    // Name change
    if (obj.name !== undefined) return String(obj.name).slice(0, 40);
    // Fallback: first scalar key/value
    const keys = Object.keys(obj);
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return `${k}: ${v}`;
    }
    return raw.slice(0, 60);
  } catch {
    return raw.slice(0, 60);
  }
}

/** Get a readable label for any change_type string, including ones from live scripts */
function getChangeTypeLabel(changeType: string, lang: 'zh' | 'en' = 'zh'): string {
  const extra: Record<string, string> = lang === 'en' ? {
    CAMPAIGN_UPDATED: 'Campaign Updated',
    AD_GROUP_UPDATED: 'Ad Group Updated',
    AD_UPDATED: 'Ad Updated',
    CAMPAIGN_REMOVED: 'Campaign Removed',
    AD_GROUP_REMOVED: 'Ad Group Removed',
    AD_REMOVED: 'Ad Removed',
    CAMPAIGN_CRITERION_UPDATE: 'Campaign Targeting Updated',
    AD_GROUP_CRITERION_UPDATE: 'Ad Group Targeting Updated',
    UNKNOWN: 'Change',
  } : {
    CAMPAIGN_UPDATED: '广告系列更新',
    AD_GROUP_UPDATED: '广告组更新',
    AD_UPDATED: '广告更新',
    CAMPAIGN_REMOVED: '广告系列删除',
    AD_GROUP_REMOVED: '广告组删除',
    AD_REMOVED: '广告删除',
    CAMPAIGN_CRITERION_UPDATE: '广告系列定向调整',
    AD_GROUP_CRITERION_UPDATE: '广告组定向调整',
    UNKNOWN: '变更',
  };
  return (lang === 'en' ? CHANGE_TYPE_LABEL_EN : CHANGE_TYPE_LABEL as Record<string, string>)[changeType]
    || extra[changeType]
    || changeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Compute the human-readable date range for before/after performance windows.
 * isBefore=true  → ends the day BEFORE the change, spans windowDays backward
 * isBefore=false → starts ON the change date, spans windowDays forward
 */
function windowDateRange(changeTimestamp: string, windowDays: number, isBefore: boolean, lang: 'zh' | 'en' = 'zh'): string {
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;

  try {
    // Work in UTC-date arithmetic to avoid DST/tz surprises
    const change = new Date(changeTimestamp);
    const changeUTC = Date.UTC(change.getUTCFullYear(), change.getUTCMonth(), change.getUTCDate());
    const DAY = 86_400_000;

    let startMs: number, endMs: number;
    if (isBefore) {
      endMs   = changeUTC - DAY;                         // day before change
      startMs = endMs - (windowDays - 1) * DAY;
    } else {
      startMs = changeUTC;                               // change day itself
      endMs   = startMs + (windowDays - 1) * DAY;
    }
    return `${fmt(new Date(startMs))} – ${fmt(new Date(endMs))}`;
  } catch {
    return `${windowDays}${lang === 'en' ? 'd' : ' 天'}`;
  }
}

/** Format "YYYY-MM-DD" to "M/D" */
function fmtDateRange(start: string, end: string): string {
  const fmt = (s: string) => {
    const [, m, d] = s.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function DeltaCell({ value, good, bad }: { value: string; good: boolean; bad: boolean }) {
  return (
    <span className={cn('tabular-nums text-xs font-medium', good && 'text-green-600 dark:text-green-400', bad && 'text-red-600 dark:text-red-400', !good && !bad && 'text-muted-foreground')}>
      {value}
    </span>
  );
}

function ExpandedRow({ annotated }: { annotated: AnnotatedChange }) {
  const { change, delta } = annotated;
  const before = change.performance_before;
  const after = change.performance_after;
  const { settings } = useSettings();
  const { t, lang } = useI18n();

  const [aiResult, setAiResult] = useState<AnalyzeChangeResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const displayInsight = aiResult?.insight_zh ?? delta.insight_zh;
  const isAiGenerated = aiResult !== null;

  async function handleGenerateAI() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/analyze-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_type: change.change_type,
          resource_type: change.resource_type,
          resource_name: change.resource_name,
          campaign: change.campaign,
          ad_group: change.ad_group,
          changed_by: change.changed_by,
          timestamp: change.timestamp,
          old_value: change.old_value,
          new_value: change.new_value,
          performance_before: change.performance_before,
          performance_after: change.performance_after,
          delta: {
            impressions_delta: delta.impressions_delta,
            clicks_delta: delta.clicks_delta,
            ctr_delta: delta.ctr_delta,
            cost_delta: delta.cost_delta,
            conversions_delta: delta.conversions_delta,
            roas_delta: delta.roas_delta,
          },
          ...(settings.openrouterApiKey && { api_key: settings.openrouterApiKey }),
          model: settings.changeTrackerModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Unknown error');
      }
      const data: AnalyzeChangeResponse = await res.json();
      setAiResult(data);
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  }

  const spendLabel = t('ct_spend');

  return (
    <div className="px-4 py-3 bg-accent/10 border-t border-border">
      {before && after ? (
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Before metrics */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('ct_before')} {before.window_days} 天
              <span className="ml-1 normal-case font-normal text-muted-foreground/70">
                ({before.date_start && before.date_end
                  ? fmtDateRange(before.date_start, before.date_end)
                  : windowDateRange(change.timestamp, before.window_days, true, lang)})
              </span>
            </p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {[
                { label: t('ct_impressions'), value: before.impressions.toLocaleString() },
                { label: t('ct_clicks'), value: before.clicks.toLocaleString() },
                { label: 'CTR', value: `${(before.ctr * 100).toFixed(1)}%` },
                { label: spendLabel, value: `$${before.cost.toFixed(2)}` },
                { label: t('ct_conversions'), value: before.conversions.toFixed(1) },
                { label: 'ROAS', value: fmtRoas(before.roas) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xs font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
          {/* After metrics */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('ct_after')} {after.window_days} 天
              <span className="ml-1 normal-case font-normal text-muted-foreground/70">
                ({after.date_start && after.date_end
                  ? fmtDateRange(after.date_start, after.date_end)
                  : windowDateRange(change.timestamp, after.window_days, false, lang)})
              </span>
              <span className="ml-1 normal-case font-normal text-muted-foreground/50 text-[10px]">{t('ct_normalized')}</span>
            </p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {[
                { label: t('ct_impressions'), value: after.impressions.toLocaleString(), delta: delta.impressions_delta },
                { label: t('ct_clicks'), value: after.clicks.toLocaleString(), delta: delta.clicks_delta },
                { label: 'CTR', value: `${(after.ctr * 100).toFixed(1)}%`, delta: delta.ctr_delta * 100 },
                { label: spendLabel, value: `$${after.cost.toFixed(2)}`, delta: delta.cost_delta },
                { label: t('ct_conversions'), value: after.conversions.toFixed(1), delta: delta.conversions_delta },
                { label: 'ROAS', value: fmtRoas(after.roas), delta: delta.roas_delta },
              ].map(({ label, value, delta: d }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn(
                    'text-xs font-semibold',
                    d > 0 && (label === spendLabel ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'),
                    d < 0 && (label === spendLabel ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                  )}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 px-3 py-2 rounded border border-border bg-card text-xs text-muted-foreground">
          {t('ct_no_snapshot')}
        </div>
      )}

      {/* AI Insight */}
      <div className="border border-border rounded px-3 py-2.5 bg-card">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold flex items-center gap-1.5 text-yellow-400">
            <Sparkles size={11} />
            {t('ai_analysis')}
            {isAiGenerated && <span className="text-blue-400 font-normal">· {t('ai_live_badge')}</span>}
          </p>
          <button
            onClick={handleGenerateAI}
            disabled={aiLoading}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading
              ? <><Loader2 size={11} className="animate-spin" /> {t('generating')}</>
              : <><Sparkles size={11} /> {isAiGenerated ? t('regenerate') : t('analyze_claude')}</>
            }
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{displayInsight}</p>
        {aiError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{t('ai_failed_prefix')}{aiError}。{t('ai_key_hint')}</p>
        )}
      </div>
    </div>
  );
}

type ChangeDateRange = '30d' | '90d' | '180d' | '365d';

export default function ChangeTrackerPage() {
  const { selectedAccountId } = useSettings();
  const { t, lang } = useI18n();
  const [allAnnotated, setAllAnnotated] = useState<AnnotatedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState('all');
  const [verdict, setVerdict] = useState('all');
  const [dateRange, setDateRange] = useState<ChangeDateRange>('30d');

  const CHANGE_DATE_RANGE_OPTIONS: { key: ChangeDateRange; label: string; days: number }[] = [
    { key: '30d',  label: t('ct_change_range_30'),  days: 30  },
    { key: '90d',  label: t('ct_change_range_90'),  days: 90  },
    { key: '180d', label: t('ct_change_range_180'), days: 180 },
    { key: '365d', label: t('ct_change_range_365'), days: 365 },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/changes?account_id=${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        const changes = data.changes ?? [];
        // Map DB field names → AccountChange schema
        const normalized = changes.map((c: Record<string, unknown>) => ({
          ...c,
          timestamp: c.changed_at ?? c.timestamp ?? new Date().toISOString(),
          changed_by: c.changed_by ?? 'Google Ads',
          change_type: c.change_type ?? 'UNKNOWN',
          resource_type: c.resource_type ?? 'UNKNOWN',
          resource_name: c.resource_name ?? '',
          campaign: c.campaign ?? '',
          ad_group: c.ad_group ?? null,
          old_value: c.old_value ?? null,
          new_value: c.new_value ?? null,
          performance_before: c.performance_before ?? null,
          performance_after: c.performance_after ?? null,
        }));
        setAllAnnotated(annotateChanges(normalized));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  const summary = useMemo(() => computeSummary(allAnnotated), [allAnnotated]);
  const allCampaigns = useMemo(() => [...new Set(allAnnotated.map(a => a.change.campaign))], [allAnnotated]);

  const filtered = useMemo(() => {
    const rangeDays = CHANGE_DATE_RANGE_OPTIONS.find(o => o.key === dateRange)?.days ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    return allAnnotated.filter(a => {
      if (campaign !== 'all' && a.change.campaign !== campaign) return false;
      if (verdict !== 'all' && a.delta.verdict !== verdict) return false;
      if (new Date(a.change.timestamp) < cutoff) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnnotated, campaign, verdict, dateRange]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) =>
      new Date(b.change.timestamp).getTime() - new Date(a.change.timestamp).getTime()
    ), [filtered]);

  function toggle(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> 加载中...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold">{t('change_tracker_title')}</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          title={t('change_total')}
          value={String(summary.total_changes)}
          subtitle={CHANGE_DATE_RANGE_OPTIONS.find(o => o.key === dateRange)?.label ?? t('ct_change_range_30')}
        />
        <MetricCard
          title={t('change_positive')}
          value={String(summary.positive_changes)}
          subtitle={`${t('ct_kpi_ratio')} ${Math.round(summary.positive_changes / summary.total_changes * 100)}%`}
          highlight
        />
        <MetricCard
          title={t('change_negative')}
          value={String(summary.negative_changes)}
          subtitle={t('ct_kpi_watchout')}
        />
        <MetricCard
          title={t('change_saved')}
          value={`$${summary.cost_saved.toFixed(0)}`}
          subtitle={t('ct_kpi_via_pausing')}
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date range tabs */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
          {CHANGE_DATE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              className={cn(
                'px-2.5 py-0.5 rounded text-xs transition-colors',
                dateRange === opt.key
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Select value={campaign} onValueChange={(v) => setCampaign(v ?? 'all')}>
          <SelectTrigger className="w-52 h-8 text-xs">
            <SelectValue placeholder={t('ct_all_campaigns')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ct_all_campaigns')}</SelectItem>
            {allCampaigns.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={verdict} onValueChange={(v) => setVerdict(v ?? 'all')}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="全部结果" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部结果</SelectItem>
            <SelectItem value="positive">正向</SelectItem>
            <SelectItem value="negative">负向</SelectItem>
            <SelectItem value="neutral">中性</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{sorted.length} {t('ct_changes_suffix')}</span>
      </div>

      {/* Change list */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">{t('ct_record_title')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('ct_record_subtitle')}</p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {/* Header row */}
          <div className="grid grid-cols-[140px_1fr_130px_80px_80px_80px_80px_80px_28px] gap-2 px-4 py-2 border-b border-border">
            {[t('ct_col_time'), t('ct_col_change'), t('ct_col_campaign'), 'ΔROAS', `Δ${t('ct_conversions')}`, `Δ${t('ct_spend')}`, `Δ${t('ct_clicks')}`, t('ct_col_result'), ''].map(h => (
              <span key={h} className="text-xs text-muted-foreground font-medium">{h}</span>
            ))}
          </div>

          {sorted.map(annotated => {
            const { change, delta } = annotated;
            const vc = getVerdictConfig(delta.verdict, lang);
            const isExpanded = expandedId === change.change_id;

            return (
              <div key={change.change_id}>
                <div
                  className="grid grid-cols-[140px_1fr_130px_80px_80px_80px_80px_80px_28px] gap-2 px-4 py-2.5 border-b border-border hover:bg-accent/20 cursor-pointer transition-colors items-center"
                  onClick={() => toggle(change.change_id)}
                >
                  {/* Time — displayed in browser local timezone */}
                  <div>
                    <p className="text-xs text-foreground font-medium">{formatChangeDateShort(change.timestamp, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(change.timestamp))}
                    </p>
                    <p className="text-[10px] text-muted-foreground/40 leading-tight">{t('ct_local_time')}</p>
                  </div>

                  {/* Change content */}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{getChangeTypeLabel(change.change_type, lang)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {/* If resource_name looks like a raw numeric/tilde ID, use campaign name instead */}
                      {/^[\d~_]+$/.test(change.resource_name) ? (change.campaign || '—') : (change.resource_name || change.campaign || '—')}
                      {change.old_value && change.new_value
                        ? ` · ${parseChangeValue(change.old_value, lang)} → ${parseChangeValue(change.new_value, lang)}`
                        : ''}
                    </p>
                    <p className="text-xs text-muted-foreground/60">{change.changed_by}</p>
                  </div>

                  {/* Campaign */}
                  <p className="text-xs text-muted-foreground truncate">{change.campaign}</p>

                  {/* Deltas */}
                  <DeltaCell
                    value={delta.roas_delta !== 0 ? fmtDelta(delta.roas_delta) + 'x' : '—'}
                    good={delta.roas_delta > 0.1}
                    bad={delta.roas_delta < -0.1}
                  />
                  <DeltaCell
                    value={delta.conversions_delta !== 0 ? fmtDelta(delta.conversions_delta) : '—'}
                    good={delta.conversions_delta > 0}
                    bad={delta.conversions_delta < 0}
                  />
                  <DeltaCell
                    value={delta.cost_delta !== 0 ? '$' + fmtDelta(delta.cost_delta) : '—'}
                    good={delta.cost_delta < 0}
                    bad={delta.cost_delta > 30}
                  />
                  <DeltaCell
                    value={delta.clicks_delta !== 0 ? fmtDelta(delta.clicks_delta) : '—'}
                    good={delta.clicks_delta > 0}
                    bad={delta.clicks_delta < 0}
                  />

                  {/* Verdict */}
                  <Badge variant="outline" className={cn('text-xs px-1.5 whitespace-nowrap', vc.badgeClass)}>
                    {vc.label}
                  </Badge>

                  {/* Expand toggle */}
                  <span className="text-muted-foreground">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>

                {isExpanded && <ExpandedRow annotated={annotated} />}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
