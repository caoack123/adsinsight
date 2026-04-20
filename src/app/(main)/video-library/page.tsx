'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/context/i18n-context';
import {
  Link2, Trash2, Sparkles, Play, Eye, Heart, MessageCircle,
  Share2, Clock, AlertCircle, CheckCircle2, Loader2, Copy, Check,
  RefreshCw, BookMarked, Zap, ChevronDown, ChevronUp, Key,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type AnalysisStatus = 'pending' | 'processing' | 'done' | 'error';

interface VideoRecord {
  id:              string;
  url:             string;
  platform:        string;
  platform_id:     string | null;
  title:           string | null;
  author:          string | null;
  thumbnail_url:   string | null;
  duration_sec:    number | null;
  view_count:      number | null;
  like_count:      number | null;
  comment_count:   number | null;
  share_count:     number | null;
  description:     string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis:        Record<string, any> | null;
  analysis_status: AnalysisStatus;
  note:            string | null;
  added_at:        string;
  analyzed_at:     string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | null) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube:   'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  tiktok:    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400',
  x:         'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  other:     'bg-muted text-muted-foreground',
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube:   'YouTube',
  tiktok:    'TikTok',
  instagram: 'Instagram',
  x:         'X / Twitter',
  other:     'Other',
};

const STATUS_CONFIG: Record<AnalysisStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pending:    { icon: <Clock size={11} />,    label: '待分析',  color: 'text-muted-foreground' },
  processing: { icon: <Loader2 size={11} className="animate-spin" />, label: '分析中…', color: 'text-blue-500' },
  done:       { icon: <CheckCircle2 size={11} />, label: '已分析', color: 'text-green-500' },
  error:      { icon: <AlertCircle size={11} />,  label: '出错了', color: 'text-red-500' },
};

// ── Video card ────────────────────────────────────────────────────────────────

