// ─── ABCD Signal definitions ────────────────────────────────────────────────
// Mirrors the 22 signals from google-marketing-solutions/abcds-detector

export type ABCDCategory = 'A' | 'B' | 'C' | 'D';

export type SignalKey =
  // A — Attract
  | 'dynamic_start'
  | 'quick_pacing'
  | 'quick_pacing_first5'
  | 'supers'
  | 'supers_with_audio'
  // B — Brand
  | 'brand_mention_speech'
  | 'brand_mention_speech_first5'
  | 'brand_visuals'
  | 'brand_visuals_first5'
  | 'product_mention_speech'
  | 'product_mention_speech_first5'
  | 'product_mention_text'
  | 'product_mention_text_first5'
  | 'product_visuals'
  | 'product_visuals_first5'
  // C — Connect
  | 'overall_pacing'
  | 'presence_of_people'
  | 'presence_of_people_first5'
  | 'visible_face_first5'
  | 'visible_face_closeup'
  // D — Direct
  | 'audio_early_first5'
  | 'call_to_action_speech'
  | 'call_to_action_text';

export interface SignalDefinition {
  key: SignalKey;
  category: ABCDCategory;
  label_zh: string;
  label_en: string;
  // The exact question sent to Gemini (interpolated with brand/product names)
  gemini_question: string;
  // Whether time-window matters for this signal
  window?: 'first5' | 'any' | 'overall';
  // Weight for scoring (some signals are more impactful)
  weight: number;
}

export const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  // ── A ──────────────────────────────────────────────────────────────────────
  {
    key: 'dynamic_start',
    category: 'A',
    label_zh: '动态开场',
    label_en: 'Dynamic Start',
    gemini_question: 'Does the first shot in the video change in less than 3 seconds? Answer YES or NO.',
    window: 'first5',
    weight: 2,
  },
  {
    key: 'quick_pacing',
    category: 'A',
    label_zh: '快节奏剪辑',
    label_en: 'Quick Pacing',
    gemini_question: 'Are there 5 or more distinct shots or visual cuts within any 5 consecutive seconds in the video? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'quick_pacing_first5',
    category: 'A',
    label_zh: '前5秒快切',
    label_en: 'Quick Pacing (First 5s)',
    gemini_question: 'Are there at least 5 shot changes or visual cuts in the first 5 seconds of the video? Answer YES or NO.',
    window: 'first5',
    weight: 3,
  },
  {
    key: 'supers',
    category: 'A',
    label_zh: '文字叠加',
    label_en: 'Supers (Text Overlays)',
    gemini_question: 'Are there any text overlays or supers displayed at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 1,
  },
  {
    key: 'supers_with_audio',
    category: 'A',
    label_zh: '字幕与语音同步',
    label_en: 'Supers with Audio',
    gemini_question: 'Does the spoken audio match or contextually support any text overlays shown in the video? Answer YES or NO.',
    window: 'any',
    weight: 1,
  },
  // ── B ──────────────────────────────────────────────────────────────────────
  {
    key: 'brand_mention_speech',
    category: 'B',
    label_zh: '语音提及品牌',
    label_en: 'Brand Mention (Speech)',
    gemini_question: 'Does the spoken audio mention the brand "{brand_name}" at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'brand_mention_speech_first5',
    category: 'B',
    label_zh: '前5秒语音提及品牌',
    label_en: 'Brand Mention Speech (First 5s)',
    gemini_question: 'Does the spoken audio mention the brand "{brand_name}" within the first 5 seconds of the video? Answer YES or NO.',
    window: 'first5',
    weight: 3,
  },
  {
    key: 'brand_visuals',
    category: 'B',
    label_zh: '品牌视觉元素',
    label_en: 'Brand Visuals',
    gemini_question: 'Is the brand name "{brand_name}" or its logo visually visible at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'brand_visuals_first5',
    category: 'B',
    label_zh: '前5秒品牌视觉',
    label_en: 'Brand Visuals (First 5s)',
    gemini_question: 'Is the brand name "{brand_name}" or its logo visually visible within the first 5 seconds of the video? Answer YES or NO.',
    window: 'first5',
    weight: 3,
  },
  {
    key: 'product_mention_speech',
    category: 'B',
    label_zh: '语音提及产品',
    label_en: 'Product Mention (Speech)',
    gemini_question: 'Is any of the following products mentioned in the spoken audio at any point: {product_list}? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'product_mention_speech_first5',
    category: 'B',
    label_zh: '前5秒语音提及产品',
    label_en: 'Product Mention Speech (First 5s)',
    gemini_question: 'Is any of the following products mentioned in the spoken audio within the first 5 seconds: {product_list}? Answer YES or NO.',
    window: 'first5',
    weight: 2,
  },
  {
    key: 'product_mention_text',
    category: 'B',
    label_zh: '文字展示产品',
    label_en: 'Product Mention (Text)',
    gemini_question: 'Is any of the following products shown in text or overlay at any point in the video: {product_list}? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'product_mention_text_first5',
    category: 'B',
    label_zh: '前5秒文字展示产品',
    label_en: 'Product Mention Text (First 5s)',
    gemini_question: 'Is any of the following products shown in text or overlay within the first 5 seconds: {product_list}? Answer YES or NO.',
    window: 'first5',
    weight: 2,
  },
  {
    key: 'product_visuals',
    category: 'B',
    label_zh: '产品视觉展示',
    label_en: 'Product Visuals',
    gemini_question: 'Is any of the following products visually shown at any point in the video: {product_list}? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'product_visuals_first5',
    category: 'B',
    label_zh: '前5秒产品视觉',
    label_en: 'Product Visuals (First 5s)',
    gemini_question: 'Is any of the following products visually shown within the first 5 seconds: {product_list}? Answer YES or NO.',
    window: 'first5',
    weight: 3,
  },
  // ── C ──────────────────────────────────────────────────────────────────────
  {
    key: 'overall_pacing',
    category: 'C',
    label_zh: '整体节奏',
    label_en: 'Overall Pacing',
    gemini_question: 'Is the average pace of the video less than 2 seconds per shot throughout the entire video? Answer YES or NO.',
    window: 'overall',
    weight: 1,
  },
  {
    key: 'presence_of_people',
    category: 'C',
    label_zh: '出现真实人物',
    label_en: 'Presence of People',
    gemini_question: 'Are there any real people (not animations or illustrations) present at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  {
    key: 'presence_of_people_first5',
    category: 'C',
    label_zh: '前5秒出现人物',
    label_en: 'Presence of People (First 5s)',
    gemini_question: 'Are there any real people present within the first 5 seconds of the video? Answer YES or NO.',
    window: 'first5',
    weight: 3,
  },
  {
    key: 'visible_face_first5',
    category: 'C',
    label_zh: '前5秒出现人脸',
    label_en: 'Visible Face (First 5s)',
    gemini_question: 'Is there a human face clearly visible within the first 5 seconds of the video? Answer YES or NO.',
    window: 'first5',
    weight: 3,
  },
  {
    key: 'visible_face_closeup',
    category: 'C',
    label_zh: '人脸特写镜头',
    label_en: 'Visible Face (Close-up)',
    gemini_question: 'Is there a close-up shot of a human face at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 2,
  },
  // ── D ──────────────────────────────────────────────────────────────────────
  {
    key: 'audio_early_first5',
    category: 'D',
    label_zh: '前5秒有语音',
    label_en: 'Audio Early (First 5s)',
    gemini_question: 'Is there any speech or spoken words in the audio within the first 5 seconds of the video? Answer YES or NO.',
    window: 'first5',
    weight: 2,
  },
  {
    key: 'call_to_action_speech',
    category: 'D',
    label_zh: '语音号召行动',
    label_en: 'Call to Action (Speech)',
    gemini_question: 'Is there a call to action (e.g. "shop now", "visit", "buy", "click", "learn more", "get yours") spoken at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 3,
  },
  {
    key: 'call_to_action_text',
    category: 'D',
    label_zh: '文字号召行动',
    label_en: 'Call to Action (Text)',
    gemini_question: 'Is there a call to action shown as text or overlay (e.g. "Shop Now", "Visit", "Buy Now", "Learn More") at any point in the video? Answer YES or NO.',
    window: 'any',
    weight: 3,
  },
];

