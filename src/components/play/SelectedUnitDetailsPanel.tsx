'use client';

import { PlayModeWeaponsDisplay } from './PlayModeWeaponsDisplay';
import type { Unit, ListUnit, Enhancement, Weapon, Modifier, ModifierSource, LoadoutGroup, Stratagem } from '@/types';

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

  // Active modifiers (Ka'tah, Stratagems)
  activeKatah?: string | null;
  katahName?: string;
  katahDescription?: string;
  activeStratagems?: string[];
  stratagemNames?: Record<string, string>;
  activeStratagemData?: Stratagem[];

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

// Get modified stat value
function getModifiedStat(
  unit: Unit,
  stat: string,
  modifiers: Modifier[]
): string | number {
  const baseStat = unit.stats[stat as keyof typeof unit.stats];
  if (baseStat === undefined) return '-';

  // For string stats (like '2+'), return as-is
  if (typeof baseStat === 'string') return baseStat;

  // Apply modifiers
  let value = baseStat;
  const statModifiers = modifiers.filter(
    (m) => m.stat === stat && (m.scope === 'model' || m.scope === 'unit')
  );
  for (const mod of statModifiers) {
    switch (mod.operation) {
      case 'add':
        value += mod.value;
        break;
      case 'subtract':
        value -= mod.value;
        break;
      case 'set':
        value = mod.value;
        break;
    }
  }

  return value;
}

// Check if stat is modified
function isStatModified(
  unit: Unit,
  stat: string,
  modifiers: Modifier[]
): boolean {
  return modifiers.some(
    (m) => m.stat === stat && (m.scope === 'model' || m.scope === 'unit')
  );
}

