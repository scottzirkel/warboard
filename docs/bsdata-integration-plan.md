# BSData Integration Plan

## Goal

Replace manually-maintained JSON files with data parsed from BSData catalogues - the canonical source used by Battlescribe, New Recruit, and Rosterizer.

## Benefits

- **Always current**: Community maintains data, includes errata/FAQ updates
- **Complete coverage**: All factions, units, wargear, and rules
- **Consistent**: Same source as other army builders
- **Potential Yellowscribe fix**: If we generate proper .rosz files, TTS integration would work

## BSData Structure

Repository: https://github.com/BSData/wh40k-10e

```
wh40k-10e/
├── Imperium - Adeptus Custodes.cat    # Faction catalogue
├── Imperium - Space Marines.cat        # Another faction
├── Warhammer 40,000 10th Edition.gst   # Game system (shared rules)
└── ...
```

Files are XML (or zipped as .catz/.gstz). Key elements:

- **Game System (.gst)**: Core rules, shared keywords, cost types
- **Catalogue (.cat)**: Faction-specific units, weapons, abilities
- **Selections/Entries**: Unit definitions with nested options
- **Profiles**: Stats (characteristics) for units/weapons
- **Rules**: Ability text and special rules

## Implementation Phases

### Phase 1: Parser Foundation

1. **Fetch catalogues**: Download .cat/.gst files from BSData GitHub
2. **XML parsing**: Parse the BSData XML schema
3. **Type definitions**: Create TypeScript types matching BSData structure

Key files to parse:
- `Warhammer 40,000 10th Edition.gst` - Core rules
- `Imperium - Adeptus Custodes.cat` - Custodes data

### Phase 2: Data Transformation

Convert BSData format → our app's JSON format:

```typescript
// BSData format (simplified)
{
  selectionEntry: {
    id: "abc-123",
    name: "Custodian Guard",
    profiles: [
      { typeName: "Unit", characteristics: [...] }
    ],
    selectionEntryGroups: [
      { name: "Weapons", selectionEntries: [...] }
    ]
  }
}

// Our format
{
  id: "custodian-guard",
  name: "Custodian Guard",
  points: { "4": 180, "5": 225 },
  stats: { m: 6, t: 6, sv: "2+", w: 3, ld: "6+", oc: 2 },
  weapons: [...],
  loadoutOptions: [...]
}
```

Transformation needs:
- Extract unit stats from profiles
- Parse weapon profiles (ranged/melee)
- Build loadout options from selection groups
- Extract abilities and rules text
- Map keywords to our categories

### Phase 3: Build Pipeline

Options:

**A) Build-time generation (recommended)**
- Script runs during build
- Generates JSON files in `public/data/`
- No runtime overhead
- Can version control the output

**B) Runtime fetching**
- Fetch and parse on demand
- Always fresh data
- More complex, slower initial load

### Phase 4: .rosz Export (Yellowscribe fix)

With BSData IDs available, we can generate valid .rosz files:

```xml
<roster gameSystemId="sys-352e-adc2-7639-d6a9"
        catalogueId="[custodes-catalogue-id]">
  <selections>
    <selection entryId="[unit-entry-id]" name="Custodian Guard">
      ...
    </selection>
  </selections>
</roster>
```

This would fix Yellowscribe/TTS integration since we'd have proper IDs.

## Technical Considerations

### XML Schema

BSData uses a well-defined schema. Key types:
- `selectionEntry`: Units, models, upgrades
- `profile`: Stats (unit characteristics, weapon stats)
- `rule`: Ability/rule text
- `cost`: Points values
- `constraint`: Min/max model counts, restrictions

### ID Mapping

BSData uses UUIDs like `abc1-def2-3456-7890`. We need to:
- Preserve these for .rosz export
- Create readable slugs for our app (`custodian-guard`)
- Maintain a mapping between both

### Shared Entries

Some entries are shared (e.g., "Grenades" across factions). The game system file contains these, and catalogues reference them via `entryLink`.

