# Yellowscribe .rosz Integration - Handoff Document

**Date**: 2026-01-25
**Status**: Complete - Ready for testing

## Goal

Make Yellowscribe export use proper .rosz files with BSData IDs so TTS unit matching works correctly.

## What's Done

### 1. BSData Integration Complete
- Parser extracts 31 units from BSData catalogue with `bsdataId` on each unit
- `catalogueId` and `gameSystemId` added to `custodes.json`
- Build pipeline: `npm run bsdata:build`

### 2. Full .rosz Generation Working
- `src/lib/roszExport.ts` - Generates complete roster XML with profiles and categories
- `src/lib/roszExport.test.ts` - 21 tests passing
- BattleScribe export option added to UI (downloads .rosz file)

### 3. Profile Generation (NEW)
Added helper functions to generate BattleScribe-compatible profiles:
- `generateUnitProfile(unit)` - Unit stats (M, T, SV, W, LD, OC, Invuln)
- `generateRangedWeaponProfile(weapon)` - Ranged weapon stats with abilities
- `generateMeleeWeaponProfile(weapon)` - Melee weapon stats with abilities
- `generateAbilityProfile(ability)` - Ability name and description
- `generateProfiles(unit)` - Combines all profiles for a unit

### 4. Category Generation (NEW)
- `generateCategories(unit)` - Creates category XML from unit keywords
- First keyword marked as `primary="true"`
- All keywords included as categories

### 5. Yellowscribe Route Updated
- `src/app/api/yellowscribe/export/route.ts` now uses:
  - `generateRosterXml()` to create roster XML
  - `archiver` package to create proper ZIP format
  - POSTs to `/makeArmyAndReturnCode` endpoint

### 6. Dependencies Added
```bash
npm install archiver @types/archiver
```

## Current XML Structure (Complete)

```xml
<selection id="..." name="Custodian Guard" entryId="..." type="unit">
  <costs>
    <cost name="pts" typeId="..." value="190"/>
  </costs>
  <profiles>
    <profile name="Custodian Guard" typeName="Unit">
      <characteristics>
        <characteristic name="M">6"</characteristic>
        <characteristic name="T">6</characteristic>
        <characteristic name="SV">2+</characteristic>
        <characteristic name="W">3</characteristic>
        <characteristic name="LD">6+</characteristic>
        <characteristic name="OC">2</characteristic>
        <characteristic name="Invuln">4+</characteristic>
      </characteristics>
    </profile>
    <profile name="Guardian Spear" typeName="Ranged Weapons">
      <characteristics>
        <characteristic name="Range">24"</characteristic>
        <characteristic name="A">2</characteristic>
        <characteristic name="BS">2+</characteristic>
        <characteristic name="S">4</characteristic>
        <characteristic name="AP">-1</characteristic>
        <characteristic name="D">2</characteristic>
        <characteristic name="Abilities">Assault</characteristic>
      </characteristics>
    </profile>
    <profile name="Guardian Spear" typeName="Melee Weapons">
      <characteristics>
        <characteristic name="Range">Melee</characteristic>
        <characteristic name="A">5</characteristic>
        <characteristic name="WS">2+</characteristic>
        <characteristic name="S">7</characteristic>
        <characteristic name="AP">-2</characteristic>
        <characteristic name="D">2</characteristic>
        <characteristic name="Abilities">-</characteristic>
      </characteristics>
    </profile>
    <profile name="Martial Prowess" typeName="Abilities">
      <characteristics>
        <characteristic name="Description">Once per battle...</characteristic>
      </characteristics>
    </profile>
  </profiles>
  <categories>
    <category name="Infantry" primary="true"/>
    <category name="Battleline" primary="false"/>
    <category name="Imperium" primary="false"/>
    <category name="Adeptus Custodes" primary="false"/>
  </categories>
  <selections>
    <selection type="model" number="5">...</selection>
  </selections>
</selection>
```

## Testing

### Test the Export
1. Start dev server: `npm run dev`
2. Add units to an army list
3. Click Export > Yellowscribe
4. If successful, you'll get a TTS import code
5. If it fails with 500, check console logs for Yellowscribe response

### Generate Test XML
```bash
npx tsx -e "
import { generateRosterXml } from './src/lib/roszExport';
const list = { name: 'Test', army: 'custodes', pointsLimit: 500, format: 'standard', detachment: 'shield-host', units: [{ unitId: 'custodian-guard', modelCount: 5, enhancement: '', weaponCounts: {}, currentWounds: null, leaderCurrentWounds: null, attachedLeader: null }] };
// Note: You'll need to load armyData from custodes.json
"
```

### Compare with Real BattleScribe Export
1. Create a roster in BattleScribe/New Recruit
2. Export as .rosz
3. Unzip and compare XML structure
4. Match our output to theirs

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/roszExport.ts` | XML generation with profiles and categories |
| `src/lib/roszExport.test.ts` | 21 tests covering all generation |
| `src/app/api/yellowscribe/export/route.ts` | API route for Yellowscribe |
| `public/data/custodes.json` | Unit data with BSData IDs |
| `docs/bsdata-integration-plan.md` | Full integration documentation |

## Yellowscribe API Reference

**Endpoint**: `POST https://yellowscribe.link/makeArmyAndReturnCode`

**Query Params**:
- `filename` - Name of the .rosz file
- `uiHeight`, `uiWidth` - TTS UI dimensions
- `decorativeNames` - Empty string
- `modules` - "MatchedPlay"

**Body**: Binary .rosz file (ZIP containing .ros XML)

**Response**: `{"code": "ABC123"}` - TTS import code

## Potential Issues

If Yellowscribe still returns 500 errors, possible causes:
1. **TypeId mismatch** - Yellowscribe may expect specific typeIds from BSData catalogs rather than random UUIDs
2. **Missing root profiles** - Some parsers expect a `<profiles>` section at the force level, not just unit level
3. **Schema validation** - XML namespace or schema version mismatch

To debug, compare with a real .rosz file exported from BattleScribe/New Recruit.

## Resources

- [Yellowscribe GitHub](https://github.com/ThePants999/Yellowscribe)
- [BSData Wiki](https://github.com/BSData/catalogue-development/wiki)
- Yellowscribe parser: `bin/roszParser.js` in their repo
