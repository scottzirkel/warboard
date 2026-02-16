# Adding a New Faction

Step-by-step guide for adding a new army to the app using the BSData import pipeline.

## Prerequisites

1. BSData `wh40k-10e` repository cloned locally
2. `BSDATA_PATH` environment variable set (or update the default in `scripts/bsdata/factions.ts`)
3. Node.js with `tsx` available (`npx tsx`)

## Step-by-Step

### 1. Register the Faction

Edit `scripts/bsdata/factions.ts` and add an entry:

```typescript
{
  id: 'myfaction',
  name: 'My Faction',
  catalogueFile: 'My Faction.cat',     // Exact filename in BSData repo
  outputFile: 'myfaction.json',
  theme: 'myfaction',
}
```

The `catalogueFile` must match the exact filename in the BSData repository.

### 2. Parse the Catalogue

```bash
npm run bsdata:parse -- myfaction
```

This reads the BSData XML catalogue and produces `scripts/bsdata/myfaction-parsed.json` with all unit data.

**Cross-catalogue references:** If the faction's `.cat` file has a `<catalogueLink importRootEntries="true"/>` (like Black Templars linking to Space Marines), the parser automatically loads and merges the parent catalogue's shared entries.

### 3. Generate the Faction JSON

```bash
npm run bsdata:generate -- myfaction
```

This transforms the parsed data into the final format at `public/data/myfaction.json`. On subsequent runs, it preserves hand-crafted data (detachments, army rules, etc.) while updating the auto-generated unit data.

### 4. Validate the Data

```bash
npx tsx scripts/bsdata/validate-faction.ts myfaction
```

Checks for:
- `loadoutGroup` / choice ID mismatches (the most common bug)
- Missing required unit stats
- Zero-point units
- Incomplete detachment structures

Fix any errors before proceeding.

### 5. Hand-Craft Detachments

Edit `public/data/myfaction.json` and add these sections (the generator preserves them on re-runs):

- **`armyRules`** - Faction-wide special rules
- **`detachments`** - Detachment rules, stratagems (6 per detachment), enhancements (4 per detachment)
- **`coreStratagems`** - Copy from any existing faction (shared across all armies)
- **`weaponKeywords`** - Weapon ability definitions
- **`keywordGlossary`** - Unit and weapon keyword definitions

Source detachment data from [Wahapedia](https://wahapedia.ru/wh40k10ed/factions/).

### 6. App Integration (3 files)

**`src/stores/armyStore.ts`** - Add to `availableArmies` array:
```typescript
{ id: 'myfaction', name: 'My Faction', file: 'myfaction.json' }
```

**`src/app/globals.css`** - Add theme CSS variables:
```css
[data-theme="myfaction"] {
  --accent-50: #...;
  /* ... through --accent-900 and --accent-glow */
}
```

**`src/components/LandingPage.tsx`** - Add to `factionColors`:
```typescript
myfaction: {
  bg: 'from-color-900/30 to-color-950/40',
  border: 'border-color-600/30 hover:border-color-500/60',
  text: 'text-color-400',
},
```

### 7. Full Validation

```bash
npm run validate
```

This runs lint, typecheck, tests, and build. Everything must pass.

## Preserved vs Generated Fields

The generator (`generate-faction.ts`) **auto-generates** these from BSData:
- `faction`, `lastUpdated`, `catalogueId`, `catalogueRevision`, `gameSystemId`
- `units` (all unit data, stats, weapons, loadoutOptions, abilities, keywords)

It **preserves** these from the existing JSON file:
- `detachments`, `armyRules`, `armyRule`
- `allies`, `chapter`
- `keywordGlossary`, `weaponKeywords`, `weaponAbilities`
- `coreStratagems`

This means you can safely re-run `bsdata:sync` to update unit data without losing hand-crafted detachment data.

## Cross-Catalogue References (SM Successors)

Space Marine successor chapters (Black Templars, Blood Angels, Dark Angels, Space Wolves, etc.) use `catalogueLink` elements to import shared units from the parent Space Marines catalogue:

```xml
<catalogueLink name="Imperium - Space Marines" importRootEntries="true"/>
```

The parser automatically:
1. Detects `catalogueLinks` in the catalogue XML
2. Loads the parent catalogue file
3. Merges parent's `sharedProfiles` and `sharedSelectionEntries`
4. Resolves `entryLink` references that target parent entries

No special configuration is needed - just register the faction and parse normally.

## Troubleshooting

### loadoutGroup mismatches
The most common issue. Weapons have `loadoutGroup` values that don't match any `choices[].id` in `loadoutOptions`. Run the validator to find them:
```bash
npx tsx scripts/bsdata/validate-faction.ts myfaction
```

### Missing weapons in Play Mode
Usually caused by loadoutGroup mismatches. The app filters weapons by the selected loadout choice ID, so if a weapon's `loadoutGroup` doesn't match, it won't display.

### Zero-point units
Some BSData entries don't include points data (e.g., Mucolid Spores). You may need to manually add points from the Munitorum Field Manual.

### Cross-catalogue: parent not found
The parser looks for parent catalogues by the `name` attribute in the `catalogueLink`. Ensure the parent catalogue file exists in the BSData repository at `$BSDATA_PATH`.
