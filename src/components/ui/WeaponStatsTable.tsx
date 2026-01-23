import { Badge } from './Badge';
import type { Weapon, RangedWeaponStats, MeleeWeaponStats, Stratagem } from '@/types';
import { getModifiedWeaponStat } from '@/hooks/useWeaponModifiers';

interface WeaponStatsTableProps {
  weapons: Weapon[];
  showModelCount?: boolean;
  modelCounts?: Record<string, number>;
  activeStratagems?: Stratagem[];
  className?: string;
}

function isRangedWeapon(weapon: Weapon): weapon is Weapon & { stats: RangedWeaponStats } {
  return weapon.type === 'ranged' && 'range' in weapon.stats;
}

function isMeleeWeapon(weapon: Weapon): weapon is Weapon & { stats: MeleeWeaponStats } {
  return weapon.type === 'melee' && 'ws' in weapon.stats;
}

interface WeaponRowProps {
  weapon: Weapon;
  count?: number;
  showCount?: boolean;
  activeStratagems?: Stratagem[];
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
      className={`py-1.5 px-2 text-center ${modified ? 'text-green-400 font-bold' : 'text-gray-300'}`}
      title={modified ? sources.join(', ') : undefined}
    >
      {value}{suffix}
    </td>
  );
}

function RangedWeaponRow({ weapon, count, showCount, activeStratagems = [] }: WeaponRowProps) {
  if (!isRangedWeapon(weapon)) return null;

  const range = getModifiedWeaponStat(weapon, 'range', activeStratagems);
  const a = getModifiedWeaponStat(weapon, 'a', activeStratagems);
  const bs = getModifiedWeaponStat(weapon, 'bs', activeStratagems);
  const s = getModifiedWeaponStat(weapon, 's', activeStratagems);
  const ap = getModifiedWeaponStat(weapon, 'ap', activeStratagems);
  const d = getModifiedWeaponStat(weapon, 'd', activeStratagems);

  return (
    <tr className="border-b border-gray-700/30 last:border-b-0">
      <td className="py-1.5 px-2 text-gray-200">
        <div className="flex items-center gap-2">
          {showCount && count !== undefined && count > 0 && (
            <span className="text-gray-500 text-xs">{count}×</span>
          )}
          <span>{weapon.name}</span>
        </div>
      </td>
      <StatCell value={range.value} modified={range.modified} sources={range.sources} suffix='"' />
      <StatCell value={a.value} modified={a.modified} sources={a.sources} />
      <StatCell value={bs.value} modified={bs.modified} sources={bs.sources} />
      <StatCell value={s.value} modified={s.modified} sources={s.sources} />
      <StatCell value={ap.value} modified={ap.modified} sources={ap.sources} />
      <StatCell value={d.value} modified={d.modified} sources={d.sources} />
      <td className="py-1.5 px-2">
        <div className="flex flex-wrap gap-1">
          {weapon.abilities.map((ability) => (
            <Badge key={ability} variant="info" size="sm">
              {ability}
            </Badge>
          ))}
        </div>
      </td>
    </tr>
  );
}

function MeleeWeaponRow({ weapon, count, showCount, activeStratagems = [] }: WeaponRowProps) {
  if (!isMeleeWeapon(weapon)) return null;

  const a = getModifiedWeaponStat(weapon, 'a', activeStratagems);
  const ws = getModifiedWeaponStat(weapon, 'ws', activeStratagems);
  const s = getModifiedWeaponStat(weapon, 's', activeStratagems);
  const ap = getModifiedWeaponStat(weapon, 'ap', activeStratagems);
  const d = getModifiedWeaponStat(weapon, 'd', activeStratagems);

  return (
    <tr className="border-b border-gray-700/30 last:border-b-0">
      <td className="py-1.5 px-2 text-gray-200">
        <div className="flex items-center gap-2">
          {showCount && count !== undefined && count > 0 && (
            <span className="text-gray-500 text-xs">{count}×</span>
          )}
          <span>{weapon.name}</span>
        </div>
      </td>
      <StatCell value={a.value} modified={a.modified} sources={a.sources} />
      <StatCell value={ws.value} modified={ws.modified} sources={ws.sources} />
      <StatCell value={s.value} modified={s.modified} sources={s.sources} />
      <StatCell value={ap.value} modified={ap.modified} sources={ap.sources} />
      <StatCell value={d.value} modified={d.modified} sources={d.sources} />
      <td className="py-1.5 px-2">
        <div className="flex flex-wrap gap-1">
          {weapon.abilities.map((ability) => (
            <Badge key={ability} variant="info" size="sm">
              {ability}
            </Badge>
          ))}
        </div>
      </td>
    </tr>
  );
}

export function WeaponStatsTable({
  weapons,
  showModelCount = false,
  modelCounts = {},
  activeStratagems = [],
  className = '',
}: WeaponStatsTableProps) {
  const rangedWeapons = weapons.filter(isRangedWeapon);
  const meleeWeapons = weapons.filter(isMeleeWeapon);

  return (
    <div className={`space-y-3 ${className}`}>
      {rangedWeapons.length > 0 && (
        <div>
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-1 font-medium">
            Ranged
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
                  <th className="py-1 px-2 text-left font-medium">Weapon</th>
                  <th className="py-1 px-2 text-center font-medium">Range</th>
                  <th className="py-1 px-2 text-center font-medium">A</th>
                  <th className="py-1 px-2 text-center font-medium">BS</th>
                  <th className="py-1 px-2 text-center font-medium">S</th>
                  <th className="py-1 px-2 text-center font-medium">AP</th>
                  <th className="py-1 px-2 text-center font-medium">D</th>
                  <th className="py-1 px-2 text-left font-medium">Abilities</th>
                </tr>
              </thead>
              <tbody>
                {rangedWeapons.map((weapon) => (
                  <RangedWeaponRow
                    key={weapon.id}
                    weapon={weapon}
                    count={modelCounts[weapon.loadoutGroup || weapon.id]}
                    showCount={showModelCount}
                    activeStratagems={activeStratagems}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meleeWeapons.length > 0 && (
        <div>
          <div className="text-xs text-red-400 uppercase tracking-wider mb-1 font-medium">
            Melee
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
                  <th className="py-1 px-2 text-left font-medium">Weapon</th>
                  <th className="py-1 px-2 text-center font-medium">A</th>
                  <th className="py-1 px-2 text-center font-medium">WS</th>
                  <th className="py-1 px-2 text-center font-medium">S</th>
                  <th className="py-1 px-2 text-center font-medium">AP</th>
                  <th className="py-1 px-2 text-center font-medium">D</th>
                  <th className="py-1 px-2 text-left font-medium">Abilities</th>
                </tr>
              </thead>
              <tbody>
                {meleeWeapons.map((weapon) => (
                  <MeleeWeaponRow
                    key={weapon.id}
                    weapon={weapon}
                    count={modelCounts[weapon.loadoutGroup || weapon.id]}
                    showCount={showModelCount}
                    activeStratagems={activeStratagems}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
