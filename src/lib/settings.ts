// ─── Model types ──────────────────────────────────────────────────────────────

export type ClaudeModel =
  | 'anthropic/claude-sonnet-4-5'
  | 'anthropic/claude-3-5-haiku'
  | 'anthropic/claude-opus-4'
  | 'anthropic/claude-3-haiku';

export type GeminiModel =
  | 'gemini-2.0-flash-001'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash';

// ─── Settings shape ───────────────────────────────────────────────────────────

export interface AppSettings {
  openrouterApiKey: string;
  googleAiApiKey: string;
  feedOptimizerModel: ClaudeModel;
  changeTrackerModel: ClaudeModel;
  videoAbcdModel: GeminiModel;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openrouterApiKey: '',
  googleAiApiKey: '',
  feedOptimizerModel: 'anthropic/claude-sonnet-4-5',
  changeTrackerModel: 'anthropic/claude-sonnet-4-5',
  videoAbcdModel: 'gemini-2.0-flash-001',
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
    value: 'gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    description: '视频理解最快',
    badge: '推荐',
  },
  {
    value: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    description: '高精度 · 长上下文',
  },
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: '轻量快速',
  },
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
