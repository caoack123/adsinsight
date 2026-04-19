'use client';

import { useState } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { useLock } from '@/context/lock-context';
import {
  TEXT_MODELS,
  GEMINI_MODELS,
  type TextModel,
  type GeminiModel,
} from '@/lib/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Key, Bot, CheckCircle2, Eye, EyeOff, ExternalLink, Lock, LockOpen, ShieldCheck } from 'lucide-react';

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

// ── PIN Lock management card ──────────────────────────────────────────────────

function PinLockCard() {
  const { lang } = useI18n();
  const { hasPin, lockEnabled, setPin, clearPin, setLockEnabled, lockNow } = useLock();

  const [mode, setMode]         = useState<'idle' | 'set' | 'change' | 'confirm'>('idle');
  const [step1, setStep1]       = useState('');   // first entry
  const [step2, setStep2]       = useState('');   // confirmation
  const [pinError, setPinError] = useState('');
  const [success, setSuccess]   = useState('');

  const L = (en: string, zh: string) => lang === 'en' ? en : zh;

  function PinInput({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
  }) {
    return (
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
          onChange(v);
          setPinError('');
        }}
        placeholder={placeholder ?? '••••'}
        className="w-28 text-center tracking-[0.4em] bg-background border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground/40"
      />
    );
  }

  function handleSave() {
    if (step1.length !== 4) { setPinError(L('PIN must be 4 digits', 'PIN 必须是 4 位数字')); return; }
    if (mode === 'confirm' || mode === 'set' || mode === 'change') {
      if (step2.length !== 4) { setPinError(L('Please confirm your PIN', '请再次输入 PIN')); return; }
      if (step1 !== step2)    { setPinError(L('PINs do not match', '两次输入不一致')); setStep2(''); return; }
    }
    setPin(step1);
    setStep1(''); setStep2(''); setPinError('');
    setMode('idle');
    setSuccess(L('PIN saved. Lock is active.', 'PIN 已保存，锁已启用。'));
    setTimeout(() => setSuccess(''), 3000);
  }

  function handleClear() {
    clearPin();
    setMode('idle'); setStep1(''); setStep2(''); setPinError('');
    setSuccess(L('PIN removed. Lock disabled.', 'PIN 已删除，锁已关闭。'));
    setTimeout(() => setSuccess(''), 3000);
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Lock size={14} className="text-muted-foreground" />
          {L('App Lock (PIN)', '应用锁（PIN 码）')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          {L(
            'Set a 4-digit PIN. You\'ll be prompted on every page load and every time you return to this tab.',
            '设置 4 位 PIN 码。每次打开主页面或切换 Tab 返回时都会要求输入。',
          )}
        </p>

        {success && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-300 rounded px-3 py-2 dark:bg-green-950/20 dark:border-green-500/30 dark:text-green-400">
            <ShieldCheck size={13} />
            {success}
          </div>
        )}

        {/* Status row */}
        <div className="flex items-center gap-3">
          {hasPin ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                <Lock size={12} /> {L('PIN set', 'PIN 已设置')}
              </span>
              {/* Enable / disable toggle */}
              <button
                onClick={() => setLockEnabled(!lockEnabled)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded border transition-colors',
                  lockEnabled
                    ? 'border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
                    : 'border-border text-muted-foreground hover:bg-accent/40'
                )}
              >
                {lockEnabled ? L('Enabled ✓', '已启用 ✓') : L('Disabled', '已禁用')}
              </button>
              {/* Lock now */}
              {lockEnabled && (
                <button
                  onClick={lockNow}
                  className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                >
                  {L('Lock now', '立即锁定')}
                </button>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LockOpen size={12} /> {L('No PIN set — lock is off', '未设置 PIN — 锁未启用')}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {mode === 'idle' && (
          <div className="flex gap-2">
            <button
              onClick={() => { setMode(hasPin ? 'change' : 'set'); setStep1(''); setStep2(''); setPinError(''); }}
              className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              {hasPin ? L('Change PIN', '修改 PIN') : L('Set PIN', '设置 PIN')}
            </button>
            {hasPin && (
              <button
                onClick={handleClear}
                className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                {L('Remove PIN', '删除 PIN')}
              </button>
            )}
          </div>
        )}

        {/* Set / Change PIN form */}
        {(mode === 'set' || mode === 'change') && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                {L('New PIN (4 digits)', '新 PIN（4 位数字）')}
              </label>
              <PinInput value={step1} onChange={setStep1} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                {L('Confirm PIN', '再次输入 PIN')}
              </label>
              <PinInput value={step2} onChange={setStep2} placeholder="••••" />
            </div>
            {pinError && (
              <p className="text-xs text-red-500">{pinError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {L('Save PIN', '保存 PIN')}
              </button>
              <button
                onClick={() => { setMode('idle'); setStep1(''); setStep2(''); setPinError(''); }}
                className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {L('Cancel', '取消')}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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

      {/* PIN Lock */}
      <PinLockCard />

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
