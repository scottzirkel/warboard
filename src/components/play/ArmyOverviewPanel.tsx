'use client';

import { PlayUnitCard } from './PlayUnitCard';
import type { Unit, ListUnit, ArmyData } from '@/types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a unit is attached as a leader to another unit in the list
 */
function isUnitAttachedAsLeader(
  unitIndex: number,
  units: ListUnit[]
): boolean {
  return units.some(
    (u) => u.attachedLeader?.unitIndex === unitIndex
  );
}

/**
 * Get the unit data from armyData by unitId
 */
function getUnitById(unitId: string, armyData: ArmyData): Unit | undefined {
  return armyData.units.find((u) => u.id === unitId);
}

/**
 * Calculate wounds for a unit, accounting for mixed loadouts with different wound modifiers
 */
function calculateUnitWounds(
  listUnit: ListUnit,
  unit: Unit
): {
  currentWounds: number;
  maxWounds: number;
  modelsAlive: number;
  totalModels: number;
  woundsPerModel: number;
} {
  const baseWoundsPerModel = unit.stats.w;
  const totalModels = listUnit.modelCount;
  const weaponCounts = listUnit.weaponCounts || {};

  // Find wound modifiers from each equipped loadout
  const woundModsByLoadout = new Map<string, number>();
  const processedGroups = new Set<string>();

  for (const weapon of unit.weapons) {
    if (!weapon.modifiers || weapon.modifiers.length === 0) continue;
    if (!weapon.loadoutGroup) continue;
    if (processedGroups.has(weapon.loadoutGroup)) continue;

    processedGroups.add(weapon.loadoutGroup);

    const count = weaponCounts[weapon.loadoutGroup] || 0;
    if (count === 0) continue;

    let woundMod = 0;
    for (const mod of weapon.modifiers) {
      if (mod.stat === 'w' && mod.scope === 'model') {
        if (mod.operation === 'add') {
          woundMod += mod.value;
        } else if (mod.operation === 'subtract') {
          woundMod -= mod.value;
        }
      }
    }

    if (woundMod !== 0) {
      woundModsByLoadout.set(weapon.loadoutGroup, woundMod);
    }
  }

  // Calculate max wounds accounting for mixed loadouts
  let maxWounds = 0;
  let modelsWithModifiers = 0;

  if (woundModsByLoadout.size === 0) {
    maxWounds = baseWoundsPerModel * totalModels;
  } else {
    for (const [loadoutGroup, woundMod] of woundModsByLoadout) {
      const modelsWithLoadout = weaponCounts[loadoutGroup] || 0;
      const woundsForThisLoadout = baseWoundsPerModel + woundMod;
      maxWounds += modelsWithLoadout * woundsForThisLoadout;
      modelsWithModifiers += modelsWithLoadout;
    }
    const modelsWithBaseWounds = totalModels - modelsWithModifiers;
    maxWounds += modelsWithBaseWounds * baseWoundsPerModel;
  }

  const avgWoundsPerModel = totalModels > 0 ? maxWounds / totalModels : baseWoundsPerModel;

  // Cap currentWounds at maxWounds (handles stale data from before calculation changes)
  const storedWounds = listUnit.currentWounds ?? maxWounds;
  const currentWounds = Math.min(storedWounds, maxWounds);
  const modelsAlive = currentWounds > 0 ? Math.ceil(currentWounds / avgWoundsPerModel) : 0;

  return {
    currentWounds,
    maxWounds,
    modelsAlive,
    totalModels,
    woundsPerModel: avgWoundsPerModel,
  };
}

/**
 * Calculate leader wounds for an attached leader
 */
