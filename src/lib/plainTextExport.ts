import type { CurrentList, ArmyData, Unit, ListUnit } from '@/types';

// ============================================================================
// Plain Text Export
// ============================================================================

/**
 * Get the unit definition from army data.
 */
function getUnitDef(armyData: ArmyData, unitId: string): Unit | undefined {
  return armyData.units.find((u) => u.id === unitId);
}

/**
 * Calculate points for a single list unit.
 */
function getUnitPoints(unitDef: Unit, listUnit: ListUnit): number {
  return unitDef.points[listUnit.modelCount] || 0;
}

/**
 * Get enhancement name and points.
 */
function getEnhancementInfo(
  armyData: ArmyData,
  detachmentId: string,
  enhancementId: string
): { name: string; points: number } | null {
  if (!enhancementId) return null;

  const detachment = armyData.detachments[detachmentId];

  if (!detachment) return null;

  const enhancement = detachment.enhancements.find((e) => e.id === enhancementId);

  if (!enhancement) return null;

  return { name: enhancement.name, points: enhancement.points };
}

/**
 * Get the selected loadout description for a unit.
 */
function getLoadoutDescription(
  unitDef: Unit,
  listUnit: ListUnit
): string | null {
  if (!unitDef.loadoutOptions || unitDef.loadoutOptions.length === 0) {
    return null;
  }

  const selections: string[] = [];

  for (const option of unitDef.loadoutOptions) {
    let selectedChoice = option.choices.find((c) => c.default);

    // Check weaponCounts first
    if (listUnit.weaponCounts && Object.keys(listUnit.weaponCounts).length > 0) {
      for (const [choiceId, count] of Object.entries(listUnit.weaponCounts)) {
        if (count > 0) {
          const choice = option.choices.find((c) => c.id === choiceId);

          if (choice) {
            selectedChoice = choice;
            break;
          }
        }
      }
    }

    if (selectedChoice && !selectedChoice.default) {
      selections.push(selectedChoice.name);
    }
  }

  return selections.length > 0 ? selections.join(', ') : null;
}

/**
 * Export army list to plain text format.
 */
export function exportToPlainText(list: CurrentList, armyData: ArmyData): string {
  const lines: string[] = [];

  // Header
  const detachment = armyData.detachments[list.detachment];
  const detachmentName = detachment?.name || 'Unknown Detachment';

  lines.push(`# ${list.name || 'Army List'}`);
  lines.push('');
  lines.push(`**Faction:** ${armyData.faction}`);
  lines.push(`**Detachment:** ${detachmentName}`);

  // Calculate total points
  let totalPoints = 0;

  for (const listUnit of list.units) {
    const unitDef = getUnitDef(armyData, listUnit.unitId);

    if (!unitDef) continue;

    totalPoints += getUnitPoints(unitDef, listUnit);

    const enhancementInfo = getEnhancementInfo(
      armyData,
      list.detachment,
      listUnit.enhancement
    );

    if (enhancementInfo) {
      totalPoints += enhancementInfo.points;
    }
  }

  lines.push(`**Points:** ${totalPoints} / ${list.pointsLimit}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Units
  lines.push('## Units');
  lines.push('');

  for (const listUnit of list.units) {
    const unitDef = getUnitDef(armyData, listUnit.unitId);

    if (!unitDef) continue;

    const unitPoints = getUnitPoints(unitDef, listUnit);
    const enhancementInfo = getEnhancementInfo(
      armyData,
      list.detachment,
      listUnit.enhancement
    );
    const loadout = getLoadoutDescription(unitDef, listUnit);

    // Unit line: Name x Count (Points)
    const countStr = listUnit.modelCount > 1 ? ` x${listUnit.modelCount}` : '';
    const unitLine = `- **${unitDef.name}**${countStr} (${unitPoints}pts)`;

    lines.push(unitLine);

    // Enhancement as sub-item
    if (enhancementInfo) {
      lines.push(`  - Enhancement: ${enhancementInfo.name} (${enhancementInfo.points}pts)`);
    }

    // Loadout as sub-item
    if (loadout) {
      lines.push(`  - Loadout: ${loadout}`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push(`**Total:** ${totalPoints}pts`);

  return lines.join('\n');
}

/**
 * Export army list to JSON format.
 */
export function exportToJson(list: CurrentList, armyData: ArmyData): string {
  const exportData = {
    name: list.name,
    faction: armyData.faction,
    detachment: armyData.detachments[list.detachment]?.name || list.detachment,
    pointsLimit: list.pointsLimit,
    format: list.format,
    units: list.units.map((listUnit) => {
      const unitDef = getUnitDef(armyData, listUnit.unitId);
      const enhancementInfo = getEnhancementInfo(
        armyData,
        list.detachment,
        listUnit.enhancement
      );

      return {
        name: unitDef?.name || listUnit.unitId,
        modelCount: listUnit.modelCount,
        points: unitDef ? getUnitPoints(unitDef, listUnit) : 0,
        enhancement: enhancementInfo?.name || null,
        weaponCounts: listUnit.weaponCounts,
      };
    }),
  };

  return JSON.stringify(exportData, null, 2);
}
