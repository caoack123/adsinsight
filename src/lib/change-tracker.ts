import rawData from '@/data/change-tracker.json';
import { annotateChanges, computeSummary } from '@/modules/change-tracker/processor';
import type { AccountChange, AnnotatedChange, ChangeType } from '@/modules/change-tracker/schema';

interface ChangeTrackerDataset {
  account_name: string;
  exported_at: string;
  changes: AccountChange[];
}

const dataset = rawData as ChangeTrackerDataset;

export const changeTrackerData = dataset;
export const changeTrackerAnnotated = annotateChanges(dataset.changes);
export const changeTrackerSummary = computeSummary(changeTrackerAnnotated);

export function getChangeTrackerAlerts(limit = 3) {
  return [...changeTrackerAnnotated]
    .filter(a => a.delta.verdict === 'negative')
    .sort((a, b) => a.delta.roas_delta - b.delta.roas_delta)
    .slice(0, limit)
    .map(a => ({
      id: a.change.change_id,
      campaign: a.change.campaign,
      resource: a.change.resource_name,
      insight_zh: a.delta.insight_zh,
      verdict: a.delta.verdict,
      roas_delta: a.delta.roas_delta,
    }));
}

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  BIDDING_STRATEGY_CHANGED: '出价策略变更',
  BID_CHANGED: '出价调整',
  BUDGET_CHANGED: '预算调整',
  AD_PAUSED: '广告暂停',
  AD_ENABLED: '广告启用',
  CAMPAIGN_PAUSED: '广告系列暂停',
  CAMPAIGN_ENABLED: '广告系列启用',
  KEYWORD_ADDED: '关键词新增',
  KEYWORD_REMOVED: '关键词删除',
  KEYWORD_PAUSED: '关键词暂停',
  AD_GROUP_ADDED: '广告组新增',
  AD_GROUP_PAUSED: '广告组暂停',
};

export function formatChangeDate(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatChangeDateShort(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function getVerdictConfig(verdict: AnnotatedChange['delta']['verdict']) {
  switch (verdict) {
    case 'positive':
      return {
        label: '正向',
        dotClass: 'bg-green-500',
        badgeClass: 'border-green-500/40 bg-green-950/20 text-green-300',
        textClass: 'text-green-400',
      };
    case 'negative':
      return {
        label: '负向',
        dotClass: 'bg-red-500',
        badgeClass: 'border-red-500/40 bg-red-950/20 text-red-300',
        textClass: 'text-red-400',
      };
    case 'paused':
      return {
        label: '已暂停',
        dotClass: 'bg-zinc-500',
        badgeClass: 'border-border bg-zinc-800/50 text-zinc-400',
        textClass: 'text-zinc-400',
      };
    default:
      return {
        label: '中性',
        dotClass: 'bg-zinc-500',
        badgeClass: 'border-border bg-zinc-800/50 text-zinc-400',
        textClass: 'text-zinc-400',
      };
  }
}

export function fmtDelta(value: number, isPercent = false, decimals = 1) {
  const sign = value > 0 ? '+' : '';
  if (isPercent) return `${sign}${(value * 100).toFixed(decimals)}pp`;
  return `${sign}${value.toFixed(decimals)}`;
}

export function fmtRoas(value: number) {
  return `${value.toFixed(2)}x`;
}
