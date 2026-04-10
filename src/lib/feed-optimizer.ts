import feedOptimizerRaw from '@/data/feed-optimizer.json';
import { analyzeTitles, computeSummary } from '@/modules/feed-optimizer/processor';
import type { FeedOptimizerSummary, FeedProduct, TitleAnalysis } from '@/modules/feed-optimizer/schema';

type FeedOptimizerDataset = {
  account_name: string;
  exported_at: string;
  products: FeedProduct[];
};

const dataset = feedOptimizerRaw as FeedOptimizerDataset;

export const feedOptimizerData = dataset;
export const feedOptimizerAnalyses = analyzeTitles(dataset.products);
export const feedOptimizerSummary = computeSummary(feedOptimizerAnalyses);

export function getFeedOptimizerDataset() {
  return dataset;
}

export function getFeedOptimizerSummary(): FeedOptimizerSummary {
  return feedOptimizerSummary;
}

export function getFeedOptimizerAnalyses(): TitleAnalysis[] {
  return feedOptimizerAnalyses;
}

export function getFeedProductAnalysis(itemGroupId: string) {
  return feedOptimizerAnalyses.find(analysis => analysis.product.item_group_id === itemGroupId);
}

export function getFeedOptimizerAlerts(limit = 3) {
  return [...feedOptimizerAnalyses]
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return b.product.cost - a.product.cost;
    })
    .slice(0, limit)
    .map(analysis => ({
      id: analysis.product.item_group_id,
      title: getProductDisplayName(analysis.product),
      summary:
        analysis.issues[0]?.description_zh ??
        '标题还有进一步优化空间，建议补充更明确的卖点和结构。',
      score: analysis.score,
      estimatedCtrLift: analysis.estimated_ctr_lift,
    }));
}

export function getIssueTypeLabel(type: string) {
  const labels: Record<string, string> = {
    keyword_stuffing: '关键词堆砌',
    missing_color: '缺少颜色信息',
    missing_material: '缺少材质信息',
    missing_occasion: '缺少场景词',
    missing_brand: '品牌未前置',
    poor_structure: '标题结构不清晰',
    too_long: '标题过长',
    too_generic: '标题过于泛化',
  };

  return labels[type] ?? type;
}

export function getSeverityLabel(severity: 'high' | 'medium' | 'low', lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'en') {
    const m: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };
    return m[severity] ?? severity;
  }
  const labels = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  } as const;

  return labels[severity];
}

export function getProductDisplayName(product: FeedProduct) {
  const segments = (product.product_type ?? '').split('>').map(segment => segment.trim()).filter(Boolean);
  return segments[segments.length - 1] || product.current_title || product.item_group_id;
}

export function getScoreTone(score: number) {
  if (score < 50) {
    return {
      badgeClassName: 'border-red-400 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
      borderClassName: 'border-red-400 dark:border-red-500/40',
      textClassName: 'text-red-600 dark:text-red-300',
    };
  }

  if (score <= 70) {
    return {
      badgeClassName: 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
      borderClassName: 'border-amber-400 dark:border-amber-500/40',
      textClassName: 'text-amber-600 dark:text-amber-300',
    };
  }

  return {
    badgeClassName: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
    borderClassName: 'border-emerald-500 dark:border-emerald-500/40',
    textClassName: 'text-emerald-700 dark:text-emerald-300',
  };
}

export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(isoString: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString));
}

export function getRoas(product: FeedProduct) {
  return product.cost > 0 ? product.conversions_value / product.cost : 0;
}

export function getSearchCoverage(term: string, text: string) {
  const parts = term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return false;

  const haystack = text.toLowerCase();
  return parts.every(part => haystack.includes(part));
}
