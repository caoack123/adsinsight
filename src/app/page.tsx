'use client';

import Link from 'next/link';
import { MODULE_REGISTRY } from '@/lib/modules';
import { feedOptimizerData, getFeedOptimizerAlerts, feedOptimizerSummary, getScoreTone } from '@/lib/feed-optimizer';
import { changeTrackerSummary, getChangeTrackerAlerts, getVerdictConfig } from '@/lib/change-tracker';
import { getVideoAbcdSummary } from '@/lib/video-abcd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Video, Eye, Scale, History, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBag,
  Video,
  Eye,
  Scale,
  History,
};

const feedAlerts = getFeedOptimizerAlerts(2);
const changeAlerts = getChangeTrackerAlerts(1);
const videoSummary = getVideoAbcdSummary();

export default function OverviewPage() {
  const enabledModules = Object.entries(MODULE_REGISTRY).filter(([, m]) => m.enabled);
  const disabledModules = Object.entries(MODULE_REGISTRY).filter(([, m]) => !m.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold">欢迎回来，{feedOptimizerData.account_name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">以下是你的 Google Ads 智能诊断概览</p>
      </div>

      {/* Quick Diagnosis */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-400" />
            快速诊断
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {feedAlerts.map(alert => {
            const tone = getScoreTone(alert.score);
            return (
              <Link
                key={alert.id}
                href={`/feed-optimizer/${alert.id}`}
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-accent/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400">Feed</Badge>
                    <span className="text-xs font-semibold text-foreground">{alert.title}</span>
                    <Badge variant="outline" className={cn('text-xs px-1.5', tone.badgeClassName)}>
                      {alert.score}/100
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{alert.summary}</p>
                  <p className="text-xs text-green-400 mt-0.5">预计 CTR 提升 {alert.estimatedCtrLift}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
          {changeAlerts.map(alert => {
            const vc = getVerdictConfig(alert.verdict);
            return (
              <Link
                key={alert.id}
                href="/change-tracker"
                className="flex items-start gap-3 p-2.5 rounded border border-border hover:bg-accent/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">变更</Badge>
                    <span className="text-xs font-semibold text-foreground truncate">{alert.resource}</span>
                    <Badge variant="outline" className={cn('text-xs px-1.5', vc.badgeClass)}>{vc.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{alert.insight_zh}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
              </Link>
            );
          })}
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
                    {key === 'feed-optimizer' && (
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-xs text-muted-foreground">产品数</p>
                          <p className="text-lg font-bold">{feedOptimizerSummary.total_products}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">平均质量分</p>
                          <p className={cn('text-lg font-bold', getScoreTone(feedOptimizerSummary.avg_title_score).textClassName)}>
                            {feedOptimizerSummary.avg_title_score}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">需优化</p>
                          <p className="text-lg font-bold text-amber-400">{feedOptimizerSummary.products_need_attention}</p>
                        </div>
                      </div>
                    )}
                    {key === 'change-tracker' && (
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-xs text-muted-foreground">总变更</p>
                          <p className="text-lg font-bold">{changeTrackerSummary.total_changes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">正向</p>
                          <p className="text-lg font-bold text-green-400">{changeTrackerSummary.positive_changes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">负向</p>
                          <p className="text-lg font-bold text-red-400">{changeTrackerSummary.negative_changes}</p>
                        </div>
                      </div>
                    )}
                    {key === 'video-abcd' && (
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-xs text-muted-foreground">视频数</p>
                          <p className="text-lg font-bold">{videoSummary.total}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">已分析</p>
                          <p className="text-lg font-bold text-blue-400">{videoSummary.analyzed}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">平均分</p>
                          <p className="text-lg font-bold text-muted-foreground">{videoSummary.avgScore ?? '—'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Coming soon modules */}
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