// ─── Result types ─────────────────────────────────────────────────────────────

export type SignalResult = 'YES' | 'NO' | 'UNKNOWN';
export type CategoryRating = 'excellent' | 'might_improve' | 'needs_review';

export interface SignalEvaluation {
  key: SignalKey;
  result: SignalResult;
  confidence: number;     // 0–1, Gemini's self-reported confidence
  note_zh?: string;       // Brief explanation from Gemini in Chinese
}

export interface CategoryScore {
  category: ABCDCategory;
  score: number;          // 0–100
  rating: CategoryRating;
  signals_passed: number;
  signals_total: number;
  evaluations: SignalEvaluation[];
}

export interface ABCDAnalysis {
  video_id: string;
  youtube_url: string;
  analyzed_at: string;    // ISO timestamp
  overall_score: number;  // 0–100, weighted average of A/B/C/D
  overall_rating: CategoryRating;
  categories: CategoryScore[];
  top_strengths_zh: string[];   // 3 things done well
  top_improvements_zh: string[]; // 3 things to improve
  summary_zh: string;           // 2-3 sentence overall summary
  model: string;                // e.g. "gemini-2.0-flash"
}

// ─── Video ad types ────────────────────────────────────────────────────────

export interface VideoAdPerformance {
  impressions: number;
  views: number;
  view_rate: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversions_value: number;
}

export interface VideoAd {
  video_id: string;
  youtube_url: string;
  youtube_video_id: string;    // the 11-char YouTube ID
  ad_name: string;
  campaign: string;
  ad_group: string;
  duration_seconds: number;
  format: 'in_stream' | 'in_feed' | 'shorts' | 'bumper';
  thumbnail_url: string;
  performance: VideoAdPerformance;
  // Set after analysis
  abcd_analysis?: ABCDAnalysis;
}
