import { describe, it, expect, beforeEach } from 'vitest';
import { useArmyStore } from './armyStore';
import type { ArmyData, CurrentList, ListUnit } from '@/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockArmyData: ArmyData = {
  faction: 'Test Faction',
  lastUpdated: '2026-01',
  units: [
    {
      id: 'custodian-guard',
      name: 'Custodian Guard',
      points: { '4': 150, '5': 190 },
      stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [
        {
          id: 'guardian-spear-melee',
          name: 'Guardian Spear',
          type: 'melee',
          stats: { a: 5, ws: '2+', s: 7, ap: -2, d: 2 },
          abilities: [],
          loadoutGroup: 'spears',
        },
        {
          id: 'sentinel-blade',
          name: 'Sentinel Blade',
          type: 'melee',
          stats: { a: 5, ws: '2+', s: 6, ap: -2, d: 1 },
          abilities: [],
          loadoutGroup: 'blades',
          modifiers: [
            { stat: 'w', operation: 'add', value: 1, scope: 'model', source: 'Praesidium Shield' },
          ],
        },
      ],
      loadoutOptions: [
        {
          id: 'main-weapon',
          name: 'Weapon',
          type: 'choice',
          pattern: 'replacement',
          choices: [
            { id: 'spears', name: 'Guardian Spears', default: true },
            { id: 'blades', name: 'Sentinel Blades + Shield' },
          ],
        },
        {
          id: 'vexilla-option',
          name: 'Vexilla',
          type: 'optional',
          pattern: 'addition',
          choices: [
            { id: 'none', name: 'None', default: true },
            { id: 'vexilla', name: 'Vexilla', maxModels: 1 },
          ],
        },
      ],
      abilities: [],
      keywords: ['Infantry', 'Battleline', 'Imperium', 'Adeptus Custodes'],
    },
    {
      id: 'shield-captain',
      name: 'Shield-Captain',
      points: { '1': 100 },
      stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [
        {
          id: 'captain-spear',
          name: 'Guardian Spear',
          type: 'melee',
          stats: { a: 6, ws: '2+', s: 7, ap: -2, d: 2 },
          abilities: [],
          loadoutGroup: 'captain-spears',
        },
      ],
      loadoutOptions: [
        {
          id: 'captain-weapon',
          name: 'Weapon',
          type: 'choice',
          pattern: 'replacement',
          choices: [
            { id: 'captain-spears', name: 'Guardian Spear', default: true },
            { id: 'captain-axe', name: 'Castellan Axe' },
          ],
        },
      ],
      abilities: [
        {
          id: 'leader',
          name: 'Leader',
          description: 'Can be attached to Custodian Guard.',
          eligibleUnits: ['custodian-guard'],
        },
      ],
      keywords: ['Infantry', 'Character', 'Imperium', 'Adeptus Custodes'],
    },
    {
      id: 'allarus-custodians',
      name: 'Allarus Custodians',
      points: { '2': 130, '3': 195 },
      stats: { m: 5, t: 7, sv: '2+', w: 4, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Terminator', 'Imperium', 'Adeptus Custodes'],
    },
  ],
  detachments: {
    'shield-host': {
      name: 'Shield Host',
      rules: [],
      stratagems: [],
      enhancements: [
        {
          id: 'auric-mantle',
          name: 'Auric Mantle',
          points: 15,
          description: '+2 Wounds',
          modifiers: [{ stat: 'w', operation: 'add', value: 2, scope: 'model' }],
        },
        {
          id: 'ceaseless-hunter',
          name: 'Ceaseless Hunter',
          points: 20,
          description: '+2 Movement',
          modifiers: [{ stat: 'm', operation: 'add', value: 2, scope: 'model' }],
        },
      ],
    },
  },
};

// ============================================================================
// Helpers
// ============================================================================

