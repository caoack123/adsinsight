import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Providers } from '@/components/providers';
import { AccountSwitcher } from '@/components/account-switcher';
import { ThemeToggle } from '@/components/theme-provider';

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
    <html lang="zh-CN" className={inter.variable}>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('adinsight_theme');if(t!=='light')document.documentElement.classList.add('dark');})()` }} />
      </head>
      <body className="bg-background text-foreground min-h-screen flex">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                AdInsight AI <span className="text-muted-foreground font-normal text-xs ml-1">广告洞察 AI</span>
              </span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <AccountSwitcher />
              </div>
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
