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
 * Get the unit data from armyData by unitId (checks both regular units and allies)
 */
function getUnitById(unitId: string, armyData: ArmyData): Unit | undefined {
  // Check regular units first
  const regularUnit = armyData.units.find((u) => u.id === unitId);
  if (regularUnit) return regularUnit;

  // Check allies
  if (armyData.allies) {
    for (const faction of Object.values(armyData.allies)) {
      const allyUnit = faction.units?.find((u) => u.id === unitId);
      if (allyUnit) return allyUnit;
    }
  }

  return undefined;
}

import type { Modifier } from '@/types';

/**
 * Calculate wound modifier from enhancement modifiers
 */
function getEnhancementWoundModifier(modifiers: Modifier[]): number {
  let woundMod = 0;
  for (const mod of modifiers) {
    if (mod.stat === 'w' && (mod.scope === 'model' || mod.scope === 'unit')) {
      if (mod.operation === 'add') {
        woundMod += mod.value;
      } else if (mod.operation === 'subtract') {
        woundMod -= mod.value;
      } else if (mod.operation === 'set') {
        // For 'set' operations, we can't easily combine with other modifiers
        // This would need special handling if used
      }
    }
  }
  return woundMod;
}

/**
 * Calculate wounds for a unit, accounting for mixed loadouts with different wound modifiers
 * and enhancement modifiers
 */
