import { useMemo } from 'react';
import type { Weapon, Stratagem, Modifier, MissionTwist, Enhancement, ArmyRuleStance, DetachmentRuleChoice } from '@/types';

export interface WeaponStatModifier {
  stat: string;
  operation: 'add' | 'subtract' | 'multiply' | 'set';
  value: number;
  source: string;
}

/** Any source that can provide weapon modifiers */
interface ModifierSource {
  name: string;
  modifiers?: Modifier[];
}

/** Active detachment rule choice with its parent rule info */
export interface ActiveRuleChoice {
  rule: { id: string; name: string };
  choice: DetachmentRuleChoice;
}

/**
 * Collects modifiers from active sources (stratagems, twists, enhancements, stances, rule choices) that apply to a specific weapon stat.
 */
export function collectWeaponModifiers(
  weapon: Weapon,
  stat: string,
  activeStratagems: Stratagem[],
  activeTwists: MissionTwist[] = [],
  enhancement: Enhancement | null = null,
  activeStance: ArmyRuleStance | null = null,
  activeRuleChoices: ActiveRuleChoice[] = []
): WeaponStatModifier[] {
  const modifiers: WeaponStatModifier[] = [];

  // Combine all modifier sources
  const sources: ModifierSource[] = [...activeStratagems, ...activeTwists];

  // Add enhancement if present
  if (enhancement) {
    sources.push(enhancement);
  }

  // Add active stance if present
  if (activeStance) {
    sources.push(activeStance);
  }

  // Add active rule choices
  for (const { choice } of activeRuleChoices) {
    if (choice.modifiers && choice.modifiers.length > 0) {
      sources.push(choice);
    }
  }

  for (const source of sources) {
    if (!source.modifiers) continue;

    for (const mod of source.modifiers as Modifier[]) {
      if (mod.stat !== stat) continue;

      // Check if modifier scope matches weapon type
      if (mod.scope === 'melee' && weapon.type === 'melee') {
        modifiers.push({ ...mod, source: source.name });
      } else if (mod.scope === 'ranged' && weapon.type === 'ranged') {
        modifiers.push({ ...mod, source: source.name });
      } else if (mod.scope === 'all' || mod.scope === 'weapon') {
        modifiers.push({ ...mod, source: source.name });
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
  activeStratagems: Stratagem[],
  activeTwists: MissionTwist[] = [],
  enhancement: Enhancement | null = null,
  activeStance: ArmyRuleStance | null = null,
  activeRuleChoices: ActiveRuleChoice[] = []
): { value: number | string; modified: boolean; sources: string[] } {
  const baseValue = weapon.stats[stat as keyof typeof weapon.stats];

  if (baseValue === undefined) {
    return { value: '-', modified: false, sources: [] };
  }

  const modifiers = collectWeaponModifiers(weapon, stat, activeStratagems, activeTwists, enhancement, activeStance, activeRuleChoices);

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
  activeStratagems: Stratagem[],
  activeTwists: MissionTwist[] = []
) {
  return useMemo(() => {
    return weapons.map(weapon => {
      const stats: Record<string, { value: number | string; modified: boolean; sources: string[] }> = {};

      // Get all stat keys from the weapon
      for (const stat of Object.keys(weapon.stats)) {
        stats[stat] = getModifiedWeaponStat(weapon, stat, activeStratagems, activeTwists);
      }

      return {
        weapon,
        stats,
      };
    });
  }, [weapons, activeStratagems, activeTwists]);
}
