'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  savedFlash: boolean;
  selectedAccountId: string;           // 'demo' | uuid
  setSelectedAccountId: (id: string) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  savedFlash: false,
  selectedAccountId: 'demo',
  setSelectedAccountId: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedFlash, setSavedFlash] = useState(false);
  const [selectedAccountId, setSelectedAccountIdState] = useState('demo');

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    const saved = localStorage.getItem('adinsight_selected_account') ?? 'demo';
    setSelectedAccountIdState(saved);
  }, []);

  function setSelectedAccountId(id: string) {
    setSelectedAccountIdState(id);
    localStorage.setItem('adinsight_selected_account', id);
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, savedFlash, selectedAccountId, setSelectedAccountId }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
