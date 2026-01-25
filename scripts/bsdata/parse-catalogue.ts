/**
 * BSData Catalogue Parser
 *
 * Parses BSData .cat XML files and transforms them into our app's JSON format.
 * Run with: npx tsx scripts/bsdata/parse-catalogue.ts
 */

import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get script directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// BSData XML attribute prefix (fast-xml-parser convention)
const ATTR_PREFIX = '@_';

// Type IDs from BSData schema (found in the catalogue)
const TYPE_IDS = {
  // Unit characteristics
  MOVEMENT: 'e703-ecb6-5ce7-aec1',
  TOUGHNESS: 'd29d-cf75-fc2d-34a4',
  SAVE: '450-a17e-9d5e-29da',
  WOUNDS: '750a-a2ec-90d3-21fe',
  LEADERSHIP: '58d2-b879-49c7-43bc',
  OC: 'bef7-942a-1a23-59f8',

  // Ranged weapon characteristics
  RANGE: '9896-9419-16a1-92fc',
  RANGED_ATTACKS: '3bb-c35f-f54-fb08',
  BS: '94d-8a98-cf90-183e',
  RANGED_STRENGTH: '2229-f494-25db-c5d3',
  RANGED_AP: '9ead-8a10-520-de15',
  RANGED_DAMAGE: 'a354-c1c8-a745-f9e3',
  RANGED_KEYWORDS: '7f1b-8591-2fcf-d01c',

  // Melee weapon characteristics
  MELEE_RANGE: '914c-b413-91e3-a132',
  MELEE_ATTACKS: '2337-daa1-6682-b110',
  WS: '95d1-95f-45b4-11d6',
  MELEE_STRENGTH: 'ab33-d393-96ce-ccba',
  MELEE_AP: '41a0-1301-112a-e2f2',
  MELEE_DAMAGE: '3254-9fe6-d824-513e',
  MELEE_KEYWORDS: '893f-9000-ccf7-648e',

  // Points
  POINTS: '51b2-306e-1021-d207',
};

// Our output types (simplified version of src/types/army.ts)
interface UnitStats {
  m: number;
  t: number;
  sv: string;
  w: number;
  ld: string;
  oc: number;
}

interface WeaponStats {
  range?: number;
  a: number | string;
  bs?: string;
  ws?: string;
  s: number;
  ap: number;
  d: number | string;
}

interface WeaponModifier {
  stat: string;
  operation: 'add' | 'subtract' | 'multiply' | 'set';
  value: number;
  scope: 'model' | 'unit';
  source?: string;
}

interface Weapon {
  id: string;
  name: string;
  type: 'melee' | 'ranged' | 'equipment';
  stats: WeaponStats;
  abilities: string[];
  loadoutGroup?: string;
  modifiers?: WeaponModifier[];
}

interface Ability {
  id: string;
  name: string;
  description: string;
  loadoutGroup?: string;
}

interface LoadoutChoice {
  id: string;
  name: string;
  default?: boolean;
  maxModels?: number;
}

interface LoadoutOption {
  id: string;
  name: string;
  type: 'choice' | 'optional';
  pattern: 'replacement' | 'addition';
  choices: LoadoutChoice[];
}

interface ParsedUnit {
  id: string;
  bsdataId: string;
  name: string;
  points: Record<string, number>;
  stats: UnitStats;
  invuln?: string;
  weapons: Weapon[];
  loadoutOptions?: LoadoutOption[];
  abilities: Ability[];
  keywords: string[];
}

// Helper to ensure array with proper typing
function ensureArray(item: unknown): Record<string, unknown>[] {
  if (!item) return [];
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  return [item] as Record<string, unknown>[];
}

// Helper to get attribute value
function getAttr(node: Record<string, unknown>, name: string): string {
  return (node[`${ATTR_PREFIX}${name}`] as string) || '';
}

// Helper to slugify name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Map BSData field IDs to our stat names
const FIELD_ID_TO_STAT: Record<string, string> = {
  [TYPE_IDS.WOUNDS]: 'w',
  [TYPE_IDS.TOUGHNESS]: 't',
  [TYPE_IDS.MOVEMENT]: 'm',
  [TYPE_IDS.LEADERSHIP]: 'ld',
  [TYPE_IDS.OC]: 'oc',
};

