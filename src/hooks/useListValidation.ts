'use client';

import { useMemo, useCallback } from 'react';
import type { ArmyData, CurrentList, ListUnit, Unit, ValidationError } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface ListValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface UseListValidationReturn {
  // Main validation
  validateList: () => ListValidationResult;

  // Individual validators
  validatePoints: () => ValidationError[];
  validateColosseumFormat: () => ValidationError[];
  validateLeaderAttachments: () => ValidationError[];

  // Quick checks
  isListValid: boolean;
  canEnterPlayMode: boolean;
  totalPoints: number;
  pointsRemaining: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a unit is an Epic Hero (named character).
 * Epic Heroes typically have the "Epic Hero" keyword.
 */
function isEpicHero(unit: Unit): boolean {
  return unit.keywords.includes('Epic Hero');
}

/**
 * Check if a unit is a Character.
 */
function isCharacter(unit: Unit): boolean {
  return unit.keywords.includes('Character');
}

/**
 * Check if a unit is Infantry.
 */
function isInfantry(unit: Unit): boolean {
  return unit.keywords.includes('Infantry');
}

/**
 * Get the toughness value from a unit.
 */
function getToughness(unit: Unit): number {
  return unit.stats.t;
}

/**
 * Calculate points for a single list unit.
 */
function calculateUnitPoints(
  listUnit: ListUnit,
  unit: Unit,
  detachmentEnhancements: { id: string; points: number }[]
): number {
  const modelCountKey = String(listUnit.modelCount);
  let points = unit.points[modelCountKey] || 0;

  // Add enhancement points
  if (listUnit.enhancement) {
    const enhancement = detachmentEnhancements.find(e => e.id === listUnit.enhancement);

    if (enhancement) {
      points += enhancement.points;
    }
  }

  return points;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for validating army lists against game rules.
 *
 * This hook provides comprehensive validation for:
 * - Points limits
 * - Colosseum format rules (if selected)
 * - Leader attachment rules
 *
 * @param armyData - The loaded faction data
 * @param currentList - The current army list
 *
 * @example
 * ```tsx
 * const { validateList, isListValid, canEnterPlayMode } = useListValidation(
 *   armyData,
 *   currentList
 * );
 *
 * if (!canEnterPlayMode) {
 *   const { errors } = validateList();
 *   // Display errors to user
 * }
 * ```
 */
export function useListValidation(
  armyData: ArmyData | null,
  currentList: CurrentList
): UseListValidationReturn {

  /**
   * Get the unit definition from army data by ID.
   */
  const getUnitById = useCallback((unitId: string): Unit | undefined => {
    return armyData?.units.find(u => u.id === unitId);
  }, [armyData]);

  /**
   * Get detachment enhancements.
   */
  const detachmentEnhancements = useMemo(() => {
    if (!armyData || !currentList.detachment) {
      return [];
    }

    const detachment = armyData.detachments[currentList.detachment];

    return detachment?.enhancements || [];
  }, [armyData, currentList.detachment]);

  /**
   * Calculate total points for the current list.
   */
  const totalPoints = useMemo((): number => {
    if (!armyData) {
      return 0;
    }

    let total = 0;

    for (const listUnit of currentList.units) {
      const unit = getUnitById(listUnit.unitId);

      if (!unit) {
        continue;
      }

      total += calculateUnitPoints(listUnit, unit, detachmentEnhancements);
    }

    return total;
  }, [armyData, currentList.units, getUnitById, detachmentEnhancements]);

  /**
   * Calculate remaining points.
   */
  const pointsRemaining = useMemo((): number => {
    return currentList.pointsLimit - totalPoints;
  }, [currentList.pointsLimit, totalPoints]);

  /**
   * Validate points limits.
   */
  const validatePoints = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (totalPoints > currentList.pointsLimit) {
      errors.push({
        type: 'points',
        message: `List exceeds points limit by ${totalPoints - currentList.pointsLimit} points`,
      });
    }

    return errors;
  }, [totalPoints, currentList.pointsLimit]);

  /**
   * Validate Colosseum format rules.
   *
   * Rules:
   * 1. Must include at least one Character (non-Epic Hero) as Warlord
   * 2. No Epic Heroes allowed
   * 3. Must include 2+ Infantry units that are NOT Characters
   * 4. No units with T10+ allowed
   */
  const validateColosseumFormat = useCallback((): ValidationError[] => {
    if (currentList.format !== 'colosseum') {
      return [];
    }

    if (!armyData) {
      return [];
    }

    const errors: ValidationError[] = [];

    let hasWarlord = false;
    let infantryNonCharacterCount = 0;

    for (const listUnit of currentList.units) {
      const unit = getUnitById(listUnit.unitId);

      if (!unit) {
        continue;
      }

      // Check for Epic Heroes (Rule 2)
      if (isEpicHero(unit)) {
        errors.push({
          type: 'format',
          message: `${unit.name} is an Epic Hero and not allowed in Colosseum format`,
        });
      }

      // Check for heavy armor (Rule 4)
      const toughness = getToughness(unit);

      if (toughness >= 10) {
        errors.push({
          type: 'format',
          message: `${unit.name} has T${toughness} which exceeds the T10 limit for Colosseum format`,
        });
      }

      // Track Warlord eligibility (Rule 1)
      if (isCharacter(unit) && !isEpicHero(unit)) {
        hasWarlord = true;
      }

      // Count Infantry non-Characters (Rule 3)
      if (isInfantry(unit) && !isCharacter(unit)) {
        infantryNonCharacterCount++;
      }
    }

    // Check Warlord requirement (Rule 1)
    if (!hasWarlord && currentList.units.length > 0) {
      errors.push({
        type: 'format',
        message: 'Colosseum format requires at least one Character (non-Epic Hero) as Warlord',
      });
    }

    // Check Infantry requirement (Rule 3)
    if (infantryNonCharacterCount < 2 && currentList.units.length > 0) {
      errors.push({
        type: 'format',
        message: `Colosseum format requires at least 2 Infantry units that are not Characters (currently: ${infantryNonCharacterCount})`,
      });
    }

    return errors;
  }, [armyData, currentList.format, currentList.units, getUnitById]);

  /**
   * Validate leader attachments.
   *
   * Rules:
   * 1. Leader can only attach to one unit
   * 2. Unit can only have one leader
   * 3. Leader must be eligible to attach to the unit
   */
  const validateLeaderAttachments = useCallback((): ValidationError[] => {
    if (!armyData) {
      return [];
    }

    const errors: ValidationError[] = [];

    // Track which leaders are attached where
    const leaderAttachments = new Map<number, number[]>();

    for (let i = 0; i < currentList.units.length; i++) {
      const listUnit = currentList.units[i];

      if (!listUnit.attachedLeader) {
        continue;
      }

      const leaderIndex = listUnit.attachedLeader.unitIndex;

      // Check if leader index is valid
      if (leaderIndex < 0 || leaderIndex >= currentList.units.length) {
        errors.push({
          type: 'leader',
          message: `Unit has invalid leader attachment (index ${leaderIndex} out of range)`,
        });

        continue;
      }

      // Track this attachment
      const attachments = leaderAttachments.get(leaderIndex) || [];
      attachments.push(i);
      leaderAttachments.set(leaderIndex, attachments);

      // Validate the attachment is valid
      const leaderListUnit = currentList.units[leaderIndex];
      const leaderUnit = getUnitById(leaderListUnit.unitId);
      const targetUnit = getUnitById(listUnit.unitId);

      if (!leaderUnit) {
        errors.push({
          type: 'leader',
          message: `Leader unit not found in army data`,
        });

        continue;
      }

      if (!targetUnit) {
        errors.push({
          type: 'leader',
          message: `Target unit not found in army data`,
        });

        continue;
      }

      // Check leader has Leader ability
      const leaderAbility = leaderUnit.abilities.find(a => a.id === 'leader' || a.name === 'Leader');

      if (!leaderAbility) {
        errors.push({
          type: 'leader',
          message: `${leaderUnit.name} does not have the Leader ability but is attached to ${targetUnit.name}`,
        });

        continue;
      }

      // Check leader can attach to this unit
      const eligibleUnits = leaderAbility.eligibleUnits || [];

      if (!eligibleUnits.includes(listUnit.unitId)) {
        errors.push({
          type: 'leader',
          message: `${leaderUnit.name} cannot attach to ${targetUnit.name}`,
        });
      }
    }

    // Check for leaders attached to multiple units
    for (const [leaderIndex, attachedTo] of leaderAttachments.entries()) {
      if (attachedTo.length > 1) {
        const leaderListUnit = currentList.units[leaderIndex];
        const leaderUnit = getUnitById(leaderListUnit.unitId);
        errors.push({
          type: 'leader',
          message: `${leaderUnit?.name || 'Leader'} is attached to multiple units (${attachedTo.length})`,
        });
      }
    }

    return errors;
  }, [armyData, currentList.units, getUnitById]);

  /**
   * Run all validations and return the complete result.
   */
  const validateList = useCallback((): ListValidationResult => {
    const pointsErrors = validatePoints();
    const formatErrors = validateColosseumFormat();
    const leaderErrors = validateLeaderAttachments();

    const allErrors = [...pointsErrors, ...formatErrors, ...leaderErrors];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: [], // Can be used for non-blocking issues in the future
    };
  }, [validatePoints, validateColosseumFormat, validateLeaderAttachments]);

  /**
   * Quick check if the list is valid.
   */
  const isListValid = useMemo((): boolean => {
    return validateList().isValid;
  }, [validateList]);

  /**
   * Check if the list can enter Play Mode.
   * Currently the same as isListValid, but can be extended.
   */
  const canEnterPlayMode = useMemo((): boolean => {
    // Need at least one unit to enter play mode
    if (currentList.units.length === 0) {
      return false;
    }

    return isListValid;
  }, [isListValid, currentList.units.length]);

  return {
    validateList,
    validatePoints,
    validateColosseumFormat,
    validateLeaderAttachments,
    isListValid,
    canEnterPlayMode,
    totalPoints,
    pointsRemaining,
  };
}