function createListUnit(
  unitId: string,
  modelCount: number,
  overrides: Partial<ListUnit> = {}
): ListUnit {
  return {
    unitId,
    modelCount,
    enhancement: '',
    loadout: {},
    weaponCounts: {},
    currentWounds: null,
    leaderCurrentWounds: null,
    attachedLeader: null,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('armyStore', () => {
  beforeEach(() => {
    // Reset the store between tests
    useArmyStore.setState({
      armyData: null,
      currentList: {
        name: '',
        army: 'custodes',
        pointsLimit: 500,
        format: 'strike-force',
        detachment: '',
        units: [],
      },
      isLoading: false,
      error: null,
    });
  });

  // ---------------------------------------------------------------------------
  // List Management
  // ---------------------------------------------------------------------------

  describe('list management', () => {
    it('sets list name', () => {
      useArmyStore.getState().setListName('My Army');

      expect(useArmyStore.getState().currentList.name).toBe('My Army');
    });

    it('sets points limit', () => {
      useArmyStore.getState().setPointsLimit(2000);

      expect(useArmyStore.getState().currentList.pointsLimit).toBe(2000);
    });

    it('sets format and auto-sets points limit for colosseum', () => {
      useArmyStore.getState().setPointsLimit(2000);
      useArmyStore.getState().setFormat('colosseum');

      expect(useArmyStore.getState().currentList.format).toBe('colosseum');
      expect(useArmyStore.getState().currentList.pointsLimit).toBe(500);
    });

    it('sets format and auto-sets points limit for fixed-points formats', () => {
      useArmyStore.getState().setFormat('incursion');
      expect(useArmyStore.getState().currentList.pointsLimit).toBe(1000);

      useArmyStore.getState().setFormat('onslaught');
      expect(useArmyStore.getState().currentList.pointsLimit).toBe(3000);
    });

    it('preserves points limit when switching to custom', () => {
      useArmyStore.getState().setPointsLimit(1500);
      useArmyStore.getState().setFormat('custom');

      expect(useArmyStore.getState().currentList.format).toBe('custom');
      expect(useArmyStore.getState().currentList.pointsLimit).toBe(1500);
    });

    it('sets detachment', () => {
      useArmyStore.getState().setDetachment('shield-host');

      expect(useArmyStore.getState().currentList.detachment).toBe('shield-host');
    });

    it('resets list to defaults while preserving army', () => {
      useArmyStore.setState({ armyData: mockArmyData });
      useArmyStore.getState().setListName('My Army');
      useArmyStore.getState().addUnit('custodian-guard', 4);
      useArmyStore.getState().resetList();

      const { currentList } = useArmyStore.getState();

      expect(currentList.name).toBe('');
      expect(currentList.units).toHaveLength(0);
      expect(currentList.army).toBe('custodes');
      expect(currentList.detachment).toBe('shield-host'); // First detachment
    });

    it('loads a saved list', () => {
      useArmyStore.setState({ armyData: mockArmyData });

      const savedList: CurrentList = {
        name: 'Saved Army',
        army: 'custodes',
        pointsLimit: 500,
        format: 'strike-force',
        detachment: 'shield-host',
        units: [
          createListUnit('custodian-guard', 5),
          createListUnit('shield-captain', 1),
        ],
      };

      useArmyStore.getState().loadList(savedList);

      const { currentList } = useArmyStore.getState();

      expect(currentList.name).toBe('Saved Army');
      expect(currentList.units).toHaveLength(2);
    });

    it('initializes weapon defaults when loading a list with empty weaponCounts', () => {
      useArmyStore.setState({ armyData: mockArmyData });

      const savedList: CurrentList = {
        name: 'Old List',
        army: 'custodes',
        pointsLimit: 500,
        format: 'strike-force',
        detachment: 'shield-host',
        units: [createListUnit('custodian-guard', 4)],
      };

      useArmyStore.getState().loadList(savedList);

      const loadedUnit = useArmyStore.getState().currentList.units[0];

      // Should have initialized default weapon counts
      expect(loadedUnit.weaponCounts).toBeDefined();
      expect(loadedUnit.weaponCounts!['spears']).toBe(4); // Default choice
    });
  });

  // ---------------------------------------------------------------------------
  // Unit Management
  // ---------------------------------------------------------------------------

  describe('unit management', () => {
    beforeEach(() => {
      useArmyStore.setState({ armyData: mockArmyData });
    });

    it('adds a unit with correct defaults', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4);

      const { units } = useArmyStore.getState().currentList;

      expect(units).toHaveLength(1);
      expect(units[0].unitId).toBe('custodian-guard');
      expect(units[0].modelCount).toBe(4);
      expect(units[0].enhancement).toBe('');
      expect(units[0].currentWounds).toBeNull();
      expect(units[0].attachedLeader).toBeNull();
    });

    it('initializes weapon counts with defaults on add', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4);

      const unit = useArmyStore.getState().currentList.units[0];

      expect(unit.weaponCounts!['spears']).toBe(4); // Default choice gets modelCount
      expect(unit.weaponCounts!['blades']).toBe(0);
      expect(unit.weaponCounts!['vexilla']).toBe(0);
    });

    it('does not add unit for unknown unitId', () => {
      useArmyStore.getState().addUnit('nonexistent', 1);

      expect(useArmyStore.getState().currentList.units).toHaveLength(0);
    });

    it('removes a unit by index', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4);
      useArmyStore.getState().addUnit('shield-captain', 1);
      useArmyStore.getState().removeUnit(0);

      const { units } = useArmyStore.getState().currentList;

      expect(units).toHaveLength(1);
      expect(units[0].unitId).toBe('shield-captain');
    });

    it('updates leader attachment indices when removing a unit', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4); // index 0
      useArmyStore.getState().addUnit('shield-captain', 1);  // index 1
      useArmyStore.getState().addUnit('allarus-custodians', 2); // index 2

      // Attach leader at index 1 to guard at index 0
      useArmyStore.getState().attachLeader(0, 1);

      // Remove allarus at index 2 - attachment should stay the same
      useArmyStore.getState().removeUnit(2);

      expect(useArmyStore.getState().currentList.units[0].attachedLeader?.unitIndex).toBe(1);
    });

    it('adjusts leader indices when removing a unit before the leader', () => {
      useArmyStore.getState().addUnit('allarus-custodians', 2); // index 0
      useArmyStore.getState().addUnit('custodian-guard', 4);    // index 1
      useArmyStore.getState().addUnit('shield-captain', 1);     // index 2

      // Attach leader at index 2 to guard at index 1
      useArmyStore.getState().attachLeader(1, 2);

      // Remove allarus at index 0 - leader index should shift from 2 to 1
      useArmyStore.getState().removeUnit(0);

      const guard = useArmyStore.getState().currentList.units[0];

      expect(guard.unitId).toBe('custodian-guard');
      expect(guard.attachedLeader?.unitIndex).toBe(1);
    });

    it('detaches leader references when removing the leader unit', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4); // index 0
      useArmyStore.getState().addUnit('shield-captain', 1);  // index 1
      useArmyStore.getState().attachLeader(0, 1);

      // Remove the leader at index 1
      useArmyStore.getState().removeUnit(1);

      const guard = useArmyStore.getState().currentList.units[0];

      expect(guard.attachedLeader).toBeNull();
    });

    it('updates model count', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4);
      useArmyStore.getState().updateUnitModelCount(0, 5);

      expect(useArmyStore.getState().currentList.units[0].modelCount).toBe(5);
    });

    it('adjusts weapon counts when increasing model count', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4);

      // Initially: spears=4, blades=0
      useArmyStore.getState().updateUnitModelCount(0, 5);

      const unit = useArmyStore.getState().currentList.units[0];

      // New model should get default weapon
      expect(unit.weaponCounts!['spears']).toBe(5);
    });

    it('reduces weapon counts when decreasing model count', () => {
      useArmyStore.getState().addUnit('custodian-guard', 5);

      // Set some blades: spears=3, blades=2
      useArmyStore.getState().setWeaponCount(0, 'blades', 2);
      useArmyStore.getState().setWeaponCount(0, 'spears', 3);

      useArmyStore.getState().updateUnitModelCount(0, 4);

      const unit = useArmyStore.getState().currentList.units[0];
      const total = Object.values(unit.weaponCounts!).reduce((s, c) => s + c, 0);

      // Total weapon assignments should not exceed model count
      expect(total).toBeLessThanOrEqual(4);
    });

    it('sets unit enhancement', () => {
      useArmyStore.getState().addUnit('shield-captain', 1);
      useArmyStore.getState().setUnitEnhancement(0, 'auric-mantle');

      expect(useArmyStore.getState().currentList.units[0].enhancement).toBe('auric-mantle');
    });

    it('clears unit enhancement', () => {
      useArmyStore.getState().addUnit('shield-captain', 1);
      useArmyStore.getState().setUnitEnhancement(0, 'auric-mantle');
      useArmyStore.getState().setUnitEnhancement(0, '');

      expect(useArmyStore.getState().currentList.units[0].enhancement).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Weapon/Loadout Management
  // ---------------------------------------------------------------------------

  describe('weapon management', () => {
    beforeEach(() => {
      useArmyStore.setState({ armyData: mockArmyData });
      useArmyStore.getState().addUnit('custodian-guard', 4);
    });

    it('updates weapon count by delta', () => {
      // Start: spears=4, blades=0
      useArmyStore.getState().updateWeaponCount(0, 'blades', 1);

      const unit = useArmyStore.getState().currentList.units[0];

      expect(unit.weaponCounts!['blades']).toBe(1);
    });

    it('clamps weapon count to 0 minimum', () => {
      useArmyStore.getState().updateWeaponCount(0, 'blades', -5);

      expect(useArmyStore.getState().currentList.units[0].weaponCounts!['blades']).toBe(0);
    });

    it('clamps weapon count to model count maximum', () => {
      useArmyStore.getState().updateWeaponCount(0, 'blades', 10);

      expect(useArmyStore.getState().currentList.units[0].weaponCounts!['blades']).toBeLessThanOrEqual(4);
    });

    it('respects maxModels constraint', () => {
      useArmyStore.getState().updateWeaponCount(0, 'vexilla', 5);

      // Vexilla has maxModels: 1
      expect(useArmyStore.getState().currentList.units[0].weaponCounts!['vexilla']).toBe(1);
    });

    it('sets weapon count directly', () => {
      useArmyStore.getState().setWeaponCount(0, 'blades', 2);

      expect(useArmyStore.getState().currentList.units[0].weaponCounts!['blades']).toBe(2);
    });

    it('enforces mutual exclusivity for single-model units', () => {
      useArmyStore.getState().addUnit('shield-captain', 1); // index 1
      useArmyStore.getState().updateWeaponCount(1, 'captain-axe', 1);

      const captain = useArmyStore.getState().currentList.units[1];

      // Single model: selecting axe should zero out spears
      expect(captain.weaponCounts!['captain-axe']).toBe(1);
      expect(captain.weaponCounts!['captain-spears']).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Leader Attachment
  // ---------------------------------------------------------------------------

  describe('leader attachment', () => {
    beforeEach(() => {
      useArmyStore.setState({ armyData: mockArmyData });
      useArmyStore.getState().addUnit('custodian-guard', 4); // index 0
      useArmyStore.getState().addUnit('shield-captain', 1);  // index 1
    });

    it('attaches a leader to a unit', () => {
      useArmyStore.getState().attachLeader(0, 1);

      expect(useArmyStore.getState().currentList.units[0].attachedLeader).toEqual({
        unitIndex: 1,
      });
    });

    it('detaches a leader from a unit', () => {
      useArmyStore.getState().attachLeader(0, 1);
      useArmyStore.getState().detachLeader(0);

      expect(useArmyStore.getState().currentList.units[0].attachedLeader).toBeNull();
    });

    it('detaches leader from previous unit when reattaching', () => {
      useArmyStore.getState().addUnit('custodian-guard', 4); // index 2

      useArmyStore.getState().attachLeader(0, 1);
      useArmyStore.getState().attachLeader(2, 1);

      // First guard should no longer have the leader
      expect(useArmyStore.getState().currentList.units[0].attachedLeader).toBeNull();
      // Second guard should have it
      expect(useArmyStore.getState().currentList.units[2].attachedLeader).toEqual({
        unitIndex: 1,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Warlord Selection
  // ---------------------------------------------------------------------------

  describe('warlord selection', () => {
    beforeEach(() => {
      useArmyStore.setState({ armyData: mockArmyData });
      useArmyStore.getState().addUnit('shield-captain', 1);  // index 0
      useArmyStore.getState().addUnit('custodian-guard', 4); // index 1
    });

    it('auto-selects warlord when only one Character exists', () => {
      // shield-captain is the only non-Epic-Hero Character, so auto-selected
      expect(useArmyStore.getState().currentList.units[0].isWarlord).toBe(true);
    });

    it('clears warlord from other units when setting a new one', () => {
      // shield-captain auto-selected, now switch to custodian-guard
      useArmyStore.getState().setWarlord(1);

      expect(useArmyStore.getState().currentList.units[0].isWarlord).toBe(false);
      expect(useArmyStore.getState().currentList.units[1].isWarlord).toBe(true);
    });

    it('toggles warlord off', () => {
      // shield-captain auto-selected, toggle it off
      useArmyStore.getState().setWarlord(0);

      expect(useArmyStore.getState().currentList.units[0].isWarlord).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Wound Tracking
  // ---------------------------------------------------------------------------

  describe('wound tracking', () => {
    beforeEach(() => {
      useArmyStore.setState({ armyData: mockArmyData });
      useArmyStore.getState().addUnit('custodian-guard', 4); // index 0
      useArmyStore.getState().addUnit('shield-captain', 1);  // index 1
    });

    it('sets unit wounds', () => {
      useArmyStore.getState().setUnitWounds(0, 8);

      expect(useArmyStore.getState().currentList.units[0].currentWounds).toBe(8);
    });

    it('clears unit wounds back to full health', () => {
      useArmyStore.getState().setUnitWounds(0, 8);
      useArmyStore.getState().setUnitWounds(0, null);

      expect(useArmyStore.getState().currentList.units[0].currentWounds).toBeNull();
    });

    it('sets leader wounds', () => {
      useArmyStore.getState().setLeaderWounds(0, 3);

      expect(useArmyStore.getState().currentList.units[0].leaderCurrentWounds).toBe(3);
    });

    it('resets all wounds', () => {
      useArmyStore.getState().setUnitWounds(0, 8);
      useArmyStore.getState().setUnitWounds(1, 2);
      useArmyStore.getState().setLeaderWounds(0, 3);
      useArmyStore.getState().resetAllWounds();

      const { units } = useArmyStore.getState().currentList;

      expect(units[0].currentWounds).toBeNull();
      expect(units[1].currentWounds).toBeNull();
      expect(units[0].leaderCurrentWounds).toBeNull();
    });

    it('handles invalid index gracefully', () => {
      useArmyStore.getState().setUnitWounds(99, 5);

      // Should not throw, state unchanged
      expect(useArmyStore.getState().currentList.units[0].currentWounds).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  describe('helpers', () => {
    beforeEach(() => {
      useArmyStore.setState({ armyData: mockArmyData });
    });

    describe('getUnitById', () => {
      it('finds a unit by ID', () => {
        const unit = useArmyStore.getState().getUnitById('custodian-guard');

        expect(unit).toBeDefined();
        expect(unit?.name).toBe('Custodian Guard');
      });

      it('returns undefined for unknown ID', () => {
        expect(useArmyStore.getState().getUnitById('nonexistent')).toBeUndefined();
      });
    });

    describe('getTotalPoints', () => {
      it('calculates total points from units', () => {
        useArmyStore.getState().addUnit('custodian-guard', 4); // 150
        useArmyStore.getState().addUnit('shield-captain', 1);  // 100

        expect(useArmyStore.getState().getTotalPoints()).toBe(250);
      });

      it('includes enhancement points', () => {
        useArmyStore.getState().setDetachment('shield-host');
        useArmyStore.getState().addUnit('shield-captain', 1); // 100
        useArmyStore.getState().setUnitEnhancement(0, 'auric-mantle'); // +15

        expect(useArmyStore.getState().getTotalPoints()).toBe(115);
      });

      it('returns 0 with no army data', () => {
        useArmyStore.setState({ armyData: null });

        expect(useArmyStore.getState().getTotalPoints()).toBe(0);
      });

      it('skips unknown units', () => {
        useArmyStore.setState(state => ({
          currentList: {
            ...state.currentList,
            units: [createListUnit('nonexistent', 1)],
          },
        }));

        expect(useArmyStore.getState().getTotalPoints()).toBe(0);
      });

      it('returns 0 for missing model count in points table', () => {
        useArmyStore.getState().addUnit('custodian-guard', 4); // 150 points for 4 models

        // Manually set a model count that's not in the points table
        useArmyStore.setState(state => ({
          currentList: {
            ...state.currentList,
            units: [{ ...state.currentList.units[0], modelCount: 99 }],
          },
        }));

        expect(useArmyStore.getState().getTotalPoints()).toBe(0);
      });
    });
  });
});
