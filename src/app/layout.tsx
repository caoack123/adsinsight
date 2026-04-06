import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Providers } from '@/components/providers';
import { feedOptimizerData } from '@/lib/feed-optimizer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '广告洞察 AI — AdInsight AI',
  description: 'Google Ads 智能分析工具，专为跨境电商卖家打造',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`dark ${inter.variable}`}>
      <body className="bg-background text-foreground min-h-screen flex">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-foreground tracking-tight">AdInsight AI <span className="text-muted-foreground font-normal text-xs ml-1">广告洞察 AI</span></span>
              <span className="text-xs text-muted-foreground">{feedOptimizerData.account_name} · Google Ads</span>
            </header>
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
