import { describe, it, expect } from 'vitest';
import {
  normalizeUnitName,
  parseNewRecruitJSON,
  convertToCurrentList,
} from './newRecruitParser';
import type { ArmyData } from '@/types';

// ============================================================================
// Test Data
// ============================================================================

const mockArmyData: ArmyData = {
  faction: 'Adeptus Custodes',
  lastUpdated: '2024-01',
  units: [
    {
      id: 'shield-captain',
      name: 'Shield-Captain',
      points: { '1': 120 },
      stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Character', 'Infantry', 'Imperium', 'Adeptus Custodes'],
    },
    {
      id: 'custodian-guard',
      name: 'Custodian Guard',
      points: { '4': 150, '5': 190 },
      stats: { m: 6, t: 6, sv: '2+', w: 3, ld: '6+', oc: 2 },
      invuln: '4+',
      weapons: [],
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
      abilities: [],
      keywords: ['Infantry', 'Battleline', 'Imperium', 'Adeptus Custodes'],
    },
    {
      id: 'allarus-custodians',
      name: 'Allarus Custodians',
      points: { '2': 110, '3': 165 },
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
          id: 'from-the-hall-of-armouries',
          name: 'From the Hall of Armouries',
          points: 25,
          description: '+1 S and D to melee weapons.',
        },
      ],
    },
  },
  allies: {
    'anathema-psykana': {
      name: 'Anathema Psykana',
      description: 'Sisters of Silence',
      units: [
        {
          id: 'prosecutors',
          name: 'Prosecutors',
          points: { '4': 40, '10': 100 },
          stats: { m: 6, t: 3, sv: '3+', w: 1, ld: '6+', oc: 2 },
          invuln: null,
          weapons: [],
          abilities: [],
          keywords: ['Infantry', 'Imperium', 'Anathema Psykana'],
        },
      ],
    },
  },
};

// Simplified New Recruit JSON structure for testing
const mockNewRecruitJSON = {
  roster: {
    name: 'Test List',
    costs: [{ name: 'pts', value: 475 }],
    forces: [
      {
        selections: [
          // Configuration
          {
            name: 'Detachments',
            type: 'upgrade' as const,
            number: 1,
            selections: [
              {
                name: 'Shield Host',
                group: 'Detachment',
                type: 'upgrade' as const,
                number: 1,
              },
            ],
          },
          // Shield-Captain
          {
            name: 'Shield-Captain',
            type: 'model' as const,
            number: 1,
            costs: [{ name: 'pts', value: 145 }],
            categories: [
              { name: 'Character', entryId: 'char', primary: true },
              { name: 'Infantry', entryId: 'inf', primary: false },
            ],
            selections: [
              {
                name: 'From the Hall of Armouries',
                type: 'upgrade' as const,
                group: 'Enhancements',
                number: 1,
                costs: [{ name: 'pts', value: 25 }],
              },
              {
                name: 'Guardian Spear',
                type: 'upgrade' as const,
                number: 1,
                categories: [
                  { name: 'Melee Weapon', entryId: 'melee', primary: false },
                ],
              },
            ],
          },
          // Custodian Guard
          {
            name: 'Custodian Guard',
            type: 'unit' as const,
            number: 1,
            costs: [{ name: 'pts', value: 150 }],
            categories: [
              { name: 'Battleline', entryId: 'bl', primary: true },
              { name: 'Infantry', entryId: 'inf', primary: false },
            ],
            selections: [
              {
                name: 'Custodian Guard (Guardian Spear)',
                type: 'model' as const,
                number: 4,
                selections: [
                  {
                    name: 'Guardian Spear',
                    type: 'upgrade' as const,
                    number: 4,
                    categories: [
                      { name: 'Melee Weapon', entryId: 'melee', primary: false },
                    ],
                  },
                ],
              },
            ],
          },
          // Prosecutors (ally)
          {
            name: 'Prosecutors',
            type: 'unit' as const,
            number: 1,
            costs: [{ name: 'pts', value: 40 }],
            categories: [
              { name: 'Infantry', entryId: 'inf', primary: true },
              { name: 'Anathema Psykana', entryId: 'ap', primary: false },
            ],
            selections: [
              {
                name: 'Prosecutor',
                type: 'model' as const,
                number: 4,
              },
            ],
          },
        ],
        categories: [],
      },
    ],
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('normalizeUnitName', () => {
  it('converts to lowercase with hyphens', () => {
    expect(normalizeUnitName('Custodian Guard')).toBe('custodian-guard');
  });

  it('removes apostrophes', () => {
    expect(normalizeUnitName("Emperor's Champion")).toBe('emperors-champion');
  });

  it('handles Shield-Captain', () => {
    expect(normalizeUnitName('Shield-Captain')).toBe('shield-captain');
  });

  it('removes special characters', () => {
    expect(normalizeUnitName('Test Unit (Special)')).toBe('test-unit-special');
  });

  it('collapses multiple spaces/hyphens', () => {
    expect(normalizeUnitName('Test   Unit')).toBe('test-unit');
  });
});

describe('parseNewRecruitJSON', () => {
  it('extracts roster name', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    expect(result.name).toBe('Test List');
  });

  it('extracts total points', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    expect(result.totalPoints).toBe(475);
  });

  it('extracts detachment', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    expect(result.detachment).toBe('Shield Host');
  });

  it('extracts units', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    expect(result.units.length).toBe(3);
  });

  it('extracts unit names', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    const names = result.units.map((u) => u.name);
    expect(names).toContain('Shield-Captain');
    expect(names).toContain('Custodian Guard');
    expect(names).toContain('Prosecutors');
  });

  it('extracts character enhancements', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    const shieldCaptain = result.units.find((u) => u.name === 'Shield-Captain');
    expect(shieldCaptain?.enhancement).toBe('From the Hall of Armouries');
  });

  it('extracts model counts', () => {
    const result = parseNewRecruitJSON(mockNewRecruitJSON);
    const custodianGuard = result.units.find((u) => u.name === 'Custodian Guard');
    expect(custodianGuard?.modelCount).toBe(4);
  });
});

