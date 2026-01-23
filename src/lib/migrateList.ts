import type { CurrentList, ListUnit, GameFormat } from '@/types';

// ============================================================================
// Old List Format Types (for migration)
// ============================================================================

interface OldListUnit {
  unitId: string;
  modelCount: number;
  enhancement?: string;
  wargear?: unknown[];
  loadout?: Record<string, string>;
  weaponCounts?: Record<string, number>;
  currentWounds?: number | null;
  leaderCurrentWounds?: number | null;
  attachedLeader?: { unitIndex: number } | null;
}

interface OldList {
  name: string;
  army?: string;
  detachment: string;
  gameFormat?: string;
  format?: GameFormat;
  pointsLimit: number;
  units: OldListUnit[];
  activeKatah?: string;
  activeModifiers?: unknown[];
  savedAt?: string;
}

// ============================================================================
// Migration Logic
// ============================================================================

/**
 * Migrate a list unit from old format to new format.
 */
function migrateListUnit(oldUnit: OldListUnit): ListUnit {
  return {
    unitId: oldUnit.unitId,
    modelCount: oldUnit.modelCount,
    enhancement: oldUnit.enhancement ?? '',
    loadout: oldUnit.loadout,
    weaponCounts: oldUnit.weaponCounts,
    currentWounds: oldUnit.currentWounds ?? null,
    leaderCurrentWounds: oldUnit.leaderCurrentWounds ?? null,
    attachedLeader: oldUnit.attachedLeader ?? null,
  };
}

/**
 * Detect army from detachment or first unit.
 * In old lists, army wasn't stored but can be inferred from detachment names.
 */
function detectArmy(oldList: OldList): string {
  const detachment = oldList.detachment.toLowerCase();

  // Custodes detachments
  if (detachment.includes('shield_host') ||
      detachment.includes('shieldhost') ||
      detachment.includes('talons') ||
      detachment.includes('null_maiden') ||
      detachment.includes('auric') ||
      detachment.includes('solar_spearhead') ||
      detachment.includes('lions')) {
    return 'custodes';
  }

  // Tyranids detachments
  if (detachment.includes('invasion_fleet') ||
      detachment.includes('unending_swarm') ||
      detachment.includes('crusher_stampede') ||
      detachment.includes('assimilation_swarm') ||
      detachment.includes('synaptic_nexus') ||
      detachment.includes('vanguard_onslaught')) {
    return 'tyranids';
  }

  // Space Marines detachments
  if (detachment.includes('gladius') ||
      detachment.includes('firestorm') ||
      detachment.includes('ironstorm') ||
      detachment.includes('stormlance') ||
      detachment.includes('vanguard') ||
      detachment.includes('anvil') ||
      detachment.includes('1st_company')) {
    return 'spacemarines';
  }

  // Chaos Space Marines detachments
  if (detachment.includes('slaves_to_darkness') ||
      detachment.includes('pactbound') ||
      detachment.includes('veterans_of_the_long_war') ||
      detachment.includes('deceptors') ||
      detachment.includes('fellhammer') ||
      detachment.includes('soulforged')) {
    return 'chaosmarines';
  }

  // Necrons detachments
  if (detachment.includes('awakened_dynasty') ||
      detachment.includes('annihilation_legion') ||
      detachment.includes('canoptek_court') ||
      detachment.includes('hypercrypt') ||
      detachment.includes('obeisance_phalanx')) {
    return 'necrons';
  }

  // Orks detachments
  if (detachment.includes('waaagh') ||
      detachment.includes('bully_boyz') ||
      detachment.includes('da_big_hunt') ||
      detachment.includes('dread_mob') ||
      detachment.includes('green_tide') ||
      detachment.includes('speed_freeks') ||
      detachment.includes('war_horde')) {
    return 'orks';
  }

  // Default to custodes if we can't detect
  return 'custodes';
}

/**
 * Check if a list needs migration.
 */
export function needsMigration(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const list = data as Record<string, unknown>;

  // Has old gameFormat field instead of format
  if ('gameFormat' in list && !('format' in list)) {
    return true;
  }

  // Missing army field
  if (!('army' in list)) {
    return true;
  }

  // Has wargear field in any unit
  if (Array.isArray(list.units)) {
    for (const unit of list.units) {
      if (unit && typeof unit === 'object' && 'wargear' in unit) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Migrate a saved list from old format to new format.
 * Returns the list unchanged if no migration is needed.
 */
export function migrateList(data: unknown): CurrentList {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid list data');
  }

  const oldList = data as OldList;

  // Determine the format (gameFormat in old, format in new)
  let format: GameFormat = 'standard';
  if (oldList.format) {
    format = oldList.format;
  } else if (oldList.gameFormat) {
    format = oldList.gameFormat === 'colosseum' ? 'colosseum' : 'standard';
  }

  // Determine army
  const army = oldList.army ?? detectArmy(oldList);

  // Migrate units
  const units = oldList.units.map(migrateListUnit);

  return {
    name: oldList.name,
    army,
    pointsLimit: oldList.pointsLimit,
    format,
    detachment: oldList.detachment,
    units,
  };
}
