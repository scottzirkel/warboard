/**
 * BSData Build Pipeline - Phase 3
 *
 * Transforms parsed BSData output into the final custodes.json format.
 * Merges unit data from BSData with hand-crafted detachments, army rules, etc.
 *
 * Run with: npm run bsdata:generate
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const PARSED_PATH = join(__dirname, 'custodes-parsed.json');
const EXISTING_PATH = join(__dirname, '../../public/data/custodes.json');
const OUTPUT_PATH = join(__dirname, '../../public/data/custodes.json');

// Types for parsed BSData output
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

interface ParsedData {
  faction: string;
  source: string;
  catalogueId: string;
  lastUpdated: string;
  units: ParsedUnit[];
}

// Extract eligible units from Leader ability description
function extractEligibleUnits(description: string): string[] | undefined {
  // Match patterns like:
  // "This model can be attached to the following units:\n■ Custodian Guard\n■ Custodian Wardens"
  // "This model can be attached to Custodian Guard or Custodian Wardens."
  const eligibleUnits: string[] = [];

  // Pattern 1: Bullet list
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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

// Main build function
function build(): void {
  console.log('Reading parsed BSData output...');
  const parsedContent = readFileSync(PARSED_PATH, 'utf-8');
  const parsed: ParsedData = JSON.parse(parsedContent);

  console.log('Reading existing custodes.json for non-unit data...');
  const existingContent = readFileSync(EXISTING_PATH, 'utf-8');
  const existing = JSON.parse(existingContent);

  console.log(`Transforming ${parsed.units.length} units...`);
  const transformedUnits = parsed.units.map(transformUnit);

  // BSData metadata for .rosz export
  const GAME_SYSTEM_ID = 'sys-352e-adc2-7639-d6a9'; // Warhammer 40,000 10th Edition

  // Build the final output
  const output = {
    faction: parsed.faction,
    lastUpdated: new Date().toISOString().slice(0, 7), // "2026-01"
    catalogueId: parsed.catalogueId,
    gameSystemId: GAME_SYSTEM_ID,
    units: transformedUnits,
    detachments: existing.detachments,
    armyRules: existing.armyRules,
    allies: existing.allies,
    keywordGlossary: existing.keywordGlossary,
  };

  // Write output
  console.log(`Writing to ${OUTPUT_PATH}...`);
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');

  console.log('\n=== Build Complete ===');
  console.log(`Units: ${output.units.length}`);
  console.log(`Detachments: ${Object.keys(output.detachments).length}`);

  // Summarize changes
  console.log('\n=== Unit Summary ===');
  for (const unit of output.units) {
    const leaderAbility = unit.abilities.find((a) => a.name === 'Leader');
    const eligibleInfo = leaderAbility?.eligibleUnits
      ? ` (Leader: ${leaderAbility.eligibleUnits.join(', ')})`
      : '';
    console.log(`- ${unit.name}: ${Object.keys(unit.points).join('/')} models, ${unit.weapons.length} weapons${eligibleInfo}`);
  }
}

// Run
build();
