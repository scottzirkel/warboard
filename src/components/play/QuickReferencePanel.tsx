'use client';

import { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import type { ArmyData, Detachment, Stratagem, WeaponKeyword, KeywordDefinition } from '../../types';

// ============================================================================
// Collapsible Section Component
// ============================================================================

interface CollapsibleSectionProps {
  id: string;
  title: string;
  itemCount?: number;
  isOpen: boolean;
  onToggle: (id: string) => void;
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'purple';
  children: React.ReactNode;
}

function CollapsibleSection({
  id,
  title,
  itemCount,
  isOpen,
  onToggle,
  variant = 'default',
  children,
}: CollapsibleSectionProps) {
  const variantStyles = {
    default: {
      header: 'bg-gray-700/50',
      border: 'border-gray-600/30',
      text: 'text-gray-200',
      count: 'bg-gray-600 text-gray-300',
    },
    blue: {
      header: 'bg-blue-900/30',
      border: 'border-blue-600/30',
      text: 'text-blue-300',
      count: 'bg-blue-600/50 text-blue-200',
    },
    green: {
      header: 'bg-green-900/30',
      border: 'border-green-600/30',
      text: 'text-green-300',
      count: 'bg-green-600/50 text-green-200',
    },
    orange: {
      header: 'bg-orange-900/30',
      border: 'border-orange-600/30',
      text: 'text-orange-300',
      count: 'bg-orange-600/50 text-orange-200',
    },
    purple: {
      header: 'bg-purple-900/30',
      border: 'border-purple-600/30',
      text: 'text-purple-300',
      count: 'bg-purple-600/50 text-purple-200',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`rounded-lg border ${styles.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`
          w-full flex items-center justify-between px-3 py-2
          ${styles.header}
          hover:brightness-110 transition-all
          cursor-pointer
        `}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`
              w-4 h-4 transition-transform duration-200
              ${isOpen ? 'rotate-90' : ''}
              ${styles.text}
            `}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className={`font-medium ${styles.text}`}>{title}</span>
        </div>
        {itemCount !== undefined && (
          <span className={`px-2 py-0.5 text-xs rounded ${styles.count}`}>
            {itemCount}
          </span>
        )}
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-200
          ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-3 bg-gray-800/30">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Stratagem Card Component
// ============================================================================

interface StratagemCardProps {
  stratagem: Stratagem;
}

function StratagemCard({ stratagem }: StratagemCardProps) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-200">{stratagem.name}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">{stratagem.phase}</Badge>
          <Badge variant="accent" size="sm">{stratagem.cost}CP</Badge>
        </div>
      </div>
      <p className="text-sm text-gray-400">{stratagem.description}</p>
    </div>
  );
}

// ============================================================================
// Keyword Card Component
// ============================================================================

interface KeywordCardProps {
  name: string;
  description: string;
}

function KeywordCard({ name, description }: KeywordCardProps) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
      <h4 className="font-medium text-gray-200 mb-1">{name}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

// ============================================================================
// Wargear Ability Card Component
// ============================================================================

interface WargearAbility {
  name: string;
  description: string;
}

interface WargearAbilityCardProps {
  ability: WargearAbility;
}

function WargearAbilityCard({ ability }: WargearAbilityCardProps) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-3 border border-orange-600/20">
      <h4 className="font-medium text-orange-300 mb-1">{ability.name}</h4>
      <p className="text-sm text-gray-400">{ability.description}</p>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a stat code to a human-readable name
 */
function getStatDisplayName(stat: string): string {
  const statNames: Record<string, string> = {
    m: 'Movement',
    t: 'Toughness',
    sv: 'Save',
    w: 'Wounds',
    ld: 'Leadership',
    oc: 'Objective Control',
    a: 'Attacks',
    s: 'Strength',
    ap: 'AP',
    d: 'Damage',
    bs: 'Ballistic Skill',
    ws: 'Weapon Skill',
    range: 'Range',
  };
  return statNames[stat] || stat.toUpperCase();
}

/**
 * Extracts unique wargear abilities (stat modifiers with source) from faction data
 */
function getWargearAbilities(armyData: ArmyData): WargearAbility[] {
  const abilities: Map<string, WargearAbility> = new Map();

  for (const unit of armyData.units) {
    for (const weapon of unit.weapons) {
      if (weapon.modifiers) {
        for (const modifier of weapon.modifiers) {
          if (modifier.source && !abilities.has(modifier.source)) {
            const signPrefix = modifier.value >= 0 ? '+' : '';
            abilities.set(modifier.source, {
              name: modifier.source,
              description: `Bearer gains ${signPrefix}${modifier.value} ${getStatDisplayName(modifier.stat)}.`,
            });
          }
        }
      }
    }
  }

  return Array.from(abilities.values());
}

// ============================================================================
// QuickReferencePanel Component
// ============================================================================

interface QuickReferencePanelProps {
  armyData: ArmyData;
  selectedDetachment: string;
  className?: string;
}

export function QuickReferencePanel({
  armyData,
  selectedDetachment,
  className = '',
}: QuickReferencePanelProps) {
  // State for tracking which sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['stratagems']) // Stratagems open by default
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isOpen = (id: string) => openSections.has(id);

  // Get current detachment data
  const detachment: Detachment | undefined = armyData.detachments[selectedDetachment];
  const stratagems: Stratagem[] = detachment?.stratagems || [];
  const enhancements = detachment?.enhancements || [];

  // Get weapon keywords from faction data (legacy format)
  const weaponKeywords: WeaponKeyword[] = armyData.weaponKeywords
    ? Object.values(armyData.weaponKeywords)
    : [];

  // Get keywords from glossary (new format - arrays)
  const weaponGlossary: KeywordDefinition[] = armyData.keywordGlossary?.weapon || [];
  const unitGlossary: KeywordDefinition[] = armyData.keywordGlossary?.unit || [];

  // Get wargear abilities (stat modifiers with sources)
  const wargearAbilities = getWargearAbilities(armyData);

  // Group stratagems by phase for better organization
  const stratagemsByPhase = stratagems.reduce<Record<string, Stratagem[]>>((acc, strat) => {
    const phase = strat.phase || 'Any';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(strat);
    return acc;
  }, {});

  return (
    <Panel title="Quick Reference" className={className}>
      <div className="p-4 space-y-3">
        {/* Detachment Rule */}
        {detachment?.rules && detachment.rules.length > 0 && (
          <CollapsibleSection
            id="detachment-rule"
            title={`${detachment.name} Rule`}
            isOpen={isOpen('detachment-rule')}
            onToggle={toggleSection}
            variant="purple"
          >
            <div className="space-y-3">
              {detachment.rules.map((rule) => (
                <div key={rule.id}>
                  <h4 className="font-medium text-purple-300 mb-1">{rule.name}</h4>
                  <p className="text-sm text-gray-400">{rule.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Stratagems Section */}
        {stratagems.length > 0 && (
          <CollapsibleSection
            id="stratagems"
            title="Detachment Stratagems"
            itemCount={stratagems.length}
            isOpen={isOpen('stratagems')}
            onToggle={toggleSection}
            variant="blue"
          >
            <div className="space-y-2">
              {Object.entries(stratagemsByPhase).map(([phase, phaseStratagems]) => (
                <div key={phase}>
                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {phase} Phase
                  </h5>
                  <div className="space-y-2">
                    {phaseStratagems.map((stratagem) => (
                      <StratagemCard key={stratagem.id} stratagem={stratagem} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Detachment Enhancements Section */}
        {enhancements.length > 0 && (
          <CollapsibleSection
            id="enhancements"
            title="Detachment Enhancements"
            itemCount={enhancements.length}
            isOpen={isOpen('enhancements')}
            onToggle={toggleSection}
            variant="green"
          >
            <div className="space-y-2">
              {enhancements.map((enhancement) => (
                <div key={enhancement.id} className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-200">{enhancement.name}</h4>
                    <Badge variant="accent" size="sm">{enhancement.points}pts</Badge>
                  </div>
                  <p className="text-sm text-gray-400">{enhancement.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Wargear Abilities Section */}
        {wargearAbilities.length > 0 && (
          <CollapsibleSection
            id="wargear-abilities"
            title="Wargear Abilities"
            itemCount={wargearAbilities.length}
            isOpen={isOpen('wargear-abilities')}
            onToggle={toggleSection}
            variant="orange"
          >
            <div className="space-y-2">
              {wargearAbilities.map((ability) => (
                <WargearAbilityCard key={ability.name} ability={ability} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Weapon Keywords Section */}
        {(weaponGlossary.length > 0 || weaponKeywords.length > 0) && (
          <CollapsibleSection
            id="weapon-keywords"
            title="Weapon Abilities"
            itemCount={weaponGlossary.length || weaponKeywords.length}
            isOpen={isOpen('weapon-keywords')}
            onToggle={toggleSection}
            variant="default"
          >
            <div className="space-y-2">
              {/* Prefer glossary format if available */}
              {weaponGlossary.length > 0 ? (
                weaponGlossary.map((keyword) => (
                  <KeywordCard
                    key={keyword.name}
                    name={keyword.name}
                    description={keyword.description}
                  />
                ))
              ) : (
                weaponKeywords.map((keyword) => (
                  <KeywordCard
                    key={keyword.name}
                    name={keyword.name}
                    description={keyword.description}
                  />
                ))
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Unit Keywords Section */}
        {unitGlossary.length > 0 && (
          <CollapsibleSection
            id="unit-keywords"
            title="Unit Abilities"
            itemCount={unitGlossary.length}
            isOpen={isOpen('unit-keywords')}
            onToggle={toggleSection}
            variant="default"
          >
            <div className="space-y-2">
              {unitGlossary.map((keyword) => (
                <KeywordCard
                  key={keyword.name}
                  name={keyword.name}
                  description={keyword.description}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Empty State */}
        {!detachment && (
          <div className="text-center py-8 text-gray-500">
            <p>Select a detachment to view reference information</p>
          </div>
        )}
      </div>
    </Panel>
  );
}
