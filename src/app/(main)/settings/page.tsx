'use client';

import { useState, useEffect } from 'react';
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
import {
  Key, Bot, CheckCircle2, Eye, EyeOff, ExternalLink,
  Lock, LockOpen, ShieldCheck, Users, ShieldAlert,
} from 'lucide-react';

function MaskedInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  if (disabled) {
    return (
      <div className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-sm font-mono text-muted-foreground select-none flex items-center gap-2">
        <Lock size={11} className="shrink-0" />
        <span>由管理员配置</span>
      </div>
    );
  }
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
  disabled,
}: {
  value: T;
  current: T;
  label: string;
  description: string;
  badge?: string;
  onSelect: (v: T) => void;
  disabled?: boolean;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded border transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
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
  const [step1, setStep1]       = useState('');
  const [step2, setStep2]       = useState('');
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

        <div className="flex items-center gap-3">
          {hasPin ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                <Lock size={12} /> {L('PIN set', 'PIN 已设置')}
              </span>
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

// ── Admin panel: user list + role management ───────────────────────────────────

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'standard' | 'visitor';
  created_at: string;
};

const ROLE_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  admin:    { zh: '管理员', en: 'Admin',    color: 'text-purple-500 border-purple-500/40 bg-purple-50 dark:bg-purple-950/20' },
  standard: { zh: '标准',   en: 'Standard', color: 'text-blue-500 border-blue-500/40 bg-blue-50 dark:bg-blue-950/20' },
  visitor:  { zh: '访客',   en: 'Visitor',  color: 'text-muted-foreground border-border' },
};

function AdminPanel() {
  const { lang } = useI18n();
  const L = (en: string, zh: string) => lang === 'en' ? en : zh;

  const [users, setUsers]         = useState<UserRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);  // userId being saved
  const [error, setError]         = useState('');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => { setError(L('Failed to load users', '加载用户失败')); setLoading(false); });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function changeRole(userId: string, role: string) {
    setSaving(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await res.text());
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: role as UserRecord['role'] } : u));
    } catch {
      setError(L('Failed to update role', '更新权限失败'));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card className="border-purple-500/30">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users size={14} className="text-purple-500" />
          {L('User Management', '用户管理')}
          <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-500 px-1.5 ml-1">Admin</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {L(
            'Manage registered users and assign roles. Standard users inherit your API keys automatically.',
            '管理已注册用户并分配权限。Standard 用户会自动继承你的 API Key。',
          )}
        </p>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => (
              <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {users.map(u => {
              const info = ROLE_LABELS[u.role] ?? ROLE_LABELS.visitor;
              return (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.name ?? ''} className="w-full h-full object-cover" />
                      : <span className="text-xs font-medium text-muted-foreground uppercase">{(u.name ?? u.email)[0]}</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{u.name ?? u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>

                  {/* Role badge + selector */}
                  <div className="shrink-0">
                    {saving === u.id ? (
                      <div className="w-20 h-6 rounded bg-muted/40 animate-pulse" />
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value)}
                        className={cn(
                          'text-xs px-2 py-1 rounded border font-medium bg-background focus:outline-none cursor-pointer',
                          info.color,
                        )}
                      >
                        <option value="visitor">{L('Visitor', '访客')}</option>
                        <option value="standard">{L('Standard', '标准')}</option>
                        <option value="admin">{L('Admin', '管理员')}</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-1">
          <p>• <span className="font-medium text-purple-500">{L('Admin', '管理员')}</span>{L(' — Full access, manages users', ' — 完全权限，可管理用户')}</p>
          <p>• <span className="font-medium text-blue-500">{L('Standard', '标准')}</span>{L(' — Uses admin API keys, cannot modify them', ' — 使用管理员 API Key，不可修改')}</p>
          <p>• <span className="font-medium">{L('Visitor', '访客')}</span>{L(' — Must configure own API keys', ' — 需自行配置 API Key')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSettings, savedFlash, userRole } = useSettings();
  const { t } = useI18n();

  const isStandard = userRole === 'standard';
  const isAdmin    = userRole === 'admin';

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

      {/* Standard user notice */}
      {isStandard && (
        <div className="flex items-start gap-2 text-xs bg-blue-50 border border-blue-200 rounded px-3 py-2.5 dark:bg-blue-950/20 dark:border-blue-500/30 text-blue-700 dark:text-blue-300">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          <span>你的账号为 Standard 级别，API Key 由管理员统一配置，无需自行填写。</span>
        </div>
      )}

      {/* Admin panel */}
      {isAdmin && <AdminPanel />}

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
              {!isStandard && (
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  {t('s_get_key')} <ExternalLink size={10} />
                </a>
              )}
            </div>
            <MaskedInput
              value={settings.openrouterApiKey}
              onChange={v => updateSettings({ openrouterApiKey: v })}
              placeholder="sk-or-v1-..."
              disabled={isStandard}
            />
            {!isStandard && (
              <p className="text-xs text-muted-foreground">
                {t('s_openrouter_desc')} <code className="bg-muted px-1 rounded">OPENROUTER_API_KEY</code> 或 <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                Google AI API Key
                <span className="ml-2 text-muted-foreground font-normal">{t('s_google_usage')}</span>
              </label>
              {!isStandard && (
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  {t('s_get_key')} <ExternalLink size={10} />
                </a>
              )}
            </div>
            <MaskedInput
              value={settings.googleAiApiKey}
              onChange={v => updateSettings({ googleAiApiKey: v })}
              placeholder="AIza..."
              disabled={isStandard}
            />
            {!isStandard && (
              <p className="text-xs text-muted-foreground">
                {t('s_google_desc')} <code className="bg-muted px-1 rounded">GOOGLE_AI_API_KEY</code>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                YouTube Data API Key
                <span className="ml-2 text-muted-foreground font-normal">{t('s_youtube_usage')}</span>
              </label>
              {!isStandard && (
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  {t('s_get_key')} <ExternalLink size={10} />
                </a>
              )}
            </div>
            <MaskedInput
              value={settings.youtubeApiKey}
              onChange={v => updateSettings({ youtubeApiKey: v })}
              placeholder="AIza..."
              disabled={isStandard}
            />
            {!isStandard && (
              <p className="text-xs text-muted-foreground">
                {t('s_youtube_desc')}
              </p>
            )}
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
                  disabled={isStandard}
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
                  disabled={isStandard}
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
                  disabled={isStandard}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIN Lock */}
      <PinLockCard />

      {/* Env var reference — hide for standard users */}
      {!isStandard && (
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
      )}
    </div>
  );
}
