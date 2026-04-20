'use client';

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { type AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';

interface SettingsContextValue {
  settings:             AppSettings;
  updateSettings:       (patch: Partial<AppSettings>) => void;
  savedFlash:           boolean;
  selectedAccountId:    string;
  setSelectedAccountId: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings:             DEFAULT_SETTINGS,
  updateSettings:       () => {},
  savedFlash:           false,
  selectedAccountId:    'demo',
  setSelectedAccountId: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = (session as Record<string, unknown> | null)?.userId as string | null ?? null;

  const [settings,               setSettings]               = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedFlash,             setSavedFlash]             = useState(false);
  const [selectedAccountId,      setSelectedAccountIdState] = useState('demo');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate: localStorage first, then cloud if logged in ──────────────────
  useEffect(() => {
    if (status === 'loading') return;

    const local = loadSettings();
    setSettings(local);
    setSelectedAccountIdState(localStorage.getItem('adinsight_selected_account') ?? 'demo');

    if (userId) {
      fetch('/api/user/settings')
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.settings && Object.keys(json.settings).length > 0) {
            const merged = { ...local, ...json.settings };
            setSettings(merged);
            saveSettings(merged);
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  function setSelectedAccountId(id: string) {
    setSelectedAccountIdState(id);
    localStorage.setItem('adinsight_selected_account', id);
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);

      // Debounced cloud save (800 ms after last keystroke)
      if (userId) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          fetch('/api/user/settings', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ settings: next }),
          }).catch(() => {});
        }, 800);
      }

      return next;
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <SettingsContext.Provider value={{
      settings, updateSettings, savedFlash, selectedAccountId, setSelectedAccountId,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
