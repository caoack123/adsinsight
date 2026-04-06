'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import { MODULE_REGISTRY } from '@/lib/modules';
import { analyzeTitles, computeSummary as computeFeedSummary } from '@/modules/feed-optimizer/processor';
import { annotateChanges, computeSummary as computeChangeSummary } from '@/modules/change-tracker/processor';
import { getScoreTone } from '@/lib/feed-optimizer';
import { getVerdictConfig } from '@/lib/change-tracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Video, Eye, Scale, History, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = { ShoppingBag, Video, Eye, Scale, History };

export default function OverviewPage() {
  const { selectedAccountId } = useSettings();

  const [feedSummary, setFeedSummary] = useState<ReturnType<typeof computeFeedSummary> | null>(null);
  const [changeSummary, setChangeSummary] = useState<ReturnType<typeof computeChangeSummary> | null>(null);
  const [videoSummary, setVideoSummary] = useState<{ total: number; analyzed: number; avgScore: number | null }>({ total: 0, analyzed: 0, avgScore: null });
  const [feedAlerts, setFeedAlerts] = useState<{ id: string; title: string; score: number; summary: string; estimatedCtrLift: string }[]>([]);
  const [changeAlerts, setChangeAlerts] = useState<{ id: string; resource: string; verdict: string; insight_zh: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const acct = selectedAccountId;

    Promise.all([
      fetch(`/api/data/feed?account_id=${acct}`).then(r => r.json()),
      fetch(`/api/data/changes?account_id=${acct}`).then(r => r.json()),
      fetch(`/api/data/videos?account_id=${acct}`).then(r => r.json()),
    ]).then(([feedData, changeData, videoData]) => {
      // Feed
      const analyses = analyzeTitles(feedData.products ?? []);
      const fs = computeFeedSummary(analyses);
      setFeedSummary(fs);
      setFeedAlerts(
        analyses
          .filter(a => a.score < 60)
          .sort((a, b) => a.score - b.score)
          .slice(0, 2)
          .map(a => ({
            id: a.product.item_group_id,
            title: a.product.current_title?.slice(0, 50) ?? a.product.item_group_id,
            score: a.score,
            summary: a.issues.map(i => i.description_zh).join('；'),
            estimatedCtrLift: a.estimated_ctr_lift ?? '+10-20%',
          }))
      );

      // Changes
      const changes = (changeData.changes ?? []).map((c: Record<string, unknown>) => ({
        ...c,
        timestamp: c.changed_at ?? c.timestamp ?? new Date().toISOString(),
      }));
      const annotated = annotateChanges(changes);
      setChangeSummary(computeChangeSummary(annotated));
      setChangeAlerts(
        annotated
          .filter(a => a.delta.verdict === 'negative')
          .slice(0, 1)
          .map(a => ({
            id: a.change.change_id,
            resource: a.change.resource_name,
            verdict: a.delta.verdict,
            insight_zh: a.delta.insight_zh,
          }))
      );

      // Videos
      const videos = videoData.videos ?? [];
      const analyzed = videos.filter((v: Record<string, unknown>) => v.abcd_analysis || v.performance).length;
      const scores = videos
        .map((v: Record<string, unknown>) => (v.abcd_analysis as Record<string, unknown>)?.overall_score as number)
        .filter((s: unknown): s is number => typeof s === 'number');
      setVideoSummary({
        total: videos.length,
        analyzed,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null,
      });
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  const enabledModules = Object.entries(MODULE_REGISTRY).filter(([, m]) => m.enabled);
  const disabledModules = Object.entries(MODULE_REGISTRY).filter(([, m]) => !m.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold">
          {selectedAccountId === 'demo' ? '演示数据概览' : '账户数据概览'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Google Ads 智能诊断概览</p>
      </div>

      {/* Quick Diagnosis */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-400" />
            快速诊断
            {loading && <Loader2 size={12} className="animate-spin text-muted-foreground ml-1" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {feedAlerts.map(alert => {
            const tone = getScoreTone(alert.score);
            return (
              <Link key={alert.id} href={`/feed-optimizer/${alert.id}`}
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-accent/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400">Feed</Badge>
                    <span className="text-xs font-semibold text-foreground truncate">{alert.title}</span>
                    <Badge variant="outline" className={cn('text-xs px-1.5 shrink-0', tone.badgeClassName)}>{alert.score}/100</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">{alert.summary}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
          {changeAlerts.map(alert => {
            const vc = getVerdictConfig(alert.verdict as Parameters<typeof getVerdictConfig>[0]);
            return (
              <Link key={alert.id} href="/change-tracker"
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-accent/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">变更</Badge>
                    <span className="text-xs font-semibold text-foreground truncate">{alert.resource}</span>
                    <Badge variant="outline" className={cn('text-xs px-1.5 shrink-0', vc.badgeClass)}>{vc.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{alert.insight_zh}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
          {!loading && feedAlerts.length === 0 && changeAlerts.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">暂无需要关注的问题 🎉</p>
          )}
        </CardContent>
      </Card>

      {/* Enabled modules */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">已启用模块</p>
        <div className="grid grid-cols-3 gap-3">
          {enabledModules.map(([key, mod]) => {
            const Icon = ICON_MAP[mod.icon] || ShoppingBag;
            return (
              <Link key={key} href={mod.path}>
                <Card className="border-blue-500/30 bg-blue-950/10 hover:bg-blue-950/20 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} className="text-blue-400" />
                      <CardTitle className="text-sm font-semibold">{mod.label}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {key === 'feed-optimizer' && feedSummary && (
                      <div className="flex gap-4 mt-1">
                        <div><p className="text-xs text-muted-foreground">产品数</p><p className="text-lg font-bold">{feedSummary.total_products}</p></div>
                        <div><p className="text-xs text-muted-foreground">平均质量分</p><p className={cn('text-lg font-bold', getScoreTone(feedSummary.avg_title_score).textClassName)}>{feedSummary.avg_title_score}</p></div>
                        <div><p className="text-xs text-muted-foreground">需优化</p><p className="text-lg font-bold text-amber-400">{feedSummary.products_need_attention}</p></div>
                      </div>
                    )}
                    {key === 'change-tracker' && changeSummary && (
                      <div className="flex gap-4 mt-1">
                        <div><p className="text-xs text-muted-foreground">总变更</p><p className="text-lg font-bold">{changeSummary.total_changes}</p></div>
                        <div><p className="text-xs text-muted-foreground">正向</p><p className="text-lg font-bold text-green-400">{changeSummary.positive_changes}</p></div>
                        <div><p className="text-xs text-muted-foreground">负向</p><p className="text-lg font-bold text-red-400">{changeSummary.negative_changes}</p></div>
                      </div>
                    )}
                    {key === 'video-abcd' && (
                      <div className="flex gap-4 mt-1">
                        <div><p className="text-xs text-muted-foreground">视频数</p><p className="text-lg font-bold">{videoSummary.total}</p></div>
                        <div><p className="text-xs text-muted-foreground">已分析</p><p className="text-lg font-bold text-blue-400">{videoSummary.analyzed}</p></div>
                        <div><p className="text-xs text-muted-foreground">平均分</p><p className="text-lg font-bold text-muted-foreground">{videoSummary.avgScore ?? '—'}</p></div>
                      </div>
                    )}
                    {loading && <div className="mt-2 h-8 bg-muted/30 rounded animate-pulse" />}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">即将上线</p>
        <div className="grid grid-cols-3 gap-3">
          {disabledModules.map(([key, mod]) => {
            const Icon = ICON_MAP[mod.icon] || ShoppingBag;
            return (
              <Card key={key} className="border-border opacity-50 cursor-not-allowed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className="text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold text-muted-foreground">{mod.label}</CardTitle>
                    <Badge variant="outline" className="text-xs ml-auto border-border text-muted-foreground">即将上线</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