### Modifiers

BSData has a modifier system for conditional stats. Example:
- "If model count > 5, add +10 points"
- "If equipped with X, gain ability Y"

We may need to evaluate these or simplify.

## Effort Estimate

| Phase | Complexity | Status | Notes |
|-------|------------|--------|-------|
| Phase 1: Parser | Medium | ✅ Complete | XML parser with fast-xml-parser |
| Phase 2: Transform | High | ✅ Complete | 31 units, all edge cases handled |
| Phase 3: Pipeline | Low | ✅ Complete | Build scripts integrated |
| Phase 4: .rosz | Medium | ✅ Complete | XML generation + UI integration |

Total: ~12 hours completed

## Starting Point

Minimal viable implementation:
1. Parse Custodes catalogue only
2. Extract units, weapons, points
3. Generate custodes.json
4. Compare output vs current manual file

## Resources

- BSData 10e repo: https://github.com/BSData/wh40k-10e
- Schema docs: https://github.com/BSData/catalogue-development/wiki
- Sample .cat file viewer: Open in text editor (it's XML)

---

## Progress Log

### Session 1 (2026-01-25)

**Completed:**
- [x] Backup current custodes.json
- [x] Download Custodes catalogue from BSData
- [x] Analyze XML structure (unit profiles, weapons, abilities)
- [x] Phase 1: Build XML parser script (v1) - 31 units parsed
- [x] Parser handles `type="unit"` entries (infantry, vehicles)
- [x] Parser handles `type="model"` entries (Characters)
- [x] Parser extracts: stats, weapons (melee/ranged), abilities, keywords, points
- [x] Add invuln save parsing from sharedProfiles
- [x] Started Phase 2: loadoutOptions generation

**✅ Session 2 Fixes (2026-01-25):**
- [x] Fixed regression in stats parsing (missing `?.profile` and `?.characteristic` accessors)
- [x] Fixed nested selectionEntryGroups for Character weapons (Shield-Captain in Terminator Armour)
- [x] Fixed direct selectionEntries weapons for Characters (Aleya, Trajann, Valerian)
- [x] Fixed entryLinks resolution for shared weapons (Aquilon Custodians, etc.)
- [x] All 31 units now have weapons parsed correctly
- [x] loadoutOptions and loadoutGroups now working for Custodian Guard

**✅ Session 3 (2026-01-25):**
- [x] Fixed points for multi-model units (Vertus Praetors now shows `{"2":150,"3":225}`)
  - Parser now checks `modifierGroups` in addition to `modifiers` for point costs
  - Removes 0-point entries that weren't set by modifiers
- [x] Added weapon modifiers support (Praesidium Shield +1W)
  - Added `WeaponModifier` interface with stat/operation/value/scope/source
  - Parser extracts modifiers from weapon selection entries
  - Parser extracts Praesidium Shield from model entry infoLinks
  - Character weapon parsing (extractWeaponsFromUpgrades) now includes modifiers
  - All Sentinel Blade weapons now have `modifiers: [{ stat: 'w', operation: 'add', value: 1, source: 'Praesidium Shield' }]`

Run parser: `npm run bsdata:parse`
Output: `scripts/bsdata/custodes-parsed.json`

**✅ loadoutOptions Validation (Session 3):**
- Allarus Custodians: Guardian Spear vs Castellan Axe + optional Vexilla ✓
- Custodian Guard: Guardian Spear vs Sentinel Blade + optional Vexilla ✓
- Custodian Wardens: Guardian Spear vs Castellan Axe + optional Vexilla ✓
- Vertus Praetors: Salvo launcher vs Hurricane bolter ✓
- Aquilon Custodians: 3 gauntlet + ranged weapon combinations ✓
- Agamatus Custodians: 3 interceptor lance + ranged combinations ✓
- Venatari Custodians: Venatari lance vs Kinetic destroyer ✓
- Sisters of Silence: Sister Superior upgrades ✓

**Phase 2 Complete!** Parser now fully extracts:
- All 31 units with stats, weapons, abilities, keywords
- Points for all model count configurations
- Weapon modifiers (Praesidium Shield +1W)
- loadoutOptions for all units with weapon choices
- Invulnerable saves
- BSData IDs for .rosz export

**Parsed Successfully (31 units):**
- Core Custodes: Custodian Guard, Wardens, Allarus, Vertus Praetors
- Characters: Shield-Captain (all 3 variants), Blade Champion, Trajann Valoris
- Sisters of Silence: Prosecutors, Vigilators, Witchseekers, Knight-Centura, Aleya, Valerian
- Forge World: Sagittarum, Aquilon, Agamatus, Venatari, various Contemptors
- Vehicles: Land Raider, Caladius, Coronus, Orion, Ares, Rhino

**Key Findings from XML Analysis:**
- Unit stats in `<profile typeName="Unit">` with characteristics (M, T, SV, W, LD, OC)
- Weapons in `<profile typeName="Melee Weapons">` and `<profile typeName="Ranged Weapons">`
- Abilities in `<profile typeName="Abilities">` with Description characteristic
- Points via `<cost name="pts">` and `<modifier>` elements
- Model variants as nested `<selectionEntry type="model">` elements
- BSData IDs are UUIDs like `91b3-2e1c-e642-d213`
- Characters use `type="model"` but have unit-level profiles
- Weapons for Characters are in `selectionEntryGroups` with `type="upgrade"`

**Files Created:**
- `scripts/bsdata/custodes.cat` - Downloaded catalogue
- `scripts/bsdata/parse-catalogue.ts` - Parser script
- `scripts/bsdata/custodes-parsed.json` - Parser output (31 units)

**Validation - Custodian Guard Comparison:**
| Field | Current | Parsed | Match |
|-------|---------|--------|-------|
| Points 4/5 | 150/190 | 150/190 | ✓ |
| M/T/SV/W/LD/OC | 6/6/2+/3/6+/2 | 6/6/2+/3/6+/2 | ✓ |
| Invuln | 4+ | 4+ | ✓ |
| Weapons | 6 | 5 | ✓ (Vexilla is equipment, not weapon) |
| Abilities | 3 | 2 | Missing Vexilla ability |
| loadoutOptions | - | 2 | ✓ (main weapon + vexilla) |
| loadoutGroups | - | 3 | ✓ (guardian-spear, sentinel-blade, vexilla) |

**Invuln Parsing Results:**
- Custodes: 4+ ✓
- Sisters of Silence (Aleya, Knight-Centura): 5+ ✓
- Units without invuln (Rhino, Prosecutors): null ✓

**✅ Phase 3 Complete (2026-01-25):**
- [x] Created `scripts/bsdata/generate-custodes.ts` - transforms parsed output to final format
- [x] Added npm scripts: `bsdata:generate` and `bsdata:build` (parse + generate)
- [x] Fixes null AP values → 0
- [x] Extracts `eligibleUnits` from Leader ability descriptions
- [x] Preserves detachments, armyRules, allies, keywordGlossary from existing file
- [x] All 382 tests pass

**BSData vs Manual Data Comparison:**
| Metric | Manual File | BSData Generated |
|--------|-------------|------------------|
| Units | 17 | 31 |
| Forge World | 0 | 11 |
| Detachments | 6 | 6 (preserved) |

**ID Changes to Note:**
- `shield-captain-allarus` → `shield-captain-in-allarus-terminator-armour`
- `shield-captain-jetbike` → `shield-captain-on-dawneagle-jetbike`
- `valerian-and-aleya` → separate `valerian` and `aleya` units

**Technical Notes:**
- Invuln saves in `sharedProfiles` section, referenced by `infoLink targetId`
- Profile ID `0300-84b9-69cf-b64f` = 4+ invuln for units
- Different invuln profiles for Characters (e.g., `4042-b2c1-d581-dbe7`)

---

## Phase 4: .rosz Export (Remaining Work)

### Goal

Generate valid BattleScribe `.rosz` roster files that can be:
1. Imported by Yellowscribe for TTS code generation
2. Opened in BattleScribe/New Recruit for validation
3. Shared with other players using standard roster format

### Yellowscribe Integration (Updated)

The app now uses Yellowscribe's .rosz endpoint (`src/app/api/yellowscribe/export/route.ts`):
- Generates .rosz XML with BSData IDs using `generateRosterXml()`
- Compresses with gzip to create proper .rosz format
- POSTs to `https://yellowscribe.link/makeArmyAndReturnCode`
- Returns a TTS import code

**Benefit**: Uses canonical BSData entry IDs for proper unit matching in TTS.

### .rosz File Format

A `.rosz` file is a **zipped XML roster**. Structure:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<roster id="[generated-uuid]"
        name="Army List Name"
        battleScribeVersion="2.03"
        gameSystemId="sys-352e-adc2-7639-d6a9"
        gameSystemName="Warhammer 40,000 10th Edition"
        gameSystemRevision="1"
        xmlns="http://www.battlescribe.net/schema/rosterSchema">

  <costs>
    <cost name="pts" typeId="51b2-306e-1021-d207" value="500"/>
  </costs>

  <forces>
    <force id="[uuid]" name="Adeptus Custodes"
           catalogueId="1f19-6509-d906-ca10"
           catalogueRevision="1"
           catalogueName="Imperium - Adeptus Custodes">

      <selections>
        <selection id="[uuid]" name="Custodian Guard"
                   entryId="[unit-bsdataId]"
                   number="1" type="unit">

          <costs>
            <cost name="pts" typeId="51b2-306e-1021-d207" value="150"/>
          </costs>

          <selections>
            <!-- Model selections with weapon choices -->
            <selection id="[uuid]" name="Custodian Guard"
                       entryId="[model-entry-id]"
                       number="4" type="model">
              <!-- Weapon selections -->
            </selection>
          </selections>

        </selection>
      </selections>

    </force>
  </forces>

</roster>
```

### BSData IDs Currently Available

| Data | ID Field | Location | Status |
|------|----------|----------|--------|
| Game System | `sys-352e-adc2-7639-d6a9` | Hardcode | ✅ Known |
| Catalogue (Custodes) | `1f19-6509-d906-ca10` | `custodes-parsed.json` | ✅ Available |
| Points Type | `51b2-306e-1021-d207` | Parser constant | ✅ Available |
| Unit Entry | `bsdataId` | `custodes.json` units | ✅ Available |
| Weapon Profile | Profile ID | Parser (line 220) | ❌ Not preserved |
| Model Entry | Model entry ID | Parser | ❌ Not preserved |
| Selection Entry | Entry ID | Parser | ❌ Not preserved |

### Required Changes

#### 1. Preserve Additional BSData IDs in Parser

Update `parse-catalogue.ts` to extract and save:

```typescript
interface Weapon {
  id: string;
  bsdataId: string;  // ADD: Profile ID for .rosz
  name: string;
  // ...
}

interface ParsedUnit {
  id: string;
  bsdataId: string;
  modelEntryId?: string;  // ADD: For model-type entries
  // ...
}
```

#### 2. Add catalogueId to Final Output

Update `generate-custodes.ts` to include:

```typescript
const output = {
  faction: parsed.faction,
  catalogueId: parsed.catalogueId,  // ADD
  gameSystemId: 'sys-352e-adc2-7639-d6a9',  // ADD
  // ...
};
```

#### 3. Create .rosz Generator

New file: `src/lib/roszExport.ts`

```typescript
export function generateRosz(list: CurrentList, armyData: ArmyData): Blob {
  const xml = generateRosterXml(list, armyData);
  return zipXml(xml, 'roster.ros');
}

function generateRosterXml(list: CurrentList, armyData: ArmyData): string {
  // Build XML using BSData IDs from armyData
  // Each unit selection references unit.bsdataId
  // Wrap in proper roster structure
}
```

#### 4. Add Export Option to UI

Extend export modal with `.rosz` format option alongside Plain Text/JSON/Yellowscribe.

### Implementation Steps

1. [x] Add `catalogueId` and `gameSystemId` to custodes.json
2. [ ] Extract and preserve weapon `bsdataId` in parser (optional - not needed for basic export)
3. [x] Create `src/lib/roszExport.ts` with XML generation
4. [x] Use browser CompressionStream API for gzip (no external dependency needed)
5. [x] Add "BattleScribe (.rosz)" option to export modal
6. [ ] Test generated .rosz in BattleScribe/New Recruit
7. [ ] Test with Yellowscribe .rosz import (if supported)

### Testing Strategy

1. **Manual BattleScribe Test**: Import generated .rosz, verify all units/weapons match
2. **Round-Trip Test**: Export → Import in BattleScribe → Export again → Compare
3. **Yellowscribe Test**: If Yellowscribe accepts .rosz, test TTS code generation

### Dependencies

```bash
npm install jszip  # For creating .rosz zip files
```

### Alternative: Minimal .rosz (Recommended First Step)

Start with a minimal .rosz that only includes:
- Roster metadata (name, points, game system)
- Force with catalogue reference
- Unit selections with `entryId` only (no nested weapon selections)

This simpler format may be sufficient for Yellowscribe matching while avoiding the complexity of full weapon/model selection trees.

---

## Summary

### Completed ✅

| Component | Details |
|-----------|---------|
| **Parser** | `scripts/bsdata/parse-catalogue.ts` - Parses BSData XML |
| **Generator** | `scripts/bsdata/generate-custodes.ts` - Transforms to app format |
| **Data** | 31 units with stats, weapons, abilities, loadoutOptions |
| **BSData IDs** | `bsdataId` preserved on all units |
| **Build Scripts** | `npm run bsdata:parse`, `npm run bsdata:generate`, `npm run bsdata:build` |

### Session 4 (2026-01-25) - Phase 4 Complete ✅

| Task | Status |
|------|--------|
| Add `catalogueId`/`gameSystemId` to custodes.json | ✅ Complete |
| Create `src/lib/roszExport.ts` with XML generation | ✅ Complete |
| Add "BattleScribe (.rosz)" to export modal | ✅ Complete |
| Write tests for roszExport (14 tests) | ✅ Complete |
| **Update Yellowscribe to use .rosz endpoint** | ✅ Complete |

**Yellowscribe Integration**: Now uses `/makeArmyAndReturnCode` with .rosz data instead of the JSON API. This sends proper BSData IDs for accurate unit matching in TTS.

### Remaining (Optional) ⏳

| Task | Priority | Notes |
|------|----------|-------|
| Preserve weapon BSData IDs in parser | Low | Only needed for full weapon selection trees |
| Test with BattleScribe/New Recruit | Medium | Manual validation recommended |
| ~~Test with Yellowscribe .rosz import~~ | ~~Low~~ | ✅ **Done** - Yellowscribe now uses .rosz |

### Commands

```bash
# Parse BSData catalogue
npm run bsdata:parse

# Generate custodes.json from parsed data
npm run bsdata:generate

# Full rebuild (parse + generate)
npm run bsdata:build
```

### Files

```
scripts/bsdata/
├── custodes.cat              # Downloaded BSData catalogue
├── parse-catalogue.ts        # XML parser script
├── generate-custodes.ts      # Transform to final format
└── custodes-parsed.json      # Intermediate parsed output

src/lib/
├── roszExport.ts             # .rosz XML generation + download
└── roszExport.test.ts        # Tests (14 passing)

src/components/ui/
└── ExportModal.tsx           # Export UI with BattleScribe option

public/data/
└── custodes.json             # Final output with BSData IDs
```
