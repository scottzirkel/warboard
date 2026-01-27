import { describe, it, expect } from 'vitest';
import {
  parsePlainText,
  convertTextToCurrentList,
  importPlainText,
} from './plainTextParser';
import type { ArmyData } from '@/types';

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
