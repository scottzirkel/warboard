'use client';

import { useMemo } from 'react';
import type {
  ArmyData,
  ListUnit,
  Unit,
  Modifier,
  ModifierOperation,
  UnitStats,
  StatKey,
  ModifierSource,
  GameState,
} from '@/types';
import {
  evaluateCondition,
  createUnitConditionState,
  type UnitConditionState,
} from '@/lib/conditionEvaluator';

// ============================================================================
// Types
// ============================================================================

export type ModifierSourceType =
  | 'enhancement'
  | 'weapon'
  | 'leader'
  | 'leaderEnhancement'
  | 'stratagem'
  | 'detachmentRule'
  | 'katah'
  | 'twist';

export interface CollectedModifier extends Modifier {
  sourceName: string;
  sourceType: ModifierSourceType;
}

export interface ModifiedStat {
  baseValue: number | string;
  modifiedValue: number | string;
  modifiers: ModifierSource[];
  hasModifier: boolean;
}

export interface ModifiedStats {
  m: ModifiedStat;
  t: ModifiedStat;
  sv: ModifiedStat;
  w: ModifiedStat;
  ld: ModifiedStat;
  oc: ModifiedStat;
}

export interface UseStatModifiersReturn {
  /** All collected modifiers from all sources */
  modifiers: CollectedModifier[];

  /** Modified stats with source information */
  modifiedStats: ModifiedStats;

  /** Get modifiers for a specific stat */
  getModifiersForStat: (stat: StatKey) => CollectedModifier[];

  /** Calculate a single modified stat value */
  calculateModifiedValue: (stat: StatKey, baseValue: number | string) => number | string;

