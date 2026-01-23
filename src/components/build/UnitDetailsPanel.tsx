'use client';

import { Button } from '@/components/ui';
import { StatsTable } from './StatsTable';
import type { Unit, ListUnit, Modifier, ModifierSource, Enhancement, Weapon, RangedWeaponStats, MeleeWeaponStats } from '@/types';

interface UnitDetailsPanelProps {
  unit: Unit | null;
  listUnit: ListUnit | null;
  unitIndex: number | null;
  enhancement: Enhancement | null;
  modifiers?: Modifier[];
  modifierSources?: Record<string, ModifierSource[]>;
  onAddUnit?: () => void;
  className?: string;
}

// Type guards for weapon stats
function isRangedStats(weapon: Weapon): weapon is Weapon & { stats: RangedWeaponStats } {
  return weapon.type === 'ranged';
}

function isMeleeStats(weapon: Weapon): weapon is Weapon & { stats: MeleeWeaponStats } {
  return weapon.type === 'melee';
}

// Group weapons by type
function groupWeaponsByType(weapons: Weapon[]): { ranged: Weapon[]; melee: Weapon[] } {
  return {
    ranged: weapons.filter((w) => w.type === 'ranged'),
    melee: weapons.filter((w) => w.type === 'melee'),
  };
}

export function UnitDetailsPanel({
  unit,
  listUnit,
  unitIndex,
  enhancement,
  modifiers,
  modifierSources,
  onAddUnit,
  className = '',
}: UnitDetailsPanelProps) {
  // No unit selected state
  if (!unit || unitIndex === null) {
    return (
      <div className={`flex flex-col h-full items-center justify-center text-white/40 ${className}`}>
        <p>Select a unit from your army list</p>
        <p className="text-xs mt-1">or add one from the roster</p>
      </div>
    );
  }

  // Calculate points for the selected configuration
  const basePoints = unit.points[String(listUnit?.modelCount || Object.keys(unit.points)[0])];
  const enhancementPoints = enhancement?.points || 0;
  const totalPoints = (basePoints || 0) + enhancementPoints;

  // Check if unit is a Character
  const isCharacter = unit.keywords.includes('Character');

  // Group weapons
  const { ranged, melee } = groupWeaponsByType(unit.weapons);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="section-header text-lg">{unit.name}</h3>
          {listUnit && (
            <span className="text-xs text-white/50">
              {listUnit.modelCount} model{listUnit.modelCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent-400 font-bold">{totalPoints} pts</span>
          {onAddUnit && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAddUnit}
              className="btn-ios btn-ios-sm btn-ios-primary"
            >
              + Add
            </Button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-4 shrink-0">
        {isCharacter && <span className="badge badge-accent">Character</span>}
        {enhancement && <span className="badge badge-purple">{enhancement.name}</span>}
      </div>

      {/* Stats */}
      <div className="mb-4 shrink-0">
        <div className="section-header-inline mb-2">
          <span>Stats</span>
          {unit.invuln && <span className="badge badge-blue ml-auto">{unit.invuln} Invuln</span>}
        </div>
        <StatsTable
          stats={unit.stats}
          modifiers={modifiers}
          modifierSources={modifierSources}
        />
      </div>

      {/* Keywords */}
      <div className="mb-4 shrink-0">
        <div className="section-header-inline mb-2">
          <span>Keywords</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {unit.keywords.map((kw) => (
            <span key={kw} className="badge">{kw}</span>
          ))}
        </div>
      </div>

      {/* Weapons */}
      <div className="mb-4 shrink-0">
        <div className="section-header-inline mb-2">
          <span>Weapons</span>
          <span className="badge">{unit.weapons.length}</span>
        </div>

        {/* Ranged Weapons */}
        {ranged.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Ranged</div>
            {ranged.filter(isRangedStats).map((weapon) => (
              <div key={weapon.id} className="bg-black/20 rounded-lg p-2 mb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{weapon.name}</span>
                  {weapon.abilities && weapon.abilities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {weapon.abilities.map((ab) => (
                        <span key={ab} className="badge badge-blue text-[10px] py-0">{ab}</span>
                      ))}
                    </div>
                  )}
                </div>
                <table className="weapon-table text-xs">
                  <thead>
                    <tr>
                      <th>Range</th>
                      <th>A</th>
                      <th>BS</th>
                      <th>S</th>
                      <th>AP</th>
                      <th>D</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{weapon.stats.range}&quot;</td>
                      <td>{weapon.stats.a}</td>
                      <td>{weapon.stats.bs}</td>
                      <td>{weapon.stats.s}</td>
                      <td>{weapon.stats.ap}</td>
                      <td>{weapon.stats.d}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Melee Weapons */}
        {melee.length > 0 && (
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Melee</div>
            {melee.filter(isMeleeStats).map((weapon) => (
              <div key={weapon.id} className="bg-black/20 rounded-lg p-2 mb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{weapon.name}</span>
                  {weapon.abilities && weapon.abilities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {weapon.abilities.map((ab) => (
                        <span key={ab} className="badge badge-red text-[10px] py-0">{ab}</span>
                      ))}
                    </div>
                  )}
                </div>
                <table className="weapon-table text-xs">
                  <thead>
                    <tr>
                      <th>A</th>
                      <th>WS</th>
                      <th>S</th>
                      <th>AP</th>
                      <th>D</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{weapon.stats.a}</td>
                      <td>{weapon.stats.ws}</td>
                      <td>{weapon.stats.s}</td>
                      <td>{weapon.stats.ap}</td>
                      <td>{weapon.stats.d}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Abilities */}
      {unit.abilities && unit.abilities.length > 0 && (
        <div className="shrink-0">
          <div className="section-header-inline mb-2">
            <span>Abilities</span>
            <span className="badge">{unit.abilities.length}</span>
          </div>
          <div className="space-y-2">
            {unit.abilities.map((ability) => (
              <div key={ability.id} className="bg-black/20 rounded-lg p-2">
                <div className="text-sm font-medium text-accent-300">{ability.name}</div>
                <div className="text-xs text-white/70 mt-0.5">{ability.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