// Helper to extract modifiers from a selection entry
function extractModifiers(entry: Record<string, unknown>, sourceName: string): WeaponModifier[] {
  const modifiers: WeaponModifier[] = [];
  const entryModifiers = ensureArray((entry.modifiers as Record<string, unknown>)?.modifier);

  for (const mod of entryModifiers) {
    const field = getAttr(mod, 'field');
    const value = parseInt(getAttr(mod, 'value'), 10);
    const type = getAttr(mod, 'type');

    // Check if this field maps to a stat we care about
    const stat = FIELD_ID_TO_STAT[field];
    if (stat && !isNaN(value)) {
      let operation: WeaponModifier['operation'] = 'add';
      if (type === 'set') operation = 'set';
      else if (type === 'decrement') operation = 'subtract';
      else if (type === 'increment') operation = 'add';

      modifiers.push({
        stat,
        operation,
        value,
        scope: 'model',
        source: sourceName,
      });
    }
  }

  return modifiers;
}

// Helper to parse characteristic value
function parseCharacteristic(chars: Record<string, unknown>[], typeId: string): string | undefined {
  const char = chars.find((c) => getAttr(c, 'typeId') === typeId);

  if (!char) return undefined;
  return (char['#text'] as string) || getAttr(char, 'name');
}

// Parse unit stats from profile characteristics
function parseUnitStats(characteristics: Record<string, unknown>[]): UnitStats | null {
  const m = parseCharacteristic(characteristics, TYPE_IDS.MOVEMENT);
  const t = parseCharacteristic(characteristics, TYPE_IDS.TOUGHNESS);
  const sv = parseCharacteristic(characteristics, TYPE_IDS.SAVE);
  const w = parseCharacteristic(characteristics, TYPE_IDS.WOUNDS);
  const ld = parseCharacteristic(characteristics, TYPE_IDS.LEADERSHIP);
  const oc = parseCharacteristic(characteristics, TYPE_IDS.OC);

  if (!m || !t || !sv || !w || !ld || !oc) {
    return null;
  }

  return {
    m: parseInt(m.replace('"', ''), 10),
    t: parseInt(t, 10),
    sv: sv,
    w: parseInt(w, 10),
    ld: ld,
    oc: parseInt(oc, 10),
  };
}

// Parse weapon stats from profile
function parseWeaponProfile(profile: Record<string, unknown>, type: 'melee' | 'ranged'): Weapon | null {
  const name = getAttr(profile, 'name');
  const id = slugify(name) + (type === 'ranged' ? '-ranged' : '-melee');
  // bsdataId available if needed for .rosz export: getAttr(profile, 'id')

  const characteristics = ensureArray(
    (profile.characteristics as Record<string, unknown>)?.characteristic
  );

  if (type === 'ranged') {
    const range = parseCharacteristic(characteristics, TYPE_IDS.RANGE);
    const attacks = parseCharacteristic(characteristics, TYPE_IDS.RANGED_ATTACKS);
    const bs = parseCharacteristic(characteristics, TYPE_IDS.BS);
    const strength = parseCharacteristic(characteristics, TYPE_IDS.RANGED_STRENGTH);
    const ap = parseCharacteristic(characteristics, TYPE_IDS.RANGED_AP);
    const damage = parseCharacteristic(characteristics, TYPE_IDS.RANGED_DAMAGE);
    const keywords = parseCharacteristic(characteristics, TYPE_IDS.RANGED_KEYWORDS);

    if (!range || !attacks || !bs || !strength || !ap || !damage) {
      return null;
    }

    return {
      id,
      name,
      type: 'ranged',
      stats: {
        range: parseInt(range.replace('"', ''), 10),
        a: isNaN(parseInt(attacks, 10)) ? attacks : parseInt(attacks, 10),
        bs: bs,
        s: parseInt(strength, 10),
        ap: parseInt(ap, 10),
        d: isNaN(parseInt(damage, 10)) ? damage : parseInt(damage, 10),
      },
      abilities: keywords && keywords !== '-' ? keywords.split(', ') : [],
    };
  } else {
    const attacks = parseCharacteristic(characteristics, TYPE_IDS.MELEE_ATTACKS);
    const ws = parseCharacteristic(characteristics, TYPE_IDS.WS);
    const strength = parseCharacteristic(characteristics, TYPE_IDS.MELEE_STRENGTH);
    const ap = parseCharacteristic(characteristics, TYPE_IDS.MELEE_AP);
    const damage = parseCharacteristic(characteristics, TYPE_IDS.MELEE_DAMAGE);
    const keywords = parseCharacteristic(characteristics, TYPE_IDS.MELEE_KEYWORDS);

    if (!attacks || !ws || !strength || !ap || !damage) {
      return null;
    }

    return {
      id,
      name,
      type: 'melee',
      stats: {
        a: isNaN(parseInt(attacks, 10)) ? attacks : parseInt(attacks, 10),
        ws: ws,
        s: parseInt(strength, 10),
        ap: parseInt(ap, 10),
        d: isNaN(parseInt(damage, 10)) ? damage : parseInt(damage, 10),
      },
      abilities: keywords && keywords !== '-' ? keywords.split(', ') : [],
    };
  }
}

