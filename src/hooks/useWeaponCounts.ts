import { useCallback, useMemo } from 'react';
import type { Unit, ListUnit, LoadoutOption, LoadoutChoice } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface WeaponCountState {
  choiceId: string;
  count: number;
  maxCount: number;
  isDefault: boolean;
  isPaired: boolean;
  hasMaxLimit: boolean;
}

export interface LoadoutOptionState {
  option: LoadoutOption;
  choices: WeaponCountState[];
  totalAssigned: number;
  isReplacement: boolean;
  isAddition: boolean;
}

export interface WeaponCountsResult {
  /** All loadout options with their current state */
  loadoutOptions: LoadoutOptionState[];

  /** Update the count for a specific choice */
  setCount: (choiceId: string, count: number) => void;

  /** Increment/decrement count for a choice */
  adjustCount: (choiceId: string, delta: number) => void;

  /** Check if a choice is at its maximum allowed count */
  isAtMaxLimit: (choiceId: string) => boolean;

  /** Check if a choice is at minimum (0) */
  isAtMinLimit: (choiceId: string) => boolean;

  /** Get the effective max for a choice (considering maxModels and modelCount) */
  getEffectiveMax: (choiceId: string) => number;

  /** Validate current weapon counts - returns error messages */
  validate: () => string[];

