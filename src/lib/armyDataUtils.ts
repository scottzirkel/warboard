import type { ArmyData, Unit } from '@/types';

/**
 * Find a unit by ID, searching both main units and ally factions.
 */
export function findUnitById(armyData: ArmyData, unitId: string): Unit | undefined {
  const mainUnit = armyData.units.find(u => u.id === unitId);

  if (mainUnit) {
    return mainUnit;
  }

  if (!armyData.allies) {
    return undefined;
  }

  for (const ally of Object.values(armyData.allies)) {
    const allyUnit = ally.units.find(u => u.id === unitId);

    if (allyUnit) {
      return allyUnit;
    }
  }

  return undefined;
}
