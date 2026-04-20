'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/context/i18n-context';
import Image from 'next/image';

export function UserMenu() {
  const { data: session, status } = useSession();
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (status === 'loading') {
    return <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />;
  }

  // Not logged in
  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <LogIn size={13} />
        {lang === 'zh' ? '登录' : 'Sign in'}
      </button>
    );
  }

  // Logged in
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avatar = (session as any).avatarUrl as string | null;
  const name   = session.user?.name ?? session.user?.email ?? 'User';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        title={name}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={name}
            width={28}
            height={28}
            className="rounded-full border border-border"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-52 bg-card border border-border rounded-lg shadow-lg py-1 z-50 text-sm">
          <div className="px-3 py-2 border-b border-border">
            <p className="font-medium text-foreground text-xs truncate">{name}</p>
            <p className="text-muted-foreground text-xs truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut size={13} />
            {lang === 'zh' ? '退出登录' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