  /** Reset to default weapon counts */
  resetToDefaults: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find a loadout option containing a specific choice
 */
function findOptionForChoice(
  unit: Unit,
  choiceId: string
): LoadoutOption | undefined {
  return unit.loadoutOptions?.find(option =>
    option.choices.some(choice => choice.id === choiceId)
  );
}

/**
 * Find a choice by its ID within a unit's loadout options
 */
function findChoice(
  unit: Unit,
  choiceId: string
): LoadoutChoice | undefined {
  for (const option of unit.loadoutOptions || []) {
    const choice = option.choices.find(c => c.id === choiceId);

    if (choice) {
      return choice;
    }
  }

  return undefined;
}

/**
 * Calculate the effective maximum for a choice
 */
function calculateEffectiveMax(
  choice: LoadoutChoice,
  modelCount: number
): number {
  if (choice.maxModels !== undefined) {
    return Math.min(choice.maxModels, modelCount);
  }

  return modelCount;
}

/**
 * Calculate default weapon counts for a unit
 */
export function calculateDefaultWeaponCounts(
  unit: Unit,
  modelCount: number
): Record<string, number> {
  const counts: Record<string, number> = {};

  if (!unit.loadoutOptions) {
    return counts;
  }

  for (const option of unit.loadoutOptions) {
    const defaultChoice = option.choices.find(c => c.default);

    if (defaultChoice) {
      counts[defaultChoice.id] = modelCount;
    }
  }

  return counts;
}

/**
 * Validate weapon counts against constraints
 */
export function validateWeaponCounts(
  unit: Unit,
  listUnit: ListUnit
): string[] {
  const errors: string[] = [];
  const { weaponCounts = {}, modelCount } = listUnit;

  if (!unit.loadoutOptions) {
    return errors;
  }

  for (const option of unit.loadoutOptions) {
    // Check maxModels constraints
    for (const choice of option.choices) {
      const count = weaponCounts[choice.id] || 0;

      if (choice.maxModels !== undefined && count > choice.maxModels) {
        errors.push(
          `${unit.name}: ${choice.name} limited to ${choice.maxModels} model(s), but ${count} assigned`
        );
      }
    }

    // For replacement patterns, total should equal modelCount if any models use this option
    if (option.pattern === 'replacement') {
      const totalAssigned = option.choices.reduce(
        (sum, choice) => sum + (weaponCounts[choice.id] || 0),
        0
      );

      if (totalAssigned > 0 && totalAssigned !== modelCount) {
        errors.push(
          `${unit.name}: ${option.name} has ${totalAssigned} models assigned, but unit has ${modelCount} models`
        );
      }
    }
  }

  return errors;
}

// ============================================================================
// Hook Implementation
// ============================================================================

const EMPTY_WEAPON_COUNTS: Record<string, number> = {};

export function useWeaponCounts(
  unit: Unit | undefined,
  listUnit: ListUnit | undefined,
  onCountChange: (choiceId: string, count: number) => void
): WeaponCountsResult {
  // Memoize weaponCounts to prevent dependency changes on every render
  const weaponCounts = useMemo(
    () => listUnit?.weaponCounts ?? EMPTY_WEAPON_COUNTS,
    [listUnit?.weaponCounts]
  );
  const modelCount = listUnit?.modelCount ?? 0;

  // Build the loadout options state
  const loadoutOptions = useMemo((): LoadoutOptionState[] => {
    if (!unit?.loadoutOptions) {
      return [];
    }

    return unit.loadoutOptions.map(option => {
      const choices: WeaponCountState[] = option.choices.map(choice => {
        const count = weaponCounts[choice.id] || 0;
        const effectiveMax = calculateEffectiveMax(choice, modelCount);

        return {
          choiceId: choice.id,
          count,
          maxCount: effectiveMax,
          isDefault: choice.default || false,
          isPaired: choice.paired || false,
          hasMaxLimit: choice.maxModels !== undefined,
        };
      });

      const totalAssigned = choices.reduce((sum, c) => sum + c.count, 0);

      return {
        option,
        choices,
        totalAssigned,
        isReplacement: option.pattern === 'replacement',
        isAddition: option.pattern === 'addition',
      };
    });
  }, [unit, weaponCounts, modelCount]);

  // Set count for a choice, handling mutual exclusivity
  const setCount = useCallback(
    (choiceId: string, newCount: number) => {
      if (!unit) {
        return;
      }

      const option = findOptionForChoice(unit, choiceId);
      const choice = findChoice(unit, choiceId);

      if (!option || !choice) {
        return;
      }

      // Clamp to valid range
      let clampedCount = Math.max(0, newCount);
      const effectiveMax = calculateEffectiveMax(choice, modelCount);
      clampedCount = Math.min(clampedCount, effectiveMax);

      // For replacement patterns, handle mutual exclusivity
      if (option.pattern === 'replacement') {
        // Calculate remaining models after this assignment
        const otherChoicesTotal = option.choices
          .filter(c => c.id !== choiceId)
          .reduce((sum, c) => sum + (weaponCounts[c.id] || 0), 0);

        // Ensure we don't exceed total model count across all choices
        const maxAvailable = modelCount - otherChoicesTotal;
        clampedCount = Math.min(clampedCount, Math.max(0, maxAvailable));
      }

      onCountChange(choiceId, clampedCount);
    },
    [unit, modelCount, weaponCounts, onCountChange]
  );

  // Adjust count by delta
  const adjustCount = useCallback(
    (choiceId: string, delta: number) => {
      const currentCount = weaponCounts[choiceId] || 0;
      setCount(choiceId, currentCount + delta);
    },
    [weaponCounts, setCount]
  );

  // Check if choice is at max limit
  const isAtMaxLimit = useCallback(
    (choiceId: string): boolean => {
      if (!unit) {
        return true;
      }

      const choice = findChoice(unit, choiceId);

      if (!choice) {
        return true;
      }

      const currentCount = weaponCounts[choiceId] || 0;
      const effectiveMax = calculateEffectiveMax(choice, modelCount);

      // Also check mutual exclusivity for replacement patterns
      const option = findOptionForChoice(unit, choiceId);

      if (option?.pattern === 'replacement') {
        const otherChoicesTotal = option.choices
          .filter(c => c.id !== choiceId)
          .reduce((sum, c) => sum + (weaponCounts[c.id] || 0), 0);

        const maxAvailable = modelCount - otherChoicesTotal;

        return currentCount >= Math.min(effectiveMax, maxAvailable);
      }

      return currentCount >= effectiveMax;
    },
    [unit, weaponCounts, modelCount]
  );

  // Check if choice is at minimum
  const isAtMinLimit = useCallback(
    (choiceId: string): boolean => {
      const currentCount = weaponCounts[choiceId] || 0;

      return currentCount <= 0;
    },
    [weaponCounts]
  );

  // Get effective max for a choice
  const getEffectiveMax = useCallback(
    (choiceId: string): number => {
      if (!unit) {
        return 0;
      }

      const choice = findChoice(unit, choiceId);

      if (!choice) {
        return 0;
      }

      const effectiveMax = calculateEffectiveMax(choice, modelCount);

      // Also consider mutual exclusivity for replacement patterns
      const option = findOptionForChoice(unit, choiceId);

      if (option?.pattern === 'replacement') {
        const otherChoicesTotal = option.choices
          .filter(c => c.id !== choiceId)
          .reduce((sum, c) => sum + (weaponCounts[c.id] || 0), 0);

        const maxAvailable = modelCount - otherChoicesTotal;

        return Math.min(effectiveMax, Math.max(0, maxAvailable));
      }

      return effectiveMax;
    },
    [unit, weaponCounts, modelCount]
  );

  // Validate current weapon counts
  const validate = useCallback((): string[] => {
    if (!unit || !listUnit) {
      return [];
    }

    return validateWeaponCounts(unit, listUnit);
  }, [unit, listUnit]);

  // Reset to default weapon counts
  const resetToDefaults = useCallback(() => {
    if (!unit) {
      return;
    }

    const defaults = calculateDefaultWeaponCounts(unit, modelCount);

    // Clear all existing counts first
    for (const choiceId of Object.keys(weaponCounts)) {
      if (!(choiceId in defaults)) {
        onCountChange(choiceId, 0);
      }
    }

    // Set default counts
    for (const [choiceId, count] of Object.entries(defaults)) {
      onCountChange(choiceId, count);
    }
  }, [unit, modelCount, weaponCounts, onCountChange]);

  return {
    loadoutOptions,
    setCount,
    adjustCount,
    isAtMaxLimit,
    isAtMinLimit,
    getEffectiveMax,
    validate,
    resetToDefaults,
  };
}
