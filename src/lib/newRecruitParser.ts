import type { CurrentList, ListUnit, ArmyData } from '@/types';
import { findUnitById } from '@/lib/armyDataUtils';

// ============================================================================
// New Recruit / BattleScribe JSON Types
// ============================================================================

interface NRCost {
  name: string;
  value: number;
}

interface NRCategory {
  name: string;
  entryId: string;
  primary: boolean;
}

interface NRSelection {
  id?: string;
  name: string;
  type: 'unit' | 'model' | 'upgrade';
  number: number;
  from?: string;
  group?: string;
  entryId?: string;
  entryGroupId?: string;
  costs?: NRCost[];
  categories?: NRCategory[];
  selections?: NRSelection[];
  profiles?: NRProfile[];
}

interface NRProfile {
  name: string;
  typeName: string;
}

interface NRForce {
  selections: NRSelection[];
  categories: NRCategory[];
}

interface NRRoster {
  name: string;
  costs: NRCost[];
  forces: NRForce[];
}

interface NewRecruitJSON {
  roster: NRRoster;
}

// ============================================================================
// Parsed Unit Type
// ============================================================================

export interface ParsedUnit {
  name: string;
  modelCount: number;
  points: number;
  enhancement?: string;
  loadout: string[];
  keywords: string[];
}

export interface ParsedList {
  name: string;
  detachment?: string;
  totalPoints: number;
  units: ParsedUnit[];
}

// ============================================================================
// Name Normalization
// ============================================================================

/**
 * Normalize a unit name to match our unitId format.
 * "Custodian Guard" -> "custodian-guard"
 */
export function normalizeUnitName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Normalize an enhancement name to match our enhancementId format.
 * "From the Hall of Armouries" -> "from-the-hall-of-armouries"
 */
export function normalizeEnhancementName(name: string): string {
  return normalizeUnitName(name);
}

/**
 * Normalize a loadout choice name.
 * "Guardian Spear" -> "guardian-spear" or mapped to loadout group
 */
export function normalizeLoadoutName(name: string): string {
  return normalizeUnitName(name);
}

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Extract the detachment name from the roster.
 */
function extractDetachment(selections: NRSelection[]): string | undefined {
  const detachmentConfig = selections.find(
    (s) => s.name === 'Detachments' && s.type === 'upgrade'
  );

  if (!detachmentConfig?.selections) return undefined;

  const detachmentSelection = detachmentConfig.selections.find(
    (s) => s.group === 'Detachment'
  );

  return detachmentSelection?.name;
}

/**
 * Extract units from a force's selections.
 */
function extractUnits(selections: NRSelection[]): ParsedUnit[] {
  const units: ParsedUnit[] = [];

  for (const selection of selections) {
    // Skip configuration entries
    if (selection.type === 'upgrade') continue;

    // Handle unit type selections
    if (selection.type === 'unit') {
      const unit = parseUnit(selection);

      if (unit) {
        units.push(unit);
      }
    }

    // Handle standalone models (characters, vehicles, monsters at top level)
    if (selection.type === 'model') {
      const isSingleModelUnit = selection.categories?.some(
        (c) => c.name === 'Character' || c.name === 'Vehicle' || c.name === 'Monster'
      );

      if (isSingleModelUnit) {
        const unit = parseCharacter(selection);

        if (unit) {
          units.push(unit);
        }
      }
    }
  }

  return units;
}

/**
 * Parse a unit selection.
 */
function parseUnit(selection: NRSelection): ParsedUnit | null {
  const points = selection.costs?.find((c) => c.name === 'pts')?.value || 0;

  // Count models by looking at nested selections
  let modelCount = 0;
  const loadout: string[] = [];
  let enhancement: string | undefined;

  if (selection.selections) {
    for (const sub of selection.selections) {
      if (sub.type === 'model') {
        modelCount += sub.number;

        // Extract loadout from model's selections
        if (sub.selections) {
          for (const weaponSel of sub.selections) {
            if (weaponSel.type === 'upgrade') {
              // Check if it's a weapon
              const isWeapon = weaponSel.categories?.some(
                (c) =>
                  c.name === 'Melee Weapon' ||
                  c.name === 'Ranged Weapon' ||
                  c.name.includes('Weapon')
              );

              if (isWeapon || !weaponSel.group) {
                loadout.push(weaponSel.name);
              }
            }
          }
        }
      }

      // Check for enhancements
      if (sub.type === 'upgrade' && sub.group === 'Enhancements') {
        enhancement = sub.name;
      }
    }
  }

  // If no nested models, use the selection's number
  if (modelCount === 0) {
    modelCount = selection.number || 1;
  }

  // Extract keywords from categories
  const keywords =
    selection.categories
      ?.filter((c) => !c.name.startsWith('Faction:'))
      .map((c) => c.name) || [];

  return {
    name: selection.name,
    modelCount,
    points,
    enhancement,
    loadout: [...new Set(loadout)], // Dedupe
    keywords,
  };
}

