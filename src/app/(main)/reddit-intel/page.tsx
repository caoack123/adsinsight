'use client';

import { useState } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Search, Loader2, TrendingUp, Users, Lightbulb, Map,
  MessageSquare, ThumbsUp, ExternalLink, ChevronDown,
  ChevronUp, AlertCircle, BarChart3, Flame, Globe2,
} from 'lucide-react';
import type { RedditIntelResponse, RedditIntelReport } from '@/app/api/reddit-intel/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pulseColor(pulse: string) {
  const p = pulse.toLowerCase();
  if (p.includes('high') || p.includes('热') || p.includes('活跃') || p.includes('积极'))
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800/30';
  if (p.includes('grow') || p.includes('增长') || p.includes('上升'))
    return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30';
  if (p.includes('negative') || p.includes('负面') || p.includes('批评'))
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30';
  return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/30';
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function InsightList({ items, color = 'blue' }: { items: string[]; color?: string }) {
  const dotColor: Record<string, string> = {
    blue:   'bg-blue-400',
    green:  'bg-green-400',
    red:    'bg-red-400',
    yellow: 'bg-yellow-400',
    purple: 'bg-purple-400',
    orange: 'bg-orange-400',
  };
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-xs text-foreground leading-relaxed">
          <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', dotColor[color] ?? 'bg-muted-foreground')} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function SectionCard({ title, icon: Icon, children, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Icon size={12} />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}

// ─── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Overview',         labelZh: '总览',      icon: BarChart3   },
  { id: 'sentiment',   label: 'Sentiment',         labelZh: '情绪分析',  icon: Flame       },
  { id: 'audience',    label: 'Audience Voice',    labelZh: '社群声音',  icon: Users       },
  { id: 'content',     label: 'Content Intel',     labelZh: '内容情报',  icon: Lightbulb   },
  { id: 'brand',       label: 'Brand Signals',     labelZh: '品牌信号',  icon: TrendingUp  },
  { id: 'opportunity', label: 'Opportunities',     labelZh: '机会地图',  icon: Map         },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Report display ────────────────────────────────────────────────────────────

function ReportDisplay({ report, posts, meta }: {
  report: RedditIntelReport;
  posts: RedditIntelResponse['posts'];
  meta: RedditIntelResponse['meta'];
}) {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showPosts, setShowPosts] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  const es   = report.executive_summary;
  const cl   = report.community_landscape;
  const sa   = report.sentiment_analysis;
  const av   = report.audience_voice;
  const ci   = report.content_intelligence;
  const bs   = report.brand_signals;
  const om   = report.opportunity_map;
  const tpa  = report.top_posts_analysis;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-orange-500">🤖</span>
            {lang === 'en' ? `Reddit Community Intelligence` : 'Reddit 社群洞察'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === 'en'
              ? `"${meta.query}" · ${meta.posts_analyzed} posts · ${meta.comments_analyzed} comments`
              : `"${meta.query}" · ${meta.posts_analyzed} 篇帖子 · ${meta.comments_analyzed} 条评论`}
          </p>
        </div>
        <span className={cn(
          'text-xs px-3 py-1 rounded-full border font-medium',
          pulseColor(es.community_pulse),
        )}>
          {es.community_pulse}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5 w-fit flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon size={11} />
            {lang === 'en' ? tab.label : tab.labelZh}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Headline */}
          <Card className="border-border bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-950/10">
            <CardContent className="pt-5 pb-5 px-5">
              <p className="text-base font-semibold text-foreground leading-snug">{es.headline}</p>
            </CardContent>
          </Card>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: lang === 'en' ? 'Posts Analyzed' : '分析帖子', value: fmtNum(meta.posts_analyzed) },
              { label: lang === 'en' ? 'Comments Sampled' : '采样评论', value: fmtNum(meta.comments_analyzed) },
              { label: lang === 'en' ? 'Sentiment Score' : '情绪得分', value: `${sa.sentiment_score}/100` },
            ].map(s => (
              <Card key={s.label} className="border-border">
                <CardContent className="pt-3 pb-3 px-4 text-center">
                  <p className="text-xl font-bold tabular-nums text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Key findings */}
          <SectionCard title={lang === 'en' ? 'Key Findings' : '核心洞察'} icon={TrendingUp}>
            <div className="grid grid-cols-1 gap-2">
              {es.key_findings.map((f, i) => (
                <div key={i} className="flex gap-3 p-2.5 rounded-md bg-muted/30">
                  <span className="shrink-0 text-xs font-bold text-muted-foreground/60 mt-0.5 w-4">{i + 1}</span>
                  <p className="text-xs text-foreground leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Community landscape */}
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Top Communities' : '活跃社群'} icon={Globe2}>
              <div className="space-y-2">
                {cl.top_subreddits.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded">
                      r/{s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.relevance}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">{cl.activity_insight}</p>
            </SectionCard>

            <SectionCard title={lang === 'en' ? 'Discussion Types' : '讨论类型'} icon={MessageSquare}>
              <div className="space-y-2">
                {cl.discussion_types.map((d, i) => (
                  <div key={i}>
                    <span className="text-xs font-medium text-foreground">{d.type}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Top posts analysis */}
          <SectionCard title={lang === 'en' ? 'Top Posts Analysis' : '热帖解析'} icon={BarChart3}>
            <div className="space-y-3">
              {tpa.map((p, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-md bg-muted/20 border border-border/50">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-xs font-bold flex items-center justify-center">
                    {p.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono text-orange-600 dark:text-orange-400">r/{p.subreddit}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp size={9} /> {fmtNum(p.score)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 italic">{p.why_resonates}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Sentiment ────────────────────────────────────────────────────────── */}
      {activeTab === 'sentiment' && (
        <div className="space-y-4">
          <SectionCard title={lang === 'en' ? 'Sentiment Overview' : '情绪总览'} icon={Flame}>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground">{sa.sentiment_score}</p>
                <p className="text-xs text-muted-foreground">/100</p>
              </div>
              <div className="flex-1">
                <div className="h-2.5 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      sa.sentiment_score >= 70 ? 'bg-green-500'
                      : sa.sentiment_score >= 40 ? 'bg-yellow-500'
                      : 'bg-red-500',
                    )}
                    style={{ width: `${sa.sentiment_score}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-foreground mt-2">{sa.overall_sentiment}</p>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-3 gap-4">
            <SectionCard title={lang === 'en' ? 'Positive Themes' : '正面主题'} icon={TrendingUp}>
              <InsightList items={sa.positive_themes} color="green" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Negative Themes' : '负面主题'} icon={AlertCircle}>
              <InsightList items={sa.negative_themes} color="red" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Neutral Observations' : '中性观察'} icon={MessageSquare}>
              <InsightList items={sa.neutral_observations} color="blue" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Audience Voice ───────────────────────────────────────────────────── */}
      {activeTab === 'audience' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Pain Points' : '痛点'} icon={AlertCircle}>
              <InsightList items={av.pain_points} color="red" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Desires & Wants' : '欲望与需求'} icon={TrendingUp}>
              <InsightList items={av.desires} color="green" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Frequently Asked' : '高频问题'} icon={MessageSquare}>
              <InsightList items={av.frequently_asked} color="blue" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Expert Opinions' : '达人/专家观点'} icon={Lightbulb}>
              <InsightList items={av.expert_opinions} color="purple" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Content Intel ────────────────────────────────────────────────────── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Popular Topics' : '热门话题'} icon={TrendingUp}>
              <InsightList items={ci.popular_topics} color="orange" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Viral Post Patterns' : '爆帖规律'} icon={Flame}>
              <InsightList items={ci.viral_post_patterns} color="red" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Comment Triggers' : '引发评论的触发点'} icon={MessageSquare}>
              <InsightList items={ci.comment_triggers} color="blue" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Language Patterns' : '语言与表达习惯'} icon={Lightbulb}>
              <InsightList items={ci.language_patterns} color="purple" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Brand Signals ────────────────────────────────────────────────────── */}
      {activeTab === 'brand' && (
        <div className="space-y-4">
          <SectionCard title={lang === 'en' ? 'Perception Summary' : '品牌认知概述'} icon={TrendingUp}>
            <p className="text-sm text-muted-foreground leading-relaxed">{bs.perception_summary}</p>
          </SectionCard>
          <div className="grid grid-cols-3 gap-4">
            <SectionCard title={lang === 'en' ? 'Positive Associations' : '正面联想'} icon={TrendingUp}>
              <InsightList items={bs.positive_associations} color="green" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Risk Signals' : '风险信号'} icon={AlertCircle}>
              <InsightList items={bs.risk_signals} color="red" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Competitor Mentions' : '竞品提及'} icon={Users}>
              <InsightList items={bs.competitor_mentions} color="yellow" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Opportunity ──────────────────────────────────────────────────────── */}
      {activeTab === 'opportunity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Content Gaps' : '内容空白'} icon={Map}>
              <InsightList items={om.content_gaps} color="blue" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Unanswered Questions' : '未被解答的问题'} icon={MessageSquare}>
              <InsightList items={om.underserved_questions} color="purple" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Community Pain Points' : '社群核心痛点'} icon={AlertCircle}>
              <InsightList items={om.community_pain_points} color="red" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Engagement Hooks' : '互动钩子'} icon={Lightbulb}>
              <InsightList items={om.engagement_hooks} color="orange" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Raw posts accordion ───────────────────────────────────────────────── */}
      <Card className="border-border">
        <button
          onClick={() => setShowPosts(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Globe2 size={14} className="text-orange-500" />
            {lang === 'en' ? `All ${posts.length} Reddit Posts` : `全部 ${posts.length} 篇 Reddit 帖子`}
          </span>
          {showPosts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showPosts && (
          <div className="border-t border-border divide-y divide-border max-h-[520px] overflow-y-auto">
            {posts.map(post => (
              <div key={post.id}>
                <button
                  onClick={() => setExpandedPost(prev => prev === post.id ? null : post.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{post.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono text-orange-600 dark:text-orange-400">r/{post.subreddit}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={10} />{fmtNum(post.score)}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={10} />{post.num_comments}</span>
                      <span>{Math.round(post.upvote_ratio * 100)}% upvoted</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink size={12} />
                    </a>
                    {expandedPost === post.id ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </button>
                {expandedPost === post.id && (
                  <div className="px-4 pb-3 bg-muted/20 space-y-2">
                    {post.selftext && (
                      <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-orange-300 dark:border-orange-700 pl-3">
                        {post.selftext}
                      </p>
                    )}
                    {post.top_comments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                          {lang === 'en' ? 'Top Comments' : '热门评论'}
                        </p>
                        <div className="space-y-1.5">
                          {post.top_comments.slice(0, 8).map((c, ci) => (
                            <div key={ci} className="flex gap-2 text-xs">
                              <span className="text-muted-foreground/50 flex items-center gap-0.5 shrink-0">
                                <ThumbsUp size={9} />{c.score}
                              </span>
                              <p className="text-muted-foreground leading-relaxed">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: 'Searching Reddit posts…',       labelZh: '搜索 Reddit 帖子…' },
  { label: 'Fetching community comments…',  labelZh: '抓取社群评论…' },
  { label: 'Gemini AI deep analysis…',      labelZh: 'Gemini AI 深度分析中…' },
];

function LoadingState({ step, lang }: { step: number; lang: 'zh' | 'en' }) {
  return (
    <Card className="border-border">
      <CardContent className="pt-6 pb-6 px-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={24} className="animate-spin text-orange-400" />
          <div className="space-y-2 w-full max-w-xs">
            {LOADING_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                  i < step  ? 'bg-green-500'
                  : i === step ? 'bg-orange-500 animate-pulse'
                  : 'bg-border',
                )} />
                <span className={cn(
                  'text-xs transition-colors',
                  i <= step ? 'text-foreground' : 'text-muted-foreground/50',
                )}>
                  {lang === 'en' ? s.label : s.labelZh}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function RedditIntelPage() {
  const { settings } = useSettings();
  const { lang } = useI18n();

  const [query,       setQuery]       = useState('');
  const [outputLang,  setOutputLang]  = useState<'zh' | 'en'>('en');
  const [loading,     setLoading]     = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<RedditIntelResponse | null>(null);

  const stepTimerRef = { current: null as ReturnType<typeof setInterval> | null };

  function startStepTimer() {
    let step = 0;
    setLoadingStep(0);
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 8000);
  }

  function clearStepTimer() {
    if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null; }
  }

  async function handleAnalyze() {
    if (!query.trim()) return;
    if (!settings.googleAiApiKey) {
      setError(lang === 'en'
        ? 'Please configure your Google AI API Key in Settings first.'
        : '请先在设置中配置 Google AI API Key。');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    startStepTimer();

    try {
      const res = await fetch('/api/reddit-intel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:          query.trim(),
          output_lang:    outputLang,
          gemini_api_key: settings.googleAiApiKey || undefined,
          model:          settings.videoAbcdModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setResult(data as RedditIntelResponse);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      clearStepTimer();
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-base font-semibold flex items-center gap-2">
          <Globe2 size={16} className="text-orange-500" />
          {lang === 'en' ? 'Reddit Community Intelligence' : 'Reddit 社群洞察'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lang === 'en'
            ? 'Analyze Reddit discussions to uncover community sentiment, pain points and opportunities'
            : '分析 Reddit 讨论，挖掘社群情绪、真实痛点与市场机会'}
        </p>
      </div>

      {/* Search form */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Query */}
        <div className="flex-1 min-w-48 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {lang === 'en' ? 'Search Query' : '搜索词'}
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading) handleAnalyze(); }}
              placeholder={lang === 'en' ? 'Brand, product, topic…' : '品牌名、产品、话题…'}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm pl-8 focus:outline-none focus:ring-1 focus:ring-orange-500/50 placeholder:text-muted-foreground/50"
              disabled={loading}
            />
          </div>
        </div>

        {/* Language toggle */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {lang === 'en' ? 'Report Language' : '报告语言'}
          </label>
          <div className="flex rounded border border-border overflow-hidden h-[34px]">
            <button type="button" onClick={() => setOutputLang('en')} disabled={loading}
              className={cn('px-3 text-xs font-medium transition-colors',
                outputLang === 'en' ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground hover:text-foreground')}>
              🇺🇸 EN
            </button>
            <button type="button" onClick={() => setOutputLang('zh')} disabled={loading}
              className={cn('px-3 text-xs font-medium transition-colors border-l border-border',
                outputLang === 'zh' ? 'bg-orange-600 text-white' : 'bg-background text-muted-foreground hover:text-foreground')}>
              🇨🇳 中文
            </button>
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {lang === 'en' ? 'Analyze' : '开始分析'}
        </button>
      </div>

      {/* Credential status */}
      {settings.googleAiApiKey ? (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <span>✓</span>
          {lang === 'en' ? 'Google AI key configured. Reddit data fetched via Apify.' : 'Google AI Key 已配置，Reddit 数据通过 Apify 获取。'}
        </p>
      ) : (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <span>⚠</span>
          {lang === 'en'
            ? 'Google AI API Key not set — go to Settings to configure.'
            : '未配置 Google AI API Key — 前往设置页面添加。'}
          <a href="/settings" className="underline hover:no-underline">
            {lang === 'en' ? 'Settings →' : '去设置 →'}
          </a>
        </p>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="pt-3 pb-3 px-4 flex items-start gap-2">
            <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && <LoadingState step={loadingStep} lang={lang} />}

      {/* Report */}
      {result && !loading && (
        <ReportDisplay report={result.report} posts={result.posts} meta={result.meta} />
      )}
    </div>
  );
}
