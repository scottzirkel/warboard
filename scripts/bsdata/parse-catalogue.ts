/**
 * BSData Catalogue Parser
 *
 * Parses BSData .cat XML files and transforms them into our app's JSON format.
 * Run with: npx tsx scripts/bsdata/parse-catalogue.ts [faction-id]
 *
 * Examples:
 *   npx tsx scripts/bsdata/parse-catalogue.ts custodes
 *   npx tsx scripts/bsdata/parse-catalogue.ts tyranids
 *   npx tsx scripts/bsdata/parse-catalogue.ts --all
 */

import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BSDATA_PATH, FACTIONS, getFaction, getAllFactionIds, type FactionConfig } from './factions.js';

// Get script directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// BSData XML attribute prefix (fast-xml-parser convention)
const ATTR_PREFIX = '@_';

// Type IDs from BSData schema (these are consistent across all 40k catalogues)
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

interface ModelType {
  id: string;
  name: string;
  stats: UnitStats;
  invuln?: string | null;
  count?: { min: number; max: number };
  weaponIds?: string[];
  keywords?: string[];
  isLeader?: boolean;
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
  modelTypes?: ModelType[];
}

export interface ParsedData {
  faction: string;
  factionId: string;
  source: string;
  catalogueId: string;
  catalogueRevision: string;
  lastUpdated: string;
  units: ParsedUnit[];
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

  // Value can be in #text, or as a direct value, or as the name attribute
  const textVal = char['#text'];
  if (textVal !== undefined && textVal !== null) {
    return String(textVal);
  }
  return getAttr(char, 'name') || undefined;
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

  // Handle movement - can be number, string with ", or string like "6" or "-"
  const mStr = String(m).replace('"', '').replace('-', '0');
  const tStr = String(t);
  const wStr = String(w);
  const ocStr = String(oc).replace('-', '0');

  return {
    m: parseInt(mStr, 10) || 0,
    t: parseInt(tStr, 10),
    sv: String(sv),
    w: parseInt(wStr, 10),
    ld: String(ld),
    oc: parseInt(ocStr, 10) || 0,
  };
}

// Parse weapon stats from profile
function parseWeaponProfile(profile: Record<string, unknown>, type: 'melee' | 'ranged'): Weapon | null {
  const name = getAttr(profile, 'name');
  const id = slugify(name) + (type === 'ranged' ? '-ranged' : '-melee');

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

// Parse an XML string into a catalogue object
function parseXml(xmlContent: string): Record<string, unknown> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ATTR_PREFIX,
    textNodeName: '#text',
    parseAttributeValue: false,
  });
  return parser.parse(xmlContent).catalogue;
}

// Load a parent catalogue referenced via catalogueLink
function loadParentCatalogue(catalogueLinks: Record<string, unknown>[]): Record<string, unknown> | null {
  for (const link of catalogueLinks) {
    const importRoot = getAttr(link, 'importRootEntries');
    if (importRoot !== 'true') continue;

    const linkName = getAttr(link, 'name');
    // Try to find the catalogue file by name
    const possibleFiles = [
      `${linkName}.cat`,
      `Imperium - ${linkName}.cat`,
    ];

    for (const filename of possibleFiles) {
      const filePath = join(BSDATA_PATH, filename);
      if (existsSync(filePath)) {
        console.log(`  Loading parent catalogue: ${filename}`);
        const xmlContent = readFileSync(filePath, 'utf-8');
        return parseXml(xmlContent);
      }
    }

    console.warn(`  Warning: Parent catalogue "${linkName}" not found`);
  }
  return null;
}

// Main parser class
class CatalogueParser {
  private catalogue: Record<string, unknown>;
  private units: ParsedUnit[] = [];
  private sharedProfiles: Map<string, Record<string, unknown>> = new Map();
  private sharedSelectionEntries: Map<string, Record<string, unknown>> = new Map();
  public catalogueId: string;
  public catalogueRevision: string;
  public catalogueName: string;