describe('convertToCurrentList', () => {
  it('maps unit names to unit IDs', () => {
    const parsed = parseNewRecruitJSON(mockNewRecruitJSON);
    const result = convertToCurrentList(parsed, mockArmyData, 'custodes');

    expect(result.list.units.length).toBeGreaterThan(0);

    const unitIds = result.list.units.map((u) => u.unitId);
    expect(unitIds).toContain('shield-captain');
    expect(unitIds).toContain('custodian-guard');
  });

  it('maps enhancement names to enhancement IDs', () => {
    const parsed = parseNewRecruitJSON(mockNewRecruitJSON);
    const result = convertToCurrentList(parsed, mockArmyData, 'custodes');

    const shieldCaptain = result.list.units.find(
      (u) => u.unitId === 'shield-captain'
    );
    expect(shieldCaptain?.enhancement).toBe('from-the-hall-of-armouries');
  });

  it('maps detachment name to detachment ID', () => {
    const parsed = parseNewRecruitJSON(mockNewRecruitJSON);
    const result = convertToCurrentList(parsed, mockArmyData, 'custodes');

    expect(result.list.detachment).toBe('shield-host');
  });

  it('handles ally units', () => {
    const parsed = parseNewRecruitJSON(mockNewRecruitJSON);
    const result = convertToCurrentList(parsed, mockArmyData, 'custodes');

    const prosecutors = result.list.units.find((u) => u.unitId === 'prosecutors');
    expect(prosecutors).toBeDefined();
  });

  it('reports warnings for unmatched units', () => {
    const jsonWithUnknownUnit = {
      ...mockNewRecruitJSON,
      roster: {
        ...mockNewRecruitJSON.roster,
        forces: [
          {
            ...mockNewRecruitJSON.roster.forces[0],
            selections: [
              ...mockNewRecruitJSON.roster.forces[0].selections,
              {
                name: 'Unknown Unit XYZ',
                type: 'unit' as const,
                number: 1,
                costs: [{ name: 'pts', value: 100 }],
                categories: [],
              },
            ],
          },
        ],
      },
    };

    const parsed = parseNewRecruitJSON(jsonWithUnknownUnit);
    const result = convertToCurrentList(parsed, mockArmyData, 'custodes');

    expect(result.unmatchedUnits).toContain('Unknown Unit XYZ');
    expect(result.warnings.some((w) => w.includes('Unknown Unit XYZ'))).toBe(
      true
    );
  });

  it('sets appropriate points limit', () => {
    const parsed = parseNewRecruitJSON(mockNewRecruitJSON);
    const result = convertToCurrentList(parsed, mockArmyData, 'custodes');

    // 475 points should round up to 500
    expect(result.list.pointsLimit).toBe(500);
  });
});
