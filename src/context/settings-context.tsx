'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  savedFlash: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  savedFlash: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedFlash, setSavedFlash] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

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
    <SettingsContext.Provider value={{ settings, updateSettings, savedFlash }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
