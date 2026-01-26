import type { Weapon, RangedWeaponStats, MeleeWeaponStats, Stratagem, MissionTwist, KeywordDefinition } from '@/types';
import { getModifiedWeaponStat } from '@/hooks/useWeaponModifiers';
import { Tooltip } from './Tooltip';

interface WeaponStatsTableProps {
  weapons: Weapon[];
  activeStratagems?: Stratagem[];
  activeTwists?: MissionTwist[];
  weaponKeywordGlossary?: KeywordDefinition[];
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
  const content = `${value}${suffix}`;

  if (modified && sources.length > 0) {
    return (
      <td className="text-accent-400 font-bold">
        <Tooltip content={sources.join(', ')}>
          <span>{content}</span>
        </Tooltip>
      </td>
    );
  }

  return <td>{content}</td>;
}

/**
 * Helper to find ability description from glossary.
 * Handles pattern matching for abilities like "Anti-X #+" or "Melta X".
 */
function findAbilityDescription(ability: string, glossary: KeywordDefinition[]): string | null {
  const normalized = ability.toLowerCase().trim();

  // Try exact match first
  const exactMatch = glossary.find((kw) => kw.name.toLowerCase() === normalized);
  if (exactMatch) return exactMatch.description;

  // Pattern matching for parameterized abilities
  if (normalized.startsWith('anti-')) {
    const pattern = glossary.find((kw) => kw.name.toLowerCase() === 'anti-x #+');
    if (pattern) return pattern.description;
  }
  if (normalized.startsWith('melta ')) {
    const pattern = glossary.find((kw) => kw.name.toLowerCase() === 'melta x');
    if (pattern) return pattern.description;
  }
  if (normalized.startsWith('sustained hits ')) {
    const pattern = glossary.find((kw) => kw.name.toLowerCase() === 'sustained hits x');
    if (pattern) return pattern.description;
  }
  if (normalized.startsWith('rapid fire ')) {
    const pattern = glossary.find((kw) => kw.name.toLowerCase() === 'rapid fire x');
    if (pattern) return pattern.description;
  }

  return null;
}

/**
 * Renders weapon abilities with tooltips for glossary terms.
 */
function WeaponAbilities({
  abilities,
  glossary,
}: {
  abilities: string[];
  glossary: KeywordDefinition[];
}) {
  if (!abilities || abilities.length === 0) return null;

  return (
    <div className="text-xs text-accent-400 mt-1">
      {abilities.map((ability, index) => {
        const description = findAbilityDescription(ability, glossary);
        return (
          <span key={ability}>
            {description ? (
              <Tooltip content={description}>
                <span className="cursor-help border-b border-dotted border-accent-400/50">
                  {ability}
                </span>
              </Tooltip>
            ) : (
              ability
            )}
            {index < abilities.length - 1 && ', '}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Single weapon display matching Alpine.js structure:
 * - Weapon name above table
 * - Stats-only table (no weapon/abilities columns)
 * - Abilities as text below table
 */
function RangedWeaponDisplay({
  weapon,
  activeStratagems = [],
  activeTwists = [],
  weaponKeywordGlossary = [],
}: {
  weapon: Weapon & { stats: RangedWeaponStats };
  activeStratagems?: Stratagem[];
  activeTwists?: MissionTwist[];
  weaponKeywordGlossary?: KeywordDefinition[];
}) {
  const range = getModifiedWeaponStat(weapon, 'range', activeStratagems, activeTwists);
  const a = getModifiedWeaponStat(weapon, 'a', activeStratagems, activeTwists);
  const bs = getModifiedWeaponStat(weapon, 'bs', activeStratagems, activeTwists);
  const s = getModifiedWeaponStat(weapon, 's', activeStratagems, activeTwists);
  const ap = getModifiedWeaponStat(weapon, 'ap', activeStratagems, activeTwists);
  const d = getModifiedWeaponStat(weapon, 'd', activeStratagems, activeTwists);

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
      <WeaponAbilities abilities={weapon.abilities || []} glossary={weaponKeywordGlossary} />
    </div>
  );
}

function MeleeWeaponDisplay({
  weapon,
  activeStratagems = [],
  activeTwists = [],
  weaponKeywordGlossary = [],
}: {
  weapon: Weapon & { stats: MeleeWeaponStats };
  activeStratagems?: Stratagem[];
  activeTwists?: MissionTwist[];
  weaponKeywordGlossary?: KeywordDefinition[];
}) {
  const a = getModifiedWeaponStat(weapon, 'a', activeStratagems, activeTwists);
  const ws = getModifiedWeaponStat(weapon, 'ws', activeStratagems, activeTwists);
  const s = getModifiedWeaponStat(weapon, 's', activeStratagems, activeTwists);
  const ap = getModifiedWeaponStat(weapon, 'ap', activeStratagems, activeTwists);
  const d = getModifiedWeaponStat(weapon, 'd', activeStratagems, activeTwists);

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
      <WeaponAbilities abilities={weapon.abilities || []} glossary={weaponKeywordGlossary} />
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
  activeTwists = [],
  weaponKeywordGlossary = [],
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
              activeTwists={activeTwists}
              weaponKeywordGlossary={weaponKeywordGlossary}
            />
          );
        }
        if (isMeleeWeapon(weapon)) {
          return (
            <MeleeWeaponDisplay
              key={weapon.id}
              weapon={weapon}
              activeStratagems={activeStratagems}
              activeTwists={activeTwists}
              weaponKeywordGlossary={weaponKeywordGlossary}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
