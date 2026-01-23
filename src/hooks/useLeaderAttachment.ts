'use client';

import { useMemo, useCallback } from 'react';
import type { ArmyData, ListUnit, AvailableLeader, Unit, Ability, ValidationError } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface LeaderAttachmentResult {
  success: boolean;
  error?: string;
}

export interface UseLeaderAttachmentReturn {
  // Queries
  getAvailableLeaders: (unitIndex: number) => AvailableLeader[];
  getAttachedLeader: (unitIndex: number) => AvailableLeader | null;
  getAttachedToUnit: (leaderIndex: number) => { unitIndex: number; unitId: string; name: string } | null;
  isLeaderUnit: (unitIndex: number) => boolean;
  isUnitAttachedAsLeader: (unitIndex: number) => boolean;
  canHaveLeaderAttached: (unitIndex: number) => boolean;

  // Actions
  attachLeader: (unitIndex: number, leaderIndex: number) => LeaderAttachmentResult;
  detachLeader: (unitIndex: number) => void;

  // Validation
  validateLeaderAttachments: () => ValidationError[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the Leader ability on a unit.
 */
function getLeaderAbility(unit: Unit): Ability | undefined {
  return unit.abilities.find(a => a.id === 'leader' || a.name === 'Leader');
}

/**
 * Check if a unit has the Leader ability.
 */
function hasLeaderAbility(unit: Unit): boolean {
  return !!getLeaderAbility(unit);
}

/**
 * Get eligible unit IDs from a leader's ability.
 */
function getEligibleUnitIds(unit: Unit): string[] {
  const leaderAbility = getLeaderAbility(unit);

  return leaderAbility?.eligibleUnits || [];
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing leader attachment state and operations.
 *
 * This hook provides functions to:
 * - Find available leaders for a unit
 * - Attach/detach leaders from units
 * - Validate leader attachment rules
 *
 * @param armyData - The loaded faction data
 * @param units - The current list of units
 * @param onAttach - Callback when attaching a leader
 * @param onDetach - Callback when detaching a leader
 *
 * @example
 * ```tsx
 * const { getAvailableLeaders, attachLeader, detachLeader } = useLeaderAttachment(
 *   armyData,
 *   currentList.units,
 *   (unitIndex, leaderIndex) => store.attachLeader(unitIndex, leaderIndex),
 *   (unitIndex) => store.detachLeader(unitIndex)
 * );
 *
 * const leaders = getAvailableLeaders(0);
 * ```
 */
export function useLeaderAttachment(
  armyData: ArmyData | null,
  units: ListUnit[],
  onAttach: (unitIndex: number, leaderIndex: number) => void,
  onDetach: (unitIndex: number) => void
): UseLeaderAttachmentReturn {

  /**
   * Get the unit definition from army data by ID.
   */
  const getUnitById = useCallback((unitId: string): Unit | undefined => {
    return armyData?.units.find(u => u.id === unitId);
  }, [armyData]);

  /**
   * Check if a unit at the given index has the Leader ability.
   */
  const isLeaderUnit = useCallback((unitIndex: number): boolean => {
    const listUnit = units[unitIndex];

    if (!listUnit) {
      return false;
    }

    const unit = getUnitById(listUnit.unitId);

    if (!unit) {
      return false;
    }

    return hasLeaderAbility(unit);
  }, [units, getUnitById]);

  /**
   * Check if a unit is currently attached as a leader to another unit.
   */
  const isUnitAttachedAsLeader = useCallback((unitIndex: number): boolean => {
    return units.some(unit => unit.attachedLeader?.unitIndex === unitIndex);
  }, [units]);

  /**
   * Get the unit this leader is attached to, if any.
   */
  const getAttachedToUnit = useCallback((leaderIndex: number): { unitIndex: number; unitId: string; name: string } | null => {
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];

      if (unit.attachedLeader?.unitIndex === leaderIndex) {
        const unitDef = getUnitById(unit.unitId);

        return {
          unitIndex: i,
          unitId: unit.unitId,
          name: unitDef?.name || unit.unitId,
        };
      }
    }

    return null;
  }, [units, getUnitById]);

  /**
   * Check if a unit can have a leader attached to it.
   * A unit can have a leader if:
   * - It is not a Character (leader) itself
   * - There is at least one leader in the list that can attach to this unit
   */
  const canHaveLeaderAttached = useCallback((unitIndex: number): boolean => {
    const listUnit = units[unitIndex];

    if (!listUnit) {
      return false;
    }

    const unit = getUnitById(listUnit.unitId);

    if (!unit) {
      return false;
    }

    // Characters cannot have leaders attached to them
    if (unit.keywords.includes('Character')) {
      return false;
    }

    // Check if any leader in the list can attach to this unit
    for (let i = 0; i < units.length; i++) {
      if (i === unitIndex) {
        continue;
      }

      const potentialLeader = units[i];
      const leaderUnit = getUnitById(potentialLeader.unitId);

      if (!leaderUnit) {
        continue;
      }

      const eligibleUnits = getEligibleUnitIds(leaderUnit);

      if (eligibleUnits.includes(listUnit.unitId)) {
        return true;
      }
    }

    return false;
  }, [units, getUnitById]);

  /**
   * Get available (unattached and eligible) leaders for a specific unit.
   */
  const getAvailableLeaders = useCallback((unitIndex: number): AvailableLeader[] => {
    const listUnit = units[unitIndex];

    if (!listUnit) {
      return [];
    }

    const unit = getUnitById(listUnit.unitId);

    if (!unit) {
      return [];
    }

    // Characters cannot have leaders attached to them
    if (unit.keywords.includes('Character')) {
      return [];
    }

    const availableLeaders: AvailableLeader[] = [];

    for (let i = 0; i < units.length; i++) {
      // Skip the unit itself
      if (i === unitIndex) {
        continue;
      }

      const potentialLeader = units[i];
      const leaderUnit = getUnitById(potentialLeader.unitId);

      if (!leaderUnit) {
        continue;
      }

      // Check if this unit has the Leader ability
      if (!hasLeaderAbility(leaderUnit)) {
        continue;
      }

      // Check if this leader can attach to the target unit
      const eligibleUnits = getEligibleUnitIds(leaderUnit);

      if (!eligibleUnits.includes(listUnit.unitId)) {
        continue;
      }

      // Check if this leader is already attached to another unit
      const isAlreadyAttached = units.some(
        (u, idx) => idx !== unitIndex && u.attachedLeader?.unitIndex === i
      );

      if (isAlreadyAttached) {
        continue;
      }

      availableLeaders.push({
        unitIndex: i,
        unitId: potentialLeader.unitId,
        name: leaderUnit.name,
        enhancement: potentialLeader.enhancement,
      });
    }

    return availableLeaders;
  }, [units, getUnitById]);

  /**
   * Get the currently attached leader for a unit.
   */
  const getAttachedLeader = useCallback((unitIndex: number): AvailableLeader | null => {
    const listUnit = units[unitIndex];

    if (!listUnit?.attachedLeader) {
      return null;
    }

    const leaderIndex = listUnit.attachedLeader.unitIndex;
    const leaderListUnit = units[leaderIndex];

    if (!leaderListUnit) {
      return null;
    }

    const leaderUnit = getUnitById(leaderListUnit.unitId);

    if (!leaderUnit) {
      return null;
    }

    return {
      unitIndex: leaderIndex,
      unitId: leaderListUnit.unitId,
      name: leaderUnit.name,
      enhancement: leaderListUnit.enhancement,
    };
  }, [units, getUnitById]);

  /**
   * Attach a leader to a unit with validation.
   */
  const attachLeader = useCallback((unitIndex: number, leaderIndex: number): LeaderAttachmentResult => {
    // Validate that both units exist
    const targetUnit = units[unitIndex];
    const leaderListUnit = units[leaderIndex];

    if (!targetUnit || !leaderListUnit) {
      return { success: false, error: 'Invalid unit index' };
    }

    // Validate unit definitions exist
    const targetUnitDef = getUnitById(targetUnit.unitId);
    const leaderUnitDef = getUnitById(leaderListUnit.unitId);

    if (!targetUnitDef || !leaderUnitDef) {
      return { success: false, error: 'Unit definition not found' };
    }

    // Validate target is not a Character
    if (targetUnitDef.keywords.includes('Character')) {
      return { success: false, error: 'Cannot attach a leader to a Character unit' };
    }

    // Validate leader has Leader ability
    if (!hasLeaderAbility(leaderUnitDef)) {
      return { success: false, error: 'Selected unit does not have the Leader ability' };
    }

    // Validate leader can attach to target unit
    const eligibleUnits = getEligibleUnitIds(leaderUnitDef);

    if (!eligibleUnits.includes(targetUnit.unitId)) {
      return { success: false, error: `${leaderUnitDef.name} cannot attach to ${targetUnitDef.name}` };
    }

    // Validate target unit doesn't already have a different leader
    if (targetUnit.attachedLeader && targetUnit.attachedLeader.unitIndex !== leaderIndex) {
      return { success: false, error: 'This unit already has a leader attached' };
    }

    // Validate leader isn't already attached to a different unit
    const currentAttachment = getAttachedToUnit(leaderIndex);

    if (currentAttachment && currentAttachment.unitIndex !== unitIndex) {
      // The leader is attached elsewhere, but we'll allow detaching and reattaching
      // The onAttach callback should handle detaching first
    }

    // Perform the attachment
    onAttach(unitIndex, leaderIndex);

    return { success: true };
  }, [units, getUnitById, getAttachedToUnit, onAttach]);

  /**
   * Detach the leader from a unit.
   */
  const detachLeader = useCallback((unitIndex: number): void => {
    onDetach(unitIndex);
  }, [onDetach]);

  /**
   * Validate all leader attachments in the current list.
   */
  const validateLeaderAttachments = useMemo((): () => ValidationError[] => {
    return () => {
      const errors: ValidationError[] = [];

      // Track which leaders are attached where
      const leaderAttachments = new Map<number, number[]>();

      for (let i = 0; i < units.length; i++) {
        const unit = units[i];

        if (!unit.attachedLeader) {
          continue;
        }

        const leaderIndex = unit.attachedLeader.unitIndex;

        // Check if leader index is valid
        if (leaderIndex < 0 || leaderIndex >= units.length) {
          errors.push({
            type: 'leader',
            message: `Unit at index ${i} has invalid leader attachment`,
          });

          continue;
        }

        // Track this attachment
        const attachments = leaderAttachments.get(leaderIndex) || [];
        attachments.push(i);
        leaderAttachments.set(leaderIndex, attachments);

        // Validate the attachment
        const leaderListUnit = units[leaderIndex];
        const leaderUnit = getUnitById(leaderListUnit.unitId);

        if (!leaderUnit) {
          errors.push({
            type: 'leader',
            message: `Leader at index ${leaderIndex} not found in army data`,
          });

          continue;
        }

        // Check leader has Leader ability
        if (!hasLeaderAbility(leaderUnit)) {
          const unitDef = getUnitById(unit.unitId);
          errors.push({
            type: 'leader',
            message: `${leaderUnit.name} does not have the Leader ability but is attached to ${unitDef?.name || 'a unit'}`,
          });

          continue;
        }

        // Check leader can attach to this unit
        const eligibleUnits = getEligibleUnitIds(leaderUnit);

        if (!eligibleUnits.includes(unit.unitId)) {
          const unitDef = getUnitById(unit.unitId);
          errors.push({
            type: 'leader',
            message: `${leaderUnit.name} cannot attach to ${unitDef?.name || unit.unitId}`,
          });
        }
      }

      // Check for leaders attached to multiple units
      for (const [leaderIndex, attachedTo] of leaderAttachments.entries()) {
        if (attachedTo.length > 1) {
          const leaderListUnit = units[leaderIndex];
          const leaderUnit = getUnitById(leaderListUnit.unitId);
          errors.push({
            type: 'leader',
            message: `${leaderUnit?.name || 'Leader'} is attached to multiple units (${attachedTo.length})`,
          });
        }
      }

      return errors;
    };
  }, [units, getUnitById]);

  return {
    getAvailableLeaders,
    getAttachedLeader,
    getAttachedToUnit,
    isLeaderUnit,
    isUnitAttachedAsLeader,
    canHaveLeaderAttached,
    attachLeader,
    detachLeader,
    validateLeaderAttachments,
  };
}
