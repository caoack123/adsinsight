'use client';

import { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search, Loader2, PlayCircle, TrendingUp, Users, Lightbulb,
  Map, BookOpen, BarChart3, ChevronDown, ChevronUp,
  ExternalLink, ThumbsUp, MessageSquare, Eye, Flame,
  Target, Palette, Megaphone, Package, LineChart,
  Clock, Trash2, Languages, Download,
} from 'lucide-react';
import type { YouTubeIntelResponse, YouTubeIntelReport, VideoItem } from '@/app/api/youtube-intel/route';

// ─── History persistence ──────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  query: string;
  country_code: string;
  sort: string;
  output_lang: 'zh' | 'en';
  created_at: string;
  data: YouTubeIntelResponse;
}

const HISTORY_KEY = 'yt_intel_history_v1';
const MAX_HISTORY = 25;

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryItem[]; }
  catch { return []; }
}

function saveHistoryItem(item: HistoryItem): void {
  if (typeof window === 'undefined') return;
  const all = loadHistory();
  const updated = [item, ...all.filter(h => h.id !== item.id)].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* quota */ }
}

function removeHistoryItem(id: string): HistoryItem[] {
  const updated = loadHistory().filter(h => h.id !== id);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* quota */ }
  return updated;
}

// ─── Country options ───────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'IN', label: 'India' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'SG', label: 'Singapore' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'TH', label: 'Thailand' },
  { code: 'PH', label: 'Philippines' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'VN', label: 'Vietnam' },
  { code: 'CN', label: 'China (Mainland)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function parseDuration(iso: string) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = parseInt(m[1] ?? '0');
  const min = parseInt(m[2] ?? '0');
  const s = parseInt(m[3] ?? '0');
  if (h > 0) return `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${min}:${String(s).padStart(2,'0')}`;
}