// Parse ability from profile
function parseAbility(profile: Record<string, unknown>): Ability | null {
  const name = getAttr(profile, 'name');
  const id = slugify(name);

  const characteristics = ensureArray(
    (profile.characteristics as Record<string, unknown>)?.characteristic
  );

  const descChar = characteristics.find((c: Record<string, unknown>) =>
    getAttr(c, 'name') === 'Description'
  ) as Record<string, unknown> | undefined;

  if (!descChar) return null;

  const description = (descChar['#text'] as string) || '';

  return {
    id,
    name,
    description,
  };
}

// Extract keywords from categoryLinks
function parseKeywords(categoryLinks: Record<string, unknown>[]): string[] {
  return categoryLinks
    .map((link) => getAttr(link, 'name'))
    .filter((name) =>
      name &&
      !name.startsWith('Faction:') &&
      name !== 'Configuration'
    );
}

// Main parser class
class CatalogueParser {
  private catalogue: Record<string, unknown>;
  private units: ParsedUnit[] = [];
  private sharedProfiles: Map<string, Record<string, unknown>> = new Map();
  private sharedSelectionEntries: Map<string, Record<string, unknown>> = new Map();

  constructor(xmlContent: string) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ATTR_PREFIX,
      textNodeName: '#text',
      parseAttributeValue: false,
    });

    this.catalogue = parser.parse(xmlContent).catalogue;

    // Build shared profiles lookup
    const profiles = ensureArray(
      (this.catalogue.sharedProfiles as Record<string, unknown>)?.profile
    );
    for (const profile of profiles) {
      const id = getAttr(profile as Record<string, unknown>, 'id');
      if (id) {
        this.sharedProfiles.set(id, profile as Record<string, unknown>);
      }
    }

    // Build shared selection entries lookup (for weapons referenced via entryLinks)
    const sharedEntries = ensureArray(
      (this.catalogue.sharedSelectionEntries as Record<string, unknown>)?.selectionEntry
    );
    for (const entry of sharedEntries) {
      const id = getAttr(entry as Record<string, unknown>, 'id');
      if (id) {
        this.sharedSelectionEntries.set(id, entry as Record<string, unknown>);
      }
    }
  }

  // Helper to get modifier source name from infoLinks (e.g., "Praesidium Shield")
  private getModifierSourceFromInfoLinks(entry: Record<string, unknown>): string | undefined {
    const infoLinks = ensureArray((entry.infoLinks as Record<string, unknown>)?.infoLink);
    for (const link of infoLinks) {
      const linkName = getAttr(link, 'name');
      const linkType = getAttr(link, 'type');
      // Look for ability profiles that describe stat modifications
      if (linkType === 'profile' && linkName && linkName !== 'Assault' && linkName !== 'Pistol') {
        return linkName;
      }
    }
    return undefined;
  }

  // Helper to extract weapons from entry links (for units like Aquilon that reference shared weapons)
  private extractWeaponsFromEntryLinks(entryLinks: Record<string, unknown>[], weapons: Weapon[], loadoutGroup?: string): void {
    for (const link of entryLinks) {
      const targetId = getAttr(link, 'targetId');
      const linkedEntry = this.sharedSelectionEntries.get(targetId);
      if (!linkedEntry) continue;

      const entryType = getAttr(linkedEntry, 'type');
      if (entryType !== 'upgrade') continue;

      // Check for modifiers on this entry (e.g., Praesidium Shield +1W)
      const entryName = getAttr(linkedEntry, 'name');
      const modifierSource = this.getModifierSourceFromInfoLinks(linkedEntry) || entryName;
      const entryModifiers = extractModifiers(linkedEntry, modifierSource);

      const weaponProfiles = ensureArray((linkedEntry.profiles as Record<string, unknown>)?.profile);
      for (const profile of weaponProfiles) {
        const typeName = getAttr(profile, 'typeName');

        if (typeName === 'Melee Weapons') {
          const weapon = parseWeaponProfile(profile, 'melee');
          if (weapon && !weapons.find(w => w.id === weapon.id)) {
            if (loadoutGroup) weapon.loadoutGroup = loadoutGroup;
            if (entryModifiers.length > 0) weapon.modifiers = entryModifiers;
            weapons.push(weapon);
          }
        } else if (typeName === 'Ranged Weapons') {
          const weapon = parseWeaponProfile(profile, 'ranged');
          if (weapon && !weapons.find(w => w.id === weapon.id)) {
            if (loadoutGroup) weapon.loadoutGroup = loadoutGroup;
            if (entryModifiers.length > 0) weapon.modifiers = entryModifiers;
            weapons.push(weapon);
          }
        }
      }
    }
  }

  parse(): ParsedUnit[] {
    // Get shared selection entries (this is where unit definitions live)
    const sharedEntries = ensureArray(
      (this.catalogue.sharedSelectionEntries as Record<string, unknown>)?.selectionEntry
    );

    // Get entry links (to find which entries are actually exposed)
    const entryLinks = ensureArray(
      (this.catalogue.entryLinks as Record<string, unknown>)?.entryLink
    );

    // Get linked entry IDs for filtering
    const linkedIds = new Set(
      entryLinks.map((link: Record<string, unknown>) => getAttr(link, 'targetId'))
    );

    // Process each unit-type selection entry
    for (const entry of sharedEntries) {
      const entryType = getAttr(entry as Record<string, unknown>, 'type');
      const entryId = getAttr(entry as Record<string, unknown>, 'id');

      // Only process entries that are linked (exposed in the catalogue)
      // Both "unit" type and "model" type can be full units (Characters are often type="model")
      if ((entryType === 'unit' || entryType === 'model') && linkedIds.has(entryId)) {
        const unit = this.parseUnit(entry as Record<string, unknown>, entryType);
        if (unit) {
          this.units.push(unit);
        }
      }
    }

    return this.units;
  }

  private parseUnit(entry: Record<string, unknown>, entryType: string = 'unit'): ParsedUnit | null {
    const name = getAttr(entry, 'name');
    const bsdataId = getAttr(entry, 'id');
    const id = slugify(name);

    console.log(`Parsing unit: ${name}`);

    // Get category links for keywords
    const categoryLinks = ensureArray(
      (entry.categoryLinks as Record<string, unknown>)?.categoryLink
    );
    const keywords = parseKeywords(categoryLinks);

    // Get profiles at unit level (abilities AND potentially unit stats)
    const unitProfiles = ensureArray(
      (entry.profiles as Record<string, unknown>)?.profile
    );

    // Parse abilities and unit stats from unit-level profiles
    const abilities: Ability[] = [];
    let stats: UnitStats | null = null;

    for (const profile of unitProfiles) {
      const typeName = getAttr(profile as Record<string, unknown>, 'typeName');

      if (typeName === 'Abilities') {
        const ability = parseAbility(profile as Record<string, unknown>);
        if (ability) abilities.push(ability);
      } else if (typeName === 'Unit' && !stats) {
        // Some units have stats at unit level (e.g., Allarus)
        const characteristics = ensureArray(
          ((profile as Record<string, unknown>).characteristics as Record<string, unknown>)?.characteristic
        );
        stats = parseUnitStats(characteristics);
      }
    }

    // Get selection entry groups (model variants)
    const groups = ensureArray(
      (entry.selectionEntryGroups as Record<string, unknown>)?.selectionEntryGroup
    );

    // Also check for direct selectionEntries (some units like Sagittarum use this)
    const directEntries = ensureArray(
      (entry.selectionEntries as Record<string, unknown>)?.selectionEntry
    );

    // Find the model group and parse stats/weapons from first model variant
    const weapons: Weapon[] = [];
    const points: Record<string, number> = {};
    const loadoutOptions: LoadoutOption[] = [];

    // Track model variants for generating loadoutOptions
    interface ModelVariant {
      name: string;
      loadoutGroup: string;
      maxModels?: number;
      isDefault: boolean;
      weaponNames: string[];
    }
    const modelVariants: ModelVariant[] = [];

    // Extract loadout group from model variant name
    // e.g., "Custodian Guard (Guardian Spear)" -> "guardian-spear"
    const extractLoadoutGroup = (variantName: string, unitName: string): string => {
      // Remove unit name prefix and extract what's in parentheses
      const match = variantName.match(/\(([^)]+)\)/);
      if (match) {
        return slugify(match[1]);
      }
      return slugify(variantName.replace(unitName, '').trim() || 'default');
    };

    // Helper to process model entries
    const processModelEntries = (entries: Record<string, unknown>[], constraints: Record<string, unknown>[], defaultEntryId?: string) => {
      let minModels = 1;
      let maxModels = 1;

      for (const constraint of constraints) {
        const type = getAttr(constraint, 'type');
        const value = parseInt(getAttr(constraint, 'value'), 10);
        if (type === 'min') minModels = value;
        if (type === 'max') maxModels = value;
      }

      // Process model entries to get stats
      for (const modelEntry of entries) {
        const entryType = getAttr(modelEntry, 'type');
        if (entryType !== 'model') continue;

        const modelEntryId = getAttr(modelEntry, 'id');
        const modelName = getAttr(modelEntry, 'name');
        const loadoutGroup = extractLoadoutGroup(modelName, name);
        const isDefault = modelEntryId === defaultEntryId;

        // Get max constraint for this specific model variant
        const modelConstraints = ensureArray((modelEntry.constraints as Record<string, unknown>)?.constraint);
        let variantMaxModels: number | undefined;
        for (const constraint of modelConstraints) {
          const type = getAttr(constraint, 'type');
          const value = parseInt(getAttr(constraint, 'value'), 10);
          if (type === 'max' && value === 1) {
            variantMaxModels = 1;
          }
        }

        const modelProfiles = ensureArray((modelEntry.profiles as Record<string, unknown>)?.profile);

        // Parse unit stats from Unit profile
        for (const profile of modelProfiles) {
          const typeName = getAttr(profile, 'typeName');

          if (typeName === 'Unit' && !stats) {
            const characteristics = ensureArray((profile.characteristics as Record<string, unknown>)?.characteristic);
            stats = parseUnitStats(characteristics);
          }
        }

        // Collect weapon names for this variant
        const variantWeaponNames: string[] = [];

        // Check for model-level modifiers (e.g., Praesidium Shield on the model entry)
        const modelModifierSource = this.getModifierSourceFromInfoLinks(modelEntry);
        const modelModifiers: WeaponModifier[] = [];
        if (modelModifierSource) {
          // Check if it's Praesidium Shield or similar equipment that adds wounds
          const modelInfoLinks = ensureArray((modelEntry.infoLinks as Record<string, unknown>)?.infoLink);
          for (const link of modelInfoLinks) {
            const linkName = getAttr(link, 'name');
            const targetId = getAttr(link, 'targetId');
            const profile = this.sharedProfiles.get(targetId);
            if (profile && linkName === 'Praesidium Shield') {
              // Praesidium Shield grants +1W
              modelModifiers.push({
                stat: 'w',
                operation: 'add',
                value: 1,
                scope: 'model',
                source: 'Praesidium Shield',
              });
            }
          }
        }

        // Parse weapons from nested selection entries
        const weaponEntries = ensureArray((modelEntry.selectionEntries as Record<string, unknown>)?.selectionEntry);

        for (const weaponEntry of weaponEntries) {
          const weaponName = getAttr(weaponEntry, 'name');
          if (weaponName) variantWeaponNames.push(weaponName);

          // Check for entry-level modifiers (e.g., weapon entry has modifiers)
          const weaponModifierSource = this.getModifierSourceFromInfoLinks(weaponEntry) || weaponName;
          const weaponModifiers = extractModifiers(weaponEntry, weaponModifierSource);

          // Combine with model-level modifiers
          const allModifiers = [...modelModifiers, ...weaponModifiers];

          const weaponProfiles = ensureArray((weaponEntry.profiles as Record<string, unknown>)?.profile);

          for (const profile of weaponProfiles) {
            const typeName = getAttr(profile, 'typeName');

            if (typeName === 'Melee Weapons') {
              const weapon = parseWeaponProfile(profile, 'melee');
              if (weapon) {
                weapon.loadoutGroup = loadoutGroup;
                if (allModifiers.length > 0) weapon.modifiers = allModifiers;
                if (!weapons.find(w => w.id === weapon.id)) {
                  weapons.push(weapon);
                }
              }
            } else if (typeName === 'Ranged Weapons') {
              const weapon = parseWeaponProfile(profile, 'ranged');
              if (weapon) {
                weapon.loadoutGroup = loadoutGroup;
                if (allModifiers.length > 0) weapon.modifiers = allModifiers;
                if (!weapons.find(w => w.id === weapon.id)) {
                  weapons.push(weapon);
                }
              }
            }
          }
        }

        // Also check entryLinks for weapons (e.g., Aquilon Custodians)
        const modelEntryLinks = ensureArray((modelEntry.entryLinks as Record<string, unknown>)?.entryLink);
        if (modelEntryLinks.length > 0) {
          this.extractWeaponsFromEntryLinks(modelEntryLinks, weapons, loadoutGroup);
          // Add weapon names for loadout tracking
          for (const link of modelEntryLinks) {
            const linkName = getAttr(link, 'name');
            if (linkName && !variantWeaponNames.includes(linkName)) {
              variantWeaponNames.push(linkName);
            }
          }
        }

        // Track this variant
        modelVariants.push({
          name: modelName,
          loadoutGroup,
          maxModels: variantMaxModels,
          isDefault,
          weaponNames: variantWeaponNames,
        });
      }

      // Set base points for min models
      if (minModels > 0) {
        points[minModels.toString()] = 0;
      }
      if (maxModels > minModels) {
        points[maxModels.toString()] = 0;
      }
    };

    // Process groups
    for (const group of groups) {
      const groupEntries = ensureArray((group.selectionEntries as Record<string, unknown>)?.selectionEntry);
      const constraints = ensureArray((group.constraints as Record<string, unknown>)?.constraint);
      const defaultEntryId = getAttr(group, 'defaultSelectionEntryId');
      processModelEntries(groupEntries, constraints, defaultEntryId || undefined);

      // For Characters (type="model"), weapons are often in groups as upgrade entries
      if (entryType === 'model') {
        // Extract loadout group from group name for Character weapons
        const groupName = getAttr(group, 'name');
        const charLoadoutGroup = slugify(groupName || 'default');

        // Helper to extract weapons from upgrade entries
        const extractWeaponsFromUpgrades = (entries: Record<string, unknown>[], loadoutGroup: string) => {
          for (const entry of entries) {
            const entryType = getAttr(entry, 'type');
            if (entryType === 'upgrade') {
              // Check for modifiers on this entry (e.g., Praesidium Shield +1W)
              const entryName = getAttr(entry, 'name');
              const modifierSource = this.getModifierSourceFromInfoLinks(entry) || entryName;
              const entryModifiers = extractModifiers(entry, modifierSource);

              const weaponProfiles = ensureArray((entry.profiles as Record<string, unknown>)?.profile);

              for (const profile of weaponProfiles) {
                const typeName = getAttr(profile, 'typeName');

                if (typeName === 'Melee Weapons') {
                  const weapon = parseWeaponProfile(profile, 'melee');
                  if (weapon && !weapons.find(w => w.id === weapon.id)) {
                    weapon.loadoutGroup = loadoutGroup;
                    if (entryModifiers.length > 0) weapon.modifiers = entryModifiers;
                    weapons.push(weapon);
                  }
                } else if (typeName === 'Ranged Weapons') {
                  const weapon = parseWeaponProfile(profile, 'ranged');
                  if (weapon && !weapons.find(w => w.id === weapon.id)) {
                    weapon.loadoutGroup = loadoutGroup;
                    if (entryModifiers.length > 0) weapon.modifiers = entryModifiers;
                    weapons.push(weapon);
                  }
                }
              }
            }
          }
        };

        // Process direct entries in this group
        extractWeaponsFromUpgrades(groupEntries, charLoadoutGroup);

        // Also check nested selectionEntryGroups (e.g., Shield-Captain in Terminator Armour)
        const nestedGroups = ensureArray((group.selectionEntryGroups as Record<string, unknown>)?.selectionEntryGroup);
        for (const nestedGroup of nestedGroups) {
          const nestedGroupName = getAttr(nestedGroup, 'name');
          const nestedLoadoutGroup = slugify(nestedGroupName || charLoadoutGroup);
          const nestedEntries = ensureArray((nestedGroup.selectionEntries as Record<string, unknown>)?.selectionEntry);
          extractWeaponsFromUpgrades(nestedEntries, nestedLoadoutGroup);
        }
      }
    }

    // Process direct entries (for units like Sagittarum)
    if (directEntries.length > 0) {
      processModelEntries(directEntries, [], undefined);
    }

    // For Characters (type="model"), also check direct selectionEntries for weapons
    // (e.g., Aleya has weapon "Somnus" directly in selectionEntries)
    if (entryType === 'model' && directEntries.length > 0) {
      for (const directEntry of directEntries) {
        const directEntryType = getAttr(directEntry, 'type');
        if (directEntryType === 'upgrade') {
          const weaponProfiles = ensureArray((directEntry.profiles as Record<string, unknown>)?.profile);

          for (const profile of weaponProfiles) {
            const typeName = getAttr(profile, 'typeName');

            if (typeName === 'Melee Weapons') {
              const weapon = parseWeaponProfile(profile, 'melee');
              if (weapon && !weapons.find(w => w.id === weapon.id)) {
                weapons.push(weapon);
              }
            } else if (typeName === 'Ranged Weapons') {
              const weapon = parseWeaponProfile(profile, 'ranged');
              if (weapon && !weapons.find(w => w.id === weapon.id)) {
                weapons.push(weapon);
              }
            }
          }
        }
      }
    }

    // Generate loadoutOptions from collected model variants
    if (modelVariants.length > 1) {
      // Group variants by their loadout pattern
      // If variants have maxModels=1, it's likely an "optional" addition like Vexilla
      const mainVariants = modelVariants.filter(v => !v.maxModels);
      const optionalVariants = modelVariants.filter(v => v.maxModels === 1);

      // Create main weapon choice if there are multiple main variants
      if (mainVariants.length > 1) {
        const mainOption: LoadoutOption = {
          id: 'main-weapon',
          name: 'Weapon',
          type: 'choice',
          pattern: 'replacement',
          choices: mainVariants.map(v => ({
            id: v.loadoutGroup,
            name: v.weaponNames.join(' + ') || v.name.replace(name, '').replace(/[()]/g, '').trim(),
            default: v.isDefault || undefined,
          })),
        };
        loadoutOptions.push(mainOption);
      }

      // Create optional choices for limited variants (like Vexilla)
      for (const optVariant of optionalVariants) {
        const optOption: LoadoutOption = {
          id: optVariant.loadoutGroup,
          name: optVariant.weaponNames[0] || optVariant.loadoutGroup,
          type: 'optional',
          pattern: 'addition',
          choices: [
            { id: 'none', name: 'None', default: true },
            { id: optVariant.loadoutGroup, name: optVariant.weaponNames.join(' + '), maxModels: 1 },
          ],
        };
        loadoutOptions.push(optOption);
      }
    }

    // For Characters (model type), set default single-model points
    if (entryType === 'model' && Object.keys(points).length === 0) {
      points['1'] = 0;
    }

    // Get costs at unit level
    const costs = ensureArray(
      (entry.costs as Record<string, unknown>)?.cost
    );

    for (const cost of costs) {
      const typeId = getAttr(cost as Record<string, unknown>, 'typeId');
      if (typeId === TYPE_IDS.POINTS) {
        const value = parseInt(getAttr(cost as Record<string, unknown>, 'value'), 10);
        // Set as base points for minimum model count
        const minCount = Object.keys(points)[0];
        if (minCount) {
          points[minCount] = value;
        }
      }
    }

    // Helper to process point modifiers
    const processPointModifiers = (modifierList: Record<string, unknown>[]) => {
      for (const modifier of modifierList) {
        const field = getAttr(modifier as Record<string, unknown>, 'field');
        const value = getAttr(modifier as Record<string, unknown>, 'value');

        if (field === TYPE_IDS.POINTS) {
          const modPoints = parseInt(value, 10);

          // Check conditions for model count
          const conditions = ensureArray(
            ((modifier as Record<string, unknown>).conditions as Record<string, unknown>)?.condition
          );

          for (const condition of conditions) {
            const condValue = parseInt(getAttr(condition as Record<string, unknown>, 'value'), 10);
            const condType = getAttr(condition as Record<string, unknown>, 'type');

            if (condType === 'atLeast' && condValue > 0) {
              points[condValue.toString()] = modPoints;
            }
          }
        }
      }
    };

    // Check modifiers for conditional points (e.g., 5 models)
    const modifiers = ensureArray(
      (entry.modifiers as Record<string, unknown>)?.modifier
    );
    processPointModifiers(modifiers);

    // Also check modifierGroups (some units like Vertus Praetors use this structure)
    const modifierGroups = ensureArray(
      (entry.modifierGroups as Record<string, unknown>)?.modifierGroup
    );
    for (const group of modifierGroups) {
      const groupModifiers = ensureArray(
        (group.modifiers as Record<string, unknown>)?.modifier
      );
      processPointModifiers(groupModifiers);
    }

    // Remove any 0-point entries that weren't set by modifiers
    // (These occur when we initialize max model count but no modifier exists for it)
    for (const count of Object.keys(points)) {
      if (points[count] === 0) {
        // Check if this is the min model count (which should have base cost from costs)
        const minCount = Math.min(...Object.keys(points).map(Number));
        if (parseInt(count, 10) !== minCount) {
          delete points[count];
        }
      }
    }

    if (!stats) {
      console.log(`  - No stats found, skipping`);
      return null;
    }

    // Extract invuln from infoLinks
    const infoLinks = ensureArray(
      (entry.infoLinks as Record<string, unknown>)?.infoLink
    );

    let invuln: string | undefined;
    for (const link of infoLinks) {
      const linkName = getAttr(link as Record<string, unknown>, 'name');
      if (linkName === 'Invulnerable Save') {
        const targetId = getAttr(link as Record<string, unknown>, 'targetId');
        const profile = this.sharedProfiles.get(targetId);
        if (profile) {
          // Extract invuln value from description (e.g., "4+ invulnerable save")
          const chars = ensureArray(
            (profile.characteristics as Record<string, unknown>)?.characteristic
          );
          const descChar = chars.find((c: Record<string, unknown>) =>
            getAttr(c, 'name') === 'Description'
          ) as Record<string, unknown> | undefined;

          if (descChar) {
            const desc = (descChar['#text'] as string) || '';
            // Match patterns like "4+" or "5+"
            const match = desc.match(/(\d)\+\s*invulnerable/i);
            if (match) {
              invuln = `${match[1]}+`;
            }
          }
        }
        break;
      }
    }

    const result: ParsedUnit = {
      id,
      bsdataId,
      name,
      points,
      stats,
      weapons,
      abilities,
      keywords,
    };

    if (invuln) {
      result.invuln = invuln;
    }

    if (loadoutOptions.length > 0) {
      result.loadoutOptions = loadoutOptions;
    }

    return result;
  }
}

// Main execution
async function main() {
  const cataloguePath = join(__dirname, 'custodes.cat');
  const outputPath = join(__dirname, 'custodes-parsed.json');

  console.log('Reading catalogue...');
  const xmlContent = readFileSync(cataloguePath, 'utf-8');

  console.log('Parsing...');
  const parser = new CatalogueParser(xmlContent);
  const units = parser.parse();

  console.log(`\nParsed ${units.length} units`);

  // Create output structure matching our format
  const output = {
    faction: 'Adeptus Custodes',
    source: 'BSData',
    catalogueId: '1f19-6509-d906-ca10',
    lastUpdated: new Date().toISOString().split('T')[0],
    units,
  };

  // Write output
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to: ${outputPath}`);

  // Print summary
  console.log('\n=== Summary ===');
  for (const unit of units) {
    console.log(`${unit.name}:`);
    console.log(`  - Points: ${JSON.stringify(unit.points)}`);
    console.log(`  - Stats: M${unit.stats.m} T${unit.stats.t} SV${unit.stats.sv} W${unit.stats.w}`);
    console.log(`  - Weapons: ${unit.weapons.length}`);
    console.log(`  - Abilities: ${unit.abilities.length}`);
  }
}

main().catch(console.error);
