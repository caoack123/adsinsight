'use client';

import { SessionProvider } from 'next-auth/react';
import { SettingsProvider } from '@/context/settings-context';
import { ThemeProvider } from '@/components/theme-provider';
import { I18nProvider } from '@/context/i18n-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <I18nProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
