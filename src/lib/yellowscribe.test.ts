import { describe, it, expect } from 'vitest';
import { transformToYellowscribe } from './yellowscribe';
import type { CurrentList, ArmyData, Unit } from '@/types';

// ============================================================================
// Test Data
// ============================================================================

const mockUnit: Unit = {
  id: 'custodian-guard',
  name: 'Custodian Guard',
  points: { '4': 150, '5': 190 },
  stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
  invuln: '4+',
  weapons: [
    {
      id: 'guardian-spear-ranged',
      name: 'Guardian Spear',
      type: 'ranged',
      stats: { range: 24, a: 2, bs: '2+', s: 4, ap: -1, d: 2 },
      abilities: ['Assault'],
      loadoutGroup: 'spears',
    },
    {
      id: 'guardian-spear-melee',
      name: 'Guardian Spear',
      type: 'melee',
      stats: { a: 5, ws: '2+', s: 7, ap: -2, d: 2 },
      abilities: [],
      loadoutGroup: 'spears',
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
        { id: 'blades', name: 'Sentinel Blades + Shield', paired: true },
      ],
    },
  ],
  abilities: [
    {
      id: 'stand-vigil',
      name: 'Stand Vigil',
      description: 'Re-roll wound rolls of 1.',
    },
  ],
  keywords: ['Infantry', 'Battleline', 'Imperium', 'Adeptus Custodes'],
};

const mockArmyData: ArmyData = {
  faction: 'Adeptus Custodes',
  lastUpdated: '2024-01',
  units: [mockUnit],
  detachments: {
    'shield-host': {
      name: 'Shield Host',
      rules: [],
      stratagems: [],
      enhancements: [
        {
          id: 'auric-mantle',
          name: 'Auric Mantle',
          points: 25,
          description: 'Bearer gains +2 Wounds.',
        },
      ],
    },
  },
};

const mockList: CurrentList = {
  name: 'Test List',
  army: 'custodes',
  pointsLimit: 500,
  format: 'standard',
  detachment: 'shield-host',
  units: [
    {
      unitId: 'custodian-guard',
      modelCount: 5,
      enhancement: '',
      weaponCounts: { spears: 5 },
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('transformToYellowscribe', () => {
  it('transforms a basic list correctly', () => {
    const result = transformToYellowscribe(mockList, mockArmyData);

    expect(result.edition).toBe('10th');
    expect(result.order).toBe('Adeptus Custodes');
    expect(result.units).toHaveLength(1);
  });

  it('includes unit stats in characteristics', () => {
    const result = transformToYellowscribe(mockList, mockArmyData);
    const unit = result.units[0];
    const model = unit.models[0];

    expect(model.characteristics.M).toBe('6"');
    expect(model.characteristics.T).toBe('6');
    expect(model.characteristics.Sv).toBe('2+');
    expect(model.characteristics.W).toBe('3');
    expect(model.characteristics.Ld).toBe('6+');
    expect(model.characteristics.OC).toBe('2');
    expect(model.characteristics.Inv).toBe('4+');
  });

  it('includes correct model count', () => {
    const result = transformToYellowscribe(mockList, mockArmyData);
    const model = result.units[0].models[0];

    expect(model.number).toBe(5);
  });

  it('includes weapons with correct stats', () => {
    const result = transformToYellowscribe(mockList, mockArmyData);
    const weapons = result.units[0].models[0].weapons;

    expect(weapons).toHaveLength(2);

    // Ranged weapon
    const ranged = weapons.find((w) => w.range === '24"');
    expect(ranged).toBeDefined();
    expect(ranged!.name).toBe('Guardian Spear');
    expect(ranged!.A).toBe('2');
    expect(ranged!.BS).toBe('2+');
    expect(ranged!.S).toBe('4');
    expect(ranged!.AP).toBe('-1');
    expect(ranged!.D).toBe('2');
    expect(ranged!.abilities).toContain('Assault');

    // Melee weapon
    const melee = weapons.find((w) => w.range === 'Melee');
    expect(melee).toBeDefined();
    expect(melee!.name).toBe('Guardian Spear');
    expect(melee!.A).toBe('5');
    expect(melee!.WS).toBe('2+');
    expect(melee!.S).toBe('7');
  });

  it('includes unit abilities', () => {
    const result = transformToYellowscribe(mockList, mockArmyData);
    const abilities = result.units[0].abilities;

    expect(abilities).toHaveLength(1);
    expect(abilities[0].name).toBe('Stand Vigil');
    expect(abilities[0].text).toBe('Re-roll wound rolls of 1.');
  });

  it('separates faction and other keywords', () => {
    const result = transformToYellowscribe(mockList, mockArmyData);
    const unit = result.units[0];

    expect(unit.factionKeywords).toContain('Imperium');
    expect(unit.factionKeywords).toContain('Adeptus Custodes');
    expect(unit.otherKeywords).toContain('Infantry');
    expect(unit.otherKeywords).toContain('Battleline');
  });

  it('handles empty list', () => {
    const emptyList: CurrentList = {
      ...mockList,
      units: [],
    };

    const result = transformToYellowscribe(emptyList, mockArmyData);

    expect(result.units).toHaveLength(0);
  });

  it('includes enhancement when present', () => {
    const listWithEnhancement: CurrentList = {
      ...mockList,
      units: [
        {
          ...mockList.units[0],
          enhancement: 'auric-mantle',
        },
      ],
    };

    const result = transformToYellowscribe(listWithEnhancement, mockArmyData);
    const model = result.units[0].models[0];
    const abilities = result.units[0].abilities;

    // Model name should include enhancement
    expect(model.name).toContain('Auric Mantle');

    // Enhancement should be in abilities
    const enhancementAbility = abilities.find((a) =>
      a.name.includes('Enhancement')
    );
    expect(enhancementAbility).toBeDefined();
    expect(enhancementAbility!.text).toBe('Bearer gains +2 Wounds.');
  });
});
