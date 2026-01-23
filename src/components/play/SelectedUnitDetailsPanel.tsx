'use client';

import { Panel, Badge } from '@/components/ui';
import { ModifiedStatsTable } from './ModifiedStatsTable';
import { DamageTracker } from './DamageTracker';
import { PlayModeWeaponsDisplay } from './PlayModeWeaponsDisplay';
import type { Unit, ListUnit, Enhancement, Weapon, Modifier, ModifierSource, LoadoutGroup } from '@/types';

interface SelectedUnitDetailsPanelProps {
  // Unit data
  unit: Unit | null;
  listUnit: ListUnit | null;
  unitIndex: number | null;

  // Enhancement
  enhancement: Enhancement | null;

  // Leader info
  hasLeader: boolean;
  leaderUnit?: Unit;
  leaderListUnit?: ListUnit;
  leaderEnhancement?: Enhancement | null;

  // Modifiers
  modifiers: Modifier[];
  modifierSources: Record<string, ModifierSource[]>;

  // Weapon loadout groups
  loadoutGroups: LoadoutGroup[];
  leaderWeapons?: Weapon[];

  // Collapse/activation state
  collapsedGroups: Record<string, boolean>;
  activatedGroups: Record<string, boolean>;
  onToggleCollapse: (unitIndex: number, groupId: string) => void;
  onToggleActivated?: (unitIndex: number, groupId: string) => void;

  // Wound callbacks
  onUnitWoundAdjust?: (delta: number) => void;
  onLeaderWoundAdjust?: (delta: number) => void;

  className?: string;
}

// Helper to calculate wounds info
function calculateWoundInfo(
  listUnit: ListUnit | null | undefined,
  unit: Unit | null | undefined,
  modifiers: Modifier[] = []
) {
  if (!listUnit || !unit) {
    return {
      currentWounds: 0,
      maxWounds: 0,
      woundsPerModel: 0,
      modelsAlive: 0,
      totalModels: 0,
    };
  }

  // Get base wounds per model
  let woundsPerModel = unit.stats.w;

  // Apply modifiers to wounds
  const woundModifiers = modifiers.filter(
    (m) => m.stat === 'w' && (m.scope === 'model' || m.scope === 'unit')
  );
  for (const mod of woundModifiers) {
    switch (mod.operation) {
      case 'add':
        woundsPerModel += mod.value;
        break;
      case 'subtract':
        woundsPerModel -= mod.value;
        break;
      case 'set':
        woundsPerModel = mod.value;
        break;
    }
  }

  const totalModels = listUnit.modelCount;
  const maxWounds = woundsPerModel * totalModels;
  const currentWounds = listUnit.currentWounds !== null ? listUnit.currentWounds : maxWounds;
  const modelsAlive = currentWounds > 0 ? Math.ceil(currentWounds / woundsPerModel) : 0;

  return {
    currentWounds,
    maxWounds,
    woundsPerModel,
    modelsAlive,
    totalModels,
  };
}

function EmptyState() {
  return (
    <Panel title="Selected Unit">
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg
          className="w-12 h-12 mb-3 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">Select a unit to view details</p>
      </div>
    </Panel>
  );
}

