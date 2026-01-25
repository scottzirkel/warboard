import type {
  CurrentList,
  ArmyData,
  Unit,
  ListUnit,
  Weapon,
  RangedWeaponStats,
  MeleeWeaponStats,
} from '@/types';

// ============================================================================
// Yellowscribe Types
// ============================================================================

interface YellowscribeWeapon {
  name: string;
  range: string;
  A: string;
  BS: string;
  WS: string;
  S: string;
  AP: string;
  D: string;
  abilities: string[];
}

interface YellowscribeAbility {
  name: string;
  text: string;
}

interface YellowscribeCharacteristics {
  M: string;
  T: string;
  Sv: string;
  W: string;
  Ld: string;
  OC: string;
  Inv?: string;
}

interface YellowscribeModel {
  name: string;
  number: number;
  weapons: YellowscribeWeapon[];
  abilities: YellowscribeAbility[];
  characteristics: YellowscribeCharacteristics;
}

interface YellowscribeUnit {
  name: string;
  models: YellowscribeModel[];
  abilities: YellowscribeAbility[];
  factionKeywords: string[];
  otherKeywords: string[];
}

interface YellowscribeArmy {
  edition: string;
  order: string;
  units: YellowscribeUnit[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatStat(value: number | string): string {
  return String(value);
}

function formatRange(range: number): string {
  return `${range}"`;
}

function formatAP(ap: number): string {
  if (ap === 0) return '0';

  return String(ap);
}

function isRangedStats(stats: unknown): stats is RangedWeaponStats {
  return (
    typeof stats === 'object' &&
    stats !== null &&
    'range' in stats &&
    'bs' in stats
  );
}

function isMeleeStats(stats: unknown): stats is MeleeWeaponStats {
  return (
    typeof stats === 'object' &&
    stats !== null &&
    'ws' in stats &&
    !('range' in stats)
  );
}

function transformWeapon(weapon: Weapon): YellowscribeWeapon | null {
  if (weapon.type === 'equipment') {
    return null;
  }

  if (isRangedStats(weapon.stats)) {
    return {
      name: weapon.name,
      range: formatRange(weapon.stats.range),
      A: formatStat(weapon.stats.a),
      BS: weapon.stats.bs,
      WS: '-',
      S: formatStat(weapon.stats.s),
      AP: formatAP(weapon.stats.ap),
      D: formatStat(weapon.stats.d),
      abilities: weapon.abilities,
    };
  }

  if (isMeleeStats(weapon.stats)) {
    return {
      name: weapon.name,
      range: 'Melee',
      A: formatStat(weapon.stats.a),
      BS: '-',
      WS: weapon.stats.ws,
      S: formatStat(weapon.stats.s),
      AP: formatAP(weapon.stats.ap),
      D: formatStat(weapon.stats.d),
      abilities: weapon.abilities,
    };
  }

  return null;
}

function getActiveWeapons(unit: Unit, listUnit: ListUnit): Weapon[] {
  // If no loadout options, return all weapons
  if (!unit.loadoutOptions || unit.loadoutOptions.length === 0) {
    return unit.weapons.filter((w) => w.type !== 'equipment');
  }

  const activeGroups = new Set<string>();

  // Determine which loadout groups are active based on weaponCounts or loadout
  for (const option of unit.loadoutOptions) {
    const selectedChoice =
      listUnit.weaponCounts && Object.keys(listUnit.weaponCounts).length > 0
        ? Object.entries(listUnit.weaponCounts).find(
            ([choiceId, count]) =>
              count > 0 &&
              option.choices.some((c) => c.id === choiceId)
          )?.[0]
        : listUnit.loadout?.[option.id];

    if (selectedChoice) {
      activeGroups.add(selectedChoice);
    } else {
      // Use default
      const defaultChoice = option.choices.find((c) => c.default);

      if (defaultChoice) {
        activeGroups.add(defaultChoice.id);
      }
    }
  }

  // Filter weapons to only include those in active groups or without a group
  return unit.weapons.filter((w) => {
    if (w.type === 'equipment') return false;
    if (!w.loadoutGroup) return true;

    return activeGroups.has(w.loadoutGroup);
  });
}

function getEnhancementName(
  listUnit: ListUnit,
  armyData: ArmyData,
  detachmentId: string
): string | null {
  if (!listUnit.enhancement) return null;

  const detachment = armyData.detachments[detachmentId];

  if (!detachment) return null;

  const enhancement = detachment.enhancements.find(
    (e) => e.id === listUnit.enhancement
  );

  return enhancement?.name ?? null;
}

// ============================================================================
// Main Transform Function
// ============================================================================

export function transformToYellowscribe(
  list: CurrentList,
  armyData: ArmyData
): YellowscribeArmy {
  const units: YellowscribeUnit[] = [];

  for (const listUnit of list.units) {
    const unitDef = armyData.units.find((u) => u.id === listUnit.unitId);

    if (!unitDef) continue;

    const activeWeapons = getActiveWeapons(unitDef, listUnit);
    const enhancementName = getEnhancementName(listUnit, armyData, list.detachment);

    // Transform weapons
    const weapons: YellowscribeWeapon[] = activeWeapons
      .map(transformWeapon)
      .filter((w): w is YellowscribeWeapon => w !== null);

    // Build characteristics
    const characteristics: YellowscribeCharacteristics = {
      M: `${unitDef.stats.m}"`,
      T: formatStat(unitDef.stats.t),
      Sv: unitDef.stats.sv,
      W: formatStat(unitDef.stats.w),
      Ld: unitDef.stats.ld,
      OC: formatStat(unitDef.stats.oc),
    };

    if (unitDef.invuln) {
      characteristics.Inv = unitDef.invuln;
    }

    // Build abilities (filter out loadout-specific ones that aren't active)
    const abilities: YellowscribeAbility[] = unitDef.abilities
      .filter((a) => {
        if (!a.loadoutGroup) return true;

        // Check if this ability's loadout group is active
        const activeWeaponGroups = new Set(
          activeWeapons.map((w) => w.loadoutGroup).filter(Boolean)
        );

        return activeWeaponGroups.has(a.loadoutGroup);
      })
      .map((a) => ({
        name: a.name,
        text: a.description,
      }));

    // Add enhancement as an ability if present
    if (enhancementName) {
      const detachment = armyData.detachments[list.detachment];
      const enhancement = detachment?.enhancements.find(
        (e) => e.id === listUnit.enhancement
      );

      if (enhancement) {
        abilities.push({
          name: `Enhancement: ${enhancement.name}`,
          text: enhancement.description,
        });
      }
    }

    // Build model name (include enhancement if character)
    let modelName = unitDef.name;

    if (enhancementName) {
      modelName = `${unitDef.name} w/ ${enhancementName}`;
    }

    // Create the model entry
    const model: YellowscribeModel = {
      name: modelName,
      number: listUnit.modelCount,
      weapons,
      abilities: [],
      characteristics,
    };

    // Split keywords into faction and other
    const factionKeywords = unitDef.keywords.filter(
      (k) =>
        k === 'Imperium' ||
        k === 'Adeptus Custodes' ||
        k === 'Anathema Psykana' ||
        k === 'Sisters of Silence' ||
        k.includes('Chaos') ||
        k.includes('Tyranid') ||
        k.includes('Aeldari') ||
        k.includes('Ork') ||
        k.includes('Necron') ||
        k.includes('T\'au')
    );

    const otherKeywords = unitDef.keywords.filter(
      (k) => !factionKeywords.includes(k)
    );

    units.push({
      name: unitDef.name,
      models: [model],
      abilities,
      factionKeywords,
      otherKeywords,
    });
  }

  return {
    edition: '10th',
    order: armyData.faction,
    units,
  };
}

// ============================================================================
// API Call
// ============================================================================

const YELLOWSCRIBE_API = 'https://yellowscribe.link';

export interface YellowscribeExportResult {
  success: boolean;
  code?: string;
  error?: string;
}

export async function exportToYellowscribe(
  list: CurrentList,
  armyData: ArmyData
): Promise<YellowscribeExportResult> {
  try {
    const army = transformToYellowscribe(list, armyData);

    // Required query parameters for TTS integration
    const queryParams = new URLSearchParams({
      uiHeight: '700',
      uiWidth: '1200',
      decorativeNames: '',
      modules: 'MatchedPlay',
    });

    const response = await fetch(
      `${YELLOWSCRIBE_API}/getArmyCode?${queryParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(army),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Yellowscribe API error: ${response.status}`,
      };
    }

    const code = await response.text();

    return {
      success: true,
      code: code.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
