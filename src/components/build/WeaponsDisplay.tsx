'use client';

import { WeaponStatsTable } from '@/components/ui';
import type { Weapon } from '@/types';

interface WeaponsDisplayProps {
  weapons: Weapon[];
  className?: string;
}

export function WeaponsDisplay({ weapons, className = '' }: WeaponsDisplayProps) {
  if (weapons.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 text-sm ${className}`}>
        No weapons available.
      </div>
    );
  }

  return (
    <div className={className}>
      <WeaponStatsTable weapons={weapons} />
    </div>
  );
}
