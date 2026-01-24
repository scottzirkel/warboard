import { describe, it, expect } from 'vitest';
import { exportToPlainText, exportToJson } from './plainTextExport';
import type { CurrentList, ArmyData } from '@/types';

const mockArmyData: ArmyData = {
  faction: 'Adeptus Custodes',
  lastUpdated: '2024-01-01',
  units: [
    {
      id: 'custodian-guard',
      name: 'Custodian Guard',
      points: { 4: 180, 5: 225 },
      stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline'],
    },
    {
      id: 'shield-captain',
      name: 'Shield-Captain',
      points: { 1: 120 },
      stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Character'],
    },
  ],
  detachments: {
    'shield-host': {
      name: 'Shield Host',
      rules: [{ id: 'test', name: 'Test', description: 'Test' }],
      stratagems: [],
      enhancements: [
        {
          id: 'auric-mantle',
          name: 'Auric Mantle',
          points: 25,
          description: '+2 Wounds',
        },
      ],
    },
  },
  allies: {},
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
      weaponCounts: {},
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    },
    {
      unitId: 'shield-captain',
      modelCount: 1,
      enhancement: 'auric-mantle',
      weaponCounts: {},
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    },
  ],
};

describe('plainTextExport', () => {
  describe('exportToPlainText', () => {
    it('generates markdown format with list name', () => {
      const result = exportToPlainText(mockList, mockArmyData);

      expect(result).toContain('# Test List');
      expect(result).toContain('**Faction:** Adeptus Custodes');
      expect(result).toContain('**Detachment:** Shield Host');
    });

    it('includes unit details with points', () => {
      const result = exportToPlainText(mockList, mockArmyData);

      expect(result).toContain('Custodian Guard');
      expect(result).toContain('x5');
      expect(result).toContain('225pts');
    });

    it('includes enhancement details', () => {
      const result = exportToPlainText(mockList, mockArmyData);

      expect(result).toContain('Enhancement: Auric Mantle (25pts)');
    });

    it('calculates total points', () => {
      const result = exportToPlainText(mockList, mockArmyData);
      // 225 (guard) + 120 (captain) + 25 (enhancement) = 370
      expect(result).toContain('**Points:** 370 / 500');
      expect(result).toContain('**Total:** 370pts');
    });
  });

  describe('exportToJson', () => {
    it('returns valid JSON', () => {
      const result = exportToJson(mockList, mockArmyData);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('Test List');
      expect(parsed.faction).toBe('Adeptus Custodes');
    });

    it('includes unit details', () => {
      const result = exportToJson(mockList, mockArmyData);
      const parsed = JSON.parse(result);

      expect(parsed.units).toHaveLength(2);
      expect(parsed.units[0].name).toBe('Custodian Guard');
      expect(parsed.units[0].modelCount).toBe(5);
      expect(parsed.units[0].points).toBe(225);
    });

    it('includes enhancement names', () => {
      const result = exportToJson(mockList, mockArmyData);
      const parsed = JSON.parse(result);

      expect(parsed.units[1].enhancement).toBe('Auric Mantle');
    });
  });
});
