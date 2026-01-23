'use client';

import { useEffect } from 'react';
import { useArmyStore } from '@/stores/armyStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const army = useArmyStore((state) => state.currentList.army);

  useEffect(() => {
    // Custodes is the default theme (defined in :root), so remove data-theme
    if (army === 'custodes') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', army);
    }
  }, [army]);

  return <>{children}</>;
}
