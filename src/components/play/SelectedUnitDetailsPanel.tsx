'use client';

import { PlayModeWeaponsDisplay } from './PlayModeWeaponsDisplay';
import type { Unit, ListUnit, Enhancement, Weapon, Modifier, ModifierSource, LoadoutGroup, Stratagem, MissionTwist } from '@/types';

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

  // Leader collapse/activation state
  isLeaderCollapsed?: boolean;
  isLeaderActivated?: boolean;
  onToggleLeaderCollapse?: () => void;
  onToggleLeaderActivated?: () => void;

  // Wound callbacks
  onUnitWoundAdjust?: (delta: number) => void;
  onLeaderWoundAdjust?: (delta: number) => void;

  // Active modifiers (Ka'tah, Stratagems, Twists)
  activeKatah?: string | null;
  katahName?: string;
  katahDescription?: string;
  activeStratagems?: string[];
  stratagemNames?: Record<string, string>;
  activeStratagemData?: Stratagem[];
  activeTwistData?: MissionTwist[];

  // Reset activations
  onResetActivations?: () => void;
  hasAnyActivations?: boolean;

  // Loadout casualties (tracking which weapon profiles lost models)
  loadoutCasualties?: Record<string, number>;
  onIncrementCasualties?: (groupId: string) => void;
  onDecrementCasualties?: (groupId: string) => void;

  className?: string;
}

// Helper to calculate wounds info accounting for mixed loadouts
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

  const baseWoundsPerModel = unit.stats.w;
  const weaponCounts = listUnit.weaponCounts || {};
  const totalModels = listUnit.modelCount;

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

  // Calculate total wounds accounting for mixed loadouts
  let maxWounds = 0;
  let modelsWithModifiers = 0;

  if (woundModsByLoadout.size === 0) {
    // No loadouts with wound modifiers - apply enhancement/other modifiers uniformly
    let woundsPerModel = baseWoundsPerModel;
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
    maxWounds = woundsPerModel * totalModels;
  } else {
    // Calculate wounds per loadout group
    for (const [loadoutGroup, woundMod] of woundModsByLoadout) {
      const modelsWithLoadout = weaponCounts[loadoutGroup] || 0;
      const woundsForThisLoadout = baseWoundsPerModel + woundMod;
      maxWounds += modelsWithLoadout * woundsForThisLoadout;
      modelsWithModifiers += modelsWithLoadout;
    }

    // Remaining models have base wounds
    const modelsWithBaseWounds = totalModels - modelsWithModifiers;
    maxWounds += modelsWithBaseWounds * baseWoundsPerModel;
  }

  const avgWoundsPerModel = totalModels > 0 ? maxWounds / totalModels : baseWoundsPerModel;
  const currentWounds = listUnit.currentWounds !== null ? listUnit.currentWounds : maxWounds;
  const modelsAlive = currentWounds > 0 ? Math.ceil(currentWounds / avgWoundsPerModel) : 0;

  return {
    currentWounds,
    maxWounds,
    woundsPerModel: avgWoundsPerModel,
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
  leaderEnhancement: _leaderEnhancement,

  modifiers,
  modifierSources,

  loadoutGroups,
  leaderWeapons,

  collapsedGroups,
  activatedGroups,
  onToggleCollapse,
  onToggleActivated,

  isLeaderCollapsed = false,
  isLeaderActivated = false,
  onToggleLeaderCollapse,
  onToggleLeaderActivated,

  onUnitWoundAdjust,
  onLeaderWoundAdjust,

  activeKatah,
  katahName,
  katahDescription,
  activeStratagems = [],
  stratagemNames: _stratagemNames = {},
  activeStratagemData = [],
  activeTwistData = [],

  onResetActivations,
  hasAnyActivations = false,

  loadoutCasualties = {},
  onIncrementCasualties,
  onDecrementCasualties,

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

      {/* Badges (matching Alpine.js: unit enhancement + leader name) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {enhancement && (
          <span className="badge badge-accent">{enhancement.name}</span>
        )}
        {hasLeader && leaderUnit && (
          <span className="badge badge-purple">+ {leaderUnit.name}</span>
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
                  <span className="stat-label">{stat}</span>
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
                  <span className="text-xs text-accent-400">
                    {katahDescription.replace('Melee weapons gain ', '').replace(/\.$/, '')}
                  </span>
                )}
              </div>
            )}
            {enhancement && (
              <div className="text-sm px-3 py-2 bg-accent-tint rounded-lg">
                <span className="text-accent-300">{enhancement.name}</span>
              </div>
            )}
            {activeStratagemData.map((strat) => (
              <div key={strat.id} className="text-sm px-3 py-2 bg-accent-tint rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-accent-300">{strat.name}</span>
                  <span className="text-[10px] text-accent-400">{strat.cost}CP</span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">{strat.phase}</div>
                <div className="text-xs text-white/70 mt-1">{strat.description}</div>
              </div>
            ))}
            {activeTwistData.map((twist) => (
              <div key={twist.id} className="text-sm px-3 py-2 bg-accent-tint rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-accent-300">{twist.name}</span>
                  <span className="text-[10px] text-white/40 capitalize">{twist.affects}</span>
                </div>
                <div className="text-xs text-white/70 mt-1">{twist.description}</div>
              </div>
            ))}
            {!activeKatah && !enhancement && activeStratagems.length === 0 && activeTwistData.length === 0 && (
              <div className="text-sm text-white/40">No modifiers active</div>
            )}
          </div>
        </div>

        {/* Weapons (Alpine.js Play Mode does NOT show Abilities section - only weapons) */}
        <div className="card-depth overflow-hidden">
          <div className="section-header flex items-center justify-between">
            <span>Weapons</span>
            {hasAnyActivations && onResetActivations && (
              <button
                onClick={onResetActivations}
                className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                title="Reset all activations for this unit"
              >
                Reset
              </button>
            )}
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
            isLeaderCollapsed={isLeaderCollapsed}
            isLeaderActivated={isLeaderActivated}
            onToggleLeaderCollapse={onToggleLeaderCollapse}
            onToggleLeaderActivated={onToggleLeaderActivated}
            activeStratagems={activeStratagemData}
            loadoutCasualties={loadoutCasualties}
            onIncrementCasualties={onIncrementCasualties}
            onDecrementCasualties={onDecrementCasualties}
          />
        </div>
      </div>
    </div>
  );
}
