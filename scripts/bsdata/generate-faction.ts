/**
 * BSData Faction Generator
 *
 * Transforms parsed BSData output into the final faction JSON format.
 * Merges unit data from BSData with hand-crafted detachments, army rules, etc.
 *
 * Run with: npx tsx scripts/bsdata/generate-faction.ts [faction-id|--all]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FACTIONS, getFaction, getAllFactionIds, type FactionConfig } from './factions.js';
import type { ParsedData } from './parse-catalogue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const PUBLIC_DATA_PATH = join(__dirname, '../../public/data');

// BSData metadata for .rosz export
const GAME_SYSTEM_ID = 'sys-352e-adc2-7639-d6a9'; // Warhammer 40,000 10th Edition

// Types
interface ParsedWeapon {
  id: string;
  name: string;
  type: 'melee' | 'ranged' | 'equipment';
  stats: {
    range?: number;
    a: number | string;
    bs?: string;
    ws?: string;
    s: number;
    ap: number | null;
    d: number | string;
  };
  abilities: string[];
  loadoutGroup?: string;
  modifiers?: Array<{
    stat: string;
    operation: string;
    value: number;
    scope: string;
    source?: string;
  }>;
}

interface ParsedAbility {
  id: string;
  name: string;
  description: string;
  loadoutGroup?: string;
  eligibleUnits?: string[];
}

interface ParsedUnit {
  id: string;
  bsdataId: string;
  name: string;
  points: Record<string, number>;
  stats: {
    m: number;
    t: number;
    sv: string;
    w: number;
    ld: string;
    oc: number;
  };
  invuln?: string;
  weapons: ParsedWeapon[];
  loadoutOptions?: Array<{
    id: string;
    name: string;
    type: 'choice' | 'optional';
    pattern: 'replacement' | 'addition';
    choices: Array<{
      id: string;
      name: string;
      default?: boolean;
      maxModels?: number;
    }>;
  }>;
  abilities: ParsedAbility[];
  keywords: string[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Extract eligible units from Leader ability description
function extractEligibleUnits(description: string): string[] | undefined {
  const eligibleUnits: string[] = [];

  // Pattern 1: Bullet list (■ Unit Name)
  const bulletPattern = /■\s*([^\n■]+)/g;
  let match;
  while ((match = bulletPattern.exec(description)) !== null) {
    const unitName = match[1].trim();
    if (unitName) {
      eligibleUnits.push(slugify(unitName));
    }
  }

  if (eligibleUnits.length > 0) {
    return eligibleUnits;
  }

  // Pattern 2: "attached to X, Y, or Z"
  const attachedPattern = /attached to\s+(.+?)\.?$/i;
  const attachedMatch = description.match(attachedPattern);
  if (attachedMatch) {
    const unitList = attachedMatch[1]
      .split(/,\s*|\s+or\s+|\s+and\s+/)
      .map((u) => slugify(u.trim()))
      .filter((u) => u.length > 0);
    if (unitList.length > 0) {
      return unitList;
    }
  }

  return undefined;
}

// Fix AP values (null -> 0)
function fixApValue(ap: number | null): number {
  return ap === null ? 0 : ap;
}

// Transform parsed unit to final format
function transformUnit(parsed: ParsedUnit): ParsedUnit {
  // Fix weapon AP values
  const weapons = parsed.weapons.map((w) => ({
    ...w,
    stats: {
      ...w.stats,
      ap: fixApValue(w.stats.ap),
    },
  }));

  // Add eligibleUnits to Leader abilities
  const abilities = parsed.abilities.map((ability) => {
    if (ability.name === 'Leader' && !ability.eligibleUnits) {
      const eligibleUnits = extractEligibleUnits(ability.description);
      if (eligibleUnits) {
        return { ...ability, eligibleUnits };
      }
    }
    return ability;
  });

  return {
    ...parsed,
    weapons,
    abilities,
  };
}

// Generate faction JSON
function generateFaction(faction: FactionConfig): boolean {
  const parsedPath = join(__dirname, `${faction.id}-parsed.json`);
  const existingPath = join(PUBLIC_DATA_PATH, faction.outputFile);
  const outputPath = existingPath;

  // Check for parsed data
  if (!existsSync(parsedPath)) {
    console.error(`  Parsed data not found: ${parsedPath}`);
    console.error(`  Run: npx tsx scripts/bsdata/parse-catalogue.ts ${faction.id}`);
    return false;
  }

  console.log(`  Reading parsed data...`);
  const parsedContent = readFileSync(parsedPath, 'utf-8');
  const parsed: ParsedData = JSON.parse(parsedContent);

  // Read existing file for hand-crafted data (detachments, rules, etc.)
  let existing: Record<string, unknown> = {};
  if (existsSync(existingPath)) {
    console.log(`  Reading existing data for merge...`);
    const existingContent = readFileSync(existingPath, 'utf-8');
    existing = JSON.parse(existingContent);
  }

  console.log(`  Transforming ${parsed.units.length} units...`);
  const transformedUnits = parsed.units.map(transformUnit);

  // Build the final output
  // Start with BSData-sourced fields
  const output: Record<string, unknown> = {
    faction: parsed.faction,
    lastUpdated: new Date().toISOString().slice(0, 7), // "2026-02"
    catalogueId: parsed.catalogueId,
    catalogueRevision: parsed.catalogueRevision,
    gameSystemId: GAME_SYSTEM_ID,
    units: transformedUnits,
  };

  // Preserve all hand-crafted data from existing file
  // These are fields that aren't generated from BSData
  const preservedFields = [
    'detachments',
    'armyRules',
    'armyRule', // Some files use singular
    'allies',
    'keywordGlossary',
    'weaponKeywords',
    'weaponAbilities',
    'coreStratagems',
    'chapter', // Space Marines specific
  ];

  for (const field of preservedFields) {
    if (existing[field]) {
      output[field] = existing[field];
    }
  }

  // Write output
  console.log(`  Writing: ${outputPath}`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');

  // Summary
  console.log(`  Units: ${transformedUnits.length}`);
  if (output.detachments) {
    const detachmentCount = typeof output.detachments === 'object'
      ? Object.keys(output.detachments as object).length
      : 0;
    console.log(`  Detachments: ${detachmentCount}`);
  }

  return true;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/bsdata/generate-faction.ts [faction-id|--all]');
    console.log('\nAvailable factions:');
    for (const f of FACTIONS) {
      console.log(`  ${f.id.padEnd(15)} - ${f.name}`);
    }
    process.exit(1);
  }

  const factionIds = args[0] === '--all' ? getAllFactionIds() : args;
  let successCount = 0;
  let failCount = 0;

  for (const factionId of factionIds) {
    const faction = getFaction(factionId);
    if (!faction) {
      console.error(`Unknown faction: ${factionId}`);
      failCount++;
      continue;
    }

    console.log(`\n=== Generating ${faction.name} ===`);
    if (generateFaction(faction)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error);
