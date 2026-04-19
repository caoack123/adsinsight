'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLock } from '@/context/lock-context';
import { useI18n } from '@/context/i18n-context';
import { Shield, Delete, AlertCircle } from 'lucide-react';

const MAX_ATTEMPTS  = 5;
const COOLDOWN_SECS = 30;

export function LockScreen() {
  const { isLocked, unlock } = useLock();
  const { lang } = useI18n();

  const [pin,       setPin]       = useState('');
  const [shake,     setShake]     = useState(false);
  const [attempts,  setAttempts]  = useState(0);
  const [cooldown,  setCooldown]  = useState(0);   // seconds remaining

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-submit once 4 digits entered
  useEffect(() => {
    if (pin.length !== 4) return;
    if (cooldown > 0) { setPin(''); return; }

    const ok = unlock(pin);
    if (ok) {
      setAttempts(0);
      setPin('');
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 500);
      if (next >= MAX_ATTEMPTS) { setCooldown(COOLDOWN_SECS); setAttempts(0); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Physical keyboard support
  useEffect(() => {
    if (!isLocked) return;
    function onKey(e: KeyboardEvent) {
      if (cooldown > 0) return;
      if (/^[0-9]$/.test(e.key) && pin.length < 4) {
        setPin(p => p + e.key);
      } else if (e.key === 'Backspace') {
        setPin(p => p.slice(0, -1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLocked, pin, cooldown]);

  const press = useCallback((digit: string) => {
    if (cooldown > 0 || pin.length >= 4) return;
    setPin(p => p + digit);
  }, [cooldown, pin]);

  const del = useCallback(() => setPin(p => p.slice(0, -1)), []);

  if (!isLocked) return null;

  const KEYS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['',  '0', 'del'],
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.65)' }}
    >
      <div className="flex flex-col items-center gap-7 select-none">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Shield size={22} className="text-blue-400" />
          </div>
          <p className="text-white font-semibold text-base tracking-tight">AdInsight AI</p>
          <p className="text-white/50 text-xs">
            {lang === 'en' ? 'Enter your PIN to continue' : '请输入 PIN 码继续'}
          </p>
        </div>

        {/* Dot indicator */}
        <div className={`flex gap-4 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                i < pin.length
                  ? 'bg-white border-white scale-110'
                  : 'bg-transparent border-white/40'
              }`}
            />
          ))}
        </div>

        {/* Error / cooldown messages */}
        {cooldown > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle size={12} />
            {lang === 'en'
              ? `Too many attempts. Try again in ${cooldown}s`
              : `尝试次数过多，请 ${cooldown} 秒后重试`}
          </div>
        )}
        {attempts > 0 && attempts < MAX_ATTEMPTS && cooldown === 0 && (
          <p className="text-xs text-red-400/80 -mt-3">
            {lang === 'en'
              ? `Wrong PIN — ${MAX_ATTEMPTS - attempts} attempts left`
              : `PIN 错误 — 还有 ${MAX_ATTEMPTS - attempts} 次机会`}
          </p>
        )}

        {/* Number pad */}
        <div className="grid grid-rows-4 gap-3">
          {KEYS.map((row, ri) => (
            <div key={ri} className="flex gap-3">
              {row.map((key, ki) => {
                if (key === '') return <div key={ki} className="w-16 h-16" />;
                if (key === 'del') return (
                  <button
                    key={ki}
                    onClick={del}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Delete size={20} />
                  </button>
                );
                return (
                  <button
                    key={ki}
                    onClick={() => press(key)}
                    disabled={cooldown > 0}
                    className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 text-white text-xl font-semibold
                               hover:bg-white/20 active:scale-95 active:bg-white/25
                               disabled:opacity-30 disabled:cursor-not-allowed
                               transition-all duration-100"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}