function VideoCard({
  video,
  onDelete,
  onAnalyze,
  analyzing,
}: {
  video: VideoRecord;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => void;
  analyzing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysis = video.analysis as Record<string, any> | null;
  const status = STATUS_CONFIG[video.analysis_status];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted w-full overflow-hidden shrink-0">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title ?? 'video'}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={28} className="text-muted-foreground/40" />
          </div>
        )}
        {/* Duration badge */}
        {video.duration_sec && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {fmtDuration(video.duration_sec)}
          </span>
        )}
        {/* Platform badge */}
        <span className={cn(
          'absolute top-1.5 left-1.5 text-xs px-2 py-0.5 rounded font-medium',
          PLATFORM_COLORS[video.platform] ?? PLATFORM_COLORS.other,
        )}>
          {PLATFORM_LABELS[video.platform] ?? video.platform}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        {/* Title + author */}
        <div>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground line-clamp-2 hover:underline leading-snug"
          >
            {video.title ?? video.url}
          </a>
          {video.author && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.author}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {video.view_count    != null && <span className="flex items-center gap-1"><Eye size={11} />{fmtNum(video.view_count)}</span>}
          {video.like_count    != null && <span className="flex items-center gap-1"><Heart size={11} />{fmtNum(video.like_count)}</span>}
          {video.comment_count != null && <span className="flex items-center gap-1"><MessageCircle size={11} />{fmtNum(video.comment_count)}</span>}
          {video.share_count   != null && <span className="flex items-center gap-1"><Share2 size={11} />{fmtNum(video.share_count)}</span>}
        </div>

        {/* Analysis status + actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <span className={cn('flex items-center gap-1 text-xs', status.color)}>
            {status.icon} {status.label}
          </span>
          <div className="flex-1" />
          {/* Analyze button */}
          {(video.analysis_status === 'pending' || video.analysis_status === 'error') && (
            <button
              onClick={() => onAnalyze(video.id)}
              disabled={analyzing}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-blue-500/40 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 disabled:opacity-50 transition-colors"
            >
              {analyzing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              分析
            </button>
          )}
          {video.analysis_status === 'done' && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? '收起' : '查看分析'}
            </button>
          )}
          <button
            onClick={() => onDelete(video.id)}
            className="text-xs p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Expanded analysis */}
        {expanded && analysis && (
          <div className="mt-2 pt-2 border-t border-border space-y-3 text-xs">
            {/* Summary */}
            {analysis.summary && (
              <p className="text-muted-foreground leading-relaxed">{analysis.summary as string}</p>
            )}

            {/* Hook */}
            {analysis.hook_type && (
              <div className="flex items-start gap-2">
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-medium uppercase text-[10px]">
                  Hook
                </span>
                <div>
                  <span className="font-medium text-foreground capitalize">{analysis.hook_type as string}</span>
                  {analysis.hook_description && (
                    <p className="text-muted-foreground mt-0.5">{analysis.hook_description as string}</p>
                  )}
                </div>
              </div>
            )}

            {/* Format + audience */}
            <div className="flex flex-wrap gap-2">
              {analysis.format && (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-[10px] font-medium">
                  {analysis.format as string}
                </span>
              )}
              {analysis.target_audience && (
                <span className="text-muted-foreground">→ {analysis.target_audience as string}</span>
              )}
            </div>

            {/* Key messages */}
            {Array.isArray(analysis.key_messages) && (analysis.key_messages as string[]).length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">核心信息</p>
                <ul className="space-y-0.5">
                  {(analysis.key_messages as string[]).map((m, i) => (
                    <li key={i} className="flex gap-1.5 text-muted-foreground">
                      <span className="shrink-0 text-blue-400">•</span>{m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strengths */}
            {Array.isArray(analysis.strengths) && (analysis.strengths as string[]).length > 0 && (
              <div>
                <p className="font-medium text-green-600 dark:text-green-400 mb-1">优势</p>
                <ul className="space-y-0.5">
                  {(analysis.strengths as string[]).map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-muted-foreground">
                      <span className="shrink-0 text-green-500">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Replication score */}
            {analysis.replication_score != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">可复制性</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(analysis.replication_score as number) * 10}%` }}
                  />
                </div>
                <span className="font-medium text-foreground">{analysis.replication_score as number}/10</span>
              </div>
            )}
            {analysis.replication_notes && (
              <p className="text-muted-foreground italic">{analysis.replication_notes as string}</p>
            )}

            {/* Tags */}
            {Array.isArray(analysis.tags) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {(analysis.tags as string[]).map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── API token panel ───────────────────────────────────────────────────────────

function ShortcutTokenPanel() {
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/user/token').then(r => r.json()).then(d => setToken(d.token));
  }, []);

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/user/token', { method: 'POST' });
    const data = await res.json();
    setToken(data.token);
    setLoading(false);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const ingestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/video-library`
    : '/api/video-library';

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Key size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium">iPhone 快捷指令接入</span>
      </div>
      <p className="text-xs text-muted-foreground">
        在 iOS 快捷指令中创建一个动作：获取当前 App 的 URL → POST 到以下地址，Header 加上你的 Token。
      </p>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">接口地址（POST）</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono truncate">{ingestUrl}</code>
            <button onClick={() => copy(ingestUrl)} className="shrink-0 text-muted-foreground hover:text-foreground">
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">X-API-Token Header</p>
          <div className="flex items-center gap-2">
            {token ? (
              <>
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono truncate">{token}</code>
                <button onClick={() => copy(token)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">尚未生成</span>
            )}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {token ? '重新生成 Token' : '生成 Token'}
        </button>
      </div>

      <div className="bg-muted/40 rounded p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">快捷指令请求体（JSON）</p>
        <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{`{
  "url": "[快捷指令变量: 当前URL]",
  "note": "可选备注"
}`}</pre>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'pending' | 'done' | 'error';

export default function VideoLibraryPage() {
  const { data: session } = useSession();
  const { lang } = useI18n();

  const [videos,     setVideos]     = useState<VideoRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [urlInput,   setUrlInput]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter,     setFilter]     = useState<FilterStatus>('all');
  const [analyzing,  setAnalyzing]  = useState<Set<string>>(new Set());
  const [showToken,  setShowToken]  = useState(false);
  const [error,      setError]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const L = (en: string, zh: string) => lang === 'en' ? en : zh;

  const fetchVideos = useCallback(async () => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    const res = await fetch(`/api/video-library${params}`);
    if (res.ok) setVideos(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Poll for processing videos
  useEffect(() => {
    const processingIds = videos.filter(v => v.analysis_status === 'processing').map(v => v.id);
    if (processingIds.length === 0) return;

    const timer = setInterval(async () => {
      const updated = await Promise.all(
        processingIds.map(id => fetch(`/api/video-library/${id}`).then(r => r.json())),
      );
      setVideos(prev => prev.map(v => {
        const u = updated.find(u => u.id === v.id);
        return u ?? v;
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, [videos]);

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/video-library', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? '添加失败');
        return;
      }
      const video = await res.json();
      setVideos(prev => [video, ...prev]);
      setUrlInput('');
      // Auto-trigger analysis
      handleAnalyze(video.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnalyze(id: string) {
    setAnalyzing(prev => new Set(prev).add(id));
    setVideos(prev => prev.map(v => v.id === id ? { ...v, analysis_status: 'processing' } : v));

    try {
      const res = await fetch(`/api/video-library/${id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setVideos(prev => prev.map(v =>
          v.id === id ? { ...v, analysis: data.analysis, analysis_status: 'done', analyzed_at: new Date().toISOString() } : v
        ));
      } else {
        const msg = data?.error ?? '分析失败';
        setVideos(prev => prev.map(v => v.id === id ? { ...v, analysis_status: 'error' } : v));
        setError(`分析失败: ${msg}`);
      }
    } catch (e) {
      setVideos(prev => prev.map(v => v.id === id ? { ...v, analysis_status: 'error' } : v));
      setError(`分析失败: ${String(e)}`);
    } finally {
      setAnalyzing(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/video-library/${id}`, { method: 'DELETE' });
    setVideos(prev => prev.filter(v => v.id !== id));
  }

  const filtered = videos.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'pending') return v.analysis_status === 'pending' || v.analysis_status === 'processing';
    return v.analysis_status === filter;
  });

  const counts = {
    all:     videos.length,
    pending: videos.filter(v => v.analysis_status === 'pending' || v.analysis_status === 'processing').length,
    done:    videos.filter(v => v.analysis_status === 'done').length,
    error:   videos.filter(v => v.analysis_status === 'error').length,
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        请先登录以使用 Video Library
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <BookMarked size={16} className="text-muted-foreground" />
            {L('Social Video Library', '社媒视频库')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {L('Collect, analyze and build insights from social videos', '收藏并分析社媒视频，积累创意洞察')}
          </p>
        </div>
        <button
          onClick={() => setShowToken(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors shrink-0"
        >
          <Zap size={12} />
          iPhone 快捷指令
        </button>
      </div>

      {/* Shortcut token panel */}
      {showToken && <ShortcutTokenPanel />}

      {/* URL input */}
      <form onSubmit={handleIngest} className="flex gap-2">
        <div className="flex-1 relative">
          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder={L(
              'Paste a YouTube, TikTok, Instagram or any video URL…',
              '粘贴 YouTube、TikTok、Instagram 或其他视频链接…',
            )}
            className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground/50"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !urlInput.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {L('Add & Analyze', '添加并分析')}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {([
          ['all',     L('All', '全部'),       counts.all],
          ['done',    L('Analyzed', '已分析'), counts.done],
          ['pending', L('Pending', '待处理'),  counts.pending],
          ['error',   L('Error', '出错'),      counts.error],
        ] as [FilterStatus, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
              filter === key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px]',
                filter === key ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-muted text-muted-foreground',
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-muted/30 rounded-lg animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <BookMarked size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {filter === 'all'
              ? L('No videos yet. Paste a URL above to get started.', '还没有视频，在上方粘贴链接开始收藏。')
              : L('No videos in this category.', '该分类下暂无视频。')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onDelete={handleDelete}
              onAnalyze={handleAnalyze}
              analyzing={analyzing.has(video.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
