'use client';

import { useState } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import {
  TEXT_MODELS,
  GEMINI_MODELS,
  type TextModel,
  type GeminiModel,
} from '@/lib/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Key, Bot, CheckCircle2, Eye, EyeOff, ExternalLink } from 'lucide-react';

function MaskedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono pr-9 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground/50"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function ModelCard<T extends string>({
  value,
  current,
  label,
  description,
  badge,
  onSelect,
}: {
  value: T;
  current: T;
  label: string;
  description: string;
  badge?: string;
  onSelect: (v: T) => void;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded border transition-colors',
        selected
          ? 'border-blue-400 bg-blue-50 text-foreground dark:border-blue-500/60 dark:bg-blue-950/20'
          : 'border-border hover:border-border/80 hover:bg-accent/30 text-muted-foreground'
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center',
          selected ? 'border-blue-400' : 'border-muted-foreground/40'
        )}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </div>
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge && (
          <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-400 px-1.5">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 ml-5">{description}</p>
    </button>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, savedFlash } = useSettings();
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-base font-semibold">{t('settings_title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t('s_subtitle')}</p>
      </div>

      {savedFlash && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-300 rounded px-3 py-2 dark:bg-green-950/20 dark:border-green-500/30 dark:text-green-400">
          <CheckCircle2 size={13} />
          {t('s_saved')}
        </div>
      )}

      {/* API Keys */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key size={14} className="text-muted-foreground" />
            {t('s_api_keys_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                OpenRouter API Key
                <span className="ml-2 text-muted-foreground font-normal">{t('s_openrouter_usage')}</span>
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                {t('s_get_key')} <ExternalLink size={10} />
              </a>
            </div>
            <MaskedInput
              value={settings.openrouterApiKey}
              onChange={v => updateSettings({ openrouterApiKey: v })}
              placeholder="sk-or-v1-..."
            />
            <p className="text-xs text-muted-foreground">
              {t('s_openrouter_desc')} <code className="bg-muted px-1 rounded">OPENROUTER_API_KEY</code> 或 <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Google AI API Key
                <span className="ml-2 text-muted-foreground font-normal">{t('s_google_usage')}</span>
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                {t('s_get_key')} <ExternalLink size={10} />
              </a>
            </div>
            <MaskedInput
              value={settings.googleAiApiKey}
              onChange={v => updateSettings({ googleAiApiKey: v })}
              placeholder="AIza..."
            />
            <p className="text-xs text-muted-foreground">
              {t('s_google_desc')} <code className="bg-muted px-1 rounded">GOOGLE_AI_API_KEY</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                YouTube Data API Key
                <span className="ml-2 text-muted-foreground font-normal">{t('s_youtube_usage')}</span>
              </label>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
              >
                {t('s_get_key')} <ExternalLink size={10} />
              </a>
            </div>
            <MaskedInput
              value={settings.youtubeApiKey}
              onChange={v => updateSettings({ youtubeApiKey: v })}
              placeholder="AIza..."
            />
            <p className="text-xs text-muted-foreground">
              {t('s_youtube_desc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model selection */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot size={14} className="text-muted-foreground" />
            {t('s_model_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-5">

          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-foreground">{t('s_feed_model')}</p>
              <p className="text-xs text-muted-foreground">{t('s_feed_model_hint')}</p>
            </div>
            <div className="space-y-1.5">
              {TEXT_MODELS.map(m => (
                <ModelCard<TextModel>
                  key={m.value}
                  value={m.value}
                  current={settings.feedOptimizerModel}
                  label={m.label}
                  description={m.description}
                  badge={m.badge}
                  onSelect={v => updateSettings({ feedOptimizerModel: v })}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-foreground">{t('s_change_model')}</p>
              <p className="text-xs text-muted-foreground">{t('s_change_model_hint')}</p>
            </div>
            <div className="space-y-1.5">
              {TEXT_MODELS.map(m => (
                <ModelCard<TextModel>
                  key={m.value}
                  value={m.value}
                  current={settings.changeTrackerModel}
                  label={m.label}
                  description={m.description}
                  badge={m.badge}
                  onSelect={v => updateSettings({ changeTrackerModel: v })}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-foreground">{t('s_video_model')}</p>
              <p className="text-xs text-muted-foreground">{t('s_video_model_hint')}</p>
            </div>
            <div className="space-y-1.5">
              {GEMINI_MODELS.map(m => (
                <ModelCard<GeminiModel>
                  key={m.value}
                  value={m.value}
                  current={settings.videoAbcdModel}
                  label={m.label}
                  description={m.description}
                  badge={m.badge}
                  onSelect={v => updateSettings({ videoAbcdModel: v })}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Env var reference */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">{t('s_env_title')}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-muted-foreground space-y-2">
          <p>{t('s_env_desc')}</p>
          <div className="font-mono bg-muted/40 rounded p-3 space-y-1">
            <p><span className="text-blue-400">OPENROUTER_API_KEY</span>=sk-or-v1-...</p>
            <p><span className="text-blue-400">GOOGLE_AI_API_KEY</span>=AIza...</p>
            <p><span className="text-blue-400">NEXT_PUBLIC_APP_URL</span>=https://your-app.vercel.app</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
