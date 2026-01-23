import { useMemo } from 'react';
import type { Weapon, Stratagem, Modifier } from '@/types';

export interface WeaponStatModifier {
  stat: string;
  operation: 'add' | 'subtract' | 'multiply' | 'set';
  value: number;
  source: string;
}

/**
 * Collects modifiers from active stratagems that apply to a specific weapon stat.
 */
export function collectWeaponModifiers(
  weapon: Weapon,
  stat: string,
  activeStratagems: Stratagem[]
): WeaponStatModifier[] {
  const modifiers: WeaponStatModifier[] = [];

  for (const strat of activeStratagems) {
    if (!strat.modifiers) continue;

    for (const mod of strat.modifiers as Modifier[]) {
      if (mod.stat !== stat) continue;

      // Check if modifier scope matches weapon type
      if (mod.scope === 'melee' && weapon.type === 'melee') {
        modifiers.push({ ...mod, source: strat.name });
      } else if (mod.scope === 'ranged' && weapon.type === 'ranged') {
        modifiers.push({ ...mod, source: strat.name });
      } else if (mod.scope === 'all' || mod.scope === 'weapon') {
        modifiers.push({ ...mod, source: strat.name });
      }
    }
  }

  return modifiers;
}

/**
 * Applies modifiers to a base value.
 */
export function applyModifiers(
  baseValue: number | string,
  modifiers: WeaponStatModifier[]
): number | string {
  if (typeof baseValue !== 'number') {
    return baseValue;
  }

  let value = baseValue;

  for (const mod of modifiers) {
    switch (mod.operation) {
      case 'add':
        value += mod.value;
        break;
      case 'subtract':
        value -= mod.value;
        break;
      case 'multiply':
        value *= mod.value;
        break;
      case 'set':
        value = mod.value;
        break;
    }
  }

  return value;
}

/**
 * Gets the modified value for a weapon stat.
 */
export function getModifiedWeaponStat(
  weapon: Weapon,
  stat: string,
  activeStratagems: Stratagem[]
): { value: number | string; modified: boolean; sources: string[] } {
  const baseValue = weapon.stats[stat as keyof typeof weapon.stats];

  if (baseValue === undefined) {
    return { value: '-', modified: false, sources: [] };
  }

  const modifiers = collectWeaponModifiers(weapon, stat, activeStratagems);

  if (modifiers.length === 0) {
    return { value: baseValue, modified: false, sources: [] };
  }

  const modifiedValue = applyModifiers(baseValue, modifiers);
  const sources = modifiers.map(m => m.source);

  return {
    value: modifiedValue,
    modified: baseValue !== modifiedValue,
    sources,
  };
}

/**
 * Hook to get modified weapon stats for a list of weapons.
 */
export function useWeaponModifiers(
  weapons: Weapon[],
  activeStratagems: Stratagem[]
) {
  return useMemo(() => {
    return weapons.map(weapon => {
      const stats: Record<string, { value: number | string; modified: boolean; sources: string[] }> = {};

      // Get all stat keys from the weapon
      for (const stat of Object.keys(weapon.stats)) {
        stats[stat] = getModifiedWeaponStat(weapon, stat, activeStratagems);
      }

      return {
        weapon,
        stats,
      };
    });
  }, [weapons, activeStratagems]);
}
