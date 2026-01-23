'use client';

import { Panel } from '@/components/ui';
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

// ============================================================================
// Component Types
// ============================================================================

interface ArmyOverviewPanelProps {
  armyData: ArmyData;
  units: ListUnit[];
  selectedUnitIndex: number | null;
  detachmentId: string;
  onSelectUnit: (index: number) => void;
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
  className = '',
}: ArmyOverviewPanelProps) {
  // Filter out units that are attached as leaders (they'll be shown with their host unit)
  const visibleUnits = units
    .map((listUnit, index) => ({ listUnit, index }))
    .filter(({ index }) => !isUnitAttachedAsLeader(index, units));

  // Count units for summary
  const totalUnits = visibleUnits.length;
  const destroyedUnits = visibleUnits.filter(({ listUnit, index: _index }) => {
    const unit = getUnitById(listUnit.unitId, armyData);
    if (!unit) return false;

    const { currentWounds } = calculateUnitWounds(listUnit, unit);

    // Also check attached leader wounds
    let leaderCurrentWounds = 0;
    if (listUnit.attachedLeader) {
      const leaderListUnit = units[listUnit.attachedLeader.unitIndex];
      const leaderUnit = getUnitById(leaderListUnit?.unitId, armyData);
      if (leaderListUnit && leaderUnit) {
        const leaderWounds = calculateLeaderWounds(leaderListUnit, leaderUnit);
        leaderCurrentWounds = leaderWounds.currentWounds;
      }
    }

    return (currentWounds + leaderCurrentWounds) <= 0;
  }).length;
  const activeUnits = totalUnits - destroyedUnits;

  return (
    <Panel
      title="Army Overview"
      headerRight={
        <span className="text-sm text-gray-400">
          {activeUnits}/{totalUnits} active
        </span>
      }
      className={className}
    >
      <div className="p-3 space-y-2">
        {visibleUnits.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No units in army list</p>
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
              />
            );
          })
        )}
      </div>
    </Panel>
  );
}
