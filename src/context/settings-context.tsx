'use client';

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { type AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';

export type UserRole = 'admin' | 'standard' | 'visitor' | null;

interface SettingsContextValue {
  settings:             AppSettings;
  updateSettings:       (patch: Partial<AppSettings>) => void;
  savedFlash:           boolean;
  selectedAccountId:    string;
  setSelectedAccountId: (id: string) => void;
  userRole:             UserRole;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings:             DEFAULT_SETTINGS,
  updateSettings:       () => {},
  savedFlash:           false,
  selectedAccountId:    'demo',
  setSelectedAccountId: () => {},
  userRole:             null,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = (session as Record<string, unknown> | null)?.userId as string | null ?? null;

  const [settings,               setSettings]               = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedFlash,             setSavedFlash]             = useState(false);
  const [selectedAccountId,      setSelectedAccountIdState] = useState('demo');
  const [userRole,               setUserRole]               = useState<UserRole>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate: localStorage first, then cloud if logged in ──────────────────
  useEffect(() => {
    if (status === 'loading') return;

    const local = loadSettings();
    setSettings(local);
    setSelectedAccountIdState(localStorage.getItem('adinsight_selected_account') ?? 'demo');

    if (userId) {
      // Fetch user profile to get role
      fetch('/api/user/profile')
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.role) setUserRole(json.role as UserRole);
        })
        .catch(() => {});

      // Fetch cloud settings (own settings)
      fetch('/api/user/settings')
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const cloud: Partial<AppSettings> = json?.settings ?? {};
          // Cloud wins for any key it has; local fills the gaps
          const merged: AppSettings = { ...local, ...(Object.keys(cloud).length ? cloud : {}) };
          setSettings(merged);
          saveSettings(merged);

          // ── Bi-directional sync: if local has API keys the cloud row is missing,
          //    push them up now so server-side lookups always work.
          const localHasKeys  = !!(local.googleAiApiKey || local.openrouterApiKey);
          const cloudHasKeys  = !!(cloud.googleAiApiKey || cloud.openrouterApiKey);
          if (localHasKeys && !cloudHasKeys) {
            fetch('/api/user/settings', {
              method:  'PUT',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ settings: merged }),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      setUserRole(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  // ── Standard users: overlay admin's API keys on top of their own settings ──
  useEffect(() => {
    if (userRole !== 'standard') return;

    fetch('/api/admin/api-keys')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return;
        setSettings(prev => ({
          ...prev,
          openrouterApiKey:    json.openrouterApiKey    ?? prev.openrouterApiKey,
          googleAiApiKey:      json.googleAiApiKey      ?? prev.googleAiApiKey,
          youtubeApiKey:       json.youtubeApiKey       ?? prev.youtubeApiKey,
          feedOptimizerModel:  json.feedOptimizerModel  ?? prev.feedOptimizerModel,
          changeTrackerModel:  json.changeTrackerModel  ?? prev.changeTrackerModel,
          videoAbcdModel:      json.videoAbcdModel      ?? prev.videoAbcdModel,
        }));
      })
      .catch(() => {});
  }, [userRole]);

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
      settings, updateSettings, savedFlash, selectedAccountId, setSelectedAccountId, userRole,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
