'use client';

import { SettingsProvider } from '@/context/settings-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