function calculateLeaderWounds(
  leaderListUnit: ListUnit,
  leaderUnit: Unit
): {
  currentWounds: number;
  maxWounds: number;
  modelsAlive: number;
  totalModels: number;
} {
  const woundsPerModel = leaderUnit.stats.w;
  const totalModels = leaderListUnit.modelCount;
  const maxWounds = woundsPerModel * totalModels;
  const currentWounds = leaderListUnit.leaderCurrentWounds ?? maxWounds;
  const modelsAlive = Math.ceil(currentWounds / woundsPerModel);

  return {
    currentWounds,
    maxWounds,
    modelsAlive,
    totalModels,
  };
}

/**
 * Get enhancement name for a unit
 */
function getEnhancementName(
  listUnit: ListUnit,
  armyData: ArmyData,
  detachmentId: string
): string | undefined {
  if (!listUnit.enhancement) return undefined;

  const detachment = armyData.detachments?.[detachmentId];
  if (!detachment) return undefined;

  const enhancement = detachment.enhancements?.find(
    (e) => e.id === listUnit.enhancement
  );
  return enhancement?.name;
}

/**
 * Calculate unit points including enhancement
 */
function getUnitPoints(
  listUnit: ListUnit,
  unit: Unit,
  armyData: ArmyData,
  detachmentId: string
): number {
  // Base points for the model count
  const basePoints = unit.points[String(listUnit.modelCount)] || 0;

  // Enhancement points
  let enhancementPoints = 0;
  if (listUnit.enhancement) {
    const detachment = armyData.detachments?.[detachmentId];
    const enhancement = detachment?.enhancements?.find(
      (e) => e.id === listUnit.enhancement
    );
    enhancementPoints = enhancement?.points || 0;
  }

  return basePoints + enhancementPoints;
}

// ============================================================================
// Component Types
// ============================================================================

