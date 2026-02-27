'use client';

import { useMemo, useCallback } from 'react';
import { findUnitById } from '@/lib/armyDataUtils';
import type {
  ArmyData,
  ListUnit,
  Unit,
} from '@/types';
import { useStatModifiers } from './useStatModifiers';

// ============================================================================
// Types
// ============================================================================

export interface WoundTrackingState {
  /** Total wounds for the unit (all models combined) */
  totalWounds: number;

  /** Current wounds remaining (null = full health) */
  currentWounds: number;

  /** Number of wounds taken */
  woundsTaken: number;

  /** Number of models alive */
  modelsAlive: number;

  /** Total model count */
  modelCount: number;

  /** Whether the unit is at full health */
  isFullHealth: boolean;

  /** Whether the unit is destroyed */
  isDestroyed: boolean;
}

export interface LeaderWoundTrackingState {
  /** Total wounds for the leader */
  totalWounds: number;

  /** Current wounds remaining (null = full health) */
  currentWounds: number;

  /** Number of wounds taken */
  woundsTaken: number;

  /** Whether the leader is at full health */
  isFullHealth: boolean;

  /** Whether the leader is dead */
  isDead: boolean;

  /** Leader unit name */
  leaderName: string | null;
}

export interface CombinedWoundState {
  /** Combined total wounds (unit + leader if attached) */
  combinedTotalWounds: number;

  /** Combined current wounds remaining */
  combinedCurrentWounds: number;

  /** Combined wounds taken */
  combinedWoundsTaken: number;

  /** Combined model count (unit + leader) */
  combinedModelCount: number;
}

export interface UseWoundTrackingReturn {
  /** Unit wound tracking state */
  unitWounds: WoundTrackingState;

  /** Leader wound tracking state (if attached) */
  leaderWounds: LeaderWoundTrackingState;

  /** Combined state for unit + leader */
  combined: CombinedWoundState;

  /** Apply damage to the unit */
  applyUnitDamage: (damage: number) => number;

  /** Apply damage to the leader */
  applyLeaderDamage: (damage: number) => number;

  /** Heal the unit */
  healUnit: (amount: number) => number;

  /** Heal the leader */
  healLeader: (amount: number) => number;

  /** Reset unit wounds to full health */
  resetUnitWounds: () => void;

  /** Reset leader wounds to full health */
  resetLeaderWounds: () => void;

  /** Reset all wounds (unit + leader) */
  resetAllWounds: () => void;

