'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/context/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Clock, Database, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DbAccount, DbSyncLog } from '@/lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string, lang: 'zh' | 'en' = 'zh'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'en' ? 'just now' : '刚刚';
  if (m < 60) return lang === 'en' ? `${m} min ago` : `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'en' ? `${h}h ago` : `${h} 小时前`;
  return lang === 'en' ? `${Math.floor(h / 24)}d ago` : `${Math.floor(h / 24)} 天前`;
}

function getDataTypeLabel(type: string, lang: 'zh' | 'en'): string {
  if (lang === 'en') {
    const map: Record<string, string> = { feed: 'Feed Products', changes: 'Changes', videos: 'Videos' };
    return map[type] ?? type;
  }
  const map: Record<string, string> = { feed: 'Feed 产品', changes: '变更记录', videos: '视频素材' };
  return map[type] ?? type;
}

// ─── Sync Log Row ─────────────────────────────────────────────────────────────

function SyncLogRow({ log }: { log: DbSyncLog }) {
  const { lang } = useI18n();
  return (
    <div className="flex items-center gap-3 py-1.5 text-xs border-b border-border/40 last:border-0">
      <span className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        log.status === 'success' ? 'bg-green-400' : 'bg-red-400'
      )} />
      <span className="text-muted-foreground w-20 shrink-0">{timeAgo(log.synced_at, lang)}</span>
      <span className="text-foreground">{getDataTypeLabel(log.data_type, lang)}</span>
      {log.status === 'success' ? (
        <span className="text-muted-foreground ml-auto">+{log.records_upserted} {lang === 'en' ? 'records' : '条'}</span>
      ) : (
        <span className="text-red-600 dark:text-red-400 ml-auto truncate max-w-48">{log.error_message}</span>
      )}
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onDelete,
}: {
  account: DbAccount;
  onDelete: (id: string) => void;
}) {
  const { t, lang } = useI18n();
  const [tokenCopied, setTokenCopied] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<DbSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/sync-logs`);
      const data = await res.json();
      setLogs(data);
    } finally {
      setLogsLoading(false);
    }
  }

  function toggleLogs() {
    if (!logsOpen && logs.length === 0) loadLogs();
    setLogsOpen(v => !v);
  }

  function copyToken() {
    navigator.clipboard.writeText(account.script_token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(t('ac_delete_confirm').replace('{name}', account.account_name))) return;
    setDeleting(true);
    await fetch(`/api/accounts?id=${account.id}`, { method: 'DELETE' });
    onDelete(account.id);
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{account.account_name}</span>
              <Badge variant="outline" className="text-xs shrink-0">{account.currency}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Customer ID: <span className="font-mono">{account.customer_id}</span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Last sync */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={12} />
          {account.last_synced_at
            ? <>{t('ac_last_sync')}<span className="text-foreground">{timeAgo(account.last_synced_at, lang)}</span></>
            : t('ac_never_synced')}
        </div>

        {/* Script token */}
        <div className="bg-muted/40 rounded p-2.5 space-y-1">
          <div className="text-xs text-muted-foreground">Google Ads Script Token</div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-foreground flex-1 truncate">
              {account.script_token}
            </code>
            <button
              onClick={copyToken}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {tokenCopied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Ingest URL hint */}
        <div className="bg-muted/40 rounded p-2.5 space-y-1">
          <div className="text-xs text-muted-foreground">Ingest Endpoint</div>
          <code className="text-xs font-mono text-muted-foreground block truncate">
            {process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'}/api/ingest
          </code>
        </div>

        {/* Sync logs toggle */}
        <button
          onClick={toggleLogs}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <Database size={12} />
          {t('ac_sync_history')}
          {logsLoading
            ? <RefreshCw size={11} className="ml-auto animate-spin" />
            : logsOpen
              ? <ChevronUp size={11} className="ml-auto" />
              : <ChevronDown size={11} className="ml-auto" />}
        </button>

        {logsOpen && (
          <div className="border border-border/40 rounded p-2">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">{t('ac_no_logs')}</p>
            ) : (
              logs.map(log => <SyncLogRow key={log.id} log={log} />)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Account Form ─────────────────────────────────────────────────────────

function AddAccountForm({ onAdded }: { onAdded: (account: DbAccount) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId.replace(/-/g, ''),
          account_name: accountName,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      onAdded(data);
      setOpen(false);
      setCustomerId('');
      setAccountName('');
    } catch (err) {
      setError(String(err).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-full"
      >
        <Plus size={14} />
        {t('ac_add_account_btn')}
      </button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('ac_add_title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('ac_name_label')}</label>
            <input
              type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder={t('ac_name_placeholder')}
              required
              className="w-full bg-muted/40 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Customer ID</label>
            <input
              type="text"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              placeholder="123-456-7890"
              required
              className="w-full bg-muted/40 border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('ac_currency_label')}</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? t('ac_adding') : t('ac_add')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setAccounts(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  function handleAdded(account: DbAccount) {
    setAccounts(prev => [account, ...prev]);
  }

  function handleDeleted(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-base font-semibold">{t('accounts_title')}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('ac_subtitle')}
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><span className="text-foreground font-medium">{accounts.length}</span> {t('ac_accounts_count')}</span>
          <span><span className="text-foreground font-medium">{accounts.filter(a => a.last_synced_at).length}</span> {t('ac_synced_count')}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded p-3">
          <AlertCircle size={14} />
          {error} — {t('ac_error_hint')}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-sm text-muted-foreground animate-pulse">{t('loading')}</div>
      )}

      {/* Account list */}
      {!loading && (
        <div className="space-y-3">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onDelete={handleDeleted}
            />
          ))}
          <AddAccountForm onAdded={handleAdded} />
        </div>
      )}

      {/* Setup guide */}
      {!loading && accounts.length > 0 && (
        <Card className="bg-muted/20">
          <CardContent className="pt-4">
            <p className="text-xs font-medium mb-2">{t('ac_next_steps')}</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{t('ac_step1')}</li>
              <li>{t('ac_step2')}</li>
              <li>{t('ac_step3')}</li>
              <li>{t('ac_step4')}</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
