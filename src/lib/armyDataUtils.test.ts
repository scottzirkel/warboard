import { describe, it, expect } from 'vitest';
import { findUnitById } from './armyDataUtils';
import type { ArmyData } from '@/types';

const mockArmyData: ArmyData = {
  faction: 'Test',
  lastUpdated: '2026-01',
  units: [
    {
      id: 'custodian-guard',
      name: 'Custodian Guard',
      points: { '4': 150, '5': 190 },
      stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline'],
    },
  ],
  detachments: {},
  allies: {
    imperial_agents: {
      name: 'Imperial Agents',
      description: 'Agents of the Imperium',
      units: [
        {
          id: 'inquisitor-draxus',
          name: 'Inquisitor Draxus',
          points: { '1': 95 },
          stats: { m: 6, t: 3, sv: '3+', w: 4, ld: '6+', oc: 1 },
          invuln: '5+',
          weapons: [],
          abilities: [],
          keywords: ['Infantry', 'Character'],
        },
      ],
    },
  },
};

describe('findUnitById', () => {
  it('finds units in the main units array', () => {
    const unit = findUnitById(mockArmyData, 'custodian-guard');

    expect(unit).toBeDefined();
    expect(unit!.name).toBe('Custodian Guard');
  });

  it('finds units in allies', () => {
    const unit = findUnitById(mockArmyData, 'inquisitor-draxus');

    expect(unit).toBeDefined();
    expect(unit!.name).toBe('Inquisitor Draxus');
    expect(unit!.points['1']).toBe(95);
  });

  it('returns undefined for non-existent units', () => {
    const unit = findUnitById(mockArmyData, 'non-existent');

    expect(unit).toBeUndefined();
  });

  it('works when allies is undefined', () => {
    const dataWithoutAllies: ArmyData = {
      ...mockArmyData,
      allies: undefined,
    };

    const unit = findUnitById(dataWithoutAllies, 'inquisitor-draxus');

    expect(unit).toBeUndefined();
  });
});
