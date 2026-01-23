import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaderAttachment } from './useLeaderAttachment';
import type { ArmyData, ListUnit } from '@/types';

// Mock minimal army data with leader units
const mockArmyData: ArmyData = {
  faction: 'Test Faction',
  lastUpdated: '2026-01',
  units: [
    {
      id: 'bodyguard-unit',
      name: 'Bodyguard Unit',
      points: { '5': 100 },
      stats: { m: 6, t: 4, sv: '3+', w: 2, ld: '6+', oc: 2 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline'],
    },
    {
      id: 'leader-unit',
      name: 'Leader Character',
      points: { '1': 80 },
      stats: { m: 6, t: 5, sv: '2+', w: 5, ld: '6+', oc: 1 },
      invuln: '4+',
      weapons: [],
      abilities: [
        {
          id: 'leader',
          name: 'Leader',
          description: 'This model can be attached to a Bodyguard Unit.',
          eligibleUnits: ['bodyguard-unit'],
        },
      ],
      keywords: ['Infantry', 'Character'],
    },
    {
      id: 'another-bodyguard',
      name: 'Another Bodyguard',
      points: { '5': 120 },
      stats: { m: 6, t: 4, sv: '3+', w: 2, ld: '6+', oc: 2 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline'],
    },
    {
      id: 'another-leader',
      name: 'Another Leader',
      points: { '1': 90 },
      stats: { m: 6, t: 5, sv: '2+', w: 6, ld: '6+', oc: 1 },
      invuln: '4+',
      weapons: [],
      abilities: [
        {
          id: 'leader',
          name: 'Leader',
          description: 'This model can be attached to Bodyguard Unit or Another Bodyguard.',
          eligibleUnits: ['bodyguard-unit', 'another-bodyguard'],
        },
      ],
      keywords: ['Infantry', 'Character'],
    },
  ],
  detachments: {},
};

const createListUnit = (unitId: string, modelCount: number, attachedLeader: { unitIndex: number } | null = null): ListUnit => ({
  unitId,
  modelCount,
  enhancement: '',
  loadout: {},
  weaponCounts: {},
  currentWounds: null,
  leaderCurrentWounds: null,
  attachedLeader,
});

describe('useLeaderAttachment', () => {
  describe('isLeaderUnit', () => {
    it('returns true for units with Leader ability', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.isLeaderUnit(1)).toBe(true);
    });

    it('returns false for units without Leader ability', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.isLeaderUnit(0)).toBe(false);
    });

    it('returns false for invalid index', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.isLeaderUnit(99)).toBe(false);
    });
  });

  describe('getAvailableLeaders', () => {
    it('returns eligible unattached leaders for a unit', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
        createListUnit('another-leader', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const leaders = result.current.getAvailableLeaders(0);

      expect(leaders).toHaveLength(2);
      expect(leaders[0].unitIndex).toBe(1);
      expect(leaders[0].name).toBe('Leader Character');
      expect(leaders[1].unitIndex).toBe(2);
      expect(leaders[1].name).toBe('Another Leader');
    });

    it('excludes leaders already attached to other units', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
        createListUnit('another-bodyguard', 5, { unitIndex: 1 }), // leader-unit attached here
        createListUnit('another-leader', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const leaders = result.current.getAvailableLeaders(0);

      // leader-unit is attached to another-bodyguard, so only another-leader should be available
      expect(leaders).toHaveLength(1);
      expect(leaders[0].unitIndex).toBe(3);
      expect(leaders[0].name).toBe('Another Leader');
    });

    it('returns empty array for Character units', () => {
      const units: ListUnit[] = [
        createListUnit('leader-unit', 1),
        createListUnit('another-leader', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      // Trying to get leaders for a Character unit
      const leaders = result.current.getAvailableLeaders(0);

      expect(leaders).toHaveLength(0);
    });

    it('only returns leaders eligible for the specific unit', () => {
      const units: ListUnit[] = [
        createListUnit('another-bodyguard', 5),
        createListUnit('leader-unit', 1), // Only eligible for bodyguard-unit
        createListUnit('another-leader', 1), // Eligible for bodyguard-unit AND another-bodyguard
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      // another-bodyguard (index 0) can only have another-leader attached
      const leaders = result.current.getAvailableLeaders(0);

      expect(leaders).toHaveLength(1);
      expect(leaders[0].name).toBe('Another Leader');
    });
  });

  describe('canHaveLeaderAttached', () => {
    it('returns true for non-Character units with eligible leaders in list', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.canHaveLeaderAttached(0)).toBe(true);
    });

    it('returns false for Character units', () => {
      const units: ListUnit[] = [
        createListUnit('leader-unit', 1),
        createListUnit('another-leader', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.canHaveLeaderAttached(0)).toBe(false);
    });

    it('returns false when no eligible leaders in list', () => {
      const units: ListUnit[] = [
        createListUnit('another-bodyguard', 5),
        // No leaders that can attach to another-bodyguard except another-leader which isn't in list
        createListUnit('leader-unit', 1), // Only eligible for bodyguard-unit
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.canHaveLeaderAttached(0)).toBe(false);
    });
  });

  describe('getAttachedLeader', () => {
    it('returns the attached leader info', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 1 }),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const leader = result.current.getAttachedLeader(0);

      expect(leader).not.toBeNull();
      expect(leader?.unitIndex).toBe(1);
      expect(leader?.name).toBe('Leader Character');
    });

    it('returns null when no leader attached', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const leader = result.current.getAttachedLeader(0);

      expect(leader).toBeNull();
    });
  });

  describe('isUnitAttachedAsLeader', () => {
    it('returns true when unit is attached as a leader', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 1 }),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.isUnitAttachedAsLeader(1)).toBe(true);
    });

    it('returns false when unit is not attached as a leader', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      expect(result.current.isUnitAttachedAsLeader(1)).toBe(false);
    });
  });

  describe('getAttachedToUnit', () => {
    it('returns the unit info that the leader is attached to', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 1 }),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const attachedTo = result.current.getAttachedToUnit(1);

      expect(attachedTo).not.toBeNull();
      expect(attachedTo?.unitIndex).toBe(0);
      expect(attachedTo?.name).toBe('Bodyguard Unit');
    });

    it('returns null when leader is not attached', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const attachedTo = result.current.getAttachedToUnit(1);

      expect(attachedTo).toBeNull();
    });
  });

  describe('attachLeader', () => {
    it('calls onAttach callback with correct indices', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const attachResult = result.current.attachLeader(0, 1);

      expect(attachResult.success).toBe(true);
      expect(onAttach).toHaveBeenCalledWith(0, 1);
    });

    it('returns error when attaching to a Character unit', () => {
      const units: ListUnit[] = [
        createListUnit('leader-unit', 1),
        createListUnit('another-leader', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const attachResult = result.current.attachLeader(0, 1);

      expect(attachResult.success).toBe(false);
      expect(attachResult.error).toContain('Character');
      expect(onAttach).not.toHaveBeenCalled();
    });

    it('returns error when leader cannot attach to target unit', () => {
      const units: ListUnit[] = [
        createListUnit('another-bodyguard', 5),
        createListUnit('leader-unit', 1), // Only eligible for bodyguard-unit
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const attachResult = result.current.attachLeader(0, 1);

      expect(attachResult.success).toBe(false);
      expect(attachResult.error).toContain('cannot attach');
      expect(onAttach).not.toHaveBeenCalled();
    });

    it('returns error for invalid unit index', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const attachResult = result.current.attachLeader(99, 1);

      expect(attachResult.success).toBe(false);
      expect(attachResult.error).toBe('Invalid unit index');
      expect(onAttach).not.toHaveBeenCalled();
    });
  });

  describe('detachLeader', () => {
    it('calls onDetach callback', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 1 }),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      result.current.detachLeader(0);

      expect(onDetach).toHaveBeenCalledWith(0);
    });
  });

  describe('validateLeaderAttachments', () => {
    it('returns empty array for valid attachments', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 1 }),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const errors = result.current.validateLeaderAttachments();

      expect(errors).toHaveLength(0);
    });

    it('returns error for invalid leader index', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 99 }), // Invalid index
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const errors = result.current.validateLeaderAttachments();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('leader');
    });

    it('returns error when non-leader unit is attached', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 1 }), // Points to non-leader
        createListUnit('another-bodyguard', 5), // Not a leader
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const errors = result.current.validateLeaderAttachments();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('leader');
      expect(errors[0].message).toContain('does not have the Leader ability');
    });

    it('returns error when leader attached to ineligible unit', () => {
      // Manually create a situation where leader is attached to wrong unit type
      const units: ListUnit[] = [
        createListUnit('another-bodyguard', 5, { unitIndex: 1 }), // leader-unit cannot attach here
        createListUnit('leader-unit', 1), // Only eligible for bodyguard-unit
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const errors = result.current.validateLeaderAttachments();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('leader');
      expect(errors[0].message).toContain('cannot attach');
    });

    it('returns error when leader attached to multiple units', () => {
      // Same leader attached to two different units (shouldn't happen via UI, but data could be corrupt)
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5, { unitIndex: 2 }),
        createListUnit('another-bodyguard', 5, { unitIndex: 2 }),
        createListUnit('another-leader', 1), // Attached to both
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(mockArmyData, units, onAttach, onDetach)
      );

      const errors = result.current.validateLeaderAttachments();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('multiple units'))).toBe(true);
    });
  });

  describe('with null armyData', () => {
    it('handles null armyData gracefully', () => {
      const units: ListUnit[] = [
        createListUnit('bodyguard-unit', 5),
        createListUnit('leader-unit', 1),
      ];
      const onAttach = vi.fn();
      const onDetach = vi.fn();

      const { result } = renderHook(() =>
        useLeaderAttachment(null, units, onAttach, onDetach)
      );

      expect(result.current.isLeaderUnit(0)).toBe(false);
      expect(result.current.getAvailableLeaders(0)).toHaveLength(0);
      expect(result.current.canHaveLeaderAttached(0)).toBe(false);
    });
  });
});
