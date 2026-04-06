export interface FeedProduct {
  item_id: string;
  item_group_id: string;
  current_title: string;
  current_title_bad_reason?: string;
  current_description: string;
  brand: string;
  product_type: string;
  image_url: string;
  price: number;
  currency: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversions_value: number;
  top_search_terms: string[];
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