function calculateUnitWounds(
  listUnit: ListUnit,
  unit: Unit,
  enhancementModifiers: Modifier[] = []
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

  // Get enhancement wound modifier (applies to all models)
  const enhancementWoundMod = getEnhancementWoundModifier(enhancementModifiers);

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

  // Calculate max wounds accounting for mixed loadouts AND enhancement modifiers
  let maxWounds = 0;
  let modelsWithModifiers = 0;

  // Base wounds per model with enhancement modifier
  const baseWithEnhancement = baseWoundsPerModel + enhancementWoundMod;

  if (woundModsByLoadout.size === 0) {
    maxWounds = baseWithEnhancement * totalModels;
  } else {
    for (const [loadoutGroup, woundMod] of woundModsByLoadout) {
      const modelsWithLoadout = weaponCounts[loadoutGroup] || 0;
      // Add both weapon modifier AND enhancement modifier
      const woundsForThisLoadout = baseWoundsPerModel + woundMod + enhancementWoundMod;
      maxWounds += modelsWithLoadout * woundsForThisLoadout;
      modelsWithModifiers += modelsWithLoadout;
    }
    const modelsWithBaseWounds = totalModels - modelsWithModifiers;
    maxWounds += modelsWithBaseWounds * baseWithEnhancement;
  }

  const avgWoundsPerModel = totalModels > 0 ? maxWounds / totalModels : baseWithEnhancement;

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
 * Calculate leader wounds for an attached leader, including weapon and enhancement modifiers
 */
function calculateLeaderWounds(
  leaderListUnit: ListUnit,
  leaderUnit: Unit,
  enhancementModifiers: Modifier[] = []
): {
  currentWounds: number;
  maxWounds: number;
  modelsAlive: number;
  totalModels: number;
} {
  const baseWoundsPerModel = leaderUnit.stats.w;
  const totalModels = leaderListUnit.modelCount;
  const weaponCounts = leaderListUnit.weaponCounts || {};

  // Get enhancement wound modifier
  const enhancementWoundMod = getEnhancementWoundModifier(enhancementModifiers);

  // Find weapon wound modifiers (e.g., Praesidium Shield)
  let weaponWoundMod = 0;
  const processedGroups = new Set<string>();

  for (const weapon of leaderUnit.weapons) {
    if (!weapon.modifiers || weapon.modifiers.length === 0) continue;
    if (!weapon.loadoutGroup) continue;
    if (processedGroups.has(weapon.loadoutGroup)) continue;

    const count = weaponCounts[weapon.loadoutGroup] || 0;
    if (count === 0) continue;

    processedGroups.add(weapon.loadoutGroup);

    for (const mod of weapon.modifiers) {
      if (mod.stat === 'w' && mod.scope === 'model') {
        if (mod.operation === 'add') {
          weaponWoundMod += mod.value;
        } else if (mod.operation === 'subtract') {
          weaponWoundMod -= mod.value;
        }
      }
    }
  }

  // Total wounds per model = base + weapon modifier + enhancement modifier
  const woundsPerModel = baseWoundsPerModel + weaponWoundMod + enhancementWoundMod;
  const maxWounds = woundsPerModel * totalModels;
  const storedWounds = leaderListUnit.leaderCurrentWounds ?? maxWounds;
  const currentWounds = Math.min(storedWounds, maxWounds);
  const modelsAlive = currentWounds > 0 ? Math.ceil(currentWounds / woundsPerModel) : 0;

  return {
    currentWounds,
    maxWounds,
    modelsAlive,
    totalModels,
  };
}

/**
 * Get enhancement modifiers for a unit
 */
function getEnhancementModifiers(
  listUnit: ListUnit,
  armyData: ArmyData,
  detachmentId: string
): Modifier[] {
  if (!listUnit.enhancement) return [];

  const detachment = armyData.detachments?.[detachmentId];
  if (!detachment) return [];

  const enhancement = detachment.enhancements?.find(
    (e) => e.id === listUnit.enhancement
  );
  return enhancement?.modifiers || [];
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

  // Sort units: alive units first, destroyed units at the bottom
  const sortedUnits = [...visibleUnits].sort((a, b) => {
    const unitA = getUnitById(a.listUnit.unitId, armyData);
    const unitB = getUnitById(b.listUnit.unitId, armyData);

    if (!unitA || !unitB) return 0;

    // Calculate combined wounds for unit A (including leader)
    const enhancementModsA = getEnhancementModifiers(a.listUnit, armyData, detachmentId);
    const woundsA = calculateUnitWounds(a.listUnit, unitA, enhancementModsA);
    let totalWoundsA = woundsA.currentWounds;
    if (a.listUnit.attachedLeader) {
      const leaderListUnitA = units[a.listUnit.attachedLeader.unitIndex];
      const leaderUnitA = leaderListUnitA ? getUnitById(leaderListUnitA.unitId, armyData) : undefined;
      if (leaderListUnitA && leaderUnitA) {
        const leaderEnhancementModsA = getEnhancementModifiers(leaderListUnitA, armyData, detachmentId);
        totalWoundsA += calculateLeaderWounds(leaderListUnitA, leaderUnitA, leaderEnhancementModsA).currentWounds;
      }
    }

    // Calculate combined wounds for unit B (including leader)
    const enhancementModsB = getEnhancementModifiers(b.listUnit, armyData, detachmentId);
    const woundsB = calculateUnitWounds(b.listUnit, unitB, enhancementModsB);
    let totalWoundsB = woundsB.currentWounds;
    if (b.listUnit.attachedLeader) {
      const leaderListUnitB = units[b.listUnit.attachedLeader.unitIndex];
      const leaderUnitB = leaderListUnitB ? getUnitById(leaderListUnitB.unitId, armyData) : undefined;
      if (leaderListUnitB && leaderUnitB) {
        const leaderEnhancementModsB = getEnhancementModifiers(leaderListUnitB, armyData, detachmentId);
        totalWoundsB += calculateLeaderWounds(leaderListUnitB, leaderUnitB, leaderEnhancementModsB).currentWounds;
      }
    }

    const destroyedA = totalWoundsA <= 0;
    const destroyedB = totalWoundsB <= 0;

    // Destroyed units go to the bottom
    if (destroyedA && !destroyedB) return 1;
    if (!destroyedA && destroyedB) return -1;
    return 0;
  });

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <h2 className="section-header-inline mb-4 shrink-0">Your Army</h2>

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

            // Get enhancement modifiers for the unit
            const enhancementMods = getEnhancementModifiers(listUnit, armyData, detachmentId);

            // Calculate unit wounds with enhancement modifiers
            const unitWounds = calculateUnitWounds(listUnit, unit, enhancementMods);

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
                  // Get leader's enhancement modifiers
                  const leaderEnhancementMods = getEnhancementModifiers(attachedLeaderListUnit, armyData, detachmentId);
                  leaderWounds = calculateLeaderWounds(attachedLeaderListUnit, attachedLeaderUnit, leaderEnhancementMods);
                }
              }
            }

            // Get enhancement name (from either unit or attached leader)
            const enhancementName =
              getEnhancementName(listUnit, armyData, detachmentId) ||
              (attachedLeaderListUnit
                ? getEnhancementName(attachedLeaderListUnit, armyData, detachmentId)
                : undefined);

            // Warlord status
            const isWarlord = listUnit.isWarlord === true;
            const isLeaderWarlord = attachedLeaderListUnit?.isWarlord === true;

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
                isWarlord={isWarlord}
                isLeaderWarlord={isLeaderWarlord}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