export function SelectedUnitDetailsPanel({
  unit,
  listUnit,
  unitIndex,

  enhancement,

  hasLeader,
  leaderUnit,
  leaderListUnit,
  leaderEnhancement,

  modifiers,
  modifierSources,

  loadoutGroups,
  leaderWeapons,

  collapsedGroups,
  activatedGroups,
  onToggleCollapse,
  onToggleActivated,

  onUnitWoundAdjust,
  onLeaderWoundAdjust,

  className = '',
}: SelectedUnitDetailsPanelProps) {
  // Empty state when no unit selected
  if (!unit || !listUnit || unitIndex === null) {
    return <EmptyState />;
  }

  // Calculate unit wound info
  const unitWoundInfo = calculateWoundInfo(listUnit, unit, modifiers);

  // Calculate leader wound info if applicable
  const leaderWoundInfo = hasLeader && leaderUnit && leaderListUnit
    ? calculateWoundInfo(
        { ...leaderListUnit, currentWounds: listUnit.leaderCurrentWounds },
        leaderUnit,
        [] // Leader modifiers calculated separately
      )
    : null;

  // Build combined unit name
  const combinedName = hasLeader && leaderUnit
    ? `${unit.name} + ${leaderUnit.name}`
    : unit.name;

  // Check if unit is a character
  const isCharacter = unit.keywords.includes('Character');

  return (
    <Panel title="Selected Unit" className={className}>
      <div className="space-y-4 overflow-y-auto">
        {/* Unit Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-100">{combinedName}</h3>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {isCharacter && (
              <Badge variant="purple" size="sm">Character</Badge>
            )}
            {enhancement && (
              <Badge variant="accent" size="sm">{enhancement.name}</Badge>
            )}
            {hasLeader && leaderEnhancement && (
              <Badge variant="purple" size="sm">
                {leaderEnhancement.name} (Leader)
              </Badge>
            )}
          </div>
        </div>

        {/* Keywords */}
        <div className="flex flex-wrap gap-1">
          {unit.keywords.map((keyword) => (
            <span
              key={keyword}
              className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-400"
            >
              {keyword}
            </span>
          ))}
        </div>

        {/* Stats Table with Modifiers */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">
            Statistics
          </div>
          <ModifiedStatsTable
            stats={unit.stats}
            invuln={unit.invuln}
            modifiers={modifiers}
            modifierSources={modifierSources}
          />
        </div>

        {/* Damage Tracker */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">
            Damage Tracker
          </div>
          <DamageTracker
            unitName={unit.name}
            unitCurrentWounds={unitWoundInfo.currentWounds}
            unitMaxWounds={unitWoundInfo.maxWounds}
            unitWoundsPerModel={unitWoundInfo.woundsPerModel}
            unitModelsAlive={unitWoundInfo.modelsAlive}
            unitTotalModels={unitWoundInfo.totalModels}
            onUnitWoundAdjust={onUnitWoundAdjust}
            hasLeader={hasLeader && !!leaderWoundInfo}
            leaderName={leaderUnit?.name}
            leaderCurrentWounds={leaderWoundInfo?.currentWounds}
            leaderMaxWounds={leaderWoundInfo?.maxWounds}
            leaderWoundsPerModel={leaderWoundInfo?.woundsPerModel}
            leaderModelsAlive={leaderWoundInfo?.modelsAlive}
            leaderTotalModels={leaderWoundInfo?.totalModels}
            onLeaderWoundAdjust={onLeaderWoundAdjust}
          />
        </div>

        {/* Weapons Display */}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">
            Weapons
          </div>
          <PlayModeWeaponsDisplay
            loadoutGroups={loadoutGroups}
            unitIndex={unitIndex}
            collapsedGroups={collapsedGroups}
            activatedGroups={activatedGroups}
            onToggleCollapse={onToggleCollapse}
            onToggleActivated={onToggleActivated}
            leaderWeapons={leaderWeapons}
            leaderName={leaderUnit?.name}
          />
        </div>

        {/* Unit Abilities */}
        {unit.abilities.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">
              Abilities
            </div>
            <div className="space-y-2">
              {unit.abilities.map((ability) => (
                <div
                  key={ability.id}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-200">
                      {ability.name}
                    </span>
                    {ability.id === 'leader' && (
                      <Badge variant="purple" size="sm">Leader</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{ability.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leader Abilities (if attached) */}
        {hasLeader && leaderUnit && leaderUnit.abilities.length > 0 && (
          <div>
            <div className="text-xs text-purple-400 uppercase tracking-wider mb-2 font-medium">
              Leader Abilities
            </div>
            <div className="space-y-2">
              {leaderUnit.abilities.map((ability) => (
                <div
                  key={ability.id}
                  className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-purple-200">
                      {ability.name}
                    </span>
                  </div>
                  <p className="text-sm text-purple-300/70">{ability.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
