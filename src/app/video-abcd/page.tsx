'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  videoAbcdVideos,
  videoAbcdData,
  getRoas,
  getCpv,
  formatDuration,
  FORMAT_LABEL,
  CATEGORY_META,
  RATING_META,
  getVideoAbcdSummary,
} from '@/lib/video-abcd';
import { MetricCard } from '@/components/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Sparkles, ExternalLink } from 'lucide-react';

const summary = getVideoAbcdSummary();

export default function VideoAbcdPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">视频素材分析</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            基于 Google ABCD 框架，用 Gemini 自动评估每条视频广告素材
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard title="视频广告数" value={String(summary.total)} subtitle="已导入" />
        <MetricCard
          title="已完成分析"
          value={`${summary.analyzed} / ${summary.total}`}
          subtitle="点击视频进入分析"
        />
        <MetricCard
          title="平均 ABCD 分"
          value={summary.avgScore !== null ? `${summary.avgScore}/100` : '—'}
          subtitle="所有已分析素材"
          highlight={summary.avgScore !== null && summary.avgScore >= 60}
        />
        <MetricCard title="分析模型" value="Gemini 2.0 Flash" subtitle="1 次请求，22 个信号" />
      </div>

      {/* ABCD legend */}
      <div className="flex gap-3">
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

      {/* Video cards */}
      <div className="space-y-3">
        {videoAbcdVideos.map(video => {
          const roas = getRoas(video);
          const cpv = getCpv(video);
          const analysis = video.abcd_analysis;

          return (
            <Card key={video.video_id} className="border-border hover:border-border/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative shrink-0 w-40 h-24 rounded overflow-hidden bg-muted">
                    <Image
                      src={video.thumbnail_url}
                      alt={video.ad_name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={20} className="text-white/80" fill="white" />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                      {formatDuration(video.duration_seconds)}
                    </div>
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                      {FORMAT_LABEL[video.format]}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <Link
                          href={`/video-abcd/${video.video_id}`}
                          className="text-sm font-semibold text-blue-400 hover:underline"
                        >
                          {video.ad_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {video.campaign} · {video.ad_group}
                        </p>
                      </div>
                      <a
                        href={video.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    {/* Performance row */}
                    <div className="flex gap-5 mb-3">
                      {[
                        { label: '曝光', value: (video.performance.impressions / 1000).toFixed(0) + 'K' },
                        { label: '观看率', value: (video.performance.view_rate * 100).toFixed(0) + '%' },
                        { label: 'CTR', value: (video.performance.ctr * 100).toFixed(1) + '%', warn: video.performance.ctr < 0.008 },
                        { label: 'CPV', value: '$' + cpv.toFixed(3) },
                        { label: 'ROAS', value: roas.toFixed(2) + 'x', good: roas >= 2, warn: roas < 1 },
                      ].map(({ label, value, warn, good }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className={cn('text-sm font-semibold tabular-nums', good && 'text-green-400', warn && 'text-red-400')}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* ABCD scores or CTA */}
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
                                <Badge variant="outline" className={cn('text-xs px-1 py-0', r.badge)}>
                                  {r.label_zh}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">总分 {analysis.overall_score}/100</span>
                        <Link
                          href={`/video-abcd/${video.video_id}`}
                          className="ml-auto text-xs text-blue-400 hover:underline"
                        >
                          查看详情 →
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/video-abcd/${video.video_id}`}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-700/20 border border-blue-500/40 text-blue-300 hover:bg-blue-700/40 transition-colors"
                        >
                          <Sparkles size={11} />
                          用 Gemini 分析 ABCD
                        </Link>
                        <span className="text-xs text-muted-foreground">未分析</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Google Ads export note */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">如何导入真实视频数据</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground space-y-1.5">
          <p>安装脚本会自动通过 GAQL 从 Google Ads 导出视频广告的 YouTube URL 和效果数据，推送到 <code className="bg-muted px-1 rounded">/api/ingest</code>。</p>
          <p>视频本身无需下载——Gemini 直接读取 YouTube URL 进行分析，本地和 Vercel 部署均适用。</p>
          <Link href="/setup" className="text-blue-400 hover:underline">→ 前往安装脚本</Link>
        </CardContent>
      </Card>
    </div>
  );
}
