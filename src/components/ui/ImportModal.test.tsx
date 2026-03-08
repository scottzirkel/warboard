import { describe, it, expect } from 'vitest';
import { parseNativeFormat } from './ImportModal';
import type { ArmyData } from '@/types';

const baseUnit = {
  unitId: 'custodian-guard',
  modelCount: 5,
  enhancement: '',
  loadout: {},
  weaponCounts: {},
};

const mockArmyData: ArmyData = {
  faction: 'Adeptus Custodes',
  lastUpdated: '2024-01',
  units: [
    {
      id: 'shield-captain',
      name: 'Shield-Captain',
      points: { '1': 140 },
      stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Character', 'Infantry'],
    },
    {
      id: 'custodian-guard',
      name: 'Custodian Guard',
      points: { '4': 160, '5': 200 },
      stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline'],
    },
  ],
  detachments: {
    'shield-host': {
      name: 'Shield Host',
      rules: [{ id: 'test', name: 'Test', description: 'Test' }],
      enhancements: [
        { id: 'auric-mantle', name: 'Auric Mantle', points: 15, description: 'Test' },
      ],
      stratagems: [],
    },
  },
};

describe('parseNativeFormat', () => {
  it('preserves non strike-force formats and points limit', () => {
    const list = parseNativeFormat(
      {
        name: 'Incursion List',
        army: 'custodes',
        format: 'incursion',
        pointsLimit: 1000,
        detachment: 'shield-host',
        units: [baseUnit],
      },
      'custodes'
    );

    expect(list.format).toBe('incursion');
    expect(list.pointsLimit).toBe(1000);
  });

  it('falls back to strike-force when format is invalid', () => {
    const list = parseNativeFormat(
      {
        name: 'Unknown',
        army: 'custodes',
        format: 'unknown',
        detachment: 'shield-host',
        units: [baseUnit],
      },
      'custodes'
    );

    expect(list.format).toBe('strike-force');
    expect(list.pointsLimit).toBe(2000);
  });

  it('resolves unit names to IDs when armyData is provided', () => {
    const list = parseNativeFormat(
      {
        name: 'Test List',
        format: 'incursion',
        pointsLimit: 1000,
        detachment: 'Shield Host',
        units: [
          { name: 'Shield-Captain', modelCount: 1, enhancement: 'Auric Mantle' },
          { name: 'Custodian Guard', modelCount: 4 },
        ],
      },
      'custodes',
      mockArmyData
    );

    expect(list.units[0].unitId).toBe('shield-captain');
    expect(list.units[0].enhancement).toBe('auric-mantle');
    expect(list.units[1].unitId).toBe('custodian-guard');
    expect(list.detachment).toBe('shield-host');
  });

  it('resolves detachment names to IDs', () => {
    const list = parseNativeFormat(
      {
        name: 'Test',
        detachment: 'Shield Host',
        units: [baseUnit],
      },
      'custodes',
      mockArmyData
    );

    expect(list.detachment).toBe('shield-host');
  });

  it('resolves leader attachments from character to bodyguard unit', () => {
    const list = parseNativeFormat(
      {
        name: 'Leader Test',
        format: 'incursion',
        pointsLimit: 1000,
        detachment: 'Shield Host',
        units: [
          { name: 'Shield-Captain', modelCount: 1, leader: 'Custodian Guard' },
          { name: 'Custodian Guard', modelCount: 4 },
        ],
      },
      'custodes',
      mockArmyData
    );

    // Leader (index 0) should be attached to bodyguard (index 1)
    expect(list.units[0].attachedLeader).toBeNull();
    expect(list.units[1].attachedLeader).toEqual({ unitIndex: 0 });
  });

  it('supports attachedTo as alternative to leader field', () => {
    const list = parseNativeFormat(
      {
        name: 'AttachedTo Test',
        format: 'incursion',
        pointsLimit: 1000,
        detachment: 'Shield Host',
        units: [
          { name: 'Shield-Captain', modelCount: 1, attachedTo: 'Custodian Guard' },
          { name: 'Custodian Guard', modelCount: 4 },
        ],
      },
      'custodes',
      mockArmyData
    );

    expect(list.units[1].attachedLeader).toEqual({ unitIndex: 0 });
  });
});
