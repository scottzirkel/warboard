import type { Weapon, RangedWeaponStats, MeleeWeaponStats, Stratagem } from '@/types';
import { getModifiedWeaponStat } from '@/hooks/useWeaponModifiers';

interface WeaponStatsTableProps {
  weapons: Weapon[];
  activeStratagems?: Stratagem[];
  className?: string;
}

function isRangedWeapon(weapon: Weapon): weapon is Weapon & { stats: RangedWeaponStats } {
  return weapon.type === 'ranged' && 'range' in weapon.stats;
}

function isMeleeWeapon(weapon: Weapon): weapon is Weapon & { stats: MeleeWeaponStats } {
  return weapon.type === 'melee' && 'ws' in weapon.stats;
}

interface StatCellProps {
  value: number | string;
  modified: boolean;
  sources: string[];
  suffix?: string;
}

function StatCell({ value, modified, sources, suffix = '' }: StatCellProps) {
  return (
    <td
      className={modified ? 'text-accent-400 font-bold' : ''}
      title={modified ? sources.join(', ') : undefined}
    >
      {value}{suffix}
    </td>
  );
}

/**
 * Single weapon display matching Alpine.js structure:
 * - Weapon name above table
 * - Stats-only table (no weapon/abilities columns)
 * - Abilities as text below table
 */
function RangedWeaponDisplay({ weapon, activeStratagems = [] }: { weapon: Weapon & { stats: RangedWeaponStats }; activeStratagems?: Stratagem[] }) {
  const range = getModifiedWeaponStat(weapon, 'range', activeStratagems);
  const a = getModifiedWeaponStat(weapon, 'a', activeStratagems);
  const bs = getModifiedWeaponStat(weapon, 'bs', activeStratagems);
  const s = getModifiedWeaponStat(weapon, 's', activeStratagems);
  const ap = getModifiedWeaponStat(weapon, 'ap', activeStratagems);
  const d = getModifiedWeaponStat(weapon, 'd', activeStratagems);

  return (
    <div className="text-sm">
      <div className="font-medium text-gray-300">{weapon.name}</div>
      <table className="w-full text-center text-xs mt-1 table-fixed">
        <thead>
          <tr className="text-gray-500">
            <th className="font-normal w-[16.67%]">RNG</th>
            <th className="font-normal w-[16.67%]">A</th>
            <th className="font-normal w-[16.67%]">BS</th>
            <th className="font-normal w-[16.67%]">S</th>
            <th className="font-normal w-[16.67%]">AP</th>
            <th className="font-normal w-[16.67%]">D</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          <tr>
            <StatCell value={range.value} modified={range.modified} sources={range.sources} suffix='"' />
            <StatCell value={a.value} modified={a.modified} sources={a.sources} />
            <StatCell value={bs.value} modified={bs.modified} sources={bs.sources} />
            <StatCell value={s.value} modified={s.modified} sources={s.sources} />
            <StatCell value={ap.value} modified={ap.modified} sources={ap.sources} />
            <StatCell value={d.value} modified={d.modified} sources={d.sources} />
          </tr>
        </tbody>
      </table>
      {weapon.abilities && weapon.abilities.length > 0 && (
        <div className="text-xs text-accent-400 mt-1">{weapon.abilities.join(', ')}</div>
      )}
    </div>
  );
}

function MeleeWeaponDisplay({ weapon, activeStratagems = [] }: { weapon: Weapon & { stats: MeleeWeaponStats }; activeStratagems?: Stratagem[] }) {
  const a = getModifiedWeaponStat(weapon, 'a', activeStratagems);
  const ws = getModifiedWeaponStat(weapon, 'ws', activeStratagems);
  const s = getModifiedWeaponStat(weapon, 's', activeStratagems);
  const ap = getModifiedWeaponStat(weapon, 'ap', activeStratagems);
  const d = getModifiedWeaponStat(weapon, 'd', activeStratagems);

  return (
    <div className="text-sm">
      <div className="font-medium text-gray-300">{weapon.name}</div>
      <table className="w-full text-center text-xs mt-1 table-fixed">
        <thead>
          <tr className="text-gray-500">
            <th className="font-normal w-[16.67%]"></th>
            <th className="font-normal w-[16.67%]">A</th>
            <th className="font-normal w-[16.67%]">WS</th>
            <th className="font-normal w-[16.67%]">S</th>
            <th className="font-normal w-[16.67%]">AP</th>
            <th className="font-normal w-[16.67%]">D</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          <tr>
            <td></td>
            <StatCell value={a.value} modified={a.modified} sources={a.sources} />
            <StatCell value={ws.value} modified={ws.modified} sources={ws.sources} />
            <StatCell value={s.value} modified={s.modified} sources={s.sources} />
            <StatCell value={ap.value} modified={ap.modified} sources={ap.sources} />
            <StatCell value={d.value} modified={d.modified} sources={d.sources} />
          </tr>
        </tbody>
      </table>
      {weapon.abilities && weapon.abilities.length > 0 && (
        <div className="text-xs text-accent-400 mt-1">{weapon.abilities.join(', ')}</div>
      )}
    </div>
  );
}

/**
 * Weapon stats table matching Alpine.js Play Mode structure.
 * NOTE: This component does NOT render section headers (RANGED/MELEE).
 * The parent component (LoadoutGroupCard) handles section headers.
 * Each weapon is displayed as: name → stats table → abilities text
 */
export function WeaponStatsTable({
  weapons,
  activeStratagems = [],
  className = '',
}: WeaponStatsTableProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {weapons.map((weapon) => {
        if (isRangedWeapon(weapon)) {
          return (
            <RangedWeaponDisplay
              key={weapon.id}
              weapon={weapon}
              activeStratagems={activeStratagems}
            />
          );
        }
        if (isMeleeWeapon(weapon)) {
          return (
            <MeleeWeaponDisplay
              key={weapon.id}
              weapon={weapon}
              activeStratagems={activeStratagems}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
