/**
 * Faction Data Validator
 *
 * Validates faction JSON files for common issues that cause bugs in the app,
 * such as loadoutGroup/choice ID mismatches (the recurring missing-wargear bug).
 *
 * Run with: npx tsx scripts/bsdata/validate-faction.ts [faction-id|--all]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FACTIONS, getFaction, getAllFactionIds } from './factions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DATA_PATH = join(__dirname, '../../public/data');

interface ValidationError {
  unit?: string;
  check: string;
  message: string;
}

interface ValidationWarning {
  unit?: string;
  check: string;
  message: string;
}

interface ValidationResult {
  factionId: string;
  factionName: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  unitCount: number;
}

interface FactionData {
  faction: string;
  units: FactionUnit[];
  detachments?: Record<string, Detachment>;
  [key: string]: unknown;
}

interface FactionUnit {
  id: string;
  name: string;
  stats?: { m?: number; t?: number; sv?: string; w?: number; ld?: string; oc?: number };
  points?: Record<string, number>;
  weapons?: Weapon[];
  loadoutOptions?: LoadoutOption[];
  abilities?: Ability[];
  keywords?: string[];
}

interface Weapon {
  id: string;
  name: string;
  type: string;
  stats: Record<string, unknown>;
  loadoutGroup?: string;
  abilities?: string[];
}

interface LoadoutOption {
  id: string;
  name: string;
  type: string;
  pattern: string;
  choices: LoadoutChoice[];
}

interface LoadoutChoice {
  id: string;
  name: string;
  default?: boolean;
  maxModels?: number;
}

interface Ability {
  id: string;
  name: string;
  description: string;
}

interface Detachment {
  name?: string;
  rules?: unknown[];
  detachmentRule?: unknown;
  stratagems?: unknown[];
  enhancements?: unknown[];
}

function validateFaction(factionId: string): ValidationResult | null {
  const faction = getFaction(factionId);
  if (!faction) {
    console.error(`Unknown faction: ${factionId}`);
    return null;
  }

  const filePath = join(PUBLIC_DATA_PATH, faction.outputFile);
  if (!existsSync(filePath)) {
    console.error(`  Data file not found: ${filePath}`);
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  const data: FactionData = JSON.parse(content);

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const unit of data.units) {
    // Check 1: Required stats
    checkRequiredStats(unit, errors);

    // Check 2: Points present
    checkPointsPresent(unit, errors);

    // Check 3: loadoutGroup <-> choice ID match
    checkLoadoutGroupChoiceMatch(unit, errors);

    // Check 4: Replacement completeness
    checkReplacementCompleteness(unit, warnings);

    // Check 5: Orphan loadoutGroups
    checkOrphanLoadoutGroups(unit, warnings);
  }

  // Check 6: Detachment structure
  checkDetachmentStructure(data, errors, warnings);

  return {
    factionId,
    factionName: data.faction || faction.name,
    errors,
    warnings,
    unitCount: data.units.length,
  };
}

function checkRequiredStats(unit: FactionUnit, errors: ValidationError[]): void {
  if (!unit.stats) {
    errors.push({
      unit: unit.name,
      check: 'required-stats',
      message: 'Unit is missing stats object entirely',
    });
    return;
  }

  const required = ['m', 't', 'sv', 'w', 'ld', 'oc'] as const;
  for (const stat of required) {
    if (unit.stats[stat] === undefined || unit.stats[stat] === null) {
      errors.push({
        unit: unit.name,
        check: 'required-stats',
        message: `Missing required stat: ${stat}`,
      });
    }
  }
}

function checkPointsPresent(unit: FactionUnit, errors: ValidationError[]): void {
  if (!unit.points || Object.keys(unit.points).length === 0) {
    errors.push({
      unit: unit.name,
      check: 'points-present',
      message: 'Unit has no points entries',
    });
    return;
  }

  const hasNonZero = Object.values(unit.points).some((v) => v > 0);
  if (!hasNonZero) {
    errors.push({
      unit: unit.name,
      check: 'points-present',
      message: 'All points entries are zero',
    });
  }
}

function checkLoadoutGroupChoiceMatch(unit: FactionUnit, errors: ValidationError[]): void {
  if (!unit.weapons || !unit.loadoutOptions) return;

  // Get all loadoutGroups from weapons (excluding undefined)
  const weaponLoadoutGroups = new Set<string>();
  for (const weapon of unit.weapons) {
    if (weapon.loadoutGroup) {
      weaponLoadoutGroups.add(weapon.loadoutGroup);
    }
  }

  // Get all choice IDs from loadoutOptions (excluding "none")
  const choiceIds = new Set<string>();
  for (const option of unit.loadoutOptions) {
    for (const choice of option.choices) {
      if (choice.id !== 'none') {
        choiceIds.add(choice.id);
      }
    }
  }

  // Check: Every weapon loadoutGroup must match a choice ID
  for (const group of weaponLoadoutGroups) {
    if (!choiceIds.has(group)) {
      errors.push({
        unit: unit.name,
        check: 'loadout-group-match',
        message: `Weapon loadoutGroup "${group}" has no matching choice ID in loadoutOptions`,
      });
    }
  }

  // Check: Every choice ID must have at least one weapon with that loadoutGroup
  for (const choiceId of choiceIds) {
    if (!weaponLoadoutGroups.has(choiceId)) {
      errors.push({
        unit: unit.name,
        check: 'loadout-group-match',
        message: `LoadoutOption choice ID "${choiceId}" has no weapons with matching loadoutGroup`,
      });
    }
  }
}

function checkReplacementCompleteness(unit: FactionUnit, warnings: ValidationWarning[]): void {
  if (!unit.weapons || !unit.loadoutOptions) return;

  for (const option of unit.loadoutOptions) {
    if (option.pattern !== 'replacement') continue;

    for (const choice of option.choices) {
      if (choice.id === 'none') continue;

      const hasWeapons = unit.weapons.some((w) => w.loadoutGroup === choice.id);
      if (!hasWeapons) {
        warnings.push({
          unit: unit.name,
          check: 'replacement-completeness',
          message: `Replacement option "${option.name}" choice "${choice.name}" (${choice.id}) has no weapons`,
        });
      }
    }
  }
}

function checkOrphanLoadoutGroups(unit: FactionUnit, warnings: ValidationWarning[]): void {
  if (!unit.weapons) return;

  const hasLoadoutOptions = unit.loadoutOptions && unit.loadoutOptions.length > 0;
  const weaponsWithGroups = unit.weapons.filter((w) => w.loadoutGroup);

  if (weaponsWithGroups.length > 0 && !hasLoadoutOptions) {
    const groups = [...new Set(weaponsWithGroups.map((w) => w.loadoutGroup))];
    warnings.push({
      unit: unit.name,
      check: 'orphan-loadout-groups',
      message: `Weapons have loadoutGroups [${groups.join(', ')}] but unit has no loadoutOptions`,
    });
  }
}

function checkDetachmentStructure(
  data: FactionData,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!data.detachments) {
    warnings.push({
      check: 'detachment-structure',
      message: 'No detachments defined',
    });
    return;
  }

  for (const [key, detachment] of Object.entries(data.detachments)) {
    if (!detachment.name) {
      errors.push({
        check: 'detachment-structure',
        message: `Detachment "${key}" is missing name`,
      });
    }

    if (!detachment.rules && !detachment.detachmentRule) {
      warnings.push({
        check: 'detachment-structure',
        message: `Detachment "${key}" has no rules or detachmentRule`,
      });
    }

    if (!detachment.stratagems || (Array.isArray(detachment.stratagems) && detachment.stratagems.length === 0)) {
      warnings.push({
        check: 'detachment-structure',
        message: `Detachment "${key}" has no stratagems`,
      });
    }

    if (!detachment.enhancements || (Array.isArray(detachment.enhancements) && detachment.enhancements.length === 0)) {
      warnings.push({
        check: 'detachment-structure',
        message: `Detachment "${key}" has no enhancements`,
      });
    }
  }
}

function printResult(result: ValidationResult): void {
  const status = result.errors.length === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`\n${status} ${result.factionName} (${result.unitCount} units)`);

  if (result.errors.length > 0) {
    console.log(`  \x1b[31mErrors (${result.errors.length}):\x1b[0m`);
    for (const error of result.errors) {
      const prefix = error.unit ? `[${error.unit}]` : '[global]';
      console.log(`    ${prefix} ${error.check}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`  \x1b[33mWarnings (${result.warnings.length}):\x1b[0m`);
    for (const warning of result.warnings) {
      const prefix = warning.unit ? `[${warning.unit}]` : '[global]';
      console.log(`    ${prefix} ${warning.check}: ${warning.message}`);
    }
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('  All checks passed');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/bsdata/validate-faction.ts [faction-id|--all]');
    console.log('\nAvailable factions:');
    for (const f of FACTIONS) {
      console.log(`  ${f.id.padEnd(15)} - ${f.name}`);
    }
    process.exit(1);
  }

  const factionIds = args[0] === '--all' ? getAllFactionIds() : args;

  console.log('=== Faction Data Validation ===');

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFactions = 0;

  for (const factionId of factionIds) {
    const result = validateFaction(factionId);
    if (result) {
      printResult(result);
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      totalFactions++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Factions: ${totalFactions}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
