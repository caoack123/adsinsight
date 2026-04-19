import type { Metadata } from 'next';
import { ThemeToggle, LangToggle } from '@/components/theme-provider';
import { PlayCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'YouTube Intelligence — AdInsight AI',
  description: 'AI-powered YouTube market intelligence for every team',
};

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Minimal top bar — no sidebar, no account switcher */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0 bg-card">
        <div className="flex items-center gap-2.5">
          <PlayCircle size={16} className="text-red-500" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            YouTube Intelligence
          </span>
          <span className="text-xs text-muted-foreground font-normal">by AdInsight AI</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
