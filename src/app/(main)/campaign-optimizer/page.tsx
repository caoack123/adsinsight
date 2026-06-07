'use client';

import { useState, useCallback } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, Zap, Plus, ChevronDown, ChevronUp,
  RotateCcw, Play, Target, DollarSign, BarChart3, Rocket,
  ShieldAlert, ArrowRight, Clock,
} from 'lucide-react';
import type {
  CampaignOptimizerResponse,
  OptimizationSuggestion,
  NewCampaignIdea,
} from '@/app/api/campaign-optimizer/route';
import campaignData from '@/data/campaign-optimizer.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
}

function fmtRoas(r: number) {
  return `${r.toFixed(2)}x`;
}

// ─── Priority / risk badge colors ─────────────────────────────────────────────

const PRIORITY_CFG = {
  high:   { label: { zh: '高优先', en: 'HIGH' },   cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30' },
  medium: { label: { zh: '中优先', en: 'MEDIUM' }, cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30' },
  low:    { label: { zh: '低优先', en: 'LOW' },    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30' },
};

const RISK_CFG = {
  low:    { label: { zh: '低风险', en: 'Low risk' },  cls: 'text-green-600 dark:text-green-400' },
  medium: { label: { zh: '中风险', en: 'Med risk' },  cls: 'text-amber-600 dark:text-amber-400' },
  high:   { label: { zh: '高风险', en: 'High risk' }, cls: 'text-red-600 dark:text-red-400' },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  INCREASE_BUDGET:          TrendingUp,
  DECREASE_BUDGET:          TrendingDown,
  INCREASE_BID:             TrendingUp,
  DECREASE_BID:             TrendingDown,
  CHANGE_BIDDING_STRATEGY:  Target,
  PAUSE_AD_GROUP:           XCircle,
  PAUSE_CAMPAIGN:           XCircle,
  ADD_NEGATIVE_KEYWORDS:    ShieldAlert,
  SCALE_UP:                 Rocket,
  RESTRUCTURE:              BarChart3,
};

const CONFIDENCE_CFG = {
  high:   { cls: 'text-green-600 dark:text-green-400',  label: { zh: '高信心', en: 'High confidence' } },
  medium: { cls: 'text-amber-600 dark:text-amber-400',  label: { zh: '中信心', en: 'Medium confidence' } },
  low:    { cls: 'text-muted-foreground',                label: { zh: '低信心', en: 'Low confidence' } },
};

// ─── Loading steps ─────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { zh: '读取 Campaign 数据…',     en: 'Reading campaign data…' },
  { zh: '分析历史变更影响…',        en: 'Analysing change history…' },
  { zh: 'AI 深度优化分析中…',       en: 'AI deep optimization…' },
  { zh: '生成新 Campaign 方案…',   en: 'Generating new campaign ideas…' },
];

// ─── Health score ring ─────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" className="-rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Campaign mini-table (overview) ───────────────────────────────────────────

function CampaignOverview({ lang }: { lang: 'zh' | 'en' }) {
  const campaigns = campaignData.campaigns;
  const L = (zh: string, en: string) => lang === 'zh' ? zh : en;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-2 pr-3 font-medium">{L('Campaign', 'Campaign')}</th>
            <th className="text-right py-2 px-2 font-medium">{L('花费', 'Cost')}</th>
            <th className="text-right py-2 px-2 font-medium">ROAS</th>
            <th className="text-right py-2 px-2 font-medium">{L('转化', 'Conv.')}</th>
            <th className="text-right py-2 px-2 font-medium">CPA</th>
            <th className="text-right py-2 pl-2 font-medium">{L('状态', 'Status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {campaigns.map(c => {
            const roasOk = c.metrics.roas >= 2.0;
            const roasBad = c.metrics.roas < 1.0;
            return (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-foreground leading-snug">{c.name}</div>
                  <div className="text-muted-foreground/70 mt-0.5">{c.type} · {c.bidding_strategy}</div>
                </td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtMoney(c.metrics.cost)}</td>
                <td className={cn('text-right py-2.5 px-2 tabular-nums font-semibold',
                  roasBad ? 'text-red-500' : roasOk ? 'text-green-600 dark:text-green-400' : 'text-amber-500')}>
                  {fmtRoas(c.metrics.roas)}
                </td>
                <td className="text-right py-2.5 px-2 tabular-nums">{c.metrics.conversions}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtMoney(c.metrics.cost_per_conversion)}</td>
                <td className="text-right py-2.5 pl-2">
                  <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium',
                    c.status === 'ENABLED' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                           : 'bg-muted text-muted-foreground')}>
                    {c.status === 'ENABLED' ? L('运行中', 'Active') : L('暂停', 'Paused')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Suggestion card ──────────────────────────────────────────────────────────

type ApplyState = 'idle' | 'applying' | 'applied' | 'rolled_back';

function SuggestionCard({
  suggestion,
  lang,
  applyState,
  onApply,
  onRollback,
}: {
  suggestion: OptimizationSuggestion;
  lang: 'zh' | 'en';
  applyState: ApplyState;
  onApply: () => void;
  onRollback: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const L = (zh: string, en: string) => lang === 'zh' ? zh : en;

  const pri = PRIORITY_CFG[suggestion.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.low;
  const risk = RISK_CFG[suggestion.risk_level as keyof typeof RISK_CFG] ?? RISK_CFG.low;
  const Icon = TYPE_ICON[suggestion.type] ?? Sparkles;

  const isApplied = applyState === 'applied';
  const isRolledBack = applyState === 'rolled_back';
  const isApplying = applyState === 'applying';

  return (
    <Card className={cn(
      'border transition-all',
      isApplied ? 'border-green-300 dark:border-green-700/50 bg-green-50/30 dark:bg-green-950/10'
      : isRolledBack ? 'border-muted bg-muted/20 opacity-60'
      : 'border-border hover:border-border/80',
    )}>
      <div className="px-4 pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={cn('p-1.5 rounded mt-0.5 shrink-0',
            isApplied ? 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400'
            : 'bg-muted/60 text-muted-foreground')}>
            {isApplied ? <CheckCircle2 size={14} /> : <Icon size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', pri.cls)}>
                {pri.label[lang]}
              </span>
              <span className="text-xs text-muted-foreground/70 font-mono">{suggestion.type}</span>
              {isApplied && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={10} /> {L('已执行', 'Applied')}
                </span>
              )}
              {isRolledBack && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RotateCcw size={10} /> {L('已回滚', 'Rolled back')}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground mt-1 leading-snug">
              {suggestion.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {suggestion.campaign}{suggestion.ad_group ? ` › ${suggestion.ad_group}` : ''}
            </p>
          </div>
        </div>

        {/* Value change + impact row */}
        {(suggestion.current_value || suggestion.recommended_value) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {suggestion.current_value && (
              <span className="text-xs bg-muted/50 px-2 py-1 rounded font-mono text-muted-foreground">
                {L('现在', 'Now')}: {suggestion.current_value}
              </span>
            )}
            {suggestion.current_value && suggestion.recommended_value && (
              <ArrowRight size={12} className="text-muted-foreground shrink-0" />
            )}
            {suggestion.recommended_value && (
              <span className="text-xs bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded font-mono text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
                {L('建议', 'Target')}: {suggestion.recommended_value}
              </span>
            )}
            <span className="text-xs font-medium text-green-700 dark:text-green-400 ml-auto pl-2">
              {suggestion.expected_impact}
            </span>
          </div>
        )}

        {/* Expand / action row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {L('查看理由', 'See rationale')}
          </button>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs', risk.cls)}>{risk.label[lang]}</span>
            {isApplied ? (
              <button
                onClick={onRollback}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <RotateCcw size={11} /> {L('回滚', 'Rollback')}
              </button>
            ) : isRolledBack ? null : (
              <button
                onClick={onApply}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isApplying ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                {L('执行', 'Apply')}
              </button>
            )}
          </div>
        </div>

        {/* Expanded rationale */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{L('分析依据', 'Rationale')}</p>
              <p className="text-xs text-foreground leading-relaxed">{suggestion.rationale}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{L('具体操作', 'Action')}</p>
              <p className="text-xs text-foreground leading-relaxed">{suggestion.action}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── New campaign card ─────────────────────────────────────────────────────────

type GenerateState = 'idle' | 'generating' | 'generated';

function NewCampaignCard({
  idea,
  lang,
  genState,
  onGenerate,
}: {
  idea: NewCampaignIdea;
  lang: 'zh' | 'en';
  genState: GenerateState;
  onGenerate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const L = (zh: string, en: string) => lang === 'zh' ? zh : en;

  const conf = CONFIDENCE_CFG[idea.confidence as keyof typeof CONFIDENCE_CFG] ?? CONFIDENCE_CFG.medium;
  const isGenerated = genState === 'generated';

  const TYPE_COLOR: Record<string, string> = {
    SEARCH:          'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    SHOPPING:        'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
    PERFORMANCE_MAX: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
    DISPLAY:         'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    VIDEO:           'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  };

  return (
    <Card className={cn(
      'border transition-all',
      isGenerated
        ? 'border-purple-300 dark:border-purple-700/50 bg-purple-50/20 dark:bg-purple-950/10'
        : 'border-border',
    )}>
      <div className="px-4 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn('p-1.5 rounded mt-0.5 shrink-0',
            isGenerated ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
            : 'bg-muted/60 text-muted-foreground')}>
            {isGenerated ? <CheckCircle2 size={14} /> : <Plus size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', TYPE_COLOR[idea.type] ?? 'bg-muted text-muted-foreground')}>
                {idea.type}
              </span>
              <span className={cn('text-xs font-medium', conf.cls)}>{conf.label[lang]}</span>
              {isGenerated && (
                <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <CheckCircle2 size={10} /> {L('已生成', 'Generated')}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground mt-1 leading-snug">{idea.name}</p>
          </div>
        </div>

        {/* Budget + expected revenue */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-xs text-muted-foreground">{L('建议预算', 'Budget')}</p>
            <p className="text-sm font-bold text-foreground">{idea.budget}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-xs text-muted-foreground">{L('出价策略', 'Bidding')}</p>
            <p className="text-xs font-semibold text-foreground leading-tight mt-0.5">{idea.bidding_strategy}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-xs text-muted-foreground">{L('预计月营收', 'Est. Revenue')}</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{idea.expected_monthly_revenue}</p>
          </div>
        </div>

        {/* Opportunity */}
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{idea.opportunity}</p>

        {/* Expand / generate row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {L('查看详细方案', 'See full plan')}
          </button>
          {isGenerated ? (
            <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 font-medium">
              <Rocket size={11} /> {L('Campaign 已创建（Demo）', 'Campaign created (Demo)')}
            </span>
          ) : (
            <button
              onClick={onGenerate}
              disabled={genState === 'generating'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {genState === 'generating'
                ? <><Loader2 size={11} className="animate-spin" /> {L('生成中…', 'Creating…')}</>
                : <><Plus size={11} /> {L('一键创建', 'Create Campaign')}</>
              }
            </button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{L('机会分析', 'Opportunity')}</p>
              <p className="text-xs text-foreground leading-relaxed">{idea.rationale}</p>
            </div>
            {idea.keywords && idea.keywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{L('核心关键词', 'Core Keywords')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {idea.keywords.map((kw, i) => (
                    <span key={i} className="text-xs bg-muted/50 border border-border px-2 py-0.5 rounded font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {idea.audience && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{L('受众设置', 'Audience')}</p>
                <p className="text-xs text-foreground">{idea.audience}</p>
              </div>
            )}
            {idea.target_roas && (
              <div className="flex items-center gap-2">
                <Target size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {L('目标 ROAS', 'Target ROAS')}: <span className="font-medium text-foreground">{idea.target_roas}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  icon: BarChart3,  zh: 'Campaign 概览', en: 'Overview' },
  { id: 'optimize',  icon: Sparkles,   zh: '优化建议',       en: 'Optimize' },
  { id: 'new',       icon: Plus,       zh: '新 Campaign',    en: 'New Campaigns' },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CampaignOptimizerPage() {
  const { settings } = useSettings();
  const { lang } = useI18n();
  const L = useCallback((zh: string, en: string) => lang === 'zh' ? zh : en, [lang]);

  const [tab,          setTab]         = useState<TabId>('overview');
  const [loading,      setLoading]     = useState(false);
  const [loadStep,     setLoadStep]    = useState(0);
  const [error,        setError]       = useState<string | null>(null);
  const [result,       setResult]      = useState<CampaignOptimizerResponse | null>(null);
  const [applyStates,  setApplyStates] = useState<Record<string, 'idle' | 'applying' | 'applied' | 'rolled_back'>>({});
  const [genStates,    setGenStates]   = useState<Record<string, 'idle' | 'generating' | 'generated'>>({});

  const stepTimerRef = { current: null as ReturnType<typeof setInterval> | null };

  async function handleAnalyze() {
    if (!settings.googleAiApiKey) {
      setError(L('请先在设置中配置 Google AI API Key。', 'Please configure Google AI API Key in Settings first.'));
      return;
    }
    setLoading(true);
    setError(null);
    setLoadStep(0);
    setApplyStates({});
    setGenStates({});

    let step = 0;
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadStep(step);
    }, 6000);

    try {
      const res = await fetch('/api/campaign-optimizer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: settings.googleAiApiKey,
          model:          settings.videoAbcdModel ?? 'gemini-2.5-flash',
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setResult(data as CampaignOptimizerResponse);
      setTab('optimize');
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setLoading(false);
    }
  }

  function handleApply(id: string) {
    setApplyStates(prev => ({ ...prev, [id]: 'applying' }));
    setTimeout(() => {
      setApplyStates(prev => ({ ...prev, [id]: 'applied' }));
    }, 900);
  }

  function handleRollback(id: string) {
    setApplyStates(prev => ({ ...prev, [id]: 'rolled_back' }));
  }

  function handleAutoApplyAll() {
    if (!result) return;
    const highPri = result.optimization_suggestions.filter(s => s.priority === 'high');
    highPri.forEach(s => {
      if (applyStates[s.id] !== 'applied') {
        setApplyStates(prev => ({ ...prev, [s.id]: 'applying' }));
        setTimeout(() => {
          setApplyStates(prev => ({ ...prev, [s.id]: 'applied' }));
        }, Math.random() * 600 + 600);
      }
    });
  }

  function handleGenerate(id: string) {
    setGenStates(prev => ({ ...prev, [id]: 'generating' }));
    setTimeout(() => {
      setGenStates(prev => ({ ...prev, [id]: 'generated' }));
    }, 1200);
  }

  const appliedCount  = Object.values(applyStates).filter(v => v === 'applied').length;
  const highPriCount  = result?.optimization_suggestions.filter(s => s.priority === 'high').length ?? 0;
  const allHighApplied = highPriCount > 0 &&
    result?.optimization_suggestions
      .filter(s => s.priority === 'high')
      .every(s => applyStates[s.id] === 'applied' || applyStates[s.id] === 'rolled_back');

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-blue-500" />
            {L('Campaign 智能优化', 'Campaign Optimizer')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {L(
              'AI 分析账号数据，自动生成优化建议并一键执行',
              'AI analyses your account and generates actionable optimization plans',
            )}
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> {L('分析中…', 'Analysing…')}</>
            : <><Sparkles size={14} /> {L('AI 一键分析', 'Run AI Analysis')}</>}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="border-border">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <div className="space-y-2 w-full max-w-xs">
                {LOADING_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                      i < loadStep  ? 'bg-green-500'
                      : i === loadStep ? 'bg-blue-500 animate-pulse'
                      : 'bg-border',
                    )} />
                    <span className={cn('text-xs', i <= loadStep ? 'text-foreground' : 'text-muted-foreground/50')}>
                      {lang === 'zh' ? s.zh : s.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="pt-3 pb-3 px-4 flex items-start gap-2">
            <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5 w-fit">
        {TABS.map(t => {
          const badgeCount = t.id === 'optimize' && result
            ? result.optimization_suggestions.filter(s => applyStates[s.id] !== 'applied' && applyStates[s.id] !== 'rolled_back').length
            : t.id === 'new' && result
            ? result.new_campaign_ideas.length
            : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                tab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon size={11} />
              {lang === 'zh' ? t.zh : t.en}
              {badgeCount > 0 && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold leading-none',
                  t.id === 'optimize' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white',
                )}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Account summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: L('总花费 (30d)', 'Total Spend'), value: fmtMoney(campaignData.account_totals.total_cost) },
              { label: L('总营收 (30d)', 'Total Revenue'), value: fmtMoney(campaignData.account_totals.total_conversions_value) },
              { label: 'Blended ROAS', value: fmtRoas(campaignData.account_totals.total_roas) },
              { label: L('转化次数', 'Conversions'), value: String(campaignData.account_totals.total_conversions) },
            ].map(m => (
              <Card key={m.label} className="border-border">
                <CardContent className="pt-3 pb-3 px-4 text-center">
                  <p className="text-xl font-bold tabular-nums text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Campaign table */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {L('Campaign 列表 · 最近 30 天', 'Campaigns · Last 30 days')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CampaignOverview lang={lang} />
            </CardContent>
          </Card>

          {/* Prompt to analyze */}
          {!result && !loading && (
            <Card className="border-dashed border-2 border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/10">
              <CardContent className="pt-6 pb-6 px-6 text-center space-y-3">
                <Sparkles size={24} className="mx-auto text-blue-400" />
                <p className="text-sm font-medium text-foreground">
                  {L('点击"AI 一键分析"，获取优化建议', 'Click "Run AI Analysis" to get optimization suggestions')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {L(
                    'AI 将分析所有 Campaign 数据，识别机会和风险，生成可执行的优化方案',
                    'AI will analyse all campaign data, identify opportunities and risks, and generate actionable plans',
                  )}
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Sparkles size={14} /> {L('开始分析', 'Analyse Now')}
                </button>
              </CardContent>
            </Card>
          )}

          {/* Health score (if analyzed) */}
          {result && !loading && (
            <Card className="border-border">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <HealthRing score={result.account_health_score} />
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-lg font-bold text-foreground">{result.account_health_score}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{result.health_label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{result.summary}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle size={11} /> {L('风险营收', 'Revenue at risk')}: {result.monthly_revenue_at_risk}
                      </span>
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <TrendingUp size={11} /> {L('增长机会', 'Opportunity')}: {result.monthly_revenue_opportunity}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Optimize tab ──────────────────────────────────────────────────────── */}
      {tab === 'optimize' && (
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="border-dashed border-2 border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/10">
              <CardContent className="pt-6 pb-6 px-6 text-center space-y-3">
                <Sparkles size={24} className="mx-auto text-blue-400" />
                <p className="text-sm font-medium text-foreground">{L('请先运行 AI 分析', 'Run AI Analysis first')}</p>
                <button onClick={handleAnalyze} className="inline-flex items-center gap-2 px-5 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Sparkles size={14} /> {L('开始分析', 'Analyse Now')}
                </button>
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{L('共', 'Total')} <strong className="text-foreground">{result.optimization_suggestions.length}</strong> {L('条建议', 'suggestions')}</span>
                  {appliedCount > 0 && (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> {appliedCount} {L('已执行', 'applied')}
                    </span>
                  )}
                </div>
                {!allHighApplied && highPriCount > 0 && (
                  <button
                    onClick={handleAutoApplyAll}
                    className="flex items-center gap-2 px-4 py-1.5 rounded border border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    <Zap size={12} />
                    {L(`一键执行全部 ${highPriCount} 条高优先建议`, `Auto-apply all ${highPriCount} high-priority`)}
                  </button>
                )}
              </div>

              {/* High priority section */}
              {result.optimization_suggestions.filter(s => s.priority === 'high').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                    <AlertTriangle size={11} /> {L('高优先级 — 建议立即处理', 'HIGH PRIORITY — Act now')}
                  </p>
                  <div className="space-y-3">
                    {result.optimization_suggestions
                      .filter(s => s.priority === 'high')
                      .map(s => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          lang={lang}
                          applyState={applyStates[s.id] ?? 'idle'}
                          onApply={() => handleApply(s.id)}
                          onRollback={() => handleRollback(s.id)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Medium + low priority */}
              {result.optimization_suggestions.filter(s => s.priority !== 'high').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock size={11} /> {L('中低优先级', 'Medium / Low Priority')}
                  </p>
                  <div className="space-y-3">
                    {result.optimization_suggestions
                      .filter(s => s.priority !== 'high')
                      .map(s => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          lang={lang}
                          applyState={applyStates[s.id] ?? 'idle'}
                          onApply={() => handleApply(s.id)}
                          onRollback={() => handleRollback(s.id)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── New Campaigns tab ─────────────────────────────────────────────────── */}
      {tab === 'new' && (
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="border-dashed border-2 border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/10">
              <CardContent className="pt-6 pb-6 px-6 text-center space-y-3">
                <Plus size={24} className="mx-auto text-purple-400" />
                <p className="text-sm font-medium text-foreground">{L('请先运行 AI 分析', 'Run AI Analysis first')}</p>
                <button onClick={handleAnalyze} className="inline-flex items-center gap-2 px-5 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors">
                  <Sparkles size={14} /> {L('开始分析', 'Analyse Now')}
                </button>
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {L(
                    `AI 发现 ${result.new_campaign_ideas.length} 个未开发的增长机会`,
                    `AI found ${result.new_campaign_ideas.length} untapped growth opportunities`,
                  )}
                </p>
                <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                  <DollarSign size={11} />
                  {L('预计总月增营收', 'Est. monthly uplift')}: {result.monthly_revenue_opportunity}
                </span>
              </div>
              <div className="space-y-4">
                {result.new_campaign_ideas.map(idea => (
                  <NewCampaignCard
                    key={idea.id}
                    idea={idea}
                    lang={lang}
                    genState={genStates[idea.id] ?? 'idle'}
                    onGenerate={() => handleGenerate(idea.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
