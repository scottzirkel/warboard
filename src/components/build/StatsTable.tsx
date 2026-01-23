'use client';

import { StatCell, StatRow } from '@/components/ui';
import type { UnitStats, Modifier, ModifierSource } from '@/types';

interface StatsTableProps {
  stats: UnitStats;
  invuln: string | null;
  modifiers?: Modifier[];
  modifierSources?: Record<string, ModifierSource[]>;
  className?: string;
}

// Get display name for stat keys
function getStatDisplayName(stat: string): string {
  const names: Record<string, string> = {
    m: 'Movement',
    t: 'Toughness',
    sv: 'Save',
    w: 'Wounds',
    ld: 'Leadership',
    oc: 'Objective Control',
  };
  return names[stat] || stat.toUpperCase();
}

// Calculate modified stat value
function getModifiedValue(
  stat: keyof UnitStats | 'invuln',
  baseValue: string | number | null,
  modifiers?: Modifier[]
): { value: string | number; modified: boolean } {
  if (baseValue === null) {
    return { value: '-', modified: false };
  }

  if (!modifiers || modifiers.length === 0) {
    return { value: baseValue, modified: false };
  }

  // Find modifiers for this stat
  const statModifiers = modifiers.filter(
    (m) => m.stat === stat && (m.scope === 'model' || m.scope === 'unit')
  );

  if (statModifiers.length === 0) {
    return { value: baseValue, modified: false };
  }

  // Apply modifiers
  let numericValue = typeof baseValue === 'number' ? baseValue : parseInt(baseValue, 10);

  if (isNaN(numericValue)) {
    // For string values like "2+" or "4+", extract the number
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
      case 'multiply':
        numericValue *= mod.value;
        break;
      case 'set':
        numericValue = mod.value;
        break;
    }
  }

  // Preserve format for dice roll values (e.g., "2+")
  if (typeof baseValue === 'string' && baseValue.includes('+')) {
    return { value: `${numericValue}+`, modified: true };
  }

  return { value: numericValue, modified: true };
}

// Build tooltip from modifier sources
function buildTooltip(stat: string, sources?: ModifierSource[]): string | undefined {
  if (!sources || sources.length === 0) {
    return undefined;
  }

  const lines = sources.map((s) => {
    const sign = s.operation === 'add' ? '+' : s.operation === 'subtract' ? '-' : '';
    return `${s.name}: ${sign}${s.value}`;
  });

  return lines.join('\n');
}

export function StatsTable({
  stats,
  invuln,
  modifiers,
  modifierSources,
  className = '',
}: StatsTableProps) {
  const mValue = getModifiedValue('m', stats.m, modifiers);
  const tValue = getModifiedValue('t', stats.t, modifiers);
  const svValue = getModifiedValue('sv', stats.sv, modifiers);
  const wValue = getModifiedValue('w', stats.w, modifiers);
  const ldValue = getModifiedValue('ld', stats.ld, modifiers);
  const ocValue = getModifiedValue('oc', stats.oc, modifiers);

  return (
    <div className={`space-y-2 ${className}`}>
      <StatRow>
        <StatCell
          label="M"
          value={`${mValue.value}"`}
          modified={mValue.modified}
          tooltip={mValue.modified ? buildTooltip('m', modifierSources?.m) : getStatDisplayName('m')}
        />
        <StatCell
          label="T"
          value={tValue.value}
          modified={tValue.modified}
          tooltip={tValue.modified ? buildTooltip('t', modifierSources?.t) : getStatDisplayName('t')}
        />
        <StatCell
          label="SV"
          value={svValue.value}
          modified={svValue.modified}
          tooltip={svValue.modified ? buildTooltip('sv', modifierSources?.sv) : getStatDisplayName('sv')}
        />
        <StatCell
          label="W"
          value={wValue.value}
          modified={wValue.modified}
          tooltip={wValue.modified ? buildTooltip('w', modifierSources?.w) : getStatDisplayName('w')}
        />
        <StatCell
          label="LD"
          value={ldValue.value}
          modified={ldValue.modified}
          tooltip={ldValue.modified ? buildTooltip('ld', modifierSources?.ld) : getStatDisplayName('ld')}
        />
        <StatCell
          label="OC"
          value={ocValue.value}
          modified={ocValue.modified}
          tooltip={ocValue.modified ? buildTooltip('oc', modifierSources?.oc) : getStatDisplayName('oc')}
        />
        {invuln && (
          <StatCell
            label="INV"
            value={invuln}
            className="bg-accent-500/10"
            tooltip="Invulnerable Save"
          />
        )}
      </StatRow>
    </div>
  );
}
