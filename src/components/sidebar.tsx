'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Settings, Wrench, History, Video, Building2, SearchCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/context/i18n-context';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: '/', label: t('nav_overview'), icon: LayoutDashboard },
    { href: '/feed-optimizer', label: t('nav_feed'), icon: ShoppingBag },
    { href: '/search-terms', label: t('nav_search_terms'), icon: SearchCode },
    { href: '/change-tracker', label: t('nav_change_tracker'), icon: History },
    { href: '/video-abcd', label: t('nav_video'), icon: Video },
    { href: '/accounts', label: t('nav_accounts'), icon: Building2 },
    { href: '/setup', label: t('nav_setup'), icon: Wrench },
    { href: '/settings', label: t('nav_settings'), icon: Settings },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-sm font-bold text-foreground tracking-tight">AdInsight AI</div>
        <div className="text-xs text-muted-foreground mt-0.5">{t('app_subtitle')}</div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors',
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
