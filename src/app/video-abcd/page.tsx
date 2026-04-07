'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/context/settings-context';
import {
  getRoas,
  getCpv,
  formatDuration,
  FORMAT_LABEL,
  CATEGORY_META,
  RATING_META,
  getVideoAbcdSummary,
  videoAbcdVideos,
} from '@/lib/video-abcd';
import type { VideoAd, ABCDAnalysis } from '@/modules/video-abcd/schema';
import type { AnalyzeVideoRequest } from '@/app/api/ai/analyze-video/route';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Sparkles, ExternalLink, Link2, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ── YouTube URL helpers ───────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,  // raw video ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function thumbUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ── Compact ABCD result display ──────────────────────────────────────────────

function AbcdResultCard({ analysis, videoId }: { analysis: ABCDAnalysis; videoId: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-4 rounded border border-border bg-card/60 p-3">
      <div className="flex items-center gap-3 flex-wrap mb-2">
        {analysis.categories.map(cat => {
          const m = CATEGORY_META[cat.category];
          const r = RATING_META[cat.rating];
          return (
            <div key={cat.category} className={cn('flex items-center gap-1.5 px-2 py-1 rounded border text-xs', m.bg, m.border)}>
              <span className={cn('font-bold', m.color)}>{cat.category}</span>
              <span className="font-semibold text-foreground">{cat.score}</span>
              <Badge variant="outline" className={cn('text-xs px-1 py-0', r.badge)}>{r.label_zh}</Badge>
            </div>
          );
        })}
        <span className="text-xs text-muted-foreground ml-auto">总分 <span className="text-foreground font-semibold">{analysis.overall_score}/100</span></span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary_zh}</p>
      <button
        onClick={() => setExpanded(v => !v)}
        className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? '收起细节' : '展开 22 个信号'}
      </button>
      {expanded && (
        <div className="mt-2 space-y-3">
          {analysis.categories.map(cat => {
            const m = CATEGORY_META[cat.category];
            return (
              <div key={cat.category}>
                <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1', m.color)}>
                  {cat.category} — {CATEGORY_META[cat.category].label_zh.split(' — ')[1]}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {cat.evaluations.map(ev => (
                    <div key={ev.key} className="flex items-center gap-2 py-0.5 border-b border-border/30">
                      <span className={cn('text-[10px] font-semibold w-8 shrink-0',
                        ev.result === 'YES' ? 'text-green-400' : ev.result === 'NO' ? 'text-red-400' : 'text-zinc-500'
                      )}>{ev.result}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{ev.note_zh ?? ev.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 pt-2 border-t border-border/40 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">优势</p>
          {analysis.top_strengths_zh.map(s => (
            <p key={s} className="text-xs text-green-400/90">✓ {s}</p>
          ))}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">改进点</p>
          {analysis.top_improvements_zh.map(s => (
            <p key={s} className="text-xs text-amber-400/90">△ {s}</p>
          ))}
        </div>
      </div>
      <Link href={`/video-abcd/${videoId}`} className="mt-2 block text-xs text-blue-400 hover:underline">
        → 查看完整详情页
      </Link>
    </div>
  );
}

// ── Manual YouTube analyzer panel ────────────────────────────────────────────

function YoutubeAnalyzer({ accountId, brandName: defaultBrand, onSaved }: { accountId: string; brandName: string; onSaved: (videoId: string) => void }) {
  const { settings } = useSettings();
  const [url, setUrl] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('yt_analyzer_url') ?? '' : ''
  );
  const [brand, setBrand] = useState(defaultBrand);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore last analysis result from sessionStorage on mount
  const [result, setResult] = useState<{ videoId: string; analysis: ABCDAnalysis } | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedUrl = sessionStorage.getItem('yt_analyzer_url') ?? '';
    const videoId = extractYouTubeId(savedUrl.trim());
    if (!videoId) return null;
    const stored = sessionStorage.getItem(`video_abcd_manual_${videoId}`);
    if (!stored) return null;
    try { const p = JSON.parse(stored); return { videoId, analysis: p.analysis }; } catch { return null; }
  });

  async function handleAnalyze() {
    const videoId = extractYouTubeId(url.trim());
    if (!videoId) {
      setError('请输入有效的 YouTube URL（或 11 位 Video ID）');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const body: AnalyzeVideoRequest = {
        youtube_url: youtubeUrl,
        video_id: videoId,
        brand_name: brand || 'Brand',
        branded_products: [],
        model: settings.videoAbcdModel,
        account_id: accountId !== 'demo' ? accountId : undefined,
      };
      const res = await fetch('/api/ai/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const analysis: ABCDAnalysis = await res.json();
      setResult({ videoId, analysis });

      // Persist to sessionStorage for detail page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `video_abcd_manual_${videoId}`,
          JSON.stringify({ videoId, youtubeUrl, analysis }),
        );
      }

      // Save to DB (non-demo accounts) so result survives navigation
      if (accountId !== 'demo') {
        await fetch('/api/data/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: accountId, video_id: videoId, youtube_url: youtubeUrl, analysis }),
        });
        onSaved(videoId);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const previewId = extractYouTubeId(url.trim());

  return (
    <Card className="border-blue-500/30 bg-blue-950/10">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Link2 size={14} className="text-blue-400" />
          粘贴 YouTube 链接预分析
        </CardTitle>
        <p className="text-xs text-muted-foreground">无需在 Google Ads 投放——直接输入 YouTube URL，Gemini 立即给出 ABCD 评分</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=... 或直接粘贴 Video ID"
            value={url}
            onChange={e => {
              setUrl(e.target.value);
              setResult(null);
              setError(null);
              if (typeof window !== 'undefined') sessionStorage.setItem('yt_analyzer_url', e.target.value);
            }}
            className="flex-1 bg-muted border border-border rounded px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="品牌名（可选）"
            value={brand}
            onChange={e => setBrand(e.target.value)}
            className="w-32 bg-muted border border-border rounded px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700/30 border border-blue-500/50 text-blue-300 text-xs hover:bg-blue-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? '分析中…' : 'ABCD 分析'}
          </button>
        </div>

        {/* Preview thumbnail while URL is typed */}
        {previewId && !result && !loading && (
          <div className="flex items-center gap-3 p-2 rounded border border-border bg-card/40">
            <div className="relative w-24 h-14 rounded overflow-hidden bg-muted shrink-0">
              <Image src={thumbUrl(previewId)} alt="preview" fill className="object-cover" unoptimized />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play size={14} className="text-white/80" fill="white" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Video ID: <span className="text-foreground font-mono">{previewId}</span></p>
              <a href={`https://www.youtube.com/watch?v=${previewId}`} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                <ExternalLink size={10} /> 在 YouTube 打开
              </a>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/30 rounded p-2">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {result && <AbcdResultCard analysis={result.analysis} videoId={result.videoId} />}
      </CardContent>
    </Card>
  );
}

// ── Video card (shared between demo & real) ───────────────────────────────────

function VideoCard({ video }: { video: VideoAd }) {
  const roas = getRoas(video);
  const cpv = getCpv(video);
  const analysis = video.abcd_analysis;

  return (
    <Card className="border-border hover:border-border/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative shrink-0 w-40 h-24 rounded overflow-hidden bg-muted">
            <Image src={video.thumbnail_url ?? thumbUrl(video.video_id)} alt={video.ad_name} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play size={20} className="text-white/80" fill="white" />
            </div>
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
              {formatDuration(video.duration_seconds)}
            </div>
            {video.format && (
              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                {FORMAT_LABEL[video.format as keyof typeof FORMAT_LABEL] ?? video.format}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <Link href={`/video-abcd/${video.video_id}`} className="text-sm font-semibold text-blue-400 hover:underline">
                  {video.ad_name}
                </Link>
                {(video.campaign || video.ad_group) && (
                  <p className="text-xs text-muted-foreground">{[video.campaign, video.ad_group].filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                <ExternalLink size={13} />
              </a>
            </div>

            <div className="flex gap-5 mb-3">
              {[
                { label: '曝光', value: ((video.performance?.impressions ?? 0) / 1000).toFixed(0) + 'K' },
                { label: '观看率', value: ((video.performance?.view_rate ?? 0) * 100).toFixed(0) + '%' },
                { label: 'CTR', value: ((video.performance?.ctr ?? 0) * 100).toFixed(1) + '%', warn: (video.performance?.ctr ?? 0) < 0.008 },
                { label: 'CPV', value: '$' + cpv.toFixed(3) },
                { label: 'ROAS', value: roas.toFixed(2) + 'x', good: roas >= 2, warn: roas < 1 },
              ].map(({ label, value, warn, good }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-sm font-semibold tabular-nums', good && 'text-green-400', warn && 'text-red-400')}>{value}</p>
                </div>
              ))}
            </div>

            {analysis ? (
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {analysis.categories.map(cat => {
                    const m = CATEGORY_META[cat.category];
                    const r = RATING_META[cat.rating];
                    return (
                      <div key={cat.category} className={cn('flex items-center gap-1.5 px-2 py-1 rounded border text-xs', m.bg, m.border)}>
                        <span className={cn('font-bold', m.color)}>{cat.category}</span>
                        <span className="font-semibold text-foreground">{cat.score}</span>
                        <Badge variant="outline" className={cn('text-xs px-1 py-0', r.badge)}>{r.label_zh}</Badge>
                      </div>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground ml-2">总分 {analysis.overall_score}/100</span>
                <Link href={`/video-abcd/${video.video_id}`} className="ml-auto text-xs text-blue-400 hover:underline">查看详情 →</Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/video-abcd/${video.video_id}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-700/20 border border-blue-500/40 text-blue-300 hover:bg-blue-700/40 transition-colors"
                >
                  <Sparkles size={11} />用 Gemini 分析 ABCD
                </Link>
                <span className="text-xs text-muted-foreground">未分析</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VideoAbcdPage() {
  const { selectedAccountId } = useSettings();
  const isDemo = selectedAccountId === 'demo';

  const [videos, setVideos] = useState<VideoAd[]>([]);
  const [brandName, setBrandName] = useState('');
  const [loading, setLoading] = useState(true);

  function loadVideos() {
    if (isDemo) {
      setVideos(videoAbcdVideos);
      setBrandName('Crowned Ice');
      setLoading(false);
      return;
    }
    fetch(`/api/data/videos?account_id=${selectedAccountId}`)
      .then(r => r.json())
      .then(data => {
        setVideos((data.videos ?? []) as VideoAd[]);
        setBrandName(data.brand_name ?? '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    loadVideos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, isDemo]);

  const demoSummary = getVideoAbcdSummary();
  const hasVideos = videos.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">视频素材分析</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            基于 Google ABCD 框架，用 Gemini 自动评估每条视频广告素材
          </p>
        </div>
        {isDemo && (
          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">演示数据</Badge>
        )}
      </div>

      {/* KPI row — only when there are videos from the account */}
      {hasVideos && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {isDemo ? (
              <>
                <MetricCard title="视频广告数" value={String(demoSummary.total)} subtitle="已导入" />
                <MetricCard title="已完成分析" value={`${demoSummary.analyzed} / ${demoSummary.total}`} subtitle="点击视频进入分析" />
                <MetricCard title="平均 ABCD 分" value={demoSummary.avgScore !== null ? `${demoSummary.avgScore}/100` : '—'} subtitle="所有已分析素材" highlight={!!demoSummary.avgScore && demoSummary.avgScore >= 60} />
                <MetricCard title="分析模型" value="Gemini 2.5 Flash" subtitle="1 次请求，22 个信号" />
              </>
            ) : (
              <>
                <MetricCard title="视频广告数" value={String(videos.length)} subtitle="已同步" />
                <MetricCard title="已完成分析" value={`${videos.filter(v => v.abcd_analysis).length} / ${videos.length}`} subtitle="点击视频进入分析" />
                <MetricCard title="平均 ABCD 分" value={(() => { const s = videos.map(v => v.abcd_analysis?.overall_score).filter((n): n is number => typeof n === 'number'); return s.length ? `${Math.round(s.reduce((a,b)=>a+b,0)/s.length)}/100` : '—'; })()} subtitle="所有已分析素材" />
                <MetricCard title="分析模型" value="Gemini 2.5 Flash" subtitle="1 次请求，22 个信号" />
              </>
            )}
          </div>

          {/* ABCD legend */}
          <div className="flex gap-3 flex-wrap">
            {(['A', 'B', 'C', 'D'] as const).map(cat => {
              const m = CATEGORY_META[cat];
              return (
                <div key={cat} className={cn('flex items-center gap-2 px-3 py-1.5 rounded border text-xs', m.bg, m.border)}>
                  <span className={cn('font-bold', m.color)}>{cat}</span>
                  <span className="text-muted-foreground">{m.label_zh.split(' — ')[1]}</span>
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              {Object.entries(RATING_META).map(([k, v]) => (
                <Badge key={k} variant="outline" className={cn('text-xs', v.badge)}>{v.label_zh}</Badge>
              ))}
            </div>
          </div>

          {/* Video list */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 size={16} className="animate-spin" /> 加载中…
              </div>
            ) : (
              videos.map(video => <VideoCard key={video.video_id} video={video} />)
            )}
          </div>
        </>
      )}

      {/* Empty state for real accounts with no videos */}
      {!isDemo && !loading && !hasVideos && (
        <Card className="border-border">
          <CardContent className="py-10 text-center space-y-2">
            <Play size={32} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">该账户暂无视频广告数据</p>
            <p className="text-xs text-muted-foreground">
              如果你的 Google Ads 账户有视频广告，请确认脚本已运行，脚本会自动同步视频 URL 和效果数据。
            </p>
            <Link href="/setup" className="text-xs text-blue-400 hover:underline block">→ 查看安装脚本</Link>
          </CardContent>
        </Card>
      )}

      {/* ── Manual YouTube analyzer (always visible) ── */}
      <YoutubeAnalyzer accountId={selectedAccountId} brandName={brandName} onSaved={loadVideos} />
    </div>
  );
}
