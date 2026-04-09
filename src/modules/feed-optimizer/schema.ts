export interface FeedProduct {
  item_id: string;
  item_group_id: string;
  current_title: string | null;
  current_title_bad_reason?: string;
  current_description: string | null;
  brand: string | null;
  product_type: string | null;
  image_url: string | null;
  price: number;
  currency: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversions_value: number;
  top_search_terms: string[] | null;
  metrics_by_range?: Record<string, {
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversions_value: number;
  }> | null;
}

export interface TitleAnalysis {
  product: FeedProduct;
  score: number;              // 0-100 quality score
  issues: TitleIssue[];
  suggested_title: string;
  reasoning: string;          // AI explanation in Chinese
  estimated_ctr_lift: string; // e.g. "+15-25%"
}

export interface TitleIssue {
  type: 'keyword_stuffing' | 'missing_color' | 'missing_material' | 'missing_occasion' | 'missing_brand' | 'poor_structure' | 'too_long' | 'too_generic';
  description_zh: string;    // Chinese description
  severity: 'high' | 'medium' | 'low';
}

export interface FeedOptimizerSummary {
  total_products: number;
  avg_title_score: number;
  products_need_attention: number;  // score < 60
  estimated_total_ctr_lift: string;
  top_issues: { type: string; count: number }[];
}
