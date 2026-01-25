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
  // No unit selected state (matching Alpine.js)
  if (!unit || unitIndex === null) {
    return (
      <div className={`text-center py-8 text-white/40 text-sm ${className}`}>
        <p className="text-lg mb-1">Select a unit</p>
        <p className="text-sm">Click on a unit in your army list or roster to view details</p>
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
      <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide leading-tight">{unit.name}</h3>
          {listUnit && (
            <span className="text-xs text-white/50">
              {listUnit.modelCount} model{listUnit.modelCount !== 1 ? 's' : ''}
            </span>
          )}
          {/* Badges inline with title info */}
          {(isCharacter || enhancement) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {isCharacter && <span className="badge badge-accent">Character</span>}
              {enhancement && <span className="badge badge-purple">{enhancement.name}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-accent-400 font-bold whitespace-nowrap">{totalPoints} pts</span>
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

      {/* Stats */}
      <div className="card-depth p-4 mb-4 shrink-0">
        <StatsTable
          stats={unit.stats}
          modifiers={modifiers}
          modifierSources={modifierSources}
          className="mb-3"
        />
        {unit.invuln && (
          <div className="flex justify-center">
            <span className="badge badge-accent">{unit.invuln} Invuln</span>
          </div>
        )}
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
              <div key={weapon.id} className="bg-black/20 rounded-lg p-3 mb-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{weapon.name}</span>
                  <span className="badge badge-blue text-[10px] py-0">ranged</span>
                </div>
                <table className="weapon-table">
                  <thead>
                    <tr>
                      <th>RNG</th>
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
                {weapon.abilities && weapon.abilities.length > 0 && (
                  <div className="text-xs text-accent-400 mt-2">{weapon.abilities.join(', ')}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Melee Weapons */}
        {melee.length > 0 && (
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Melee</div>
            {melee.filter(isMeleeStats).map((weapon) => (
              <div key={weapon.id} className="bg-black/20 rounded-lg p-3 mb-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{weapon.name}</span>
                  <span className="badge badge-red text-[10px] py-0">melee</span>
                </div>
                <table className="weapon-table">
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
                {weapon.abilities && weapon.abilities.length > 0 && (
                  <div className="text-xs text-accent-400 mt-2">{weapon.abilities.join(', ')}</div>
                )}
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