/**
 * Parse a standalone character.
 */
function parseCharacter(selection: NRSelection): ParsedUnit | null {
  const points = selection.costs?.find((c) => c.name === 'pts')?.value || 0;
  const loadout: string[] = [];
  let enhancement: string | undefined;

  if (selection.selections) {
    for (const sub of selection.selections) {
      // Check for enhancements
      if (sub.type === 'upgrade' && sub.group === 'Enhancements') {
        enhancement = sub.name;
      }

      // Check for weapons
      if (sub.type === 'upgrade') {
        const isWeapon = sub.categories?.some(
          (c) =>
            c.name === 'Melee Weapon' ||
            c.name === 'Ranged Weapon' ||
            c.name.includes('Weapon')
        );

        if (isWeapon) {
          loadout.push(sub.name);
        }
      }
    }
  }

  const keywords =
    selection.categories
      ?.filter((c) => !c.name.startsWith('Faction:'))
      .map((c) => c.name) || [];

  return {
    name: selection.name,
    modelCount: 1,
    points,
    enhancement,
    loadout: [...new Set(loadout)],
    keywords,
  };
}

/**
 * Parse a New Recruit JSON export into a structured list.
 */
export function parseNewRecruitJSON(json: NewRecruitJSON): ParsedList {
  const roster = json.roster;
  const force = roster.forces[0];

  if (!force) {
    throw new Error('No force found in roster');
  }

  const detachment = extractDetachment(force.selections);
  const units = extractUnits(force.selections);
  const totalPoints = roster.costs?.find((c) => c.name === 'pts')?.value || 0;

  return {
    name: roster.name,
    detachment,
    totalPoints,
    units,
  };
}

// ============================================================================
// Conversion to CurrentList
// ============================================================================

/**
 * Find a matching unit in army data by normalized name.
 */
function findUnit(armyData: ArmyData, name: string): string | undefined {
  const normalized = normalizeUnitName(name);

  // Direct match
  const directMatch = armyData.units.find((u) => u.id === normalized);

  if (directMatch) return directMatch.id;

  // Fuzzy match by comparing normalized names
  const fuzzyMatch = armyData.units.find(
    (u) => normalizeUnitName(u.name) === normalized
  );

  if (fuzzyMatch) return fuzzyMatch.id;

  // Check allies
  if (armyData.allies) {
    for (const ally of Object.values(armyData.allies)) {
      for (const unit of ally.units || []) {
        if (unit.id === normalized || normalizeUnitName(unit.name) === normalized) {
          return unit.id;
        }
      }
    }
  }

  return undefined;
}

/**
 * Find a matching detachment in army data.
 */
function findDetachment(
  armyData: ArmyData,
  name: string | undefined
): string | undefined {
  if (!name) return Object.keys(armyData.detachments)[0];

  const normalized = normalizeUnitName(name);

  for (const [id, detachment] of Object.entries(armyData.detachments)) {
    if (id === normalized || normalizeUnitName(detachment.name) === normalized) {
      return id;
    }
  }

  // Return first detachment as fallback
  return Object.keys(armyData.detachments)[0];
}

/**
 * Find a matching enhancement in the detachment.
 */
function findEnhancement(
  armyData: ArmyData,
  detachmentId: string,
  name: string | undefined
): string {
  if (!name) return '';

  const detachment = armyData.detachments[detachmentId];

  if (!detachment) return '';

  const normalized = normalizeEnhancementName(name);
  const enhancement = detachment.enhancements.find(
    (e) => e.id === normalized || normalizeEnhancementName(e.name) === normalized
  );

  return enhancement?.id || '';
}

/**
 * Map loadout selections to weapon counts.
 * Always initializes all choices to 0, then sets defaults or matched loadouts.
 */