// Format inches display
function formatInches(value: number): string {
  return `${value}"`;
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

  activeKatah,
  katahName,
  katahDescription,
  activeStratagems = [],
  stratagemNames = {},
  activeStratagemData = [],

  className = '',
}: SelectedUnitDetailsPanelProps) {
  // Empty state when no unit selected
  if (!unit || !listUnit || unitIndex === null) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center text-white/40">
          <p>Select a unit from your army to view details</p>
        </div>
      </div>
    );
  }

  // Calculate unit wound info
  const unitWoundInfo = calculateWoundInfo(listUnit, unit, modifiers);

  // Calculate leader wound info if applicable
  const leaderWoundInfo = hasLeader && leaderUnit && leaderListUnit
    ? calculateWoundInfo(
        { ...leaderListUnit, currentWounds: listUnit.leaderCurrentWounds },
        leaderUnit,
        []
      )
    : null;

  // Build combined unit name
  const combinedName = hasLeader && leaderUnit
    ? `${unit.name} + ${leaderUnit.name}`
    : unit.name;

  // Combined models
  const combinedModelsAlive = unitWoundInfo.modelsAlive + (leaderWoundInfo?.modelsAlive ?? 0);
  const combinedTotalModels = unitWoundInfo.totalModels + (leaderWoundInfo?.totalModels ?? 0);

  // Current model wounds for wound dots display
  const currentModelWounds = unitWoundInfo.woundsPerModel > 1 && unitWoundInfo.modelsAlive > 0
    ? unitWoundInfo.currentWounds % unitWoundInfo.woundsPerModel || unitWoundInfo.woundsPerModel
    : 0;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Unit Header */}
      <h2 className="text-xl font-semibold text-accent-300 mb-2">{combinedName}</h2>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {enhancement && (
          <span className="badge badge-accent">{enhancement.name}</span>
        )}
        {hasLeader && leaderEnhancement && (
          <span className="badge badge-purple">+ {leaderEnhancement.name}</span>
        )}
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto scroll-smooth">
        {/* Stats Table with Modifiers */}
        <div className="card-depth p-4">
          <div className="grid grid-cols-6 gap-2 mb-3">
            {['m', 't', 'sv', 'w', 'ld', 'oc'].map((stat) => {
              const value = getModifiedStat(unit, stat, modifiers);
              const modified = isStatModified(unit, stat, modifiers);
              const sources = modifierSources[stat] || [];

              return (
                <div key={stat} className="stat-cell">
                  <span className="stat-label">{stat.toUpperCase()}</span>
                  <span
                    className={`stat-value ${modified ? 'modified cursor-help' : ''}`}
                    title={modified ? sources.map(s => `${s.name}: ${s.operation === 'add' ? '+' : ''}${s.value}`).join('\n') : undefined}
                  >
                    {stat === 'm' && typeof value === 'number' ? formatInches(value) : value}
                  </span>
                </div>
              );
            })}
          </div>
          {unit.invuln && (
            <div className="flex justify-center">
              <span className="badge badge-accent">{unit.invuln} Invuln</span>
            </div>
          )}
        </div>

        {/* Damage Tracker */}
        <div className="card-depth p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 font-medium">Damage</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-bold ${
                  combinedModelsAlive < combinedTotalModels ? 'text-red-400' : 'text-white'
                }`}
              >
                {combinedModelsAlive}
              </span>
              <span className="text-white/40">/</span>
              <span className="text-lg text-white/50">{combinedTotalModels} models</span>
            </div>
          </div>

          {/* Unit Wounds Section */}
          <div className="bg-black/20 rounded-lg p-3 mb-3">
            <div className="text-xs text-white/50 text-center mb-2">{unit.name}</div>

            {/* Wound Dots */}
            {unitWoundInfo.woundsPerModel > 1 && unitWoundInfo.modelsAlive > 0 && (
              <div className="flex items-center justify-center gap-1 mb-3">
                {Array.from({ length: unitWoundInfo.woundsPerModel }).map((_, i) => (
                  <div
                    key={i}
                    className={`wound-dot ${i < currentModelWounds ? 'filled' : ''}`}
                  />
                ))}
              </div>
            )}

            {/* Unit Wounds Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => onUnitWoundAdjust?.(-1)}
                className="btn-ios btn-ios-secondary px-6"
                disabled={unitWoundInfo.currentWounds <= 0}
              >
                <span className="text-red-400 font-bold">- Wound</span>
              </button>
              <div className="text-center min-w-[60px]">
                <span className="text-xl font-bold">{unitWoundInfo.currentWounds}</span>
                <span className="text-white/40"> / </span>
                <span className="text-sm text-white/50">{unitWoundInfo.maxWounds}</span>
              </div>
              <button
                onClick={() => onUnitWoundAdjust?.(1)}
                className="btn-ios btn-ios-secondary px-6"
                disabled={unitWoundInfo.currentWounds >= unitWoundInfo.maxWounds}
              >
                <span className="text-green-400 font-bold">+ Heal</span>
              </button>
            </div>
          </div>

          {/* Leader Wounds Section */}
          {hasLeader && leaderWoundInfo && leaderUnit && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="text-xs text-purple-400 text-center mb-2">{leaderUnit.name}</div>

              {/* Leader Wound Dots */}
              {leaderWoundInfo.woundsPerModel > 1 && leaderWoundInfo.modelsAlive > 0 && (
                <div className="flex items-center justify-center gap-1 mb-3">
                  {Array.from({ length: leaderWoundInfo.woundsPerModel }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < (leaderWoundInfo.currentWounds % leaderWoundInfo.woundsPerModel || leaderWoundInfo.woundsPerModel)
                          ? 'bg-purple-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => onLeaderWoundAdjust?.(-1)}
                  className="btn-ios btn-ios-secondary btn-ios-sm px-4"
                  disabled={(leaderWoundInfo?.currentWounds ?? 0) <= 0}
                >
                  <span className="text-red-400 font-bold">-</span>
                </button>
                <div className="text-center">
                  <span className="text-xl font-bold text-purple-300">{leaderWoundInfo.currentWounds}</span>
                  <span className="text-white/40"> / </span>
                  <span className="text-sm text-white/50">{leaderWoundInfo.maxWounds}</span>
                </div>
                <button
                  onClick={() => onLeaderWoundAdjust?.(1)}
                  className="btn-ios btn-ios-secondary btn-ios-sm px-4"
                  disabled={(leaderWoundInfo?.currentWounds ?? 0) >= (leaderWoundInfo?.maxWounds ?? 0)}
                >
                  <span className="text-green-400 font-bold">+</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Modifiers Summary */}
        <div className="card-depth overflow-hidden">
          <div className="section-header">Active Modifiers</div>
          <div className="px-4 pb-4 space-y-1">
            {activeKatah && katahName && (
              <div className="text-sm px-3 py-2 bg-accent-tint rounded-lg flex items-center justify-between">
                <span className="text-accent-300 font-medium">{katahName}</span>
                {katahDescription && (
                  <span className="text-xs text-accent-400">{katahDescription}</span>
                )}
              </div>
            )}
            {enhancement && (
              <div className="text-sm px-3 py-2 bg-accent-tint rounded-lg">
                <span className="text-accent-300">{enhancement.name}</span>
              </div>
            )}
            {activeStratagems.map((stratId) => (
              <div key={stratId} className="text-sm px-3 py-2 bg-accent-tint-strong rounded-lg">
                <span>{stratagemNames[stratId] || stratId}</span>
              </div>
            ))}
            {!activeKatah && !enhancement && activeStratagems.length === 0 && (
              <div className="text-sm text-white/40">No modifiers active</div>
            )}
          </div>
        </div>

        {/* Weapons */}
        <div className="card-depth overflow-hidden">
          <div className="section-header">Weapons</div>
          <PlayModeWeaponsDisplay
            loadoutGroups={loadoutGroups}
            unitIndex={unitIndex}
            collapsedGroups={collapsedGroups}
            activatedGroups={activatedGroups}
            onToggleCollapse={onToggleCollapse}
            onToggleActivated={onToggleActivated}
            leaderWeapons={leaderWeapons}
            leaderName={leaderUnit?.name}
            activeStratagems={activeStratagemData}
          />
        </div>

        {/* Unit Abilities */}
        {unit.abilities.length > 0 && (
          <div className="card-depth overflow-hidden">
            <div className="section-header">Abilities</div>
            <div className="px-4 pb-4 space-y-2">
              {unit.abilities.map((ability) => (
                <div key={ability.id} className="text-sm">
                  <span className="font-semibold text-accent-300">{ability.name}: </span>
                  <span className="text-white/70">{ability.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leader Abilities */}
        {hasLeader && leaderUnit && leaderUnit.abilities.length > 0 && (
          <div className="card-depth overflow-hidden border border-purple-500/30">
            <div className="section-header text-purple-400">Leader Abilities</div>
            <div className="px-4 pb-4 space-y-2">
              {leaderUnit.abilities.map((ability) => (
                <div key={ability.id} className="text-sm">
                  <span className="font-semibold text-purple-300">{ability.name}: </span>
                  <span className="text-purple-200/70">{ability.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
