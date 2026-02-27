import { describe, it, expect } from 'vitest';
import { generateRosterXml, generateRos } from './roszExport';
import type { CurrentList, ArmyData, Unit } from '@/types';

// ============================================================================
// Test Data
// ============================================================================

const mockUnit: Unit = {
  id: 'custodian-guard',
  bsdataId: 'abc1-def2-3456-7890',
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
    },
    {
      id: 'guardian-spear-melee',
      name: 'Guardian Spear',
      type: 'melee',
      stats: { a: 5, ws: '2+', s: 7, ap: -2, d: 2 },
      abilities: [],
    },
  ],
  abilities: [
    {
      id: 'martial-prowess',
      name: 'Martial Prowess',
      description: 'Once per battle, this unit can use this ability.',
    },
  ],
  keywords: ['Infantry', 'Battleline', 'Imperium', 'Adeptus Custodes'],
};

const mockShieldCaptain: Unit = {
  id: 'shield-captain',
  bsdataId: 'xyz9-abc1-1234-5678',
  name: 'Shield-Captain',
  points: { '1': 100 },
  stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
  invuln: '4+',
  weapons: [],
  abilities: [],
  keywords: ['Infantry', 'Character', 'Imperium', 'Adeptus Custodes'],
};

const mockArmyData: ArmyData = {
  faction: 'Adeptus Custodes',
  lastUpdated: '2026-01',
  catalogueId: '1f19-6509-d906-ca10',
  gameSystemId: 'sys-352e-adc2-7639-d6a9',
  units: [mockUnit, mockShieldCaptain],
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
  name: 'Test Army',
  army: 'custodes',
  pointsLimit: 500,
  format: 'strike-force',
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
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('generateRosterXml', () => {
  it('generates valid XML structure', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<roster');
    expect(xml).toContain('</roster>');
  });

  it('includes game system metadata', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('gameSystemId="sys-352e-adc2-7639-d6a9"');
    expect(xml).toContain('gameSystemName="Warhammer 40,000 10th Edition"');
    expect(xml).toContain('battleScribeVersion="2.03"');
  });

  it('includes catalogue metadata', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('catalogueId="1f19-6509-d906-ca10"');
    expect(xml).toContain('catalogueName="Imperium - Adeptus Custodes"');
  });

  it('includes roster name', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('name="Test Army"');
  });

  it('calculates total points correctly', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    // 5 models = 190 points
    expect(xml).toContain('<cost name="pts" typeId="51b2-306e-1021-d207" value="190"/>');
  });

  it('includes unit selections with BSData entry ID', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('name="Custodian Guard"');
    expect(xml).toContain('entryId="abc1-def2-3456-7890"');
    expect(xml).toContain('type="unit"');
  });

  it('includes model count in selection', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('type="model" number="5"');
  });

  it('handles multiple units', () => {
    const listWithMultiple: CurrentList = {
      ...mockList,
      units: [
        {
          unitId: 'custodian-guard',
          modelCount: 4,
          enhancement: '',
          weaponCounts: {},
          currentWounds: null,
          leaderCurrentWounds: null,
          attachedLeader: null,
        },
        {
          unitId: 'shield-captain',
          modelCount: 1,
          enhancement: '',
          weaponCounts: {},
          currentWounds: null,
          leaderCurrentWounds: null,
          attachedLeader: null,
        },
      ],
    };

    const xml = generateRosterXml(listWithMultiple, mockArmyData);

    expect(xml).toContain('name="Custodian Guard"');
    expect(xml).toContain('name="Shield-Captain"');
    expect(xml).toContain('entryId="abc1-def2-3456-7890"'); // Custodian Guard
    expect(xml).toContain('entryId="xyz9-abc1-1234-5678"'); // Shield-Captain

    // Total points: 150 (4 guards) + 100 (captain) = 250
    expect(xml).toContain('value="250"');
  });

  it('includes enhancement as upgrade selection', () => {
    const listWithEnhancement: CurrentList = {
      ...mockList,
      units: [
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

    const xml = generateRosterXml(listWithEnhancement, mockArmyData);

    expect(xml).toContain('name="Auric Mantle"');
    expect(xml).toContain('type="upgrade"');
    expect(xml).toContain('value="25"'); // Enhancement points
  });

  it('escapes XML special characters in names', () => {
    const armyWithSpecialChars: ArmyData = {
      ...mockArmyData,
      units: [
        {
          ...mockUnit,
          name: 'Test & Unit <Special>',
        },
      ],
    };

    const xml = generateRosterXml(mockList, armyWithSpecialChars);

    expect(xml).toContain('Test &amp; Unit &lt;Special&gt;');
    expect(xml).not.toContain('Test & Unit <Special>');
  });

  it('handles empty unit list', () => {
    const emptyList: CurrentList = {
      ...mockList,
      units: [],
    };

    const xml = generateRosterXml(emptyList, mockArmyData);

    expect(xml).toContain('<selections>');
    expect(xml).toContain('</selections>');
    expect(xml).toContain('value="0"'); // Zero points
  });

  it('handles missing bsdataId gracefully', () => {
    const unitWithoutBsdataId: Unit = {
      ...mockUnit,
      bsdataId: undefined,
    };

    const armyWithNoBsdataId: ArmyData = {
      ...mockArmyData,
      units: [unitWithoutBsdataId],
    };

    const xml = generateRosterXml(mockList, armyWithNoBsdataId);

    // Should still generate valid XML with a generated entryId
    expect(xml).toContain('entryId="');
    expect(xml).toContain('name="Custodian Guard"');
  });
});