  /** Check if the unit has an attached leader */
  hasAttachedLeader: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the number of models alive based on wounds taken.
 * Models are removed when total wounds exceed multiples of wounds per model.
 */
function calculateModelsAlive(
  totalWounds: number,
  woundsTaken: number,
  modelCount: number,
  woundsPerModel: number
): number {
  if (woundsPerModel <= 0 || modelCount <= 0) {
    return 0;
  }

  // Calculate models killed based on wounds taken
  const modelsKilled = Math.floor(woundsTaken / woundsPerModel);

  return Math.max(0, modelCount - modelsKilled);
}

/**
 * Parse a stat value that might be a string or number to a number.
 */
function parseStatToNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = parseInt(value, 10);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate total wounds for a unit accounting for mixed loadouts and enhancements.
 * Different models may have different wound counts based on their equipped weapons.
 * Enhancement modifiers apply uniformly to all models.
 */
function calculateTotalWoundsForUnit(
  unit: Unit | undefined,
  listUnit: ListUnit | undefined,
  baseWoundsPerModel: number,
  enhancementWoundMod: number = 0
): { totalWounds: number; woundsPerModel: number } {
  if (!unit || !listUnit) {
    return { totalWounds: 0, woundsPerModel: 0 };
  }

  const weaponCounts = listUnit.weaponCounts || {};
  const totalModels = listUnit.modelCount;

  // Apply enhancement modifier to base wounds (affects all models)
  const baseWithEnhancement = baseWoundsPerModel + enhancementWoundMod;

  // Find all unique wound modifiers from equipped loadouts
  const woundModsByLoadout = new Map<string, number>();
  const processedGroups = new Set<string>();

  for (const weapon of unit.weapons) {
    if (!weapon.modifiers || weapon.modifiers.length === 0) continue;
    if (!weapon.loadoutGroup) continue;
    if (processedGroups.has(weapon.loadoutGroup)) continue;

    processedGroups.add(weapon.loadoutGroup);

    // Check if this loadout is equipped and has wound modifiers
    const count = weaponCounts[weapon.loadoutGroup] || 0;
    if (count === 0) continue;

    // Sum up wound modifiers for this loadout
    let woundMod = 0;
    for (const mod of weapon.modifiers) {
      if (mod.stat === 'w' && mod.scope === 'model') {
        if (mod.operation === 'add') {
          woundMod += mod.value;
        } else if (mod.operation === 'subtract') {
          woundMod -= mod.value;
        }
      }
    }

    if (woundMod !== 0) {
      woundModsByLoadout.set(weapon.loadoutGroup, woundMod);
    }
  }

  // If no loadouts with wound modifiers, use simple calculation
  if (woundModsByLoadout.size === 0) {
    return {
      totalWounds: baseWithEnhancement * totalModels,
      woundsPerModel: baseWithEnhancement,
    };
  }

  // Calculate total wounds by summing up models with each wound value
  let totalWounds = 0;
  let modelsWithModifiers = 0;

  for (const [loadoutGroup, woundMod] of woundModsByLoadout) {
    const modelsWithLoadout = weaponCounts[loadoutGroup] || 0;
    const woundsForThisLoadout = baseWithEnhancement + woundMod;
    totalWounds += modelsWithLoadout * woundsForThisLoadout;
    modelsWithModifiers += modelsWithLoadout;
  }

  // Remaining models have base wounds (with enhancement)
  const modelsWithBaseWounds = totalModels - modelsWithModifiers;
  totalWounds += modelsWithBaseWounds * baseWithEnhancement;

  // Average wounds per model for display purposes
  const avgWoundsPerModel = totalModels > 0 ? totalWounds / totalModels : baseWithEnhancement;

  return {
    totalWounds,
    woundsPerModel: avgWoundsPerModel,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing wound tracking state for a unit and its attached leader.
 *
 * Calculates total wounds using modified stats (from useStatModifiers),
 * tracks current wounds, calculates models alive, and handles leader wounds
 * separately.
 *
 * @param armyData - The loaded faction data
 * @param unit - The unit definition from army data
 * @param listUnit - The list unit with current state
 * @param unitIndex - Index of the unit in the list
 * @param units - All units in the list (for leader lookup)
 * @param detachment - The selected detachment
 * @param onSetUnitWounds - Callback to update unit wounds in store
 * @param onSetLeaderWounds - Callback to update leader wounds in store
 *
 * @example
 * ```tsx
 * const { unitWounds, leaderWounds, combined, applyUnitDamage } = useWoundTracking(
 *   armyData,
 *   unit,
 *   listUnit,
 *   unitIndex,
 *   currentList.units,
 *   currentList.detachment,
 *   (wounds) => armyStore.setUnitWounds(unitIndex, wounds),
 *   (wounds) => armyStore.setLeaderWounds(unitIndex, wounds)
 * );
 *
 * // Display wounds
 * <div>
 *   {unitWounds.currentWounds} / {unitWounds.totalWounds} wounds
 *   ({unitWounds.modelsAlive} models alive)
 * </div>
 *
 * // Apply damage
 * <button onClick={() => applyUnitDamage(3)}>Take 3 damage</button>
 * ```
 */
export function useWoundTracking(
  armyData: ArmyData | null,
  unit: Unit | undefined,
  listUnit: ListUnit | undefined,
  unitIndex: number,
  units: ListUnit[],
  detachment: string,
  onSetUnitWounds: (wounds: number | null) => void,
  onSetLeaderWounds: (wounds: number | null) => void
): UseWoundTrackingReturn {
  // Check if there's an attached leader
  const hasAttachedLeader = !!listUnit?.attachedLeader;

  // Get leader info if attached
  const leaderAttachedUnitIndex = listUnit?.attachedLeader?.unitIndex;
  const leaderInfo = useMemo(() => {
    if (!hasAttachedLeader || leaderAttachedUnitIndex === undefined || !armyData) {
      return null;
    }

    const leaderListUnit = units[leaderAttachedUnitIndex];

    if (!leaderListUnit) {
      return null;
    }

    const leaderUnit = findUnitById(armyData, leaderListUnit.unitId);

    if (!leaderUnit) {
      return null;
    }

    return {
      unit: leaderUnit,
      listUnit: leaderListUnit,
      unitIndex: leaderAttachedUnitIndex,
    };
  }, [hasAttachedLeader, leaderAttachedUnitIndex, units, armyData]);

  // Get modified stats for the leader (if attached)
  const { modifiedStats: leaderModifiedStats } = useStatModifiers(
    armyData,
    leaderInfo?.unit,
    leaderInfo?.listUnit,
    leaderInfo?.unitIndex ?? -1,
    units,
    detachment
  );

  // Calculate unit wound tracking state
  const unitWounds = useMemo((): WoundTrackingState => {
    if (!unit || !listUnit) {
      return {
        totalWounds: 0,
        currentWounds: 0,
        woundsTaken: 0,
        modelsAlive: 0,
        modelCount: 0,
        isFullHealth: true,
        isDestroyed: true,
      };
    }

    // Get base wounds per model (without weapon modifiers - those are handled by calculateTotalWoundsForUnit)
    const baseWoundsPerModel = unit.stats.w;
    const modelCount = listUnit.modelCount;

    // Calculate enhancement wound modifier
    let enhancementWoundMod = 0;
    if (listUnit.enhancement && armyData?.detachments[detachment]) {
      const enhancement = armyData.detachments[detachment].enhancements?.find(
        e => e.id === listUnit.enhancement
      );
      if (enhancement?.modifiers) {
        for (const mod of enhancement.modifiers) {
          if (mod.stat === 'w' && (mod.scope === 'model' || mod.scope === 'unit')) {
            if (mod.operation === 'add') {
              enhancementWoundMod += mod.value;
            } else if (mod.operation === 'subtract') {
              enhancementWoundMod -= mod.value;
            }
          }
        }
      }
    }

    // Calculate total wounds accounting for mixed loadouts with different wound values
    const { totalWounds, woundsPerModel } = calculateTotalWoundsForUnit(
      unit,
      listUnit,
      baseWoundsPerModel,
      enhancementWoundMod
    );

    // If currentWounds is null, unit is at full health
    const currentWounds = listUnit.currentWounds ?? totalWounds;
    const woundsTaken = totalWounds - currentWounds;

    const modelsAlive = calculateModelsAlive(
      totalWounds,
      woundsTaken,
      modelCount,
      woundsPerModel
    );

    return {
      totalWounds,
      currentWounds,
      woundsTaken,
      modelsAlive,
      modelCount,
      isFullHealth: listUnit.currentWounds === null || listUnit.currentWounds >= totalWounds,
      isDestroyed: currentWounds <= 0,
    };
  }, [unit, listUnit, armyData, detachment]);

  // Calculate leader wound tracking state
  const leaderWounds = useMemo((): LeaderWoundTrackingState => {
    if (!leaderInfo || !listUnit) {
      return {
        totalWounds: 0,
        currentWounds: 0,
        woundsTaken: 0,
        isFullHealth: true,
        isDead: false,
        leaderName: null,
      };
    }

    const totalWounds = parseStatToNumber(leaderModifiedStats.w.modifiedValue);
    const currentWounds = listUnit.leaderCurrentWounds ?? totalWounds;
    const woundsTaken = totalWounds - currentWounds;

    return {
      totalWounds,
      currentWounds,
      woundsTaken,
      isFullHealth: listUnit.leaderCurrentWounds === null || listUnit.leaderCurrentWounds >= totalWounds,
      isDead: currentWounds <= 0,
      leaderName: leaderInfo.unit.name,
    };
  }, [leaderInfo, listUnit, leaderModifiedStats.w.modifiedValue]);

  // Calculate combined state
  const combined = useMemo((): CombinedWoundState => {
    const leaderTotal = hasAttachedLeader ? leaderWounds.totalWounds : 0;
    const leaderCurrent = hasAttachedLeader ? leaderWounds.currentWounds : 0;

    return {
      combinedTotalWounds: unitWounds.totalWounds + leaderTotal,
      combinedCurrentWounds: unitWounds.currentWounds + leaderCurrent,
      combinedWoundsTaken: unitWounds.woundsTaken + (hasAttachedLeader ? leaderWounds.woundsTaken : 0),
      combinedModelCount: unitWounds.modelCount + (hasAttachedLeader ? 1 : 0),
    };
  }, [unitWounds, leaderWounds, hasAttachedLeader]);

  // Apply damage to unit
  const applyUnitDamage = useCallback((damage: number): number => {
    if (damage <= 0 || unitWounds.isDestroyed) {
      return unitWounds.currentWounds;
    }

    const newWounds = Math.max(0, unitWounds.currentWounds - damage);
    onSetUnitWounds(newWounds);

    return newWounds;
  }, [unitWounds.currentWounds, unitWounds.isDestroyed, onSetUnitWounds]);

  // Apply damage to leader
  const applyLeaderDamage = useCallback((damage: number): number => {
    if (damage <= 0 || !hasAttachedLeader || leaderWounds.isDead) {
      return leaderWounds.currentWounds;
    }

    const newWounds = Math.max(0, leaderWounds.currentWounds - damage);
    onSetLeaderWounds(newWounds);

    return newWounds;
  }, [leaderWounds.currentWounds, leaderWounds.isDead, hasAttachedLeader, onSetLeaderWounds]);

  // Heal unit
  const healUnit = useCallback((amount: number): number => {
    if (amount <= 0 || unitWounds.isFullHealth) {
      return unitWounds.currentWounds;
    }

    const newWounds = Math.min(unitWounds.totalWounds, unitWounds.currentWounds + amount);

    // If fully healed, set to null (full health)
    if (newWounds >= unitWounds.totalWounds) {
      onSetUnitWounds(null);
    } else {
      onSetUnitWounds(newWounds);
    }

    return newWounds;
  }, [unitWounds.currentWounds, unitWounds.totalWounds, unitWounds.isFullHealth, onSetUnitWounds]);

  // Heal leader
  const healLeader = useCallback((amount: number): number => {
    if (amount <= 0 || !hasAttachedLeader || leaderWounds.isFullHealth) {
      return leaderWounds.currentWounds;
    }

    const newWounds = Math.min(leaderWounds.totalWounds, leaderWounds.currentWounds + amount);

    // If fully healed, set to null (full health)
    if (newWounds >= leaderWounds.totalWounds) {
      onSetLeaderWounds(null);
    } else {
      onSetLeaderWounds(newWounds);
    }

    return newWounds;
  }, [leaderWounds.currentWounds, leaderWounds.totalWounds, leaderWounds.isFullHealth, hasAttachedLeader, onSetLeaderWounds]);

  // Reset unit wounds
  const resetUnitWounds = useCallback(() => {
    onSetUnitWounds(null);
  }, [onSetUnitWounds]);

  // Reset leader wounds
  const resetLeaderWounds = useCallback(() => {
    onSetLeaderWounds(null);
  }, [onSetLeaderWounds]);

  // Reset all wounds
  const resetAllWounds = useCallback(() => {
    onSetUnitWounds(null);
    onSetLeaderWounds(null);
  }, [onSetUnitWounds, onSetLeaderWounds]);

  return {
    unitWounds,
    leaderWounds,
    combined,
    applyUnitDamage,
    applyLeaderDamage,
    healUnit,
    healLeader,
    resetUnitWounds,
    resetLeaderWounds,
    resetAllWounds,
    hasAttachedLeader,
  };
}
