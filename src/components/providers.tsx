'use client';

import { SettingsProvider } from '@/context/settings-context';
import { ThemeProvider } from '@/components/theme-provider';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </ThemeProvider>
  );
}
