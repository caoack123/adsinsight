export type ChangeType =
  | 'BIDDING_STRATEGY_CHANGED'
  | 'BID_CHANGED'
  | 'BUDGET_CHANGED'
  | 'AD_PAUSED'
  | 'AD_ENABLED'
  | 'CAMPAIGN_PAUSED'
  | 'CAMPAIGN_ENABLED'
  | 'KEYWORD_ADDED'
  | 'KEYWORD_REMOVED'
  | 'KEYWORD_PAUSED'
  | 'AD_GROUP_ADDED'
  | 'AD_GROUP_PAUSED';

export type ResourceType = 'CAMPAIGN' | 'AD_GROUP' | 'AD' | 'KEYWORD';

export interface PerformanceSnapshot {
  window_days: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversions_value: number;
  roas: number;
}

export interface AccountChange {
  change_id: string;
  timestamp: string;         // ISO 8601
  campaign: string;
  ad_group: string | null;
  change_type: ChangeType;
  resource_type: ResourceType;
  resource_name: string;
  changed_by: string;
  old_value: string | null;
  new_value: string | null;
  performance_before: PerformanceSnapshot;
  performance_after: PerformanceSnapshot;
}

export interface PerformanceDelta {
  impressions_delta: number;    // absolute
  clicks_delta: number;
  ctr_delta: number;            // absolute (e.g. 0.002 = +0.2pp)
  cost_delta: number;
  conversions_delta: number;
  roas_delta: number;
  cost_per_conv_before: number;
  cost_per_conv_after: number;
  verdict: 'positive' | 'negative' | 'neutral' | 'paused';
  verdict_reason_zh: string;
  insight_zh: string;
}

export interface AnnotatedChange {
  change: AccountChange;
  delta: PerformanceDelta;
}

export interface ChangeTrackerSummary {
  total_changes: number;
  positive_changes: number;
  negative_changes: number;
  neutral_changes: number;
  top_insight_zh: string;
  cost_saved: number;           // from pausing / reducing bids
  roas_improvement: number;     // avg roas delta across positive changes
}
