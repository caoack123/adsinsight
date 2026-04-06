'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Settings, Wrench, History, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '总览', icon: LayoutDashboard },
  { href: '/feed-optimizer', label: 'Feed 智能优化', icon: ShoppingBag },
  { href: '/change-tracker', label: '变更追踪', icon: History },
  { href: '/video-abcd', label: '视频素材分析', icon: Video },
  { href: '/setup', label: '安装脚本', icon: Wrench },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-sm font-bold text-foreground tracking-tight">AdInsight AI</div>
        <div className="text-xs text-muted-foreground mt-0.5">广告洞察 AI</div>
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
