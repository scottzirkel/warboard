'use client';

import { useState } from 'react';
import { PlayModeWeaponsDisplay } from './PlayModeWeaponsDisplay';
import { Tooltip, TooltipBadge } from '../ui/Tooltip';
import type { Unit, ListUnit, Enhancement, Weapon, Modifier, ModifierSource, LoadoutGroup, Stratagem, MissionTwist, KeywordDefinition } from '@/types';

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

  // Keyword glossary for tooltips
  unitKeywordGlossary?: KeywordDefinition[];
  weaponKeywordGlossary?: KeywordDefinition[];

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

// Parse a stat value that might be a string like "2+"
function parseStatValue(value: number | string): number {
  if (typeof value === 'number') return value;
  const match = value.match(/^(\d+)\+?$/);
  if (match) return parseInt(match[1], 10);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// Format a stat value back to its display format
function formatStatValue(value: number, originalFormat: string | number): string | number {
  if (typeof originalFormat === 'number') return value;
  if (originalFormat.match(/^\d+\+$/)) return `${value}+`;
  return value;
}

// Get modified stat value
function getModifiedStat(
  unit: Unit,
  stat: string,
  modifiers: Modifier[]
): string | number {
  const baseStat = unit.stats[stat as keyof typeof unit.stats];
  if (baseStat === undefined) return '-';

  // Parse the base value
  let value = parseStatValue(baseStat);

  // Apply modifiers
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

  return formatStatValue(value, baseStat);
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
  activeStratagems: _activeStratagems = [],
  stratagemNames: _stratagemNames = {},
  activeStratagemData = [],
  activeTwistData = [],

  onResetActivations,
  hasAnyActivations = false,

  loadoutCasualties = {},
  onIncrementCasualties,
  onDecrementCasualties,

  unitKeywordGlossary = [],
  weaponKeywordGlossary = [],

  className = '',
}: SelectedUnitDetailsPanelProps) {
  // Build keyword lookup map for tooltips
  const unitKeywordMap = new Map(
    unitKeywordGlossary.map((kw) => [kw.name.toLowerCase(), kw.description])
  );

  // Helper to find keyword description
  const getKeywordDescription = (keyword: string): string | null => {
    return unitKeywordMap.get(keyword.toLowerCase()) || null;
  };
  // Collapse state for Abilities (default open)
  // Note: Hooks must be called before any early returns
  const [abilitiesOpen, setAbilitiesOpen] = useState(true);

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

  // Current model wounds for wound dots display
  const currentModelWounds = unitWoundInfo.woundsPerModel > 1 && unitWoundInfo.modelsAlive > 0
    ? unitWoundInfo.currentWounds % unitWoundInfo.woundsPerModel || unitWoundInfo.woundsPerModel
    : 0;

  // Count active modifiers for summary
  const activeModifierCount =
    (activeKatah ? 1 : 0) +
    (enhancement ? 1 : 0) +
    activeStratagemData.length +
    activeTwistData.length;

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
        <div className="card-depth p-3">
          <div className="grid grid-cols-6 gap-2 mb-2">
            {['m', 't', 'sv', 'w', 'ld', 'oc'].map((stat) => {
              const value = getModifiedStat(unit, stat, modifiers);
              const modified = isStatModified(unit, stat, modifiers);
              const sources = modifierSources[stat] || [];

              const tooltipContent = modified
                ? sources.map(s => `${s.name}: ${s.operation === 'add' ? '+' : ''}${s.value}`).join('\n')
                : null;

              return (
                <div key={stat} className="stat-cell">
                  <span className="stat-label">{stat}</span>
                  {modified && tooltipContent ? (
                    <Tooltip content={tooltipContent}>
                      <span className="stat-value modified">
                        {stat === 'm' && typeof value === 'number' ? formatInches(value) : value}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="stat-value">
                      {stat === 'm' && typeof value === 'number' ? formatInches(value) : value}
                    </span>
                  )}
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

        {/* Damage Tracker - Compact */}
        <div className="card-depth p-3">
          {/* Unit Wounds Row */}
          <div className="flex items-center justify-between gap-2 bg-black/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-white/50 truncate">{unit.name}</span>
              {/* Wound Dots inline */}
              {unitWoundInfo.woundsPerModel > 1 && unitWoundInfo.modelsAlive > 0 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: unitWoundInfo.woundsPerModel }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < currentModelWounds ? 'bg-accent-400' : 'bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onUnitWoundAdjust?.(-1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
                disabled={unitWoundInfo.currentWounds <= 0}
              >
                <span className="text-red-400 font-bold text-sm">−</span>
              </button>
              <div className="text-center min-w-[50px]">
                <span className="text-base font-bold">{unitWoundInfo.currentWounds}</span>
                <span className="text-white/40 text-xs"> / {unitWoundInfo.maxWounds}</span>
              </div>
              <button
                onClick={() => onUnitWoundAdjust?.(1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
                disabled={unitWoundInfo.currentWounds >= unitWoundInfo.maxWounds}
              >
                <span className="text-green-400 font-bold text-sm">+</span>
              </button>
            </div>
          </div>

          {/* Leader Wounds Row */}
          {hasLeader && leaderWoundInfo && leaderUnit && (
            <div className="flex items-center justify-between gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-purple-400 truncate">{leaderUnit.name}</span>
                {/* Leader Wound Dots inline */}
                {leaderWoundInfo.woundsPerModel > 1 && leaderWoundInfo.modelsAlive > 0 && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: leaderWoundInfo.woundsPerModel }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < (leaderWoundInfo.currentWounds % leaderWoundInfo.woundsPerModel || leaderWoundInfo.woundsPerModel)
                            ? 'bg-purple-500'
                            : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onLeaderWoundAdjust?.(-1)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
                  disabled={(leaderWoundInfo?.currentWounds ?? 0) <= 0}
                >
                  <span className="text-red-400 font-bold text-sm">−</span>
                </button>
                <div className="text-center min-w-[50px]">
                  <span className="text-base font-bold text-purple-300">{leaderWoundInfo.currentWounds}</span>
                  <span className="text-white/40 text-xs"> / {leaderWoundInfo.maxWounds}</span>
                </div>
                <button
                  onClick={() => onLeaderWoundAdjust?.(1)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
                  disabled={(leaderWoundInfo?.currentWounds ?? 0) >= (leaderWoundInfo?.maxWounds ?? 0)}
                >
                  <span className="text-green-400 font-bold text-sm">+</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Modifiers Summary - Inline badges with tooltips */}
        {activeModifierCount > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {activeKatah && katahName && (
              <TooltipBadge tooltip={katahDescription || katahName}>
                {katahName.replace(' Stance', '')}
              </TooltipBadge>
            )}
            {enhancement && (
              <TooltipBadge tooltip={enhancement.description}>
                {enhancement.name}
              </TooltipBadge>
            )}
            {activeStratagemData.map((strat) => (
              <TooltipBadge
                key={strat.id}
                tooltip={`${strat.name} (${strat.cost}CP) - ${strat.phase}\n\n${strat.description}`}
              >
                {strat.name}
              </TooltipBadge>
            ))}
            {activeTwistData.map((twist) => (
              <TooltipBadge
                key={twist.id}
                tooltip={`${twist.name} (${twist.affects})\n\n${twist.description}`}
              >
                {twist.name}
              </TooltipBadge>
            ))}
          </div>
        )}

        {/* Weapons */}
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
            activeTwists={activeTwistData}
            weaponKeywordGlossary={weaponKeywordGlossary}
            loadoutCasualties={loadoutCasualties}
            onIncrementCasualties={onIncrementCasualties}
            onDecrementCasualties={onDecrementCasualties}
          />
        </div>

        {/* Abilities - Collapsible, default open */}
        {unit.abilities && unit.abilities.length > 0 && (
          <div className="card-depth overflow-hidden">
            <button
              onClick={() => setAbilitiesOpen(!abilitiesOpen)}
              className="section-header w-full flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span>Abilities</span>
              <div className="flex items-center gap-2">
                <span className="badge">{unit.abilities.length}</span>
                <svg
                  className={`w-3 h-3 text-white/40 transition-transform duration-200 ${abilitiesOpen ? '' : '-rotate-90'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${abilitiesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 space-y-2">
                {unit.abilities.map((ability) => (
                  <div key={ability.id} className="bg-black/20 rounded-lg p-2">
                    <div className="text-sm font-medium text-accent-300">{ability.name}</div>
                    <div className="text-xs text-white/70 mt-0.5">{ability.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Keywords - Simplified inline badges with tooltips for glossary terms */}
        <div className="flex flex-wrap gap-1 px-1">
          {unit.keywords.map((kw) => {
            const description = getKeywordDescription(kw);
            return description ? (
              <TooltipBadge key={kw} tooltip={description} variant="default" className="text-[10px]">
                {kw}
              </TooltipBadge>
            ) : (
              <span key={kw} className="badge text-[10px]">{kw}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
