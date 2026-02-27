'use client';

import { Modal } from '@/components/ui';
import { StatsTable } from './StatsTable';
import type { Unit, Weapon, RangedWeaponStats, MeleeWeaponStats } from '@/types';

interface UnitDetailModalProps {
  unit: Unit | null;
  isOpen: boolean;
  onClose: () => void;
  onAddUnit: (unit: Unit) => void;
}

function isRangedStats(weapon: Weapon): weapon is Weapon & { stats: RangedWeaponStats } {
  return weapon.type === 'ranged';
}

function isMeleeStats(weapon: Weapon): weapon is Weapon & { stats: MeleeWeaponStats } {
  return weapon.type === 'melee';
}

function getPointsDisplay(unit: Unit): string {
  const modelCounts = Object.keys(unit.points).map(Number).sort((a, b) => a - b);
  const minCount = modelCounts[0];
  const maxCount = modelCounts[modelCounts.length - 1];
  const minPoints = unit.points[String(minCount)] || 0;
  const maxPoints = unit.points[String(maxCount)] || 0;

  if (minPoints === maxPoints || modelCounts.length === 1) {
    return `${minPoints} pts`;
  }
  return `${minPoints}-${maxPoints} pts`;
}

export function UnitDetailModal({ unit, isOpen, onClose, onAddUnit }: UnitDetailModalProps) {
  if (!unit) return null;

  const ranged = unit.weapons.filter((w) => w.type === 'ranged');
  const melee = unit.weapons.filter((w) => w.type === 'melee');
  const isCharacter = unit.keywords.includes('Character');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={unit.name}
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Points & Character Badge */}
        <div className="flex items-center gap-2">
          <span className="text-accent-400 font-bold">{getPointsDisplay(unit)}</span>
          {isCharacter && <span className="badge badge-accent">Character</span>}
        </div>

        {/* Stats */}
        <div className="card-depth p-4">
          <StatsTable stats={unit.stats} />
          {unit.invuln && (
            <div className="flex justify-center mt-3">
              <span className="badge badge-accent">{unit.invuln} Invuln</span>
            </div>
          )}
        </div>

        {/* Keywords */}
        <div>
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
        <div>
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
          <div>
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

      {/* Add to Roster Button */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => {
            onAddUnit(unit);
            onClose();
          }}
          className="btn-ios btn-ios-primary w-full py-3 text-base font-semibold"
        >
          + Add to Roster
        </button>
      </div>
    </Modal>
  );
}
