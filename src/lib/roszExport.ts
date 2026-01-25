import type {
  CurrentList,
  ArmyData,
  Unit,
  ListUnit,
  Weapon,
  Ability,
  RangedWeaponStats,
  MeleeWeaponStats,
} from '@/types';

// ============================================================================
// Constants
// ============================================================================

const BATTLESCRIBE_VERSION = '2.03';
const GAME_SYSTEM_NAME = 'Warhammer 40,000 10th Edition';
const POINTS_TYPE_ID = '51b2-306e-1021-d207';

// ============================================================================
// Types
// ============================================================================

interface RosterMeta {
  id: string;
  name: string;
  gameSystemId: string;
  gameSystemName: string;
  catalogueId: string;
  catalogueName: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a UUID v4 for roster element IDs
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calculate total points for a list unit
 */
function calculateUnitPoints(unit: Unit, listUnit: ListUnit): number {
  const modelPoints = unit.points[listUnit.modelCount.toString()] ?? 0;
  // Enhancement points would be added here if we had access to detachment data
  return modelPoints;
}

/**
 * Calculate total list points
 */
function calculateTotalPoints(list: CurrentList, armyData: ArmyData): number {
  let total = 0;

  for (const listUnit of list.units) {
    const unitDef = armyData.units.find((u) => u.id === listUnit.unitId);
    if (unitDef) {
      total += calculateUnitPoints(unitDef, listUnit);

      // Add enhancement points
      if (listUnit.enhancement) {
        const detachment = armyData.detachments[list.detachment];
        const enhancement = detachment?.enhancements.find(
          (e) => e.id === listUnit.enhancement
        );
        if (enhancement) {
          total += enhancement.points;
        }
      }
    }
  }

  return total;
}

// ============================================================================
// XML Generation - Profile Helpers
// ============================================================================

/**
 * Generate a unit stats profile
 */
function generateUnitProfile(unit: Unit): string {
  const profileId = generateUUID();
  const typeId = generateUUID();

  return `
        <profile id="${profileId}" name="${escapeXml(unit.name)}" typeId="${typeId}" typeName="Unit">
          <characteristics>
            <characteristic name="M" typeId="${generateUUID()}">${unit.stats.m}"</characteristic>
            <characteristic name="T" typeId="${generateUUID()}">${unit.stats.t}</characteristic>
            <characteristic name="SV" typeId="${generateUUID()}">${unit.stats.sv}</characteristic>
            <characteristic name="W" typeId="${generateUUID()}">${unit.stats.w}</characteristic>
            <characteristic name="LD" typeId="${generateUUID()}">${unit.stats.ld}</characteristic>
            <characteristic name="OC" typeId="${generateUUID()}">${unit.stats.oc}</characteristic>${unit.invuln ? `
            <characteristic name="Invuln" typeId="${generateUUID()}">${unit.invuln}</characteristic>` : ''}
          </characteristics>
        </profile>`;
}

/**
 * Generate a ranged weapon profile
 */
function generateRangedWeaponProfile(weapon: Weapon): string {
  const stats = weapon.stats as RangedWeaponStats;
  const profileId = generateUUID();
  const typeId = generateUUID();
  const abilities = weapon.abilities.length > 0 ? weapon.abilities.join(', ') : '-';

  return `
        <profile id="${profileId}" name="${escapeXml(weapon.name)}" typeId="${typeId}" typeName="Ranged Weapons">
          <characteristics>
            <characteristic name="Range" typeId="${generateUUID()}">${stats.range}"</characteristic>
            <characteristic name="A" typeId="${generateUUID()}">${stats.a}</characteristic>
            <characteristic name="BS" typeId="${generateUUID()}">${stats.bs}</characteristic>
            <characteristic name="S" typeId="${generateUUID()}">${stats.s}</characteristic>
            <characteristic name="AP" typeId="${generateUUID()}">${stats.ap}</characteristic>
            <characteristic name="D" typeId="${generateUUID()}">${stats.d}</characteristic>
            <characteristic name="Abilities" typeId="${generateUUID()}">${escapeXml(abilities)}</characteristic>
          </characteristics>
        </profile>`;
}

/**
 * Generate a melee weapon profile
 */
function generateMeleeWeaponProfile(weapon: Weapon): string {
  const stats = weapon.stats as MeleeWeaponStats;
  const profileId = generateUUID();
  const typeId = generateUUID();
  const abilities = weapon.abilities.length > 0 ? weapon.abilities.join(', ') : '-';

  return `
        <profile id="${profileId}" name="${escapeXml(weapon.name)}" typeId="${typeId}" typeName="Melee Weapons">
          <characteristics>
            <characteristic name="Range" typeId="${generateUUID()}">Melee</characteristic>
            <characteristic name="A" typeId="${generateUUID()}">${stats.a}</characteristic>
            <characteristic name="WS" typeId="${generateUUID()}">${stats.ws}</characteristic>
            <characteristic name="S" typeId="${generateUUID()}">${stats.s}</characteristic>
            <characteristic name="AP" typeId="${generateUUID()}">${stats.ap}</characteristic>
            <characteristic name="D" typeId="${generateUUID()}">${stats.d}</characteristic>
            <characteristic name="Abilities" typeId="${generateUUID()}">${escapeXml(abilities)}</characteristic>
          </characteristics>
        </profile>`;
}

/**
 * Generate an ability profile
 */
function generateAbilityProfile(ability: Ability): string {
  const profileId = generateUUID();
  const typeId = generateUUID();

  return `
        <profile id="${profileId}" name="${escapeXml(ability.name)}" typeId="${typeId}" typeName="Abilities">
          <characteristics>
            <characteristic name="Description" typeId="${generateUUID()}">${escapeXml(ability.description)}</characteristic>
          </characteristics>
        </profile>`;
}

/**
 * Generate all profiles for a unit (stats, weapons, abilities)
 */
function generateProfiles(unit: Unit): string {
  const profiles: string[] = [];

  // Unit stats profile
  profiles.push(generateUnitProfile(unit));

  // Weapon profiles
  for (const weapon of unit.weapons) {
    if (weapon.type === 'ranged') {
      profiles.push(generateRangedWeaponProfile(weapon));
    } else if (weapon.type === 'melee') {
      profiles.push(generateMeleeWeaponProfile(weapon));
    }
    // Skip 'equipment' type - no stats to display
  }

  // Ability profiles
  for (const ability of unit.abilities) {
    profiles.push(generateAbilityProfile(ability));
  }

  if (profiles.length === 0) {
    return '';
  }

  return `
      <profiles>${profiles.join('')}
      </profiles>`;
}

/**
 * Generate categories from unit keywords
 */
function generateCategories(unit: Unit): string {
  if (!unit.keywords || unit.keywords.length === 0) {
    return '';
  }

  const categoryEntries = unit.keywords.map((keyword) => {
    const categoryId = generateUUID();
    const entryId = generateUUID();
    // Mark first keyword as "primary" (usually the unit's own name)
    const primary = unit.keywords.indexOf(keyword) === 0 ? 'true' : 'false';
    return `
        <category id="${categoryId}" name="${escapeXml(keyword)}" entryId="${entryId}" primary="${primary}"/>`;
  });

  return `
      <categories>${categoryEntries.join('')}
      </categories>`;
}

// ============================================================================
// XML Generation - Unit Selection
// ============================================================================

/**
 * Generate a unit selection XML element
 */
function generateUnitSelection(
  unit: Unit,
  listUnit: ListUnit,
  armyData: ArmyData,
  detachmentId: string
): string {
  const selectionId = generateUUID();
  const points = calculateUnitPoints(unit, listUnit);

  // Get enhancement if present
  let enhancementXml = '';
  if (listUnit.enhancement) {
    const detachment = armyData.detachments[detachmentId];
    const enhancement = detachment?.enhancements.find(
      (e) => e.id === listUnit.enhancement
    );
    if (enhancement) {
      const enhId = generateUUID();
      enhancementXml = `
        <selection id="${enhId}" name="${escapeXml(enhancement.name)}" type="upgrade" number="1">
          <costs>
            <cost name="pts" typeId="${POINTS_TYPE_ID}" value="${enhancement.points}"/>
          </costs>
        </selection>`;
    }
  }

  // Use bsdataId if available, otherwise generate one
  const entryId = unit.bsdataId || generateUUID();

  // Generate profiles (stats, weapons, abilities) and categories (keywords)
  const profilesXml = generateProfiles(unit);
  const categoriesXml = generateCategories(unit);

  return `
      <selection id="${selectionId}" name="${escapeXml(unit.name)}" entryId="${entryId}" number="1" type="unit">
        <costs>
          <cost name="pts" typeId="${POINTS_TYPE_ID}" value="${points}"/>
        </costs>${profilesXml}${categoriesXml}
        <selections>
          <selection id="${generateUUID()}" name="${escapeXml(unit.name)}" type="model" number="${listUnit.modelCount}">
            <costs>
              <cost name="pts" typeId="${POINTS_TYPE_ID}" value="0"/>
            </costs>
          </selection>${enhancementXml}
        </selections>
      </selection>`;
}

/**
 * Generate the complete roster XML
 */
export function generateRosterXml(
  list: CurrentList,
  armyData: ArmyData
): string {
  const meta: RosterMeta = {
    id: generateUUID(),
    name: list.name || 'Army List',
    gameSystemId: armyData.gameSystemId || 'sys-352e-adc2-7639-d6a9',
    gameSystemName: GAME_SYSTEM_NAME,
    catalogueId: armyData.catalogueId || '',
    catalogueName: `Imperium - ${armyData.faction}`,
  };

  const totalPoints = calculateTotalPoints(list, armyData);
  const forceId = generateUUID();

  // Generate unit selections
  const selections = list.units
    .map((listUnit) => {
      const unit = armyData.units.find((u) => u.id === listUnit.unitId);
      if (!unit) return '';
      return generateUnitSelection(unit, listUnit, armyData, list.detachment);
    })
    .filter(Boolean)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<roster id="${meta.id}"
        name="${escapeXml(meta.name)}"
        battleScribeVersion="${BATTLESCRIBE_VERSION}"
        gameSystemId="${meta.gameSystemId}"
        gameSystemName="${escapeXml(meta.gameSystemName)}"
        gameSystemRevision="1"
        xmlns="http://www.battlescribe.net/schema/rosterSchema">
  <costs>
    <cost name="pts" typeId="${POINTS_TYPE_ID}" value="${totalPoints}"/>
  </costs>
  <forces>
    <force id="${forceId}"
           name="${escapeXml(armyData.faction)}"
           catalogueId="${meta.catalogueId}"
           catalogueRevision="1"
           catalogueName="${escapeXml(meta.catalogueName)}">
      <selections>${selections}
      </selections>
    </force>
  </forces>
</roster>`;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Generate a .ros XML file (uncompressed roster)
 * This can be imported by BattleScribe directly
 */
export function generateRos(list: CurrentList, armyData: ArmyData): Blob {
  const xml = generateRosterXml(list, armyData);
  return new Blob([xml], { type: 'application/xml' });
}

/**
 * Generate a .rosz file (compressed roster)
 * Uses the browser's CompressionStream API for gzip
 */
export async function generateRosz(
  list: CurrentList,
  armyData: ArmyData
): Promise<Blob> {
  const xml = generateRosterXml(list, armyData);
  const encoder = new TextEncoder();
  const data = encoder.encode(xml);

  // Check if CompressionStream is available (modern browsers)
  if (typeof CompressionStream !== 'undefined') {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });

    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new Blob([result], { type: 'application/gzip' });
  }

  // Fallback: return uncompressed XML if CompressionStream is not available
  console.warn(
    'CompressionStream not available, returning uncompressed .ros file'
  );
  return new Blob([xml], { type: 'application/xml' });
}

/**
 * Download a roster file
 */
export function downloadRoster(
  blob: Blob,
  filename: string,
  compressed: boolean
): void {
  const extension = compressed ? '.rosz' : '.ros';
  const fullFilename = filename.endsWith(extension)
    ? filename
    : `${filename}${extension}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