interface ArmyOverviewPanelProps {
  armyData: ArmyData;
  units: ListUnit[];
  selectedUnitIndex: number | null;
  detachmentId: string;
  onSelectUnit: (index: number) => void;
  // Battle info props
  listName?: string;
  totalPoints?: number;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function ArmyOverviewPanel({
  armyData,
  units,
  selectedUnitIndex,
  detachmentId,
  onSelectUnit,
  listName,
  totalPoints,
  className = '',
}: ArmyOverviewPanelProps) {
  // Filter out units that are attached as leaders (they'll be shown with their host unit)
  const visibleUnits = units
    .map((listUnit, index) => ({ listUnit, index }))
    .filter(({ index }) => !isUnitAttachedAsLeader(index, units));

  // Sort units: alive units first, destroyed units at the bottom
  const sortedUnits = [...visibleUnits].sort((a, b) => {
    const unitA = getUnitById(a.listUnit.unitId, armyData);
    const unitB = getUnitById(b.listUnit.unitId, armyData);

    if (!unitA || !unitB) return 0;

    // Calculate combined wounds for unit A (including leader)
    const woundsA = calculateUnitWounds(a.listUnit, unitA);
    let totalWoundsA = woundsA.currentWounds;
    if (a.listUnit.attachedLeader) {
      const leaderListUnitA = units[a.listUnit.attachedLeader.unitIndex];
      const leaderUnitA = leaderListUnitA ? getUnitById(leaderListUnitA.unitId, armyData) : undefined;
      if (leaderListUnitA && leaderUnitA) {
        totalWoundsA += calculateLeaderWounds(leaderListUnitA, leaderUnitA).currentWounds;
      }
    }

    // Calculate combined wounds for unit B (including leader)
    const woundsB = calculateUnitWounds(b.listUnit, unitB);
    let totalWoundsB = woundsB.currentWounds;
    if (b.listUnit.attachedLeader) {
      const leaderListUnitB = units[b.listUnit.attachedLeader.unitIndex];
      const leaderUnitB = leaderListUnitB ? getUnitById(leaderListUnitB.unitId, armyData) : undefined;
      if (leaderListUnitB && leaderUnitB) {
        totalWoundsB += calculateLeaderWounds(leaderListUnitB, leaderUnitB).currentWounds;
      }
    }

    const destroyedA = totalWoundsA <= 0;
    const destroyedB = totalWoundsB <= 0;

    // Destroyed units go to the bottom
    if (destroyedA && !destroyedB) return 1;
    if (!destroyedA && destroyedB) return -1;
    return 0;
  });

  const detachment = armyData.detachments?.[detachmentId];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <h2 className="section-header-inline mb-4 shrink-0">Your Army</h2>

      {/* Battle Info Card */}
      {(listName || detachment || totalPoints !== undefined) && (
        <div className="card-depth p-4 mb-4 shrink-0">
          {listName && (
            <div className="text-lg font-semibold">{listName}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {detachment && (
              <span className="badge badge-accent">{detachment.name}</span>
            )}
            {totalPoints !== undefined && (
              <span className="text-accent-400 font-bold">{totalPoints} pts</span>
            )}
          </div>
        </div>
      )}

      {/* Army Units List */}
      <div className="space-y-2 flex-1 overflow-y-auto scroll-smooth min-h-0">
        {sortedUnits.length === 0 ? (
          <div className="text-center text-white/40 py-12">
            <p className="text-lg mb-1">No units in your army</p>
            <p className="text-sm">Switch to Build Mode to add units</p>
          </div>
        ) : (
          sortedUnits.map(({ listUnit, index }) => {
            const unit = getUnitById(listUnit.unitId, armyData);
            if (!unit) return null;

            // Calculate unit wounds
            const unitWounds = calculateUnitWounds(listUnit, unit);

            // Get attached leader info
            let attachedLeaderName: string | undefined;
            let attachedLeaderUnit: Unit | undefined;
            let attachedLeaderListUnit: ListUnit | undefined;
            let leaderWounds = {
              currentWounds: 0,
              maxWounds: 0,
              modelsAlive: 0,
              totalModels: 0,
            };

            if (listUnit.attachedLeader) {
              attachedLeaderListUnit = units[listUnit.attachedLeader.unitIndex];
              if (attachedLeaderListUnit) {
                attachedLeaderUnit = getUnitById(attachedLeaderListUnit.unitId, armyData);
                if (attachedLeaderUnit) {
                  attachedLeaderName = attachedLeaderUnit.name;
                  leaderWounds = calculateLeaderWounds(attachedLeaderListUnit, attachedLeaderUnit);
                }
              }
            }

            // Get enhancement name (from either unit or attached leader)
            const enhancementName =
              getEnhancementName(listUnit, armyData, detachmentId) ||
              (attachedLeaderListUnit
                ? getEnhancementName(attachedLeaderListUnit, armyData, detachmentId)
                : undefined);

            // Calculate unit points (including leader if attached)
            let unitPoints = getUnitPoints(listUnit, unit, armyData, detachmentId);
            if (attachedLeaderListUnit && attachedLeaderUnit) {
              unitPoints += getUnitPoints(attachedLeaderListUnit, attachedLeaderUnit, armyData, detachmentId);
            }

            return (
              <PlayUnitCard
                key={index}
                unit={unit}
                listUnit={listUnit}
                index={index}
                isSelected={selectedUnitIndex === index}
                onSelect={() => onSelectUnit(index)}
                currentWounds={unitWounds.currentWounds}
                maxWounds={unitWounds.maxWounds}
                modelsAlive={unitWounds.modelsAlive}
                totalModels={unitWounds.totalModels}
                attachedLeaderName={attachedLeaderName}
                attachedLeaderUnit={attachedLeaderUnit}
                attachedLeaderListUnit={attachedLeaderListUnit}
                leaderCurrentWounds={leaderWounds.currentWounds}
                leaderMaxWounds={leaderWounds.maxWounds}
                leaderModelsAlive={leaderWounds.modelsAlive}
                leaderTotalModels={leaderWounds.totalModels}
                enhancementName={enhancementName}
                unitPoints={unitPoints}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