function mapLoadout(
  armyData: ArmyData,
  unitId: string,
  loadout: string[],
  modelCount: number
): Record<string, number> {
  const unit = findUnitById(armyData, unitId);

  if (!unit || !unit.loadoutOptions) return {};

  const weaponCounts: Record<string, number> = {};

  // First, initialize all choices to 0
  for (const option of unit.loadoutOptions) {
    for (const choice of option.choices) {
      if (choice.id !== 'none') {
        weaponCounts[choice.id] = 0;
      }
    }
  }

  // If no loadout specified, apply defaults
  if (!loadout || loadout.length === 0) {
    for (const option of unit.loadoutOptions) {
      // Only apply defaults for 'choice' type options
      if (option.type === 'choice') {
        const defaultChoice = option.choices.find(c => c.default) || option.choices[0];

        if (defaultChoice && defaultChoice.id !== 'none') {
          weaponCounts[defaultChoice.id] = modelCount;
        }
      }
    }

    return weaponCounts;
  }

  // Check each loadout option for matches
  for (const option of unit.loadoutOptions) {
    let hasMatch = false;

    for (const choice of option.choices) {
      if (choice.id === 'none') continue;

      const choiceNormalized = normalizeLoadoutName(choice.name);

      // Check if any loadout item matches this choice
      const matches = loadout.some((l) => {
        const loadoutNorm = normalizeLoadoutName(l);

        return (
          loadoutNorm.includes(choiceNormalized) ||
          choiceNormalized.includes(loadoutNorm)
        );
      });

      if (matches) {
        // Use maxModels if specified, otherwise use model count
        weaponCounts[choice.id] = choice.maxModels || modelCount;
        hasMatch = true;
      }
    }

    // If no match found for a 'choice' type option, apply default
    if (!hasMatch && option.type === 'choice') {
      const defaultChoice = option.choices.find(c => c.default) || option.choices[0];

      if (defaultChoice && defaultChoice.id !== 'none') {
        weaponCounts[defaultChoice.id] = modelCount;
      }
    }
  }

  return weaponCounts;
}

export interface ConversionResult {
  list: CurrentList;
  warnings: string[];
  unmatchedUnits: string[];
}

/**
 * Convert a parsed New Recruit list to a CurrentList.
 */
export function convertToCurrentList(
  parsed: ParsedList,
  armyData: ArmyData,
  armyId: string
): ConversionResult {
  const warnings: string[] = [];
  const unmatchedUnits: string[] = [];

  const detachmentId = findDetachment(armyData, parsed.detachment);

  if (!detachmentId) {
    warnings.push(`Could not find detachment: ${parsed.detachment}`);
  }

  const units: ListUnit[] = [];

  for (const parsedUnit of parsed.units) {
    const unitId = findUnit(armyData, parsedUnit.name);

    if (!unitId) {
      unmatchedUnits.push(parsedUnit.name);
      warnings.push(`Could not find unit: ${parsedUnit.name}`);
      continue;
    }

    const enhancement = findEnhancement(
      armyData,
      detachmentId || '',
      parsedUnit.enhancement
    );

    if (parsedUnit.enhancement && !enhancement) {
      warnings.push(
        `Could not find enhancement: ${parsedUnit.enhancement} for ${parsedUnit.name}`
      );
    }

    const weaponCounts = mapLoadout(
      armyData,
      unitId,
      parsedUnit.loadout,
      parsedUnit.modelCount
    );

    units.push({
      unitId,
      modelCount: parsedUnit.modelCount,
      enhancement,
      weaponCounts,
      currentWounds: null,
      leaderCurrentWounds: null,
      attachedLeader: null,
    });
  }

  return {
    list: {
      name: parsed.name || 'Imported List',
      army: armyId,
      pointsLimit: Math.ceil(parsed.totalPoints / 500) * 500, // Round up to nearest 500
      format: 'strike-force',
      detachment: detachmentId || '',
      units,
    },
    warnings,
    unmatchedUnits,
  };
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import a New Recruit JSON string into a CurrentList.
 */
export function importNewRecruitJSON(
  jsonString: string,
  armyData: ArmyData,
  armyId: string
): ConversionResult {
  const json = JSON.parse(jsonString) as NewRecruitJSON;

  if (!json.roster) {
    throw new Error('Invalid New Recruit JSON: missing roster');
  }

  const parsed = parseNewRecruitJSON(json);

  return convertToCurrentList(parsed, armyData, armyId);
}
