import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useListValidation } from './useListValidation';
import type { ArmyData, CurrentList, ListUnit } from '@/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockArmyData: ArmyData = {
  faction: 'Test Faction',
  lastUpdated: '2026-01',
  units: [
    {
      id: 'infantry-unit',
      name: 'Infantry Unit',
      points: { '5': 100, '10': 180 },
      stats: { m: 6, t: 4, sv: '3+', w: 1, ld: '6+', oc: 2 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline'],
    },
    {
      id: 'character-unit',
      name: 'Character Unit',
      points: { '1': 80 },
      stats: { m: 6, t: 5, sv: '2+', w: 5, ld: '6+', oc: 1 },
      invuln: '4+',
      weapons: [],
      abilities: [
        {
          id: 'leader',
          name: 'Leader',
          description: 'Can be attached to Infantry Unit.',
          eligibleUnits: ['infantry-unit'],
        },
      ],
      keywords: ['Infantry', 'Character'],
    },
    {
      id: 'epic-hero',
      name: 'Epic Hero',
      points: { '1': 150 },
      stats: { m: 6, t: 5, sv: '2+', w: 7, ld: '5+', oc: 1 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Character', 'Epic Hero'],
    },
    {
      id: 'heavy-armor',
      name: 'Heavy Tank',
      points: { '1': 200 },
      stats: { m: 10, t: 12, sv: '2+', w: 14, ld: '6+', oc: 5 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Vehicle'],
    },
    {
      id: 'another-infantry',
      name: 'Another Infantry',
      points: { '5': 90 },
      stats: { m: 6, t: 4, sv: '4+', w: 1, ld: '6+', oc: 2 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Infantry'],
    },
    {
      id: 'another-character',
      name: 'Another Character',
      points: { '1': 70 },
      stats: { m: 6, t: 4, sv: '3+', w: 4, ld: '6+', oc: 1 },
      invuln: '5+',
      weapons: [],
      abilities: [
        {
          id: 'leader',
          name: 'Leader',
          description: 'Can be attached to Infantry Unit.',
          eligibleUnits: ['infantry-unit'],
        },
      ],
      keywords: ['Infantry', 'Character'],
    },
  ],
  detachments: {
    'test-detachment': {
      name: 'Test Detachment',
      rules: [],
      stratagems: [],
      enhancements: [
        { id: 'enhancement-1', name: 'Enhancement 1', points: 20, description: 'Test enhancement' },
        { id: 'enhancement-2', name: 'Enhancement 2', points: 30, description: 'Test enhancement 2' },
      ],
    },
  },
};

const createListUnit = (
  unitId: string,
  modelCount: number,
  enhancement: string = '',
  attachedLeader: { unitIndex: number } | null = null
): ListUnit => ({
  unitId,
  modelCount,
  enhancement,
  loadout: {},
  weaponCounts: {},
  currentWounds: null,
  leaderCurrentWounds: null,
  attachedLeader,
});

const createList = (
  units: ListUnit[],
  format: 'standard' | 'colosseum' = 'standard',
  pointsLimit: number = 500,
  detachment: string = 'test-detachment'
): CurrentList => ({
  name: 'Test List',
  army: 'test',
  pointsLimit,
  format,
  detachment,
  units,
});

// ============================================================================
// Tests
// ============================================================================

describe('useListValidation', () => {
  describe('totalPoints', () => {
    it('calculates total points for units', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),  // 100 points
        createListUnit('character-unit', 1), // 80 points
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.totalPoints).toBe(180);
    });

    it('includes enhancement points', () => {
      const list = createList([
        createListUnit('character-unit', 1, 'enhancement-1'), // 80 + 20 = 100 points
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.totalPoints).toBe(100);
    });

    it('returns 0 when no army data', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
      ]);

      const { result } = renderHook(() => useListValidation(null, list));

      expect(result.current.totalPoints).toBe(0);
    });
  });

  describe('pointsRemaining', () => {
    it('calculates remaining points correctly', () => {
      const list = createList([
        createListUnit('infantry-unit', 5), // 100 points
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.pointsRemaining).toBe(400);
    });

    it('returns negative when over limit', () => {
      const list = createList([
        createListUnit('heavy-armor', 1), // 200 points
        createListUnit('heavy-armor', 1), // 200 points
        createListUnit('heavy-armor', 1), // 200 points - total 600
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.pointsRemaining).toBe(-100);
    });
  });

  describe('validatePoints', () => {
    it('returns empty array when under points limit', () => {
      const list = createList([
        createListUnit('infantry-unit', 5), // 100 points
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.validatePoints()).toHaveLength(0);
    });

    it('returns empty array when exactly at points limit', () => {
      const list = createList([
        createListUnit('infantry-unit', 5), // 100 points
      ], 'standard', 100);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.validatePoints()).toHaveLength(0);
    });

    it('returns error when over points limit', () => {
      const list = createList([
        createListUnit('heavy-armor', 1), // 200 points
        createListUnit('heavy-armor', 1), // 200 points
        createListUnit('heavy-armor', 1), // 200 points - total 600
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validatePoints();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('points');
      expect(errors[0].message).toContain('100'); // 100 over limit
    });
  });

  describe('validateColosseumFormat', () => {
    it('returns empty array for standard format', () => {
      const list = createList([
        createListUnit('epic-hero', 1), // Would be invalid in colosseum
      ], 'standard');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.validateColosseumFormat()).toHaveLength(0);
    });

    it('returns error for Epic Hero in colosseum', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
        createListUnit('another-infantry', 5),
        createListUnit('character-unit', 1), // Valid warlord
        createListUnit('epic-hero', 1), // Invalid
      ], 'colosseum');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateColosseumFormat();
      expect(errors.some(e => e.message.includes('Epic Hero'))).toBe(true);
    });

    it('returns error for T10+ units in colosseum', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
        createListUnit('another-infantry', 5),
        createListUnit('character-unit', 1),
        createListUnit('heavy-armor', 1), // T12, invalid
      ], 'colosseum');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateColosseumFormat();
      expect(errors.some(e => e.message.includes('T12'))).toBe(true);
    });

    it('returns error when no warlord (Character)', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
        createListUnit('another-infantry', 5),
        // No Character
      ], 'colosseum');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateColosseumFormat();
      expect(errors.some(e => e.message.includes('Warlord') || e.message.includes('Character'))).toBe(true);
    });

    it('returns error when not enough Infantry non-Characters', () => {
      const list = createList([
        createListUnit('infantry-unit', 5), // Only 1 Infantry non-Character
        createListUnit('character-unit', 1),
      ], 'colosseum');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateColosseumFormat();
      expect(errors.some(e => e.message.includes('Infantry') && e.message.includes('2'))).toBe(true);
    });

    it('returns empty array for valid colosseum list', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
        createListUnit('another-infantry', 5),
        createListUnit('character-unit', 1),
      ], 'colosseum');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.validateColosseumFormat()).toHaveLength(0);
    });

    it('does not count Characters as Infantry for Infantry requirement', () => {
      // Character with Infantry keyword should not count toward Infantry requirement
      const list = createList([
        createListUnit('infantry-unit', 5), // 1 Infantry non-Character
        createListUnit('character-unit', 1), // Has Infantry keyword but is Character
        createListUnit('another-character', 1), // Another Character with Infantry keyword
      ], 'colosseum');

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateColosseumFormat();
      // Should still fail because we only have 1 Infantry non-Character
      expect(errors.some(e => e.message.includes('Infantry') && e.message.includes('1'))).toBe(true);
    });
  });

  describe('validateLeaderAttachments', () => {
    it('returns empty array for valid attachments', () => {
      const list = createList([
        createListUnit('infantry-unit', 5, '', { unitIndex: 1 }),
        createListUnit('character-unit', 1),
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.validateLeaderAttachments()).toHaveLength(0);
    });

    it('returns empty array when no attachments', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
        createListUnit('character-unit', 1),
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.validateLeaderAttachments()).toHaveLength(0);
    });

    it('returns error for invalid leader index', () => {
      const list = createList([
        createListUnit('infantry-unit', 5, '', { unitIndex: 99 }), // Invalid index
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateLeaderAttachments();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('leader');
    });

    it('returns error when non-leader unit is attached', () => {
      const list = createList([
        createListUnit('infantry-unit', 5, '', { unitIndex: 1 }), // Points to non-leader
        createListUnit('another-infantry', 5), // Not a leader
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateLeaderAttachments();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('does not have the Leader ability');
    });

    it('returns error when leader attached to ineligible unit', () => {
      const list = createList([
        createListUnit('another-infantry', 5, '', { unitIndex: 1 }), // character-unit cannot attach here
        createListUnit('character-unit', 1), // Only eligible for infantry-unit
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateLeaderAttachments();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('cannot attach');
    });

    it('returns error when leader attached to multiple units', () => {
      const list = createList([
        createListUnit('infantry-unit', 5, '', { unitIndex: 2 }),
        createListUnit('infantry-unit', 5, '', { unitIndex: 2 }), // Same leader
        createListUnit('character-unit', 1),
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const errors = result.current.validateLeaderAttachments();
      expect(errors.some(e => e.message.includes('multiple units'))).toBe(true);
    });
  });

  describe('validateList', () => {
    it('returns isValid true for valid list', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
        createListUnit('character-unit', 1),
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const validation = result.current.validateList();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('collects all errors from all validators', () => {
      const list = createList([
        createListUnit('heavy-armor', 1), // Over points, has T12
        createListUnit('heavy-armor', 1),
        createListUnit('heavy-armor', 1), // Total 600 points
        createListUnit('epic-hero', 1), // Epic Hero not allowed
        createListUnit('infantry-unit', 5, '', { unitIndex: 99 }), // Invalid leader
      ], 'colosseum', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      const validation = result.current.validateList();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      // Should have points, format, and leader errors
      expect(validation.errors.some(e => e.type === 'points')).toBe(true);
      expect(validation.errors.some(e => e.type === 'format')).toBe(true);
      expect(validation.errors.some(e => e.type === 'leader')).toBe(true);
    });
  });

  describe('isListValid', () => {
    it('returns true for valid list', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.isListValid).toBe(true);
    });

    it('returns false for invalid list', () => {
      const list = createList([
        createListUnit('heavy-armor', 1),
        createListUnit('heavy-armor', 1),
        createListUnit('heavy-armor', 1), // 600 points, over limit
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.isListValid).toBe(false);
    });
  });

  describe('canEnterPlayMode', () => {
    it('returns false for empty list', () => {
      const list = createList([], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.canEnterPlayMode).toBe(false);
    });

    it('returns true for valid non-empty list', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.canEnterPlayMode).toBe(true);
    });

    it('returns false for invalid non-empty list', () => {
      const list = createList([
        createListUnit('heavy-armor', 1),
        createListUnit('heavy-armor', 1),
        createListUnit('heavy-armor', 1), // 600 points
      ], 'standard', 500);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.canEnterPlayMode).toBe(false);
    });
  });

  describe('with null armyData', () => {
    it('handles null armyData gracefully', () => {
      const list = createList([
        createListUnit('infantry-unit', 5),
      ]);

      const { result } = renderHook(() => useListValidation(null, list));

      expect(result.current.totalPoints).toBe(0);
      expect(result.current.isListValid).toBe(true); // No errors when no data
      expect(result.current.validatePoints()).toHaveLength(0);
      expect(result.current.validateColosseumFormat()).toHaveLength(0);
      expect(result.current.validateLeaderAttachments()).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles unknown unit IDs gracefully', () => {
      const list = createList([
        createListUnit('unknown-unit', 5),
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.totalPoints).toBe(0);
    });

    it('handles missing model count in points table', () => {
      const list = createList([
        createListUnit('infantry-unit', 99), // No points for 99 models
      ]);

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      expect(result.current.totalPoints).toBe(0);
    });

    it('handles missing detachment gracefully', () => {
      const list = createList(
        [createListUnit('character-unit', 1, 'enhancement-1')],
        'standard',
        500,
        'non-existent-detachment'
      );

      const { result } = renderHook(() => useListValidation(mockArmyData, list));

      // Enhancement points should not be added since detachment doesn't exist
      expect(result.current.totalPoints).toBe(80); // Just base points
    });
  });
});
