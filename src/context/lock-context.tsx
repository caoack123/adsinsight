'use client';

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react';

const PIN_KEY     = 'adinsight_lock_pin';
const ENABLED_KEY = 'adinsight_lock_enabled';

interface LockContextValue {
  isLocked:       boolean;
  hasPin:         boolean;
  lockEnabled:    boolean;
  unlock:         (pin: string) => boolean;
  setPin:         (pin: string) => void;
  clearPin:       () => void;
  setLockEnabled: (enabled: boolean) => void;
  lockNow:        () => void;
}

const LockContext = createContext<LockContextValue>({
  isLocked: false, hasPin: false, lockEnabled: false,
  unlock: () => false, setPin: () => {}, clearPin: () => {},
  setLockEnabled: () => {}, lockNow: () => {},
});

export function useLock() { return useContext(LockContext); }

export function LockProvider({ children }: { children: ReactNode }) {
  const [isLocked,    setIsLocked]    = useState(false);
  const [hasPin,      setHasPin]      = useState(false);
  const [lockEnabled, setLockEnabled_] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const pin     = localStorage.getItem(PIN_KEY);
    const enabled = localStorage.getItem(ENABLED_KEY) === 'true';
    setHasPin(!!pin);
    setLockEnabled_(enabled);
    if (pin && enabled) setIsLocked(true);
  }, []);

  // Re-lock whenever the tab becomes visible again
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        const pin     = localStorage.getItem(PIN_KEY);
        const enabled = localStorage.getItem(ENABLED_KEY) === 'true';
        if (pin && enabled) setIsLocked(true);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const unlock = useCallback((pin: string): boolean => {
    const stored = localStorage.getItem(PIN_KEY);
    if (pin === stored) { setIsLocked(false); return true; }
    return false;
  }, []);

  const setPin = useCallback((pin: string) => {
    localStorage.setItem(PIN_KEY, pin);
    localStorage.setItem(ENABLED_KEY, 'true');
    setHasPin(true);
    setLockEnabled_(true);
    setIsLocked(false);
  }, []);

  const clearPin = useCallback(() => {
    localStorage.removeItem(PIN_KEY);
    localStorage.setItem(ENABLED_KEY, 'false');
    setHasPin(false);
    setLockEnabled_(false);
    setIsLocked(false);
  }, []);

  const setLockEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(ENABLED_KEY, String(enabled));
    setLockEnabled_(enabled);
    if (!enabled) setIsLocked(false);
    else {
      const pin = localStorage.getItem(PIN_KEY);
      if (pin) setIsLocked(true);
    }
  }, []);

  const lockNow = useCallback(() => {
    const pin     = localStorage.getItem(PIN_KEY);
    const enabled = localStorage.getItem(ENABLED_KEY) === 'true';
    if (pin && enabled) setIsLocked(true);
  }, []);

  return (
    <LockContext.Provider value={{
      isLocked, hasPin, lockEnabled,
      unlock, setPin, clearPin, setLockEnabled, lockNow,
    }}>
      {children}
    </LockContext.Provider>
  );
}
