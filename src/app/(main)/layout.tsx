import { Sidebar } from '@/components/sidebar';
import { AccountSwitcher } from '@/components/account-switcher';
import { ThemeToggle, LangToggle } from '@/components/theme-provider';
import { LockProvider } from '@/context/lock-context';
import { LockScreen } from '@/components/lock-screen';
import { UserMenu } from '@/components/user-menu';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LockProvider>
      {/* Full-screen PIN overlay — renders on top of everything when locked */}
      <LockScreen />

      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              AdInsight AI <span className="text-muted-foreground font-normal text-xs ml-1">广告洞察 AI</span>
            </span>
            <div className="flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
              <AccountSwitcher />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </LockProvider>
  );
}
