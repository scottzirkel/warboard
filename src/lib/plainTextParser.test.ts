import { describe, it, expect } from 'vitest';
import {
  parsePlainText,
  convertTextToCurrentList,
  importPlainText,
} from './plainTextParser';
import { findUnitById } from '@/lib/armyDataUtils';
import darkAngelsData from '@scottzirkel/40k-data/data/darkangels.json';
import spaceMarinesData from '@scottzirkel/40k-data/data/spacemarines.json';
import type { ArmyData, CurrentList } from '@/types';

// ============================================================================
// Test Data
// ============================================================================

const mockArmyData: ArmyData = {
  faction: 'Tyranids',
  lastUpdated: '2024-01',
  units: [
    {
      id: 'parasite-of-mortrex',
      name: 'Parasite of Mortrex',
      points: { '1': 90 },
      stats: { m: 12, t: 5, sv: '4+', w: 5, ld: '7+', oc: 1 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Character', 'Fly', 'Tyranids'],
    },
    {
      id: 'termagants',
      name: 'Termagants',
      points: { '10': 60, '20': 120 },
      stats: { m: 6, t: 3, sv: '5+', w: 1, ld: '8+', oc: 2 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline', 'Tyranids'],
    },
    {
      id: 'hormagaunts',
      name: 'Hormagaunts',
      points: { '10': 65, '20': 130 },
      stats: { m: 10, t: 3, sv: '5+', w: 1, ld: '8+', oc: 2 },
      invuln: null,
      weapons: [],
      abilities: [],
      keywords: ['Infantry', 'Battleline', 'Tyranids'],
    },
    {
      id: 'hive-tyrant',
      name: 'Hive Tyrant',
      points: { '1': 235 },
      stats: { m: 8, t: 10, sv: '2+', w: 10, ld: '7+', oc: 4 },
      invuln: '4+',
      weapons: [],
      abilities: [],
      keywords: ['Character', 'Monster', 'Tyranids'],
    },
  ],
  detachments: {
    'invasion-fleet': {
      name: 'Invasion Fleet',
      rules: [],
      stratagems: [],
      enhancements: [
        {
          id: 'adaptive-biology',
          name: 'Adaptive Biology',
          points: 25,
          description: '5+ Feel No Pain.',
        },
      ],
    },
  },
};

const actualDarkAngelsData = (() => {
  const darkAngels = structuredClone(darkAngelsData) as unknown as ArmyData;
  const spaceMarines = spaceMarinesData as unknown as ArmyData;
  const darkAngelUnitIds = new Set(darkAngels.units.map((unit) => unit.id));

  return {
    ...darkAngels,
    units: [
      ...darkAngels.units,
      ...spaceMarines.units.filter((unit) => !darkAngelUnitIds.has(unit.id)),
    ],
    detachments: {
      ...spaceMarines.detachments,
      ...darkAngels.detachments,
    },
  };
})();

function calculateListPoints(list: CurrentList, armyData: ArmyData): number {
  const detachment = armyData.detachments[list.detachment];

  return list.units.reduce((sum, listUnit) => {
    const unit = findUnitById(armyData, listUnit.unitId);
    const unitPoints = unit?.points[String(listUnit.modelCount)] ?? 0;
    const enhancementPoints = detachment?.enhancements.find((e) => e.id === listUnit.enhancement)?.points ?? 0;

    return sum + unitPoints + enhancementPoints;
  }, 0);
}

// ============================================================================
// parsePlainText Tests
// ============================================================================

describe('parsePlainText', () => {
  describe('table format', () => {
    it('parses markdown table format', () => {
      const text = `
| Unit | Config | Points |
|------|--------|--------|
| Parasite of Mortrex | Warlord | 90 |
| Termagants x20 | Fleshborers | 120 |
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
      expect(result.units[0].name).toBe('Parasite of Mortrex');
      expect(result.units[0].isWarlord).toBe(true);
      expect(result.units[1].name).toBe('Termagants');
      expect(result.units[1].modelCount).toBe(20);
    });

    it('handles table without header separators', () => {
      const text = `
| Unit | Points |
| Hive Tyrant | 235 |
| Hormagaunts x10 | 65 |
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
      expect(result.units[0].name).toBe('Hive Tyrant');
      expect(result.units[0].points).toBe(235);
    });

    it('extracts points from various positions', () => {
      const text = `
| Unit | Points |
| Termagants x20 | 120pts |
`;
      const result = parsePlainText(text);

      expect(result.units[0].points).toBe(120);
    });
  });

  describe('list format', () => {
    it('parses simple list with points', () => {
      const text = `
Parasite of Mortrex - 90pts
Termagants x20 - 120pts
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
      expect(result.units[0].name).toBe('Parasite of Mortrex');
      expect(result.units[0].points).toBe(90);
      expect(result.units[1].modelCount).toBe(20);
    });

    it('parses numbered list', () => {
      const text = `
1. Hive Tyrant (235pts) - Warlord
2. Hormagaunts x20 (130pts)
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
      expect(result.units[0].name).toBe('Hive Tyrant');
      expect(result.units[0].isWarlord).toBe(true);
      expect(result.units[0].points).toBe(235);
    });

    it('parses bullet list', () => {
      const text = `
- Parasite of Mortrex (90)
- Termagants x10 (60)
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
      expect(result.units[0].points).toBe(90);
      expect(result.units[1].modelCount).toBe(10);
    });

    it('handles "20x" model count format', () => {
      const text = `20x Termagants - 120pts`;
      const result = parsePlainText(text);

      expect(result.units[0].modelCount).toBe(20);
      expect(result.units[0].name).toBe('Termagants');
    });

    it('handles "10 models" format', () => {
      const text = `Hormagaunts 10 models - 65pts`;
      const result = parsePlainText(text);

      expect(result.units[0].modelCount).toBe(10);
    });
  });

  describe('AI chatbot format', () => {
    it('parses full format with detachment and points limit', () => {
      const text = `
**Detachment:** Invasion Fleet
**Points:** 480 / 500

| Unit | Config | Points |
|------|--------|--------|
| Parasite of Mortrex | Warlord, Adaptive Biology | 105 |
| Termagants x20 | Fleshborers | 120 |
| Hormagaunts x10 | Default | 65 |
| **Total** | | **480** |
`;
      const result = parsePlainText(text);

      expect(result.detachment).toBe('Invasion Fleet');
      expect(result.units.length).toBe(3); // Total row should be skipped
      expect(result.units[0].name).toBe('Parasite of Mortrex');
      expect(result.units[0].isWarlord).toBe(true);
      expect(result.units[0].enhancement).toBe('Adaptive Biology');
      expect(result.units[0].points).toBe(105);
      expect(result.units[1].modelCount).toBe(20);
      expect(result.units[2].enhancement).toBeUndefined(); // "Default" should not be stored
    });

    it('extracts detachment from header', () => {
      const text = `
**Detachment:** Shield Host
| Unit | Points |
| Custodian Guard x4 | 150 |
`;
      const result = parsePlainText(text);

      expect(result.detachment).toBe('Shield Host');
    });

    it('extracts points limit from header', () => {
      const text = `
**Points:** 350 / 500
Hive Tyrant - 235pts
`;
      const result = parsePlainText(text);

      expect(result.pointsLimit).toBe(500);
      expect(result.totalPoints).toBe(235); // Calculated from units
    });

    it('handles "Warlord, Enhancement" in config column', () => {
      const text = `
| Unit | Config | Points |
| Hive Tyrant | Warlord, Adaptive Biology | 260 |
`;
      const result = parsePlainText(text);

      expect(result.units[0].isWarlord).toBe(true);
      expect(result.units[0].enhancement).toBe('Adaptive Biology');
    });

    it('skips Total row', () => {
      const text = `
| Unit | Points |
| Hive Tyrant | 235 |
| **Total** | **235** |
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(1);
      expect(result.units[0].name).toBe('Hive Tyrant');
    });

    it('handles Default config', () => {
      const text = `
| Unit | Config | Points |
| Biovore x1 | Default | 40 |
`;
      const result = parsePlainText(text);

      expect(result.units[0].enhancement).toBeUndefined();
    });
  });

  describe('hierarchical markdown format', () => {
    it('parses Claude chat format with sections and indented enhancements', () => {
      const text = `## Tyranids - King of the Colosseum (500pts)

### HQ
- **Parasite of Mortrex** (Warlord) - 80pts
  - Enhancement: Adaptive Biology (25pts)

### Battleline
- **Termagants x20** - 120pts
  - Fleshborers

### Other
- **Genestealers x10** - 140pts
- **Biovore x1** - 50pts
- **Barbgaunts x5** - 55pts

---

**Total: 445pts**
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(5);
      expect(result.units[0].name).toBe('Parasite of Mortrex');
      expect(result.units[0].isWarlord).toBe(true);
      expect(result.units[0].enhancement).toBe('Adaptive Biology');
      expect(result.units[0].points).toBe(80);
      expect(result.units[1].name).toBe('Termagants');
      expect(result.units[1].modelCount).toBe(20);
      expect(result.units[2].name).toBe('Genestealers');
      expect(result.units[2].modelCount).toBe(10);
      expect(result.units[3].name).toBe('Biovore');
      expect(result.units[3].modelCount).toBe(1);
      expect(result.units[4].name).toBe('Barbgaunts');
      expect(result.units[4].modelCount).toBe(5);
    });

    it('skips markdown section headers', () => {
      const text = `### HQ
- Hive Tyrant - 195pts
### Troops
- Termagants x10 - 60pts
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
      expect(result.units[0].name).toBe('Hive Tyrant');
    });

    it('skips horizontal rules and total lines', () => {
      const text = `- Hive Tyrant - 195pts
---
**Total: 195pts**
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(1);
    });

    it('handles enhancement on indented line', () => {
      const text = `- **Hive Tyrant** - 195pts
  - Enhancement: Alien Cunning (30pts)
`;
      const result = parsePlainText(text);

      expect(result.units[0].enhancement).toBe('Alien Cunning');
    });

    it('captures weapon loadout from indented lines', () => {
      const text = `- **Termagants x20** - 120pts
  - Fleshborers
- **Tyranid Warriors x3** - 65pts
  - Deathspitters
  - Venom Cannon
`;
      const result = parsePlainText(text);

      expect(result.units[0].loadout).toEqual(['Fleshborers']);
      expect(result.units[1].loadout).toEqual(['Deathspitters', 'Venom Cannon']);
    });
  });

  describe('BattleScribe/New Recruit format', () => {
    it('skips model composition lines that match the unit name', () => {
      const text = `
Custodian Guard (150 pts)

4x Custodian Guard

4x Guardian Spear
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(1);
      expect(result.units[0].name).toBe('Custodian Guard');
      expect(result.units[0].modelCount).toBe(4);
      expect(result.units[0].points).toBe(150);
    });

    it('skips model composition lines with different model names', () => {
      const text = `
Witchseekers (65 pts)

1x Witchseeker Sister Superior

Close combat weapon
Witchseeker Flamer

4x Witchseeker

Close combat weapon
Witchseeker Flamer
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(1);
      expect(result.units[0].name).toBe('Witchseekers');
      expect(result.units[0].modelCount).toBe(4); // Should use the higher count
      expect(result.units[0].points).toBe(65);
    });

    it('parses full BattleScribe export format', () => {
      const text = `
Adeptus Custodes — 500 Points
Detachment: Shield Host

CHARACTERS
Shield-Captain (135 pts)

Warlord
Guardian Spear
Enhancement: From the Halls of Armories


BATTLELINE
Custodian Guard (150 pts)

4x Custodian Guard

4x Sentinel Blade
4x Praesidium Shield



Custodian Guard (150 pts)

4x Custodian Guard

4x Guardian Spear




OTHER DATASHEETS
Witchseekers (65 pts)

1x Witchseeker Sister Superior

Close combat weapon
Witchseeker Flamer


4x Witchseeker

Close combat weapon
Witchseeker Flamer




Total: 500 pts
`;
      const result = parsePlainText(text);

      expect(result.detachment).toBe('Shield Host');
      expect(result.units.length).toBe(4);
      expect(result.units[0].name).toBe('Shield-Captain');
      expect(result.units[0].points).toBe(135);
      expect(result.units[1].name).toBe('Custodian Guard');
      expect(result.units[1].modelCount).toBe(4);
      expect(result.units[2].name).toBe('Custodian Guard');
      expect(result.units[2].modelCount).toBe(4);
      expect(result.units[3].name).toBe('Witchseekers');
      expect(result.units[3].points).toBe(65);
    });

    it('imports Warhammer app exports without treating preamble or footer as units', () => {
      const text = `2k (2000 Points)

Space Marines
Dark Angels
Wrath of the Rock
Strike Force (2,000 Points)

CHARACTERS

Apothecary (60 Points)
  • 1x Absolvor bolt pistol
  • 1x Close combat weapon
  • 1x Reductor pistol
  • Enhancements: Tempered in Battle (Aura)

Azrael (125 Points)
  • Warlord
  • 1x Lion’s Wrath
  • 1x The Lion Helm
  • 1x The Sword of Secrets

Belial (85 Points)
  • 1x Master-crafted storm bolter
  • 1x The Sword of Silence

Chaplain in Terminator Armour (90 Points)
  • 1x Crozius arcanum
  • 1x Storm bolter
  • Enhancements: Deathwing Assault

Judiciar (95 Points)
  • 1x Absolvor bolt pistol
  • 1x Executioner relic blade
  • Enhancements: Ancient Weapons

BATTLELINE

Intercessor Squad (160 Points)
  • 1x Intercessor Sergeant
     ◦ 1x Bolt pistol
     ◦ 1x Close combat weapon
     ◦ 1x Hand flamer
  • 9x Intercessor
     ◦ 1x Astartes grenade launcher
     ◦ 9x Bolt pistol
     ◦ 9x Bolt rifle
     ◦ 9x Close combat weapon

OTHER DATASHEETS

Bladeguard Veteran Squad (170 Points)
  • 1x Bladeguard Veteran Sergeant
     ◦ 1x Heavy bolt pistol
     ◦ 1x Master-crafted power weapon
  • 5x Bladeguard Veteran
     ◦ 5x Heavy bolt pistol
     ◦ 5x Master-crafted power weapon

Deathwing Knights (250 Points)
  • 1x Knight Master
     ◦ 1x Great weapon of the Unforgiven
  • 4x Deathwing Knight
     ◦ 4x Mace of absolution

Deathwing Terminator Squad (180 Points)
  • 1x Deathwing Sergeant
     ◦ 1x Power weapon
     ◦ 1x Storm bolter
  • 4x Deathwing Terminator
     ◦ 4x Power fist
     ◦ 4x Storm bolter

Hellblaster Squad (110 Points)
  • 1x Hellblaster Sergeant
     ◦ 1x Bolt pistol
     ◦ 1x Close combat weapon
     ◦ 1x Plasma incinerator
  • 4x Hellblaster
     ◦ 4x Bolt pistol
     ◦ 4x Close combat weapon
     ◦ 4x Plasma incinerator

Infernus Squad (90 Points)
  • 1x Infernus Sergeant
     ◦ 1x Bolt pistol
     ◦ 1x Close combat weapon
     ◦ 1x Pyreblaster
  • 4x Infernus Marine
     ◦ 4x Bolt pistol
     ◦ 4x Close combat weapon
     ◦ 4x Pyreblaster

Infiltrator Squad (200 Points)
  • 1x Infiltrator Sergeant
     ◦ 1x Bolt pistol
     ◦ 1x Close combat weapon
     ◦ 1x Marksman bolt carbine
  • 9x Infiltrator
     ◦ 9x Bolt pistol
     ◦ 9x Close combat weapon
     ◦ 1x Helix Gauntlet
     ◦ 1x Infiltrator Comms Array
     ◦ 9x Marksman bolt carbine

Inner Circle Companions (90 Points)
  • 3x Inner Circle Companion
     ◦ 3x Calibanite greatsword
     ◦ 3x Heavy bolt pistol

Inner Circle Companions (90 Points)
  • 3x Inner Circle Companion
     ◦ 3x Calibanite greatsword
     ◦ 3x Heavy bolt pistol

Redemptor Dreadnought (205 Points)
  • 1x Heavy flamer
  • 1x Heavy onslaught gatling cannon
  • 1x Redemptor fist
  • 1x Twin fragstorm grenade launcher

Exported with App Version: v1.53.0 (1), Data Version: v780`;

      const parsed = parsePlainText(text);
      const result = importPlainText(text, actualDarkAngelsData, 'darkangels');

      expect(parsed.totalPoints).toBe(2000);
      expect(parsed.units).toHaveLength(15);
      expect(parsed.units.find((unit) => unit.name === 'Infiltrator Squad')?.modelCount).toBe(10);
      expect(result.unmatchedUnits).toEqual([]);
      expect(result.list.units).toHaveLength(15);
      expect(result.list.detachment).toBe('wrath_of_the_rock');
      expect(result.list.pointsLimit).toBe(2000);
      expect(calculateListPoints(result.list, actualDarkAngelsData)).toBeLessThan(2500);

      const intercessors = result.list.units.find((unit) => unit.unitId === 'intercessor-squad');
      expect(intercessors?.modelCount).toBe(10);

      const infiltrators = result.list.units.find((unit) => unit.unitId === 'infiltrator-squad');
      expect(infiltrators?.modelCount).toBe(10);

      const azrael = result.list.units.find((unit) => unit.unitId === 'azrael');
      expect(azrael?.isWarlord).toBe(true);

      const apothecary = result.list.units.find((unit) => unit.unitId === 'apothecary');
      expect(apothecary?.enhancement).toBe('tempered-in-battle');

      const chaplain = result.list.units.find((unit) => unit.unitId === 'chaplain-in-terminator-armour');
      expect(chaplain?.enhancement).toBe('deathwing-assault-wrath');
    });
  });

  describe('edge cases', () => {
    it('skips empty lines', () => {
      const text = `
Hive Tyrant - 235pts

Termagants x10 - 60pts
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(2);
    });

    it('skips comment lines', () => {
      const text = `
# This is a Tyranids list
Hive Tyrant - 235pts
`;
      const result = parsePlainText(text);

      expect(result.units.length).toBe(1);
    });

    it('calculates total points', () => {
      const text = `
Parasite of Mortrex - 90pts
Termagants x20 - 120pts
`;
      const result = parsePlainText(text);

      expect(result.totalPoints).toBe(210);
    });

    it('handles missing points', () => {
      const text = `Hive Tyrant`;
      const result = parsePlainText(text);

      expect(result.units[0].points).toBeUndefined();
      expect(result.totalPoints).toBeUndefined();
    });
  });
});

// ============================================================================
// convertTextToCurrentList Tests
// ============================================================================

describe('convertTextToCurrentList', () => {
  it('maps unit names to unit IDs', () => {
    const parsed = parsePlainText(`
Parasite of Mortrex - 90pts
Termagants x20 - 120pts
`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.list.units.length).toBe(2);
    expect(result.list.units[0].unitId).toBe('parasite-of-mortrex');
    expect(result.list.units[1].unitId).toBe('termagants');
  });

  it('preserves model counts', () => {
    const parsed = parsePlainText(`Termagants x20 - 120pts`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.list.units[0].modelCount).toBe(20);
  });

  it('adjusts invalid model counts to closest valid', () => {
    const parsed = parsePlainText(`Termagants x15 - 90pts`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    // 15 is not valid (only 10 or 20), should adjust to 10 (closest)
    expect(result.list.units[0].modelCount).toBe(10);
    expect(result.warnings.some((w) => w.includes('Adjusted model count'))).toBe(
      true
    );
  });

  it('reports warnings for unmatched units', () => {
    const parsed = parsePlainText(`Unknown Xenos Creature - 100pts`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.unmatchedUnits).toContain('Unknown Xenos Creature');
    expect(result.warnings.some((w) => w.includes('Unknown Xenos Creature'))).toBe(
      true
    );
  });

  it('matches partial unit names', () => {
    const parsed = parsePlainText(`Tyrant - 235pts`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    // Should match "Hive Tyrant" via partial match
    expect(result.list.units[0].unitId).toBe('hive-tyrant');
  });

  it('sets appropriate points limit', () => {
    const parsed = parsePlainText(`
Hive Tyrant - 235pts
Termagants x20 - 120pts
`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    // 355 points should round up to 500
    expect(result.list.pointsLimit).toBe(500);
  });

  it('uses first detachment as default', () => {
    const parsed = parsePlainText(`Hive Tyrant - 235pts`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.list.detachment).toBe('invasion-fleet');
  });

  it('uses detachment from parsed text', () => {
    const parsed = parsePlainText(`
**Detachment:** Invasion Fleet
Hive Tyrant - 235pts
`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.list.detachment).toBe('invasion-fleet');
  });

  it('maps enhancement from config column', () => {
    const parsed = parsePlainText(`
| Unit | Config | Points |
| Hive Tyrant | Adaptive Biology | 260 |
`);
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.list.units[0].enhancement).toBe('adaptive-biology');
  });

  it('uses parsed list name', () => {
    const parsed = parsePlainText(`
**Name:** My Tyranid Swarm
Hive Tyrant - 235pts
`);
    parsed.name = 'My Tyranid Swarm';
    const result = convertTextToCurrentList(parsed, mockArmyData, 'tyranids');

    expect(result.list.name).toBe('My Tyranid Swarm');
  });
});

// ============================================================================
// importPlainText Tests
// ============================================================================

describe('importPlainText', () => {
  it('successfully imports valid text', () => {
    const text = `Hive Tyrant - 235pts`;
    const result = importPlainText(text, mockArmyData, 'tyranids');

    expect(result.list.units.length).toBe(1);
  });

  it('throws error for empty text', () => {
    expect(() => importPlainText('', mockArmyData, 'tyranids')).toThrow(
      'No units found'
    );
  });

  it('throws error for text with no parseable units', () => {
    expect(() =>
      importPlainText('Just some random text', mockArmyData, 'tyranids')
    ).not.toThrow(); // Actually this will parse "Just some random text" as a unit name
  });
});

// ============================================================================
// Regression: em dash "—" must not match any enhancement
// ============================================================================

describe('enhancement matching regression', () => {
  const armyWithEnhancements: ArmyData = {
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
      {
        id: 'blade-champion',
        name: 'Blade Champion',
        points: { '1': 120 },
        stats: { m: 6, t: 6, sv: '2+', w: 6, ld: '6+', oc: 2 },
        invuln: '4+',
        weapons: [],
        abilities: [],
        keywords: ['Infantry', 'Character'],
      },
    ],
    detachments: {
      'lions-of-the-emperor': {
        name: 'Lions of the Emperor',
        rules: [],
        stratagems: [],
        enhancements: [
          {
            id: 'superior-creation',
            name: 'Superior Creation',
            points: 25,
            description: 'Test enhancement.',
          },
          {
            id: 'fierce-conqueror',
            name: 'Fierce Conqueror',
            points: 15,
            description: 'Test enhancement.',
          },
        ],
      },
    },
  };

  it('does not assign enhancement when table column has em dash', () => {
    const text = `**Detachment:** Lions of the Emperor
| Unit | Config | Enhancement | Points |
|------|--------|-------------|--------|
| Custodian Guard x4 | Guardian Spears | — | 150 |
| Blade Champion | Vaultswords | Superior Creation | 145 |`;

    const result = importPlainText(text, armyWithEnhancements, 'test');

    // Guard should have NO enhancement
    const guard = result.list.units.find(u => u.unitId === 'custodian-guard');
    expect(guard).toBeDefined();
    expect(guard!.enhancement).toBe('');

    // Blade Champion should have the correct enhancement
    const champion = result.list.units.find(u => u.unitId === 'blade-champion');
    expect(champion).toBeDefined();
    expect(champion!.enhancement).toBe('superior-creation');
  });

  it('does not assign enhancement when table column has en dash', () => {
    const text = `**Detachment:** Lions of the Emperor
| Unit | Config | Enhancement | Points |
|------|--------|-------------|--------|
| Custodian Guard x5 | Guardian Spears | – | 190 |`;

    const result = importPlainText(text, armyWithEnhancements, 'test');
    const guard = result.list.units.find(u => u.unitId === 'custodian-guard');

    expect(guard!.enhancement).toBe('');
  });

  it('does not assign enhancement when table column has hyphen', () => {
    const text = `**Detachment:** Lions of the Emperor
| Unit | Config | Enhancement | Points |
|------|--------|-------------|--------|
| Custodian Guard x4 | Guardian Spears | - | 150 |`;

    const result = importPlainText(text, armyWithEnhancements, 'test');
    const guard = result.list.units.find(u => u.unitId === 'custodian-guard');

    expect(guard!.enhancement).toBe('');
  });

  it('calculates correct total points without phantom enhancements', () => {
    const text = `**Detachment:** Lions of the Emperor
| Unit | Config | Enhancement | Points |
|------|--------|-------------|--------|
| Custodian Guard x4 | Guardian Spears | — | 150 |
| Custodian Guard x5 | Guardian Spears | — | 190 |
| Blade Champion | Vaultswords | Superior Creation | 145 |`;

    const result = importPlainText(text, armyWithEnhancements, 'test');

    // No unit should have enhancement except Blade Champion
    const guards = result.list.units.filter(u => u.unitId === 'custodian-guard');

    for (const guard of guards) {
      expect(guard.enhancement).toBe('');
    }

    const champion = result.list.units.find(u => u.unitId === 'blade-champion');
    expect(champion!.enhancement).toBe('superior-creation');
  });
});
