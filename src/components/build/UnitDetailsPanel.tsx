'use client';

import { Panel, PanelSection, Badge } from '@/components/ui';
import { StatsTable } from './StatsTable';
import { WeaponsDisplay } from './WeaponsDisplay';
import { AbilitiesDisplay } from './AbilitiesDisplay';
import type { Unit, ListUnit, Modifier, ModifierSource, Enhancement } from '@/types';

interface UnitDetailsPanelProps {
  unit: Unit | null;
  listUnit: ListUnit | null;
  unitIndex: number | null;
  enhancement: Enhancement | null;
  modifiers?: Modifier[];
  modifierSources?: Record<string, ModifierSource[]>;
  className?: string;
}

export function UnitDetailsPanel({
  unit,
  listUnit,
  unitIndex,
  enhancement,
  modifiers,
  modifierSources,
  className = '',
}: UnitDetailsPanelProps) {
  // No unit selected state
  if (!unit || unitIndex === null) {
    return (
      <Panel title="Unit Details" className={className}>
        <div className="flex items-center justify-center h-full text-gray-500 text-sm p-8">
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">⚔️</div>
            <p>Select a unit from your army list to view details.</p>
          </div>
        </div>
      </Panel>
    );
  }

  // Calculate points for the selected configuration
  const basePoints = unit.points[String(listUnit?.modelCount || Object.keys(unit.points)[0])];
  const enhancementPoints = enhancement?.points || 0;
  const totalPoints = (basePoints || 0) + enhancementPoints;

  // Check if unit is a Character
  const isCharacter = unit.keywords.includes('Character');

  return (
    <Panel
      title="Unit Details"
      headerRight={
        <span className="text-sm text-accent-400 font-semibold">
          {totalPoints} pts
        </span>
      }
      className={className}
    >
      {/* Unit Header */}
      <PanelSection className="border-b border-gray-700/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">{unit.name}</h3>
            {listUnit && (
              <p className="text-sm text-gray-400 mt-0.5">
                {listUnit.modelCount} model{listUnit.modelCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {isCharacter && (
              <Badge variant="accent" size="sm">
                Character
              </Badge>
            )}
            {enhancement && (
              <Badge variant="purple" size="sm">
                {enhancement.name}
              </Badge>
            )}
          </div>
        </div>
      </PanelSection>

      {/* Unit Stats */}
      <PanelSection title="Stats" className="border-b border-gray-700/30">
        <StatsTable
          stats={unit.stats}
          invuln={unit.invuln}
          modifiers={modifiers}
          modifierSources={modifierSources}
        />
      </PanelSection>

      {/* Keywords */}
      <PanelSection title="Keywords" className="border-b border-gray-700/30">
        <div className="flex flex-wrap gap-1">
          {unit.keywords.map((keyword) => (
            <Badge key={keyword} variant="default" size="sm">
              {keyword}
            </Badge>
          ))}
        </div>
      </PanelSection>

      {/* Weapons */}
      <PanelSection title="Weapons" className="border-b border-gray-700/30">
        <WeaponsDisplay weapons={unit.weapons} />
      </PanelSection>

      {/* Abilities */}
      <PanelSection title="Abilities">
        <AbilitiesDisplay abilities={unit.abilities} />
      </PanelSection>
    </Panel>
  );
}