function tempColor(temp: string) {
  const t = temp.toLowerCase();
  if (t.includes('hot') || t.includes('boom') || t.includes('explosive'))
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30';
  if (t.includes('grow') || t.includes('rising') || t.includes('upward'))
    return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800/30';
  if (t.includes('stable') || t.includes('mature'))
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30';
  if (t.includes('declin') || t.includes('shrink') || t.includes('saturat'))
    return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700/30';
  return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/30';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function SectionCard({
  title, icon: Icon, children, className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Icon size={12} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

function PlaybookCard({
  title, icon: Icon, items, accentClass,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  accentClass: string;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className={cn('p-1.5 rounded', accentClass)}>
            <Icon size={13} />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <InsightList items={items} />
      </CardContent>
    </Card>
  );
}

// ─── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: 'Overview',     labelZh: '总览',     icon: BarChart3 },
  { id: 'audience',     label: 'Audience',     labelZh: '受众洞察', icon: Users },
  { id: 'creative',     label: 'Creative Intel', labelZh: '创意情报', icon: Lightbulb },
  { id: 'opportunity',  label: 'Opportunities', labelZh: '机会地图', icon: Map },
  { id: 'playbooks',    label: 'Team Playbooks', labelZh: '团队策略', icon: BookOpen },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Report display ────────────────────────────────────────────────────────────

function ReportDisplay({
  report, videos, meta,
}: {
  report: YouTubeIntelReport;
  videos: VideoItem[];
  meta: YouTubeIntelResponse['meta'];
}) {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]     = useState<string | null>(null);

  async function handleDownloadPDF() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch('/api/youtube-intel/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, meta }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      // Trigger browser download
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const safeQuery = meta.query.replace(/[^\w\u4e00-\u9fff]/g, '-').slice(0, 30);
      a.href     = url;
      a.download = `yt-intel-${safeQuery}-${meta.generated_at.split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[PDF]', e);
      setPdfError(msg);
    } finally {
      setPdfLoading(false);
    }
  }

  const { executive_summary: es, content_landscape: cl, audience_intel: ai,
          brand_intelligence: bi, creative_intelligence: ci,
          opportunity_map: om, team_playbooks: tp, quantitative_summary: qs } = report;

  return (
    <div className="space-y-4">
      {/* Meta bar */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <PlayCircle size={12} className="text-red-500" />
          <strong className="text-foreground">"{meta.query}"</strong>
        </span>
        <span>·</span>
        <span>{COUNTRIES.find(c => c.code === meta.country_code)?.label ?? meta.country_code}</span>
        <span>·</span>
        <span className="flex items-center gap-1"><Eye size={10} /> {meta.videos_analyzed} {lang === 'en' ? 'videos' : '个视频'}</span>
        <span className="flex items-center gap-1"><MessageSquare size={10} /> {meta.comments_analyzed} {lang === 'en' ? 'comments' : '条评论'}</span>
        <Badge
          variant="outline"
          className={cn(
            'text-xs px-1.5',
            meta.output_lang === 'zh'
              ? 'border-red-500/40 text-red-500 dark:text-red-400'
              : 'border-blue-500/40 text-blue-500 dark:text-blue-400'
          )}
        >
          {meta.output_lang === 'zh' ? '中文报告' : 'EN Report'}
        </Badge>
        <span>{new Date(meta.generated_at).toLocaleString()}</span>
        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pdfLoading
            ? <><Loader2 size={11} className="animate-spin" /> {lang === 'en' ? 'Generating PDF…' : '生成 PDF 中…'}</>
            : <><Download size={11} /> {lang === 'en' ? 'Download PDF' : '下载 PDF'}</>
          }
        </button>
      </div>

      {pdfError && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded px-3 py-2">
          PDF error: {pdfError}
        </div>
      )}

      {/* Headline + market temp */}
      <div className="flex items-start gap-3 flex-wrap">
        <p className="text-base font-semibold flex-1">{es.headline}</p>
        <Badge variant="outline" className={cn('text-xs shrink-0 font-medium', tempColor(es.market_temperature))}>
          <Flame size={10} className="mr-1" />
          {es.market_temperature}
        </Badge>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon size={11} />
            {lang === 'en' ? tab.label : tab.labelZh}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Key findings */}
          <SectionCard title={lang === 'en' ? 'Key Findings' : '核心洞察'} icon={TrendingUp}>
            <div className="grid grid-cols-1 gap-2">
              {es.key_findings.map((f, i) => (
                <div key={i} className="flex gap-3 p-2.5 rounded bg-muted/30 border border-border">
                  <span className="text-xs font-bold text-blue-400 shrink-0 w-4">{i + 1}</span>
                  <p className="text-xs text-foreground leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Quantitative summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-0.5">{lang === 'en' ? 'Avg Views' : '平均观看量'}</p>
                <p className="text-xl font-bold tabular-nums">{fmtNum(qs.avg_views)}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-0.5">{lang === 'en' ? 'Median Views' : '中位数观看量'}</p>
                <p className="text-xl font-bold tabular-nums">{fmtNum(qs.median_views)}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-0.5">{lang === 'en' ? 'Comments Analyzed' : '已分析评论'}</p>
                <p className="text-xl font-bold tabular-nums">{fmtNum(qs.total_comments_analyzed)}</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground italic">{qs.engagement_insight}</p>

          {/* Top 5 videos */}
          <SectionCard title={lang === 'en' ? 'Top 5 Videos' : '热门视频 Top 5'} icon={PlayCircle}>
            <div className="space-y-3">
              {qs.top_5_videos.map((v) => (
                <div key={v.rank} className="flex gap-3 items-start">
                  <span className="text-sm font-bold text-muted-foreground/50 w-5 shrink-0 pt-0.5">#{v.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{v.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.channel} · {fmtNum(v.views)} {lang === 'en' ? 'views' : '次观看'}
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5 leading-relaxed">{v.why_it_works}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Content landscape */}
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Dominant Themes' : '主要内容主题'} icon={TrendingUp}>
              <div className="space-y-2.5">
                {cl.dominant_themes.map((t, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-foreground">{t.theme}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{t.why_it_works}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Winning Formats' : '高效内容形式'} icon={BarChart3}>
              <div className="space-y-2.5">
                {cl.winning_formats.map((f, i) => (
                  <div key={i}>
                    <Badge variant="outline" className="text-xs mb-0.5">{f.format}</Badge>
                    <p className="text-xs text-muted-foreground leading-snug">{f.description}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="rounded border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{lang === 'en' ? 'Publishing insight: ' : '发布规律：'}</span>
            {cl.publishing_insight}
          </div>
        </div>
      )}

      {/* ── Audience tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'audience' && (
        <div className="space-y-4">
          {/* Sentiment bar */}
          <Card className="border-border">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">{lang === 'en' ? 'Audience Sentiment Score' : '受众情绪分'}</p>
                <span className="text-2xl font-bold tabular-nums text-foreground">{ai.sentiment_score}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    ai.sentiment_score >= 70 ? 'bg-green-500' :
                    ai.sentiment_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${ai.sentiment_score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{ai.overall_sentiment}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Pain Points' : '用户痛点'} icon={Users}>
              <InsightList items={ai.pain_points} color="red" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Desires & Wants' : '用户期望'} icon={TrendingUp}>
              <InsightList items={ai.desires} color="green" />
            </SectionCard>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Viral Triggers' : '传播触发点'} icon={Flame}>
              <InsightList items={ai.viral_triggers} color="orange" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Demographic Signals' : '人群画像信号'} icon={Users}>
              <InsightList items={ai.demographic_signals} color="purple" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Creative Intel tab ───────────────────────────────────────────────── */}
      {activeTab === 'creative' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Title Patterns That Win' : '高效标题规律'} icon={TrendingUp}>
              <InsightList items={ci.title_patterns} color="blue" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Hook Formulas' : 'Hook 公式'} icon={Flame}>
              <InsightList items={ci.hook_formulas} color="orange" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Visual / Thumbnail Patterns' : '视觉与封面规律'} icon={Palette}>
              <InsightList items={ci.visual_patterns} color="purple" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Content Angles' : '内容切入角度'} icon={Lightbulb}>
              <InsightList items={ci.content_angles} color="green" />
            </SectionCard>
          </div>

          {/* Brand intel */}
          <SectionCard title={lang === 'en' ? 'Brand Perception' : '品牌认知'} icon={Target}>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{bi.perception_summary}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-1.5 text-green-600 dark:text-green-400">
                  {lang === 'en' ? 'Positive associations' : '正向品牌信号'}
                </p>
                <InsightList items={bi.positive_associations} color="green" />
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5 text-red-600 dark:text-red-400">
                  {lang === 'en' ? 'Risk signals' : '风险信号'}
                </p>
                <InsightList items={bi.risk_signals} color="red" />
              </div>
            </div>
          </SectionCard>

          <div className="rounded border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{lang === 'en' ? 'Competitive landscape: ' : '竞争格局：'}</span>
            {bi.competitor_landscape}
          </div>
        </div>
      )}

      {/* ── Opportunities tab ────────────────────────────────────────────────── */}
      {activeTab === 'opportunity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Content Gaps' : '内容空白'} icon={Map}>
              <InsightList items={om.content_gaps} color="blue" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'Trending Angles' : '趋势切角'} icon={TrendingUp}>
              <InsightList items={om.trending_angles} color="orange" />
            </SectionCard>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title={lang === 'en' ? 'Underserved Niches' : '未被服务的细分人群'} icon={Users}>
              <InsightList items={om.underserved_niches} color="purple" />
            </SectionCard>
            <SectionCard title={lang === 'en' ? 'First-Mover Opportunities' : '先发优势机会'} icon={Flame}>
              <InsightList items={om.first_mover_ops} color="green" />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── Team Playbooks tab ───────────────────────────────────────────────── */}
      {activeTab === 'playbooks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <PlaybookCard
              title={lang === 'en' ? 'CMO — Strategic Brief' : 'CMO — 战略决策'}
              icon={LineChart}
              items={tp.cmo}
              accentClass="bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
            />
            <PlaybookCard
              title={lang === 'en' ? 'Marketing Director — Campaign Plan' : '营销总监 — 执行计划'}
              icon={Megaphone}
              items={tp.marketing_director}
              accentClass="bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <PlaybookCard
              title={lang === 'en' ? 'Creative Team' : '创意团队'}
              icon={Palette}
              items={tp.creative_team}
              accentClass="bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
            />
            <PlaybookCard
              title={lang === 'en' ? 'Ads Team' : '广告投放团队'}
              icon={Target}
              items={tp.ads_team}
              accentClass="bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400"
            />
            <PlaybookCard
              title={lang === 'en' ? 'Product Team' : '产品团队'}
              icon={Package}
              items={tp.product_team}
              accentClass="bg-pink-100 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400"
            />
          </div>
        </div>
      )}

      {/* ── All videos accordion ─────────────────────────────────────────────── */}
      <Card className="border-border">
        <button
          onClick={() => setShowAllVideos(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <PlayCircle size={14} className="text-red-500" />
            {lang === 'en' ? `All ${videos.length} Videos` : `全部 ${videos.length} 个视频`}
          </span>
          {showAllVideos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showAllVideos && (
          <div className="border-t border-border divide-y divide-border">
            {videos.map((v) => (
              <div key={v.id}>
                <button
                  onClick={() => setExpandedVideo(prev => prev === v.id ? null : v.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                >
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-20 h-12 object-cover rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{v.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.channel} · {v.published}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye size={10} />{fmtNum(v.views)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={10} />{fmtNum(v.likes)}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={10} />{fmtNum(v.comments_count)}</span>
                      <span>{parseDuration(v.duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink size={12} />
                    </a>
                    {expandedVideo === v.id ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </button>
                {expandedVideo === v.id && v.top_comments.length > 0 && (
                  <div className="px-4 pb-3 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                      {lang === 'en' ? 'Top Comments' : '热门评论'}
                    </p>
                    <div className="space-y-1.5">
                      {v.top_comments.slice(0, 10).map((c, ci) => (
                        <div key={ci} className="flex gap-2 text-xs">
                          <span className="text-muted-foreground/50 flex items-center gap-0.5 shrink-0">
                            <ThumbsUp size={9} />{c.likes}
                          </span>
                          <p className="text-muted-foreground leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
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

// ─── History panel ────────────────────────────────────────────────────────────

function HistoryPanel({
  history, onLoad, onDelete, lang,
}: {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  lang: 'zh' | 'en';
}) {
  const [open, setOpen] = useState(true);
  if (history.length === 0) return null;

  return (
    <Card className="border-border">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Clock size={13} />
          {lang === 'en' ? `History (${history.length})` : `历史记录 (${history.length})`}
        </span>
        {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {history.map(item => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-accent/20 group transition-colors">
              <button onClick={() => onLoad(item)} className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground truncate max-w-[220px]">
                    "{item.query}"
                  </span>
                  <Badge variant="outline" className="text-xs px-1.5 shrink-0">{item.country_code}</Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs px-1.5 shrink-0',
                      item.output_lang === 'zh'
                        ? 'border-red-500/40 text-red-500 dark:text-red-400'
                        : 'border-blue-500/40 text-blue-500 dark:text-blue-400'
                    )}
                  >
                    {item.output_lang === 'zh' ? '中文' : 'EN'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.data.meta.videos_analyzed}{lang === 'en' ? ' videos' : ' 个视频'}
                    {' · '}
                    {item.data.meta.comments_analyzed}{lang === 'en' ? ' comments' : ' 条评论'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                className="text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 mt-0.5 shrink-0"
                title={lang === 'en' ? 'Delete' : '删除'}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Loading steps ─────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: 'Searching YouTube...', labelZh: '搜索 YouTube 视频...' },
  { label: 'Fetching video details & stats...', labelZh: '获取视频详情和统计数据...' },
  { label: 'Fetching audience comments...', labelZh: '抓取受众评论...' },
  { label: 'Gemini AI deep analysis...', labelZh: 'Gemini AI 深度分析中...' },
];

function LoadingState({ step, lang }: { step: number; lang: 'zh' | 'en' }) {
  return (
    <Card className="border-border">
      <CardContent className="pt-6 pb-6 px-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={24} className="animate-spin text-blue-400" />
          <div className="space-y-2 w-full max-w-xs">
            {LOADING_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0',
                  i < step  ? 'bg-green-500 text-white' :
                  i === step ? 'bg-blue-500 text-white animate-pulse' :
                  'bg-muted text-muted-foreground'
                )}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-xs',
                  i === step ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {lang === 'en' ? s.label : s.labelZh}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{lang === 'en' ? 'Est. 30–60 seconds' : '预计 30–60 秒'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function YouTubeIntelPage() {
  const { settings } = useSettings();
  const { lang } = useI18n();

  const [query, setQuery]               = useState('');
  const [countryCode, setCountryCode]   = useState('US');
  const [sort, setSort]                 = useState<'relevance' | 'date' | 'viewCount'>('relevance');
  const [outputLang, setOutputLang]     = useState<'zh' | 'en'>('en');
  const [loading, setLoading]           = useState(false);
  const [loadingStep, setLoadingStep]   = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const [result, setResult]             = useState<YouTubeIntelResponse | null>(null);
  const [history, setHistory]           = useState<HistoryItem[]>([]);

  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate history from localStorage on mount
  useEffect(() => { setHistory(loadHistory()); }, []);

  function startStepTimer() {
    let step = 0;
    setLoadingStep(0);
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 8000);  // advance step every ~8s
  }

  function clearStepTimer() {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }

  async function handleAnalyze() {
    if (!query.trim()) return;
    if (!settings.youtubeApiKey) {
      setError(lang === 'en'
        ? 'Please configure your YouTube Data API Key in Settings first.'
        : '请先在设置中配置 YouTube Data API Key。');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    startStepTimer();

    try {
      const res = await fetch('/api/youtube-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          country_code: countryCode,
          sort,
          output_lang: outputLang,
          youtube_api_key: settings.youtubeApiKey,
          gemini_api_key: settings.googleAiApiKey || undefined,
          model: settings.videoAbcdModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      const resp = data as YouTubeIntelResponse;
      setResult(resp);
      // Auto-save to history
      const histItem: HistoryItem = {
        id: Date.now().toString(),
        query: query.trim(),
        country_code: countryCode,
        sort,
        output_lang: outputLang,
        created_at: new Date().toISOString(),
        data: resp,
      };
      saveHistoryItem(histItem);
      setHistory(loadHistory());
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      clearStepTimer();
      setLoading(false);
    }
  }

  function handleLoadHistory(item: HistoryItem) {
    setQuery(item.query);
    setCountryCode(item.country_code);
    setSort(item.sort as 'relevance' | 'date' | 'viewCount');
    setOutputLang(item.output_lang);
    setResult(item.data);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeleteHistory(id: string) {
    setHistory(removeHistoryItem(id));
  }

  const sortOptions = [
    { value: 'relevance',  label: lang === 'en' ? 'Most Relevant'   : '最相关'  },
    { value: 'viewCount',  label: lang === 'en' ? 'Most Popular'    : '最热门'  },
    { value: 'date',       label: lang === 'en' ? 'Most Recent'     : '最新发布' },
  ] as const;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-base font-semibold flex items-center gap-2">
          <PlayCircle size={16} className="text-red-500" />
          {lang === 'en' ? 'YouTube Intelligence' : 'YouTube 洞察报告'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lang === 'en'
            ? 'Search any brand, category or competitor — get AI-powered insights for every team.'
            : 'AI 驱动的 YouTube 市场情报，为每个团队提供可直接执行的洞察。'}
        </p>
      </div>

      {/* Search form */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex gap-3 flex-wrap items-end">
            {/* Query input */}
            <div className="flex-1 min-w-48 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {lang === 'en' ? 'Search Query' : '搜索关键词'}
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !loading) handleAnalyze(); }}
                  placeholder={lang === 'en' ? 'Brand, category, competitor...' : '品牌名、品类、竞争对手...'}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm pl-8 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground/50"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Country */}
            <div className="w-40 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {lang === 'en' ? 'Country' : '国家/地区'}
              </label>
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-full bg-background border border-border rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-foreground"
                disabled={loading}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="w-36 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {lang === 'en' ? 'Sort By' : '排序方式'}
              </label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
                className="w-full bg-background border border-border rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-foreground"
                disabled={loading}
              >
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Report language */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Languages size={11} />
                {lang === 'en' ? 'Report Language' : '报告语言'}
              </label>
              <div className="flex rounded border border-border overflow-hidden h-[34px]">
                <button
                  type="button"
                  onClick={() => setOutputLang('en')}
                  disabled={loading}
                  className={cn(
                    'px-3 text-xs font-medium transition-colors',
                    outputLang === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  🇺🇸 EN
                </button>
                <button
                  type="button"
                  onClick={() => setOutputLang('zh')}
                  disabled={loading}
                  className={cn(
                    'px-3 text-xs font-medium transition-colors border-l border-border',
                    outputLang === 'zh'
                      ? 'bg-red-600 text-white'
                      : 'bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  🇨🇳 中文
                </button>
              </div>
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 size={13} className="animate-spin" /> {lang === 'en' ? 'Analyzing...' : '分析中...'}</>
                : <><PlayCircle size={13} /> {lang === 'en' ? 'Analyze' : '开始分析'}</>
              }
            </button>
          </div>

          {/* API key warning */}
          {!settings.youtubeApiKey && (
            <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>⚠</span>
              {lang === 'en'
                ? 'No YouTube API Key configured — add it in Settings.'
                : '未配置 YouTube API Key — 请前往设置页添加。'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {!result && !loading && (
        <HistoryPanel
          history={history}
          onLoad={handleLoadHistory}
          onDelete={handleDeleteHistory}
          lang={lang}
        />
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingState step={loadingStep} lang={lang} />}

      {/* Report */}
      {result && !loading && (
        <div className="space-y-4">
          <ReportDisplay report={result.report} videos={result.videos} meta={result.meta} />
          {/* History at the bottom when a report is open */}
          {history.length > 0 && (
            <HistoryPanel
              history={history}
              onLoad={handleLoadHistory}
              onDelete={handleDeleteHistory}
              lang={lang}
            />
          )}
        </div>
      )}
    </div>
  );
}