  constructor(xmlContent: string) {
    this.catalogue = parseXml(xmlContent);
    this.catalogueId = getAttr(this.catalogue, 'id');
    this.catalogueRevision = getAttr(this.catalogue, 'revision');
    this.catalogueName = getAttr(this.catalogue, 'name');

    // Check for parent catalogue links and load them first
    const catalogueLinks = ensureArray(
      (this.catalogue.catalogueLinks as Record<string, unknown>)?.catalogueLink
    );
    if (catalogueLinks.length > 0) {
      const parentCatalogue = loadParentCatalogue(catalogueLinks);
      if (parentCatalogue) {
        this.mergeParentData(parentCatalogue);
      }
    }

    // Build shared profiles lookup (child overrides parent)
    const profiles = ensureArray(
      (this.catalogue.sharedProfiles as Record<string, unknown>)?.profile
    );
    for (const profile of profiles) {
      const id = getAttr(profile as Record<string, unknown>, 'id');
      if (id) {
        this.sharedProfiles.set(id, profile as Record<string, unknown>);
      }
    }

    // Build shared selection entries lookup (child overrides parent)
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

  // Merge shared profiles and selection entries from a parent catalogue
  private mergeParentData(parent: Record<string, unknown>): void {
    const parentProfiles = ensureArray(
      (parent.sharedProfiles as Record<string, unknown>)?.profile
    );
    for (const profile of parentProfiles) {
      const id = getAttr(profile as Record<string, unknown>, 'id');
      if (id) {
        this.sharedProfiles.set(id, profile as Record<string, unknown>);
      }
    }

    const parentEntries = ensureArray(
      (parent.sharedSelectionEntries as Record<string, unknown>)?.selectionEntry
    );
    for (const entry of parentEntries) {
      const id = getAttr(entry as Record<string, unknown>, 'id');
      if (id) {
        this.sharedSelectionEntries.set(id, entry as Record<string, unknown>);
      }
    }

    console.log(`  Merged ${parentProfiles.length} profiles and ${parentEntries.length} entries from parent`);
  }

  // Helper to get modifier source name from infoLinks
  private getModifierSourceFromInfoLinks(entry: Record<string, unknown>): string | undefined {
    const infoLinks = ensureArray((entry.infoLinks as Record<string, unknown>)?.infoLink);
    for (const link of infoLinks) {
      const linkName = getAttr(link, 'name');
      const linkType = getAttr(link, 'type');
      if (linkType === 'profile' && linkName && linkName !== 'Assault' && linkName !== 'Pistol') {
        return linkName;
      }
    }
    return undefined;
  }

  // Get unit stats from an infoLink reference to sharedProfiles
  // Used by units like Termagants where model entries reference shared profiles
  private getStatsFromInfoLink(entry: Record<string, unknown>): UnitStats | null {
    const infoLinks = ensureArray((entry.infoLinks as Record<string, unknown>)?.infoLink);
    for (const link of infoLinks) {
      const linkType = getAttr(link, 'type');
      if (linkType === 'profile') {
        const targetId = getAttr(link, 'targetId');
        const profile = this.sharedProfiles.get(targetId);
        if (profile) {
          const typeName = getAttr(profile, 'typeName');
          if (typeName === 'Unit') {
            const characteristics = ensureArray(
              (profile.characteristics as Record<string, unknown>)?.characteristic
            );
            const stats = parseUnitStats(characteristics);
            if (stats) return stats;
          }
        }
      }
    }
    return null;
  }

  // Get unit stats from a shared selection entry (model type)
  // Used by units like Gretchin where the unit links to shared model entries
  private getStatsFromSharedModelEntry(targetId: string): UnitStats | null {
    const sharedEntry = this.sharedSelectionEntries.get(targetId);
    if (!sharedEntry) return null;

    // Check profiles directly on the shared entry
    const profiles = ensureArray((sharedEntry.profiles as Record<string, unknown>)?.profile);
    for (const profile of profiles) {
      const typeName = getAttr(profile, 'typeName');
      if (typeName === 'Unit') {
        const characteristics = ensureArray(
          (profile.characteristics as Record<string, unknown>)?.characteristic
        );
        const stats = parseUnitStats(characteristics);
        if (stats) return stats;
      }
    }

    // Also check infoLinks on the shared entry (Termagants pattern)
    const statsFromInfoLink = this.getStatsFromInfoLink(sharedEntry);
    if (statsFromInfoLink) return statsFromInfoLink;

    return null;
  }

  // Extract weapons from a shared model entry
  private extractWeaponsFromSharedModelEntry(targetId: string, weapons: Weapon[], loadoutGroup?: string): string[] {
    const sharedEntry = this.sharedSelectionEntries.get(targetId);
    if (!sharedEntry) return [];

    const weaponIds: string[] = [];

    // Get weapons from direct selection entries
    const weaponEntries = ensureArray((sharedEntry.selectionEntries as Record<string, unknown>)?.selectionEntry);
    for (const weaponEntry of weaponEntries) {
      const weaponProfiles = ensureArray((weaponEntry.profiles as Record<string, unknown>)?.profile);
      for (const profile of weaponProfiles) {
        const typeName = getAttr(profile, 'typeName');
        if (typeName === 'Melee Weapons') {
          const weapon = parseWeaponProfile(profile, 'melee');
          if (weapon && !weapons.find(w => w.id === weapon.id)) {
            if (loadoutGroup) weapon.loadoutGroup = loadoutGroup;
            weapons.push(weapon);
            weaponIds.push(weapon.id);
          }
        } else if (typeName === 'Ranged Weapons') {
          const weapon = parseWeaponProfile(profile, 'ranged');
          if (weapon && !weapons.find(w => w.id === weapon.id)) {
            if (loadoutGroup) weapon.loadoutGroup = loadoutGroup;
            weapons.push(weapon);
            weaponIds.push(weapon.id);
          }
        }
      }
    }

    // Also check entryLinks for weapons
    const entryLinks = ensureArray((sharedEntry.entryLinks as Record<string, unknown>)?.entryLink);
    this.extractWeaponsFromEntryLinks(entryLinks, weapons, loadoutGroup);

    return weaponIds;
  }

  // Get full model type info from a shared model entry
  private getModelTypeFromSharedEntry(targetId: string, link: Record<string, unknown>): ModelType | null {
    const sharedEntry = this.sharedSelectionEntries.get(targetId);
    if (!sharedEntry) return null;

    const name = getAttr(link, 'name') || getAttr(sharedEntry, 'name');
    const id = slugify(name);

    // Get stats
    const stats = this.getStatsFromSharedModelEntry(targetId);
    if (!stats) return null;

    // Get count constraints from the link
    const constraints = ensureArray((link.constraints as Record<string, unknown>)?.constraint);
    let minCount = 1;
    let maxCount = 1;
    for (const constraint of constraints) {
      const type = getAttr(constraint, 'type');
      const value = parseInt(getAttr(constraint, 'value'), 10);
      if (type === 'min') minCount = value;
      if (type === 'max') maxCount = value;
    }

    // Check if this is a leader-type model (Nob, Runtherd, etc.)
    // Leaders typically have maxCount=1 or 2 and higher stats
    const isLeader = maxCount <= 2 && (
      name.toLowerCase().includes('nob') ||
      name.toLowerCase().includes('runtherd') ||
      name.toLowerCase().includes('sergeant') ||
      name.toLowerCase().includes('champion')
    );

    // Get keywords from category links on shared entry
    const categoryLinks = ensureArray((sharedEntry.categoryLinks as Record<string, unknown>)?.categoryLink);
    const keywords = categoryLinks
      .map((cl) => getAttr(cl, 'name'))
      .filter((k) => k && !k.startsWith('Faction:'));

    return {
      id,
      name,
      stats,
      count: { min: minCount, max: maxCount },
      keywords: keywords.length > 0 ? keywords : undefined,
      isLeader,
    };
  }

  // Helper to extract weapons from entry links
  private extractWeaponsFromEntryLinks(entryLinks: Record<string, unknown>[], weapons: Weapon[], loadoutGroup?: string): void {
    for (const link of entryLinks) {
      const targetId = getAttr(link, 'targetId');
      const linkedEntry = this.sharedSelectionEntries.get(targetId);
      if (!linkedEntry) continue;

      const entryType = getAttr(linkedEntry, 'type');
      if (entryType !== 'upgrade') continue;

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
    // Get shared selection entries from the catalogue itself
    const sharedEntries = ensureArray(
      (this.catalogue.sharedSelectionEntries as Record<string, unknown>)?.selectionEntry
    );

    // Build a map of local shared entries by ID
    const localEntryMap = new Map<string, Record<string, unknown>>();
    for (const entry of sharedEntries) {
      const id = getAttr(entry as Record<string, unknown>, 'id');
      if (id) localEntryMap.set(id, entry as Record<string, unknown>);
    }

    // Get entry links (to find which entries are actually exposed)
    const entryLinks = ensureArray(
      (this.catalogue.entryLinks as Record<string, unknown>)?.entryLink
    );

    // Get linked entry IDs for filtering
    const linkedIds = new Set(
      entryLinks.map((link: Record<string, unknown>) => getAttr(link, 'targetId'))
    );

    // Process each linked entry - check local entries first, then parent (merged) entries
    for (const targetId of linkedIds) {
      const entry = localEntryMap.get(targetId) || this.sharedSelectionEntries.get(targetId);
      if (!entry) continue;

      const entryType = getAttr(entry, 'type');
      if (entryType === 'unit' || entryType === 'model') {
        const unit = this.parseUnit(entry, entryType);
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

    console.log(`  Parsing unit: ${name}`);

    // Get category links for keywords
    const categoryLinks = ensureArray(
      (entry.categoryLinks as Record<string, unknown>)?.categoryLink
    );
    const keywords = parseKeywords(categoryLinks);

    // Get profiles at unit level
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

    // Also check for direct selectionEntries
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

    const extractLoadoutGroup = (variantName: string, unitName: string): string => {
      const match = variantName.match(/\(([^)]+)\)/);
      if (match) {
        return slugify(match[1]);
      }
      return slugify(variantName.replace(unitName, '').trim() || 'default');
    };

    const processModelEntries = (entries: Record<string, unknown>[], constraints: Record<string, unknown>[], defaultEntryId?: string) => {
      let minModels = 1;
      let maxModels = 1;

      for (const constraint of constraints) {
        const type = getAttr(constraint, 'type');
        const value = parseInt(getAttr(constraint, 'value'), 10);
        if (type === 'min') minModels = value;
        if (type === 'max') maxModels = value;
      }

      for (const modelEntry of entries) {
        const entryType = getAttr(modelEntry, 'type');
        if (entryType !== 'model') continue;

        const modelEntryId = getAttr(modelEntry, 'id');
        const modelName = getAttr(modelEntry, 'name');
        const loadoutGroup = extractLoadoutGroup(modelName, name);
        const isDefault = modelEntryId === defaultEntryId;

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

        for (const profile of modelProfiles) {
          const typeName = getAttr(profile, 'typeName');

          if (typeName === 'Unit' && !stats) {
            const characteristics = ensureArray((profile.characteristics as Record<string, unknown>)?.characteristic);
            stats = parseUnitStats(characteristics);
          }
        }

        // If no stats found in direct profiles, check infoLinks (Termagants pattern)
        if (!stats) {
          stats = this.getStatsFromInfoLink(modelEntry);
        }

        const variantWeaponNames: string[] = [];
        const modelModifierSource = this.getModifierSourceFromInfoLinks(modelEntry);
        const modelModifiers: WeaponModifier[] = [];

        if (modelModifierSource) {
          const modelInfoLinks = ensureArray((modelEntry.infoLinks as Record<string, unknown>)?.infoLink);
          for (const link of modelInfoLinks) {
            const linkName = getAttr(link, 'name');
            const targetId = getAttr(link, 'targetId');
            const profile = this.sharedProfiles.get(targetId);
            if (profile && linkName === 'Praesidium Shield') {
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

        const weaponEntries = ensureArray((modelEntry.selectionEntries as Record<string, unknown>)?.selectionEntry);

        for (const weaponEntry of weaponEntries) {
          const weaponName = getAttr(weaponEntry, 'name');
          if (weaponName) variantWeaponNames.push(weaponName);

          const weaponModifierSource = this.getModifierSourceFromInfoLinks(weaponEntry) || weaponName;
          const weaponModifiers = extractModifiers(weaponEntry, weaponModifierSource);
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

        const modelEntryLinks = ensureArray((modelEntry.entryLinks as Record<string, unknown>)?.entryLink);
        if (modelEntryLinks.length > 0) {
          this.extractWeaponsFromEntryLinks(modelEntryLinks, weapons, loadoutGroup);
          for (const link of modelEntryLinks) {
            const linkName = getAttr(link, 'name');
            if (linkName && !variantWeaponNames.includes(linkName)) {
              variantWeaponNames.push(linkName);
            }
          }
        }

        modelVariants.push({
          name: modelName,
          loadoutGroup,
          maxModels: variantMaxModels,
          isDefault,
          weaponNames: variantWeaponNames,
        });
      }

      if (minModels > 0) {
        points[minModels.toString()] = 0;
      }
      if (maxModels > minModels) {
        points[maxModels.toString()] = 0;
      }
    };

    // Collect model types for units with multiple model types (e.g., Gretchin, Squighog Boyz)
    const collectedModelTypes: ModelType[] = [];

    for (const group of groups) {
      const groupEntries = ensureArray((group.selectionEntries as Record<string, unknown>)?.selectionEntry);
      const constraints = ensureArray((group.constraints as Record<string, unknown>)?.constraint);
      const defaultEntryId = getAttr(group, 'defaultSelectionEntryId');
      processModelEntries(groupEntries, constraints, defaultEntryId || undefined);

      // Handle units like Gretchin where groups have upgrade entries with entryLinks to shared model entries
      for (const groupEntry of groupEntries) {
        const groupEntryType = getAttr(groupEntry, 'type');
        if (groupEntryType === 'upgrade') {
          const entryLinks = ensureArray((groupEntry.entryLinks as Record<string, unknown>)?.entryLink);
          for (const link of entryLinks) {
            const targetId = getAttr(link, 'targetId');
            const linkType = getAttr(link, 'type');

            if (linkType === 'selectionEntry' && targetId) {
              // Try to get stats from the linked shared entry
              if (!stats) {
                stats = this.getStatsFromSharedModelEntry(targetId);
              }

              // Extract weapons and get weapon IDs for this model type
              const weaponIds = this.extractWeaponsFromSharedModelEntry(targetId, weapons);

              // Get full model type info
              const modelType = this.getModelTypeFromSharedEntry(targetId, link);
              if (modelType) {
                modelType.weaponIds = weaponIds.length > 0 ? weaponIds : undefined;
                // Only add if not already present
                if (!collectedModelTypes.find(mt => mt.id === modelType.id)) {
                  collectedModelTypes.push(modelType);
                }
              }
            }
          }
        }
      }

      if (entryType === 'model') {
        const groupName = getAttr(group, 'name');
        const charLoadoutGroup = slugify(groupName || 'default');

        const extractWeaponsFromUpgrades = (entries: Record<string, unknown>[], loadoutGroup: string) => {
          for (const entry of entries) {
            const entryType = getAttr(entry, 'type');
            if (entryType === 'upgrade') {
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

        extractWeaponsFromUpgrades(groupEntries, charLoadoutGroup);

        const nestedGroups = ensureArray((group.selectionEntryGroups as Record<string, unknown>)?.selectionEntryGroup);
        for (const nestedGroup of nestedGroups) {
          const nestedGroupName = getAttr(nestedGroup, 'name');
          const nestedLoadoutGroup = slugify(nestedGroupName || charLoadoutGroup);
          const nestedEntries = ensureArray((nestedGroup.selectionEntries as Record<string, unknown>)?.selectionEntry);
          extractWeaponsFromUpgrades(nestedEntries, nestedLoadoutGroup);
        }
      }
    }

    if (directEntries.length > 0) {
      processModelEntries(directEntries, [], undefined);
    }

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

    if (modelVariants.length > 1) {
      const mainVariants = modelVariants.filter(v => !v.maxModels);
      const optionalVariants = modelVariants.filter(v => v.maxModels === 1);

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

    if (entryType === 'model' && Object.keys(points).length === 0) {
      points['1'] = 0;
    }

    const costs = ensureArray(
      (entry.costs as Record<string, unknown>)?.cost
    );

    for (const cost of costs) {
      const typeId = getAttr(cost as Record<string, unknown>, 'typeId');
      if (typeId === TYPE_IDS.POINTS) {
        const value = parseInt(getAttr(cost as Record<string, unknown>, 'value'), 10);
        const minCount = Object.keys(points)[0];
        if (minCount) {
          points[minCount] = value;
        }
      }
    }

    const processPointModifiers = (modifierList: Record<string, unknown>[]) => {
      for (const modifier of modifierList) {
        const field = getAttr(modifier as Record<string, unknown>, 'field');
        const value = getAttr(modifier as Record<string, unknown>, 'value');

        if (field === TYPE_IDS.POINTS) {
          const modPoints = parseInt(value, 10);

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

    const modifiers = ensureArray(
      (entry.modifiers as Record<string, unknown>)?.modifier
    );
    processPointModifiers(modifiers);

    const modifierGroups = ensureArray(
      (entry.modifierGroups as Record<string, unknown>)?.modifierGroup
    );
    for (const group of modifierGroups) {
      const groupModifiers = ensureArray(
        (group.modifiers as Record<string, unknown>)?.modifier
      );
      processPointModifiers(groupModifiers);
    }

    for (const count of Object.keys(points)) {
      if (points[count] === 0) {
        const minCount = Math.min(...Object.keys(points).map(Number));
        if (parseInt(count, 10) !== minCount) {
          delete points[count];
        }
      }
    }

    if (!stats) {
      console.log(`    - No stats found, skipping`);
      return null;
    }

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
          const chars = ensureArray(
            (profile.characteristics as Record<string, unknown>)?.characteristic
          );
          const descChar = chars.find((c: Record<string, unknown>) =>
            getAttr(c, 'name') === 'Description'
          ) as Record<string, unknown> | undefined;

          if (descChar) {
            const desc = (descChar['#text'] as string) || '';
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

    // Add model types if there are multiple (e.g., Gretchin, Squighog Boyz)
    if (collectedModelTypes.length > 1) {
      result.modelTypes = collectedModelTypes;
    }

    return result;
  }
}

// Parse a single faction
export function parseFaction(faction: FactionConfig): ParsedData | null {
  const cataloguePath = join(BSDATA_PATH, faction.catalogueFile);

  if (!existsSync(cataloguePath)) {
    console.error(`  Catalogue file not found: ${cataloguePath}`);
    return null;
  }

  console.log(`  Reading: ${faction.catalogueFile}`);
  const xmlContent = readFileSync(cataloguePath, 'utf-8');

  const parser = new CatalogueParser(xmlContent);
  const units = parser.parse();

  console.log(`  Parsed ${units.length} units (revision ${parser.catalogueRevision})`);

  return {
    faction: faction.name,
    factionId: faction.id,
    source: 'BSData',
    catalogueId: parser.catalogueId,
    catalogueRevision: parser.catalogueRevision,
    lastUpdated: new Date().toISOString().split('T')[0],
    units,
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/bsdata/parse-catalogue.ts [faction-id|--all]');
    console.log('\nAvailable factions:');
    for (const f of FACTIONS) {
      console.log(`  ${f.id.padEnd(15)} - ${f.name}`);
    }
    process.exit(1);
  }

  const factionIds = args[0] === '--all' ? getAllFactionIds() : args;
  const outputDir = __dirname;

  for (const factionId of factionIds) {
    const faction = getFaction(factionId);
    if (!faction) {
      console.error(`Unknown faction: ${factionId}`);
      continue;
    }

    console.log(`\n=== Parsing ${faction.name} ===`);
    const parsed = parseFaction(faction);

    if (parsed) {
      const outputPath = join(outputDir, `${faction.id}-parsed.json`);
      writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
      console.log(`  Output: ${outputPath}`);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
