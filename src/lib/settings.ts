// ─── Model types ──────────────────────────────────────────────────────────────

export type ClaudeModel =
  | 'anthropic/claude-sonnet-4-5'
  | 'anthropic/claude-3-5-haiku'
  | 'anthropic/claude-opus-4'
  | 'anthropic/claude-3-haiku';

export type GeminiModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash-lite';

// Text models available for Feed Optimizer + Change Tracker (OpenRouter or direct Google AI)
export type TextModel =
  | ClaudeModel
  | 'google/gemini-2.5-flash'
  | 'google/gemini-2.5-pro'
  | 'google/gemini-2.5-flash-lite';

// ─── Settings shape ───────────────────────────────────────────────────────────

export interface AppSettings {
  openrouterApiKey: string;
  googleAiApiKey: string;
  feedOptimizerModel: TextModel;
  changeTrackerModel: TextModel;
  videoAbcdModel: GeminiModel;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openrouterApiKey: '',
  googleAiApiKey: '',
  feedOptimizerModel: 'anthropic/claude-sonnet-4-5',
  changeTrackerModel: 'anthropic/claude-sonnet-4-5',
  videoAbcdModel: 'gemini-2.5-flash',
};

// ─── Model option lists ───────────────────────────────────────────────────────

export const CLAUDE_MODELS: { value: ClaudeModel; label: string; description: string; badge?: string }[] = [
  {
    value: 'anthropic/claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    description: '速度与效果平衡',
    badge: '推荐',
  },
  {
    value: 'anthropic/claude-3-5-haiku',
    label: 'Claude 3.5 Haiku',
    description: '最快 · 成本最低',
  },
  {
    value: 'anthropic/claude-opus-4',
    label: 'Claude Opus 4',
    description: '最强推理能力',
  },
  {
    value: 'anthropic/claude-3-haiku',
    label: 'Claude 3 Haiku',
    description: '极低成本',
  },
];

export const GEMINI_MODELS: { value: GeminiModel; label: string; description: string; badge?: string }[] = [
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: '速度快 · 视频理解强',
    badge: '推荐',
  },
  {
    value: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: '最强推理 · 高精度',
  },
  {
    value: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: '最轻量 · 成本最低',
  },
];

// Combined text models for feed optimizer + change tracker
export const TEXT_MODELS: { value: TextModel; label: string; description: string; badge?: string; provider: 'anthropic' | 'google' }[] = [
  { value: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5', description: '速度与效果平衡', badge: '推荐', provider: 'anthropic' },
  { value: 'anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku', description: '最快 · 成本最低', provider: 'anthropic' },
  { value: 'anthropic/claude-opus-4', label: 'Claude Opus 4', description: '最强推理能力', provider: 'anthropic' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: '速度快 · 支持 Google AI Key', badge: 'Google', provider: 'google' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: '最强推理 · 高精度', provider: 'google' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: '最轻量 · 成本最低', provider: 'google' },
];

// ─── LocalStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = 'adinsight_settings_v1';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}
