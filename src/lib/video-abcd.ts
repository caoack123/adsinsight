import rawData from '@/data/video-abcd.json';
import {
  SIGNAL_DEFINITIONS,
  type ABCDAnalysis,
  type ABCDCategory,
  type CategoryRating,
  type VideoAd,
} from '@/modules/video-abcd/schema';

interface VideoAbcdDataset {
  account_name: string;
  brand_name: string;
  branded_products: string[];
  exported_at: string;
  videos: VideoAd[];
}

export const videoAbcdData = rawData as VideoAbcdDataset;
export const videoAbcdVideos = videoAbcdData.videos;

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function getVideoById(videoId: string): VideoAd | undefined {
  return videoAbcdVideos.find(v => v.video_id === videoId);
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const CATEGORY_META: Record<ABCDCategory, { label_zh: string; label_en: string; color: string; bg: string; border: string }> = {
  A: {
    label_zh: 'A — 吸引注意',
    label_en: 'Attract',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-300 dark:border-violet-500/40',
  },
  B: {
    label_zh: 'B — 品牌植入',
    label_en: 'Brand',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-300 dark:border-blue-500/40',
  },
  C: {
    label_zh: 'C — 情感连接',
    label_en: 'Connect',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-300 dark:border-emerald-500/40',
  },
  D: {
    label_zh: 'D — 行动引导',
    label_en: 'Direct',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300 dark:border-amber-500/40',
  },
};

export const RATING_META: Record<CategoryRating, { label_zh: string; badge: string }> = {
  excellent:     { label_zh: '优秀',  badge: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-300' },
  might_improve: { label_zh: '可提升', badge: 'border-amber-400  bg-amber-50  text-amber-700  dark:border-amber-500/40  dark:bg-amber-950/20  dark:text-amber-300' },
  needs_review:  { label_zh: '需改进', badge: 'border-red-400    bg-red-50    text-red-700    dark:border-red-500/40    dark:bg-red-950/20    dark:text-red-300' },
};

export function getSignalDef(key: string) {
  return SIGNAL_DEFINITIONS.find(d => d.key === key);
}

export function getSignalsByCategory(category: ABCDCategory) {
  return SIGNAL_DEFINITIONS.filter(d => d.category === category);
}

// ─── Performance helpers ──────────────────────────────────────────────────────

export function getRoas(video: VideoAd): number {
  const p = video.performance;
  return p && p.cost > 0 ? p.conversions_value / p.cost : 0;
}

export function getCpv(video: VideoAd): number {
  const p = video.performance;
  return p && p.views > 0 ? p.cost / p.views : 0;
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

export const FORMAT_LABEL: Record<string, string> = {
  in_stream: 'In-stream',
  in_feed:   'In-feed',
  shorts:    'Shorts',
  bumper:    '6s Bumper',
};

// ─── Summary for overview card ────────────────────────────────────────────────

export function getVideoAbcdSummary() {
  const total = videoAbcdVideos.length;
  const analyzed = videoAbcdVideos.filter(v => v.abcd_analysis).length;
  const avgScore = analyzed > 0
    ? Math.round(
        videoAbcdVideos
          .filter(v => v.abcd_analysis)
          .reduce((s, v) => s + (v.abcd_analysis!.overall_score), 0) / analyzed
      )
    : null;
  return { total, analyzed, avgScore };
}

// ─── Google Ads script snippet shown on /setup ─────────────────────────────
// (exported separately so it can be embedded in the existing setup page)

export const VIDEO_GAQL = `
SELECT
  ad_group_ad.ad.video_ad.in_stream.video.resource_name,
  ad_group_ad.ad.name,
  campaign.name,
  ad_group.name,
  metrics.impressions,
  metrics.video_views,
  metrics.video_view_rate,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.video_quartile_p25_rate,
  metrics.video_quartile_p50_rate,
  metrics.video_quartile_p75_rate,
  metrics.video_quartile_p100_rate
FROM ad_group_ad
WHERE ad_group_ad.ad.type IN (
  'VIDEO_RESPONSIVE_AD',
  'VIDEO_OUTSTREAM_AD',
  'IN_STREAM_VIDEO_AD'
)
AND segments.date DURING LAST_30_DAYS
AND metrics.impressions > 0
ORDER BY metrics.impressions DESC`.trim();