  /** Check if a stat has any modifiers */
  hasModifiersForStat: (stat: StatKey) => boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a stat value that might be a string (like "2+") to a number.
 */
function parseStatValue(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  // Handle dice notation like "2+", "3+", etc.
  const match = value.match(/^(\d+)\+$/);

  if (match) {
    return parseInt(match[1], 10);
  }

  // Try parsing as number
  const parsed = parseInt(value, 10);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a stat value back to its display format.
 */
function formatStatValue(value: number, originalFormat: string | number): string | number {
  if (typeof originalFormat === 'number') {
    return value;
  }

  // If original was "2+", "3+", etc., format the result the same way
  if (originalFormat.match(/^\d+\+$/)) {
    return `${value}+`;
  }

  return value;
}

/**
 * Apply a modifier operation to a value.
 */
function applyModifier(
  baseValue: number,
  operation: ModifierOperation,
  modifierValue: number
): number {
  switch (operation) {
    case 'add':
      return baseValue + modifierValue;
    case 'subtract':
      return baseValue - modifierValue;
    case 'multiply':
      return baseValue * modifierValue;
    case 'set':
      return modifierValue;
    default:
      return baseValue;
  }
}

/**
 * Check if a weapon is equipped based on weaponCounts.
 */
function isWeaponEquipped(
  loadoutGroup: string | undefined,
  weaponCounts: Record<string, number>
): boolean {
  // Weapons without a loadoutGroup are always equipped
  if (!loadoutGroup) {
    return true;
  }

  // Check if this loadoutGroup has any models using it
  const count = weaponCounts[loadoutGroup] || 0;

  return count > 0;
}

/**
 * Collect modifiers from an enhancement.
 */
function collectEnhancementModifiers(
  armyData: ArmyData,
  detachment: string,
  enhancementId: string,
  sourceType: 'enhancement' | 'leaderEnhancement'
): CollectedModifier[] {
  if (!enhancementId || !detachment) {
    return [];
  }

  const detachmentData = armyData.detachments[detachment];

  if (!detachmentData) {
    return [];
  }

  const enhancement = detachmentData.enhancements?.find(e => e.id === enhancementId);

  if (!enhancement?.modifiers) {
    return [];
  }

  return enhancement.modifiers.map(mod => ({
    ...mod,
    sourceName: enhancement.name,
    sourceType,
  }));
}

/**
 * Collect modifiers from equipped weapons.
 */
function collectWeaponModifiers(
  unit: Unit,
  weaponCounts: Record<string, number>
): CollectedModifier[] {
  const modifiers: CollectedModifier[] = [];
  const processedGroups = new Set<string>();

  for (const weapon of unit.weapons) {
    // Skip weapons without modifiers
    if (!weapon.modifiers || weapon.modifiers.length === 0) {
      continue;
    }

    // Skip if not equipped
    if (!isWeaponEquipped(weapon.loadoutGroup, weaponCounts)) {
      continue;
    }

    // Only process each loadoutGroup once to avoid duplicate modifiers
    if (weapon.loadoutGroup && processedGroups.has(weapon.loadoutGroup)) {
      continue;
    }

    if (weapon.loadoutGroup) {
      processedGroups.add(weapon.loadoutGroup);
    }

    for (const mod of weapon.modifiers) {
      modifiers.push({
        ...mod,
        sourceName: mod.source || weapon.name,
        sourceType: 'weapon',
      });
    }
  }

  return modifiers;
}

/**
 * Collect modifiers from an attached leader.
 */
function collectLeaderModifiers(
  armyData: ArmyData,
  units: ListUnit[],
  unitIndex: number,
  detachment: string
): CollectedModifier[] {
  const listUnit = units[unitIndex];

  if (!listUnit?.attachedLeader) {
    return [];
  }

  const leaderListUnit = units[listUnit.attachedLeader.unitIndex];

  if (!leaderListUnit) {
    return [];
  }

  const leaderUnit = armyData.units.find(u => u.id === leaderListUnit.unitId);

  if (!leaderUnit) {
    return [];
  }

  const modifiers: CollectedModifier[] = [];

  // Collect leader's enhancement modifiers (these apply to the attached unit)
  if (leaderListUnit.enhancement) {
    const enhancementMods = collectEnhancementModifiers(
      armyData,
      detachment,
      leaderListUnit.enhancement,
      'leaderEnhancement'
    );

    // Only include modifiers with 'unit' or 'all' scope from leader enhancements
    for (const mod of enhancementMods) {
      if (mod.scope === 'unit' || mod.scope === 'all') {
        modifiers.push(mod);
      }
    }
  }

  // Collect leader's weapon modifiers that affect the unit
  const weaponMods = collectWeaponModifiers(
    leaderUnit,
    leaderListUnit.weaponCounts || {}
  );

  // Only include weapon modifiers with 'unit' or 'all' scope
  for (const mod of weaponMods) {
    if (mod.scope === 'unit' || mod.scope === 'all') {
      modifiers.push({
        ...mod,
        sourceType: 'leader',
        sourceName: `${leaderUnit.name}: ${mod.sourceName}`,
      });
    }
  }

  return modifiers;
}

/**
 * Collect modifiers from active stratagems.
 */
function collectStratagemModifiers(
  armyData: ArmyData,
  detachment: string,
  activeStratagems: string[],
  unitCondition: UnitConditionState
): CollectedModifier[] {
  if (activeStratagems.length === 0) {
    return [];
  }

  // Combine detachment stratagems with core (evergreen) stratagems
  const detachmentData = armyData.detachments[detachment];
  const allStratagems = [
    ...(detachmentData?.stratagems || []),
    ...(armyData.coreStratagems || []),
  ];

  const modifiers: CollectedModifier[] = [];

  for (const stratagemId of activeStratagems) {
    const stratagem = allStratagems.find(s => s.id === stratagemId);

    if (!stratagem?.modifiers) {
      continue;
    }

    for (const mod of stratagem.modifiers) {
      // Check if condition is met
      if (!evaluateCondition(mod.condition, unitCondition)) {
        continue;
      }

      modifiers.push({
        ...mod,
        sourceName: stratagem.name,
        sourceType: 'stratagem',
      });
    }
  }

  return modifiers;
}

/**
 * Collect modifiers from detachment rules and active rule choices.
 */
function collectDetachmentRuleModifiers(
  armyData: ArmyData,
  detachment: string,
  unitCondition: UnitConditionState,
  activeRuleChoices: Record<string, string> = {}
): CollectedModifier[] {
  if (!detachment) {
    return [];
  }

  const detachmentData = armyData.detachments[detachment];

  if (!detachmentData?.rules) {
    return [];
  }

  const modifiers: CollectedModifier[] = [];

  for (const rule of detachmentData.rules) {
    // Collect base rule modifiers
    if (rule.modifiers && rule.modifiers.length > 0) {
      for (const mod of rule.modifiers) {
        // Check if condition is met
        if (!evaluateCondition(mod.condition, unitCondition)) {
          continue;
        }

        modifiers.push({
          ...mod,
          sourceName: rule.name,
          sourceType: 'detachmentRule',
        });
      }
    }

    // Collect modifiers from active rule choices
    if (rule.choices && rule.choices.length > 0) {
      const activeChoiceId = activeRuleChoices[rule.id];
      if (activeChoiceId) {
        const activeChoice = rule.choices.find(c => c.id === activeChoiceId);
        if (activeChoice?.modifiers) {
          for (const mod of activeChoice.modifiers) {
            // Check if condition is met
            if (!evaluateCondition(mod.condition, unitCondition)) {
              continue;
            }

            modifiers.push({
              ...mod,
              sourceName: `${rule.name}: ${activeChoice.name}`,
              sourceType: 'detachmentRule',
            });
          }
        }
      }
    }
  }

  return modifiers;
}

/**
 * Collect modifiers from Martial Ka'tah stance (Custodes army rule).
 */
function collectKatahModifiers(
  armyData: ArmyData,
  katah: string | null,
  unitCondition: UnitConditionState
): CollectedModifier[] {
  if (!katah) {
    return [];
  }

  const martialKatah = armyData.armyRules?.['martial_katah'];

  if (!martialKatah?.stances) {
    return [];
  }

  const stance = martialKatah.stances.find(s => s.id === katah);

  if (!stance?.modifiers) {
    return [];
  }

  const modifiers: CollectedModifier[] = [];

  for (const mod of stance.modifiers) {
    // Check if condition is met
    if (!evaluateCondition(mod.condition, unitCondition)) {
      continue;
    }

    modifiers.push({
      ...mod,
      sourceName: `${martialKatah.name}: ${stance.name}`,
      sourceType: 'katah',
    });
  }

  return modifiers;
}

/**
 * Collect modifiers from active mission twists.
 */
function collectTwistModifiers(
  _armyData: ArmyData,
  _activeTwists: string[],
  _unitCondition: UnitConditionState,
  _isWarlord: boolean
): CollectedModifier[] {
  // Mission twists are stored in a separate data file, not in faction data
  // For now, return empty - twists would need to be loaded separately
  // This is a placeholder for future implementation
  return [];
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for collecting and calculating stat modifiers from all sources.
 *
 * Collects modifiers from:
 * - Unit's own enhancement
 * - Unit's equipped weapons (with model/unit scope)
 * - Attached leader's enhancement (unit scope only)
 * - Attached leader's weapons (unit scope only)
 * - Active stratagems (with condition evaluation)
 * - Detachment rules (with condition evaluation)
 * - Martial Ka'tah stance
 * - Mission twists
 *
 * @param armyData - The loaded faction data
 * @param unit - The unit definition from army data
 * @param listUnit - The list unit with selections
 * @param unitIndex - Index of the unit in the list
 * @param units - All units in the list (for leader lookup)
 * @param detachment - The selected detachment
 * @param gameState - Optional game state for stratagem/katah modifiers
 *
 * @example
 * ```tsx
 * const { modifiedStats, modifiers } = useStatModifiers(
 *   armyData,
 *   unit,
 *   listUnit,
 *   unitIndex,
 *   currentList.units,
 *   currentList.detachment,
 *   gameState
 * );
 *
 * // Display modified wounds with tooltip
 * <StatCell
 *   value={modifiedStats.w.modifiedValue}
 *   hasModifier={modifiedStats.w.hasModifier}
 *   sources={modifiedStats.w.modifiers}
 * />
 * ```
 */
export function useStatModifiers(
  armyData: ArmyData | null,
  unit: Unit | undefined,
  listUnit: ListUnit | undefined,
  unitIndex: number,
  units: ListUnit[],
  detachment: string,
  gameState?: GameState | null
): UseStatModifiersReturn {
  // Collect all modifiers
  const modifiers = useMemo((): CollectedModifier[] => {
    if (!armyData || !unit || !listUnit) {
      return [];
    }

    const allModifiers: CollectedModifier[] = [];
    const weaponCounts = listUnit.weaponCounts || {};

    // Create unit condition state for evaluating conditional modifiers
    const unitCondition = createUnitConditionState(
      listUnit.modelCount,
      unit.stats.w,
      listUnit.currentWounds
    );

    // 1. Collect enhancement modifiers
    if (listUnit.enhancement) {
      const enhancementMods = collectEnhancementModifiers(
        armyData,
        detachment,
        listUnit.enhancement,
        'enhancement'
      );

      allModifiers.push(...enhancementMods);
    }

    // 2. Collect weapon modifiers
    const weaponMods = collectWeaponModifiers(unit, weaponCounts);
    allModifiers.push(...weaponMods);

    // 3. Collect leader modifiers
    const leaderMods = collectLeaderModifiers(armyData, units, unitIndex, detachment);
    allModifiers.push(...leaderMods);

    // 4. Collect game state modifiers (stratagems, rules, katah, twists)
    if (gameState) {
      // Stratagem modifiers
      const stratagemMods = collectStratagemModifiers(
        armyData,
        detachment,
        gameState.activeStratagems,
        unitCondition
      );
      allModifiers.push(...stratagemMods);

      // Detachment rule modifiers
      const ruleMods = collectDetachmentRuleModifiers(
        armyData,
        detachment,
        unitCondition,
        gameState.activeRuleChoices || {}
      );
      allModifiers.push(...ruleMods);

      // Katah modifiers (Custodes army rule)
      const katahMods = collectKatahModifiers(
        armyData,
        gameState.katah,
        unitCondition
      );
      allModifiers.push(...katahMods);

      // Twist modifiers
      const twistMods = collectTwistModifiers(
        armyData,
        gameState.activeTwists || [],
        unitCondition,
        listUnit.isWarlord || false
      );
      allModifiers.push(...twistMods);
    }

    return allModifiers;
  }, [armyData, unit, listUnit, unitIndex, units, detachment, gameState]);

  // Get modifiers for a specific stat
  const getModifiersForStat = useMemo(() => {
    return (stat: StatKey): CollectedModifier[] => {
      return modifiers.filter(mod => {
        // Check if modifier applies to this stat
        if (mod.stat !== stat) {
          return false;
        }

        // Check scope - for unit stats, only 'model', 'unit', 'all' scopes apply
        const validScopes = ['model', 'unit', 'all'];

        return validScopes.includes(mod.scope);
      });
    };
  }, [modifiers]);

  // Calculate modified value for a stat
  const calculateModifiedValue = useMemo(() => {
    return (stat: StatKey, baseValue: number | string): number | string => {
      const statModifiers = getModifiersForStat(stat);

      if (statModifiers.length === 0) {
        return baseValue;
      }

      let currentValue = parseStatValue(baseValue);

      // Apply modifiers in order: set first, then add/subtract, then multiply
      const setModifiers = statModifiers.filter(m => m.operation === 'set');
      const addSubModifiers = statModifiers.filter(m => m.operation === 'add' || m.operation === 'subtract');
      const multiplyModifiers = statModifiers.filter(m => m.operation === 'multiply');

      for (const mod of setModifiers) {
        currentValue = applyModifier(currentValue, mod.operation, mod.value);
      }

      for (const mod of addSubModifiers) {
        currentValue = applyModifier(currentValue, mod.operation, mod.value);
      }

      for (const mod of multiplyModifiers) {
        currentValue = applyModifier(currentValue, mod.operation, mod.value);
      }

      return formatStatValue(currentValue, baseValue);
    };
  }, [getModifiersForStat]);

  // Check if stat has modifiers
  const hasModifiersForStat = useMemo(() => {
    return (stat: StatKey): boolean => {
      return getModifiersForStat(stat).length > 0;
    };
  }, [getModifiersForStat]);

  // Calculate all modified stats
  const modifiedStats = useMemo((): ModifiedStats => {
    const stats = unit?.stats || { m: 0, t: 0, sv: '0+', w: 0, ld: '0+', oc: 0 };

    const createModifiedStat = (
      stat: keyof UnitStats,
      baseValue: number | string
    ): ModifiedStat => {
      const statModifiers = getModifiersForStat(stat);
      const modifiedValue = calculateModifiedValue(stat, baseValue);

      const sources: ModifierSource[] = statModifiers.map(mod => ({
        name: mod.sourceName,
        value: mod.value,
        operation: mod.operation,
      }));

      return {
        baseValue,
        modifiedValue,
        modifiers: sources,
        hasModifier: statModifiers.length > 0,
      };
    };

    return {
      m: createModifiedStat('m', stats.m),
      t: createModifiedStat('t', stats.t),
      sv: createModifiedStat('sv', stats.sv),
      w: createModifiedStat('w', stats.w),
      ld: createModifiedStat('ld', stats.ld),
      oc: createModifiedStat('oc', stats.oc),
    };
  }, [unit, getModifiersForStat, calculateModifiedValue]);

  return {
    modifiers,
    modifiedStats,
    getModifiersForStat,
    calculateModifiedValue,
    hasModifiersForStat,
  };
}
