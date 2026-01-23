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
 * Calculate wounds for a unit
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
  const woundsPerModel = unit.stats.w;
  const totalModels = listUnit.modelCount;
  const maxWounds = woundsPerModel * totalModels;
  const currentWounds = listUnit.currentWounds ?? maxWounds;
  const modelsAlive = Math.ceil(currentWounds / woundsPerModel);

  return {
    currentWounds,
    maxWounds,
    modelsAlive,
    totalModels,
    woundsPerModel,
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
        {visibleUnits.length === 0 ? (
          <div className="text-center text-white/40 py-12">
            <p className="text-lg mb-1">No units in your army</p>
            <p className="text-sm">Switch to Build Mode to add units</p>
          </div>
        ) : (
          visibleUnits.map(({ listUnit, index }) => {
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
