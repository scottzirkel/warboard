'use client';

import { Button } from '@/components/ui';
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

// Sort weapons: ranged first, then melee, alphabetically within each group
function sortWeapons(weapons: Weapon[]): Weapon[] {
  return [...weapons]
    .filter(w => w.type !== 'equipment')
    .sort((a, b) => {
      if (a.type === 'ranged' && b.type === 'melee') return -1;
      if (a.type === 'melee' && b.type === 'ranged') return 1;
      return a.name.localeCompare(b.name);
    });
}

// Calculate modified stat value
function getModifiedValue(
  stat: string,
  baseValue: string | number,
  modifiers?: Modifier[]
): { value: string | number; modified: boolean } {
  if (!modifiers || modifiers.length === 0) {
    return { value: baseValue, modified: false };
  }

  const statModifiers = modifiers.filter(
    (m) => m.stat === stat && (m.scope === 'model' || m.scope === 'unit')
  );

  if (statModifiers.length === 0) {
    return { value: baseValue, modified: false };
  }

  let numericValue = typeof baseValue === 'number' ? baseValue : parseInt(baseValue, 10);
  if (isNaN(numericValue)) {
    const match = String(baseValue).match(/(\d+)/);
    if (match) {
      numericValue = parseInt(match[1], 10);
    } else {
      return { value: baseValue, modified: false };
    }
  }

  for (const mod of statModifiers) {
    switch (mod.operation) {
      case 'add':
        numericValue += mod.value;
        break;
      case 'subtract':
        numericValue -= mod.value;
        break;
      case 'set':
        numericValue = mod.value;
        break;
    }
  }

  if (typeof baseValue === 'string' && baseValue.includes('+')) {
    return { value: `${numericValue}+`, modified: true };
  }

  return { value: numericValue, modified: true };
}

export function UnitDetailsPanel({
  unit,
  listUnit,
  unitIndex,
  enhancement,
  modifiers,
  modifierSources: _modifierSources,
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

  // Get sorted weapons
  const sortedWeaponsList = sortWeapons(unit.weapons);

  // Calculate modified stats
  const stats = {
    m: getModifiedValue('m', unit.stats.m, modifiers),
    t: getModifiedValue('t', unit.stats.t, modifiers),
    sv: getModifiedValue('sv', unit.stats.sv, modifiers),
    w: getModifiedValue('w', unit.stats.w, modifiers),
    ld: getModifiedValue('ld', unit.stats.ld, modifiers),
    oc: getModifiedValue('oc', unit.stats.oc, modifiers),
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto scroll-smooth ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4 shrink-0">
        <h2 className="text-xl font-semibold text-accent-300">{unit.name}</h2>
        <div className="flex items-center gap-3">
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
      {enhancement && (
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          <span className="badge badge-purple">{enhancement.name}</span>
        </div>
      )}

      {/* Stats Table */}
      <div className="card-depth p-4 mb-4 shrink-0">
        <div className="grid grid-cols-6 gap-2 mb-3">
          <div className="stat-cell">
            <span className="stat-label">M</span>
            <span className={`stat-value ${stats.m.modified ? 'modified' : ''}`}>
              {stats.m.value}&quot;
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">T</span>
            <span className={`stat-value ${stats.t.modified ? 'modified' : ''}`}>
              {stats.t.value}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">SV</span>
            <span className={`stat-value ${stats.sv.modified ? 'modified' : ''}`}>
              {stats.sv.value}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">W</span>
            <span className={`stat-value ${stats.w.modified ? 'modified' : ''}`}>
              {stats.w.value}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">LD</span>
            <span className={`stat-value ${stats.ld.modified ? 'modified' : ''}`}>
              {stats.ld.value}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">OC</span>
            <span className={`stat-value ${stats.oc.modified ? 'modified' : ''}`}>
              {stats.oc.value}
            </span>
          </div>
        </div>
        {unit.invuln && (
          <div className="flex justify-center">
            <span className="badge badge-accent">{unit.invuln} Invuln</span>
          </div>
        )}
      </div>

      {/* Weapons */}
      <div className="card-depth overflow-hidden mb-4 shrink-0">
        <div className="section-header">Weapons</div>
        <div className="px-4 pb-4 space-y-3">
          {sortedWeaponsList.map((weapon) => (
            <div key={weapon.id} className="bg-black/20 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{weapon.name}</span>
                <span className={`badge text-[10px] py-0 ${weapon.type === 'ranged' ? 'badge-blue' : 'badge-red'}`}>
                  {weapon.type}
                </span>
              </div>
              {isRangedStats(weapon) && (
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
              )}
              {isMeleeStats(weapon) && (
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
              )}
              {weapon.abilities && weapon.abilities.length > 0 && (
                <div className="text-xs text-accent-400 mt-2">
                  {weapon.abilities.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Abilities */}
      {unit.abilities && unit.abilities.length > 0 && (
        <div className="card-depth overflow-hidden shrink-0">
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
    </div>
  );
}
