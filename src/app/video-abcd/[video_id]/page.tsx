'use client';

import { use, useState, useEffect } from 'react';
import { useSettings } from '@/context/settings-context';
import Link from 'next/link';
import Image from 'next/image';
import {
  getVideoById,
  videoAbcdData,
  getRoas,
  getCpv,
  formatDuration,
  FORMAT_LABEL,
  CATEGORY_META,
  RATING_META,
  getSignalDef,
  getSignalsByCategory,
} from '@/lib/video-abcd';
import type { ABCDAnalysis, ABCDCategory, CategoryScore } from '@/modules/video-abcd/schema';
import type { AnalyzeVideoRequest } from '@/app/api/ai/analyze-video/route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Loader2, ExternalLink, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="72" height="72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x="36" y="36" textAnchor="middle" dominantBaseline="central"
        className="rotate-90 fill-foreground text-xs font-bold"
        style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px', fontSize: 14, fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  );
}

// ── Category block ────────────────────────────────────────────────────────────
function CategoryBlock({ catScore }: { catScore: CategoryScore }) {
  const meta = CATEGORY_META[catScore.category];
  const ratingMeta = RATING_META[catScore.rating];
  const sigDefs = getSignalsByCategory(catScore.category);

  // Ring color per category
  const ringColors: Record<ABCDCategory, string> = {
    A: '#a78bfa', B: '#60a5fa', C: '#34d399', D: '#fbbf24',
  };

  return (
    <Card className={cn('border', meta.border, meta.bg)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn('text-sm font-bold', meta.color)}>{meta.label_zh}</CardTitle>
            <p className="text-xs text-muted-foreground">{meta.label_en} · {catScore.signals_passed}/{catScore.signals_total} 通过</p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing score={catScore.score} color={ringColors[catScore.category]} />
            <Badge variant="outline" className={cn('text-xs', ratingMeta.badge)}>{ratingMeta.label_zh}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-1.5">
          {sigDefs.map(def => {
            const ev = catScore.evaluations.find(e => e.key === def.key);
            const result = ev?.result ?? 'UNKNOWN';
            return (
              <div key={def.key} className="flex items-center gap-2.5 py-0.5">
                {result === 'YES'
                  ? <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                  : result === 'NO'
                  ? <XCircle size={13} className="text-red-400 shrink-0" />
                  : <HelpCircle size={13} className="text-muted-foreground shrink-0" />
                }
                <span className="text-xs text-foreground flex-1">{def.label_zh}</span>
                <span className="text-xs text-muted-foreground">{def.label_en}</span>
                {ev?.note_zh && (
                  <span className={cn('text-xs', result === 'YES' ? 'text-green-400' : 'text-red-400')}>
                    {ev.note_zh}
                  </span>
                )}
                {ev?.confidence !== undefined && ev.confidence < 0.6 && (
                  <span className="text-xs text-muted-foreground/60">({Math.round(ev.confidence * 100)}%)</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Manual-analysis-only view (no performance data) ──────────────────────────
function ManualVideoDetail({ videoId, youtubeUrl, analysis }: { videoId: string; youtubeUrl: string; analysis: ABCDAnalysis }) {
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/video-abcd" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold">YouTube 视频分析</h1>
          <p className="text-xs text-muted-foreground font-mono">{videoId}</p>
        </div>
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ExternalLink size={12} /> YouTube
        </a>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 space-y-4">
          <Card className={cn('border', analysis.overall_rating === 'excellent' ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/10' : analysis.overall_rating === 'might_improve' ? 'border-amber-400 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/10' : 'border-red-400 bg-red-50 dark:border-red-500/40 dark:bg-red-950/10')}>
            <CardContent className="px-4 py-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black tabular-nums text-foreground">
                  {analysis.overall_score}
                  <span className="text-base font-normal text-muted-foreground">/100</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn('text-xs', RATING_META[analysis.overall_rating].badge)}>
                      {RATING_META[analysis.overall_rating].label_zh}
                    </Badge>
                    <span className="text-xs text-muted-foreground">by {analysis.model} · {new Date(analysis.analyzed_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary_zh}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {analysis.categories.map(cat => <CategoryBlock key={cat.category} catScore={cat} />)}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-emerald-500/30 bg-emerald-950/10">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-emerald-400 uppercase tracking-wider">优势亮点</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <ul className="space-y-2">
                  {analysis.top_strengths_zh.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-amber-400 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/10">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-amber-400 uppercase tracking-wider">待改进方向</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <ul className="space-y-2">
                  {analysis.top_improvements_zh.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <XCircle size={12} className="text-amber-400 mt-0.5 shrink-0" />{s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <Card className="border-border overflow-hidden">
            <div className="relative w-full aspect-video bg-muted">
              <Image src={thumbUrl} alt="thumbnail" fill className="object-cover" unoptimized />
            </div>
            <CardContent className="p-3">
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                <ExternalLink size={11} /> 在 YouTube 中打开
              </a>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">ABCD 分类得分</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {analysis.categories.map(cat => {
                const m = CATEGORY_META[cat.category];
                const r = RATING_META[cat.rating];
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-xs font-semibold', m.color)}>{m.label_zh}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs tabular-nums text-foreground font-semibold">{cat.score}</span>
                        <Badge variant="outline" className={cn('text-xs px-1 py-0', r.badge)}>{r.label_zh}</Badge>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', m.color.replace('text-', 'bg-'))} style={{ width: `${cat.score}%` }} />
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ video_id: string }>;
}) {
  const { video_id } = use(params);
  const video = getVideoById(video_id);

  const [analysis, setAnalysis] = useState<ABCDAnalysis | null>(video?.abcd_analysis ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  // For manually-analyzed videos not in static data — check sessionStorage
  const [manualData, setManualData] = useState<{ youtubeUrl: string; analysis: ABCDAnalysis } | null>(null);
  const [manualChecked, setManualChecked] = useState(!!video); // skip check if video found in static data
  useEffect(() => {
    if (!video) {
      const stored = typeof window !== 'undefined'
        ? sessionStorage.getItem(`video_abcd_manual_${video_id}`)
        : null;
      if (stored) {
        try { setManualData(JSON.parse(stored)); } catch { /* ignore */ }
      }
      setManualChecked(true);
    }
  }, [video_id, video]);

  if (!video) {
    if (!manualChecked) return null; // wait for sessionStorage check
    if (manualData) {
      return <ManualVideoDetail videoId={video_id} youtubeUrl={manualData.youtubeUrl} analysis={manualData.analysis} />;
    }
    return (
      <div className="space-y-4">
        <Link href="/video-abcd" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft size={14} /> 返回列表
        </Link>
        <p className="text-sm text-muted-foreground">找不到该视频。</p>
      </div>
    );
  }

  const roas = getRoas(video);
  const cpv = getCpv(video);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const body: AnalyzeVideoRequest = {
        youtube_url: video!.youtube_url,
        video_id: video!.video_id,
        brand_name: videoAbcdData.brand_name,
        branded_products: videoAbcdData.branded_products,
        ...(settings.googleAiApiKey && { api_key: settings.googleAiApiKey }),
        model: settings.videoAbcdModel,
      };
      const res = await fetch('/api/ai/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Unknown error');
      }
      const data: ABCDAnalysis = await res.json();
      setAnalysis(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/video-abcd" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{video.ad_name}</h1>
          <p className="text-xs text-muted-foreground">{video.campaign} · {video.ad_group}</p>
        </div>
        <a
          href={video.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink size={12} /> YouTube
        </a>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Left col: analysis results */}
        <div className="col-span-3 space-y-4">

          {/* Analyze button / overall score */}
          {!analysis ? (
            <Card className="border-blue-500/30 bg-blue-950/10">
              <CardContent className="px-4 py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">尚未分析</p>
                  <p className="text-xs text-muted-foreground">
                    点击按钮，Gemini 将自动检测 22 个 ABCD 信号
                  </p>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 border border-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> 分析中…</>
                    : <><Sparkles size={14} /> 开始 ABCD 分析</>
                  }
                </button>
              </CardContent>
              {error && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-red-400">分析失败：{error}。请确认 GOOGLE_AI_API_KEY 已配置。</p>
                </div>
              )}
            </Card>
          ) : (
            <>
              {/* Overall score banner */}
              <Card className={cn('border', analysis.overall_rating === 'excellent' ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/10' : analysis.overall_rating === 'might_improve' ? 'border-amber-400 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/10' : 'border-red-400 bg-red-50 dark:border-red-500/40 dark:bg-red-950/10')}>
                <CardContent className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    {/* Big score */}
                    <div className="text-4xl font-black tabular-nums text-foreground">
                      {analysis.overall_score}
                      <span className="text-base font-normal text-muted-foreground">/100</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn('text-xs', RATING_META[analysis.overall_rating].badge)}>
                          {RATING_META[analysis.overall_rating].label_zh}
                        </Badge>
                        <span className="text-xs text-muted-foreground">by {analysis.model} · {new Date(analysis.analyzed_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary_zh}</p>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      重新分析
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Category scores grid */}
              <div className="grid grid-cols-2 gap-3">
                {analysis.categories.map(cat => (
                  <CategoryBlock key={cat.category} catScore={cat} />
                ))}
              </div>
            </>
          )}

          {/* Strengths + improvements */}
          {analysis && (
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-emerald-500/30 bg-emerald-950/10">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs text-emerald-400 uppercase tracking-wider">优势亮点</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ul className="space-y-2">
                    {analysis.top_strengths_zh.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-amber-400 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/10">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs text-amber-400 uppercase tracking-wider">待改进方向</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ul className="space-y-2">
                    {analysis.top_improvements_zh.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <XCircle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {error && !loading && (
            <p className="text-xs text-red-400 px-1">分析失败：{error}</p>
          )}
        </div>

        {/* Right col: video info + performance */}
        <div className="col-span-2 space-y-4">
          {/* Thumbnail */}
          <Card className="border-border overflow-hidden">
            <div className="relative w-full aspect-video bg-muted">
              <Image
                src={video.thumbnail_url ?? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                alt={video.ad_name}
                fill
                className="object-cover"
                unoptimized
              />
              {video.duration_seconds != null && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {formatDuration(video.duration_seconds)}
                </div>
              )}
              {video.format && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {FORMAT_LABEL[video.format]}
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <a
                href={video.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                <ExternalLink size={11} /> 在 YouTube 中打开
              </a>
            </CardContent>
          </Card>

          {/* Performance — only shown if the video has real ad data */}
          {video.performance && (video.performance.impressions > 0 || video.performance.cost > 0) && (
            <Card className="border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">广告效果数据</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    { label: '曝光量', value: ((video.performance.impressions ?? 0) / 1000).toFixed(0) + 'K' },
                    { label: '视频观看', value: ((video.performance.views ?? 0) / 1000).toFixed(0) + 'K' },
                    { label: '观看率 (VTR)', value: ((video.performance.view_rate ?? 0) * 100).toFixed(0) + '%', good: (video.performance.view_rate ?? 0) >= 0.3 },
                    { label: '点击率 (CTR)', value: ((video.performance.ctr ?? 0) * 100).toFixed(2) + '%', warn: (video.performance.ctr ?? 0) < 0.008 },
                    { label: '单次观看成本 (CPV)', value: '$' + cpv.toFixed(3) },
                    { label: '总花费', value: '$' + (video.performance.cost ?? 0).toLocaleString() },
                    { label: '转化数', value: String(video.performance.conversions ?? 0) },
                    { label: 'ROAS', value: roas.toFixed(2) + 'x', good: roas >= 2, warn: roas > 0 && roas < 1 },
                  ].map(({ label, value, warn, good }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn('text-sm font-semibold tabular-nums',
                        good ? 'text-green-400' : warn ? 'text-red-400' : 'text-foreground'
                      )}>{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ABCD score summary when analyzed */}
          {analysis && (
            <Card className="border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">ABCD 分类得分</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {analysis.categories.map(cat => {
                  const m = CATEGORY_META[cat.category];
                  const r = RATING_META[cat.rating];
                  const pct = cat.score;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-semibold', m.color)}>{m.label_zh}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs tabular-nums text-foreground font-semibold">{pct}</span>
                          <Badge variant="outline" className={cn('text-xs px-1 py-0', r.badge)}>{r.label_zh}</Badge>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', m.color.replace('text-', 'bg-'))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
