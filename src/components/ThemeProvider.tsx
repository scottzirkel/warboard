'use client';

import { useEffect } from 'react';
import { useArmyStore } from '@/stores/armyStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const army = useArmyStore((state) => state.currentList.army);

  useEffect(() => {
    document.body.setAttribute('data-theme', army);
  }, [army]);

  return <>{children}</>;
}