describe('generateRos', () => {
  it('returns a Blob with XML content type', () => {
    const blob = generateRos(mockList, mockArmyData);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/xml');
  });

  it('returns blob with correct content', async () => {
    const blob = generateRos(mockList, mockArmyData);

    // Use FileReader API which is available in JSDOM
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });

    expect(text).toContain('<?xml version="1.0"');
    expect(text).toContain('<roster');
    expect(text).toContain('Custodian Guard');
  });
});

describe('profile generation', () => {
  it('includes unit stats profile', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('<profiles>');
    expect(xml).toContain('</profiles>');
    expect(xml).toContain('typeName="Unit"');
    expect(xml).toContain('<characteristic name="M"');
    expect(xml).toContain('<characteristic name="T"');
    expect(xml).toContain('<characteristic name="SV"');
    expect(xml).toContain('<characteristic name="W"');
    expect(xml).toContain('<characteristic name="LD"');
    expect(xml).toContain('<characteristic name="OC"');
  });

  it('includes invuln save when present', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('<characteristic name="Invuln"');
    expect(xml).toContain('4+');
  });

  it('includes ranged weapon profiles', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('typeName="Ranged Weapons"');
    expect(xml).toContain('<characteristic name="Range"');
    expect(xml).toContain('<characteristic name="BS"');
    expect(xml).toContain('Assault');
  });

  it('includes melee weapon profiles', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('typeName="Melee Weapons"');
    expect(xml).toContain('<characteristic name="WS"');
  });

  it('includes ability profiles', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('typeName="Abilities"');
    expect(xml).toContain('Martial Prowess');
    expect(xml).toContain('<characteristic name="Description"');
  });
});

describe('category generation', () => {
  it('includes categories from keywords', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    expect(xml).toContain('<categories>');
    expect(xml).toContain('</categories>');
    expect(xml).toContain('name="Infantry"');
    expect(xml).toContain('name="Battleline"');
    expect(xml).toContain('name="Imperium"');
    expect(xml).toContain('name="Adeptus Custodes"');
  });

  it('marks first keyword as primary', () => {
    const xml = generateRosterXml(mockList, mockArmyData);

    // First category should be primary="true"
    expect(xml).toMatch(/name="Infantry"[^>]*primary="true"/);
  });
});
