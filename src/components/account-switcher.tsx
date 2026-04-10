'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/context/settings-context';
import { useI18n } from '@/context/i18n-context';
import { ChevronDown, Database, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DbAccount } from '@/lib/supabase';

export function AccountSwitcher() {
  const { selectedAccountId, setSelectedAccountId } = useSettings();
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  const current = selectedAccountId === 'demo'
    ? null
    : accounts.find(a => a.id === selectedAccountId);

  const label = selectedAccountId === 'demo'
    ? t('as_demo')
    : (current?.account_name ?? t('as_select'));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-border bg-card hover:bg-accent transition-colors"
      >
        {selectedAccountId === 'demo'
          ? <FlaskConical size={12} className="text-amber-400" />
          : <Database size={12} className="text-green-400" />}
        <span className="font-medium">{label}</span>
        <ChevronDown size={11} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-card border border-border rounded shadow-lg py-1 text-sm">
            {/* Demo option */}
            <button
              onClick={() => { setSelectedAccountId('demo'); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left',
                selectedAccountId === 'demo' && 'text-amber-400 font-medium'
              )}
            >
              <FlaskConical size={13} className="text-amber-400 shrink-0" />
              <div>
                <div>{t('as_demo')}</div>
                <div className="text-xs text-muted-foreground">{t('as_demo_subtitle')}</div>
              </div>
            </button>

            {accounts.length > 0 && (
              <div className="border-t border-border my-1" />
            )}

            {/* Real accounts */}
            {accounts.map(account => (
              <button
                key={account.id}
                onClick={() => { setSelectedAccountId(account.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left',
                  selectedAccountId === account.id && 'text-green-400 font-medium'
                )}
              >
                <Database size={13} className="text-green-400 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate">{account.account_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {account.last_synced_at
                      ? `${t('as_synced')}${account.currency}`
                      : t('as_not_synced')}
                  </div>
                </div>
              </button>
            ))}

            {accounts.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t('as_no_accounts')} —{' '}
                <a href="/accounts" className="text-primary underline">{t('as_add')}</a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
