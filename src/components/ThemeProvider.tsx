'use client';

import { useEffect } from 'react';
import { useArmyStore } from '@/stores/armyStore';
import { useUIStore } from '@/stores/uiStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const army = useArmyStore((state) => state.currentList.army);
  const colorMode = useUIStore((state) => state.colorMode);

  useEffect(() => {
    document.body.setAttribute('data-theme', army);
  }, [army]);

  useEffect(() => {
    document.body.setAttribute('data-color-mode', colorMode);
  }, [colorMode]);

  return <>{children}</>;
}
