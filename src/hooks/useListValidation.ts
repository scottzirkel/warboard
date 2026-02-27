'use client';

import { useMemo, useCallback } from 'react';
import type { ArmyData, CurrentList, ListUnit, Unit, ValidationError } from '@/types';
import { findUnitById } from '@/lib/armyDataUtils';

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
  validateWarlord: () => ValidationError[];
  validateColosseumFormat: () => ValidationError[];
  validateArmyRules: () => ValidationError[];
  validateLeaderAttachments: () => ValidationError[];
  validateMaxModels: () => ValidationError[];

  // Quick checks
  isListValid: boolean;
  canEnterPlayMode: boolean;
  totalPoints: number;
  pointsRemaining: number;
  unitIndicesWithErrors: Set<number>;
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
 * Check if a unit has elevated datasheet limits (Battleline or Dedicated Transport).
 * These units allow up to 6 per datasheet instead of the standard 3.
 */
function hasElevatedDatasheetLimit(unit: Unit): boolean {
  return unit.keywords.includes('Battleline') || unit.keywords.includes('Dedicated Transport');
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
    if (!armyData) return undefined;

    return findUnitById(armyData, unitId);
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
   * Validate that a Warlord is designated.
   *
   * Required for Colosseum and Strike Force formats.
   * Any Character (including Epic Heroes) can be Warlord.
   * Colosseum format separately bans Epic Heroes entirely.
   */
  const validateWarlord = useCallback((): ValidationError[] => {
    const requiresWarlord = currentList.format === 'colosseum' || currentList.format === 'strike-force';

    if (!requiresWarlord || !armyData || currentList.units.length === 0) {
      return [];
    }

    const hasDesignatedWarlord = currentList.units.some(lu => {
      if (!lu.isWarlord) return false;

      const unit = getUnitById(lu.unitId);
      return unit && isCharacter(unit);
    });

    if (!hasDesignatedWarlord) {
      return [{
        type: 'format',
        message: 'You must designate a Warlord (tap the crown icon on a Character)',
      }];
    }

    return [];
  }, [armyData, currentList.format, currentList.units, getUnitById]);

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

    let infantryNonCharacterCount = 0;

    for (let i = 0; i < currentList.units.length; i++) {
      const listUnit = currentList.units[i];
      const unit = getUnitById(listUnit.unitId);

      if (!unit) {
        continue;
      }

      // Check for Epic Heroes (Rule 2)
      if (isEpicHero(unit)) {
        errors.push({
          type: 'format',
          message: `${unit.name} is an Epic Hero and not allowed in Colosseum format`,
          unitIndex: i,
        });
      }

      // Check for heavy armor (Rule 4)
      const toughness = getToughness(unit);

      if (toughness >= 10) {
        errors.push({
          type: 'format',
          message: `${unit.name} has T${toughness} which exceeds the T10 limit for Colosseum format`,
          unitIndex: i,
        });
      }

      // Count Infantry non-Characters (Rule 3)
      if (isInfantry(unit) && !isCharacter(unit)) {
        infantryNonCharacterCount++;
      }
    }

    // Check Infantry requirement (Rule 3)
    if (infantryNonCharacterCount < 2 && currentList.units.length > 0) {
      errors.push({
        type: 'format',
        message: `Colosseum format requires at least 2 Infantry units that are not Characters (currently: ${infantryNonCharacterCount})`,
      });
    }

    // Check for duplicate datasheets (Rule 5) - Battleline units are exempt
    const datasheetCounts = new Map<string, { count: number; indices: number[] }>();

    for (let i = 0; i < currentList.units.length; i++) {
      const listUnit = currentList.units[i];
      const unit = getUnitById(listUnit.unitId);

      if (!unit) {
        continue;
      }

      // Battleline units are exempt from the duplicate restriction
      if (unit.keywords.includes('Battleline')) {
        continue;
      }

      const entry = datasheetCounts.get(listUnit.unitId) || { count: 0, indices: [] };
      entry.count++;
      entry.indices.push(i);
      datasheetCounts.set(listUnit.unitId, entry);
    }

    for (const [unitId, { count, indices }] of datasheetCounts.entries()) {
      if (count > 1) {
        const unit = getUnitById(unitId);

        for (const idx of indices) {
          errors.push({
            type: 'format',
            message: `${unit?.name || unitId} appears ${count} times — Colosseum format allows no duplicate datasheets (except Battleline)`,
            unitIndex: idx,
          });
        }
      }
    }

    return errors;
  }, [armyData, currentList.format, currentList.units, getUnitById]);

  /**
   * Validate 10th edition army construction rules.
   *
   * Rules:
   * 1. Max 3 of each datasheet (6 for Battleline / Dedicated Transport)
   * 2. Only 1 of each Epic Hero
   * 3. Max 3 enhancements per army, all must be different
   */
  const validateArmyRules = useCallback((): ValidationError[] => {
    if (!armyData) {
      return [];
    }

    const errors: ValidationError[] = [];

    // Rule 1: Datasheet limits (3 per datasheet, 6 for Battleline/Dedicated Transport)
    const datasheetCounts = new Map<string, { count: number; indices: number[] }>();

    for (let i = 0; i < currentList.units.length; i++) {
      const listUnit = currentList.units[i];
      const entry = datasheetCounts.get(listUnit.unitId) || { count: 0, indices: [] };
      entry.count++;
      entry.indices.push(i);
      datasheetCounts.set(listUnit.unitId, entry);
    }

    for (const [unitId, { count, indices }] of datasheetCounts.entries()) {
      const unit = getUnitById(unitId);

      if (!unit) {
        continue;
      }

      const limit = hasElevatedDatasheetLimit(unit) ? 6 : 3;

      if (count > limit) {
        for (const idx of indices) {
          errors.push({
            type: 'format',
            message: `${unit.name} appears ${count} times (max ${limit})`,
            unitIndex: idx,
          });
        }
      }
    }

    // Rule 2: Only 1 of each Epic Hero
    const epicHeroCounts = new Map<string, { count: number; indices: number[] }>();

    for (let i = 0; i < currentList.units.length; i++) {
      const listUnit = currentList.units[i];
      const unit = getUnitById(listUnit.unitId);

      if (!unit || !isEpicHero(unit)) {
        continue;
      }

      const entry = epicHeroCounts.get(listUnit.unitId) || { count: 0, indices: [] };
      entry.count++;
      entry.indices.push(i);
      epicHeroCounts.set(listUnit.unitId, entry);
    }

    for (const [unitId, { count, indices }] of epicHeroCounts.entries()) {
      if (count > 1) {
        const unit = getUnitById(unitId);

        for (const idx of indices) {
          errors.push({
            type: 'format',
            message: `${unit?.name || unitId} is an Epic Hero and can only be included once (found ${count})`,
            unitIndex: idx,
          });
        }
      }
    }

    // Rule 3: Max 3 enhancements, all different
    const enhancements: string[] = [];

    for (const listUnit of currentList.units) {
      if (listUnit.enhancement) {
        enhancements.push(listUnit.enhancement);
      }
    }

    if (enhancements.length > 3) {
      errors.push({
        type: 'format',
        message: `Army has ${enhancements.length} enhancements (max 3)`,
      });
    }

    const enhancementCounts = new Map<string, number>();

    for (const enhId of enhancements) {
      enhancementCounts.set(enhId, (enhancementCounts.get(enhId) || 0) + 1);
    }

    for (const [enhId, count] of enhancementCounts.entries()) {
      if (count > 1) {
        const enhName = detachmentEnhancements.find(e => e.id === enhId)?.name || enhId;
        errors.push({
          type: 'format',
          message: `Enhancement "${enhName}" is used ${count} times (each enhancement must be unique)`,
        });
      }
    }

    return errors;
  }, [armyData, currentList.units, getUnitById, detachmentEnhancements]);

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
   * Validate maxModels constraints for loadout options.
   *
   * Checks that no weapon choice exceeds its maxModels limit.
   */
  const validateMaxModels = useCallback((): ValidationError[] => {
    if (!armyData) {
      return [];
    }

    const errors: ValidationError[] = [];

    for (let i = 0; i < currentList.units.length; i++) {
      const listUnit = currentList.units[i];
      const unit = getUnitById(listUnit.unitId);

      if (!unit || !unit.loadoutOptions) {
        continue;
      }

      const weaponCounts = listUnit.weaponCounts || {};

      for (const option of unit.loadoutOptions) {
        for (const choice of option.choices) {
          if (choice.id === 'none') {
            continue;
          }

          if (choice.maxModels === undefined) {
            continue;
          }

          const count = weaponCounts[choice.id] || 0;

          if (count > choice.maxModels) {
            errors.push({
              type: 'loadout',
              message: `${unit.name}: ${choice.name} limited to ${choice.maxModels} model(s), but ${count} assigned`,
              unitIndex: i,
            });
          }
        }
      }
    }

    return errors;
  }, [armyData, currentList.units, getUnitById]);

  /**
   * Run all validations and return the complete result.
   */
  const validateList = useCallback((): ListValidationResult => {
    const pointsErrors = validatePoints();
    const warlordErrors = validateWarlord();
    const formatErrors = validateColosseumFormat();
    const armyRulesErrors = validateArmyRules();
    const leaderErrors = validateLeaderAttachments();
    const maxModelsErrors = validateMaxModels();

    const allErrors = [...pointsErrors, ...warlordErrors, ...formatErrors, ...armyRulesErrors, ...leaderErrors, ...maxModelsErrors];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: [],
    };
  }, [validatePoints, validateWarlord, validateColosseumFormat, validateArmyRules, validateLeaderAttachments, validateMaxModels]);

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

  /**
   * Get the set of unit indices that have validation errors.
   */
  const unitIndicesWithErrors = useMemo((): Set<number> => {
    const { errors } = validateList();
    const indices = new Set<number>();

    for (const error of errors) {
      if (error.unitIndex !== undefined) {
        indices.add(error.unitIndex);
      }
    }

    return indices;
  }, [validateList]);

  return {
    validateList,
    validatePoints,
    validateWarlord,
    validateColosseumFormat,
    validateArmyRules,
    validateLeaderAttachments,
    validateMaxModels,
    isListValid,
    canEnterPlayMode,
    totalPoints,
    pointsRemaining,
    unitIndicesWithErrors,
  };
}
