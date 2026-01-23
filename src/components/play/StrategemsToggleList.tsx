'use client';

import { Badge } from '@/components/ui';
import type { Stratagem } from '@/types';

interface StrategemsToggleListProps {
  stratagems: Stratagem[];
  activeStratagems: string[];
  commandPoints: number;
  onToggleStratagem: (stratagemId: string) => void;
  className?: string;
}

export function StrategemsToggleList({
  stratagems,
  activeStratagems,
  commandPoints,
  onToggleStratagem,
  className = '',
}: StrategemsToggleListProps) {
  // Group stratagems by phase
  const groupedStratagems = groupByPhase(stratagems);
  const phases = Object.keys(groupedStratagems);

  return (
    <div className={`bg-gray-700/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Stratagems
        </span>
        <Badge variant={activeStratagems.length > 0 ? 'success' : 'default'} size="sm">
          {activeStratagems.length} active
        </Badge>
      </div>

      {stratagems.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-4">
          No stratagems available for this detachment
        </p>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
          {phases.map((phase) => (
            <div key={phase}>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                {phase} Phase
              </h4>
              <div className="space-y-2">
                {groupedStratagems[phase].map((stratagem) => (
                  <StratagemToggleCard
                    key={stratagem.id}
                    stratagem={stratagem}
                    isActive={activeStratagems.includes(stratagem.id)}
                    canAfford={commandPoints >= stratagem.cost}
                    onToggle={() => onToggleStratagem(stratagem.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Stratagem Card Component
// ============================================================================

interface StratagemToggleCardProps {
  stratagem: Stratagem;
  isActive: boolean;
  canAfford: boolean;
  onToggle: () => void;
}

function StratagemToggleCard({
  stratagem,
  isActive,
  canAfford,
  onToggle,
}: StratagemToggleCardProps) {
  const canActivate = canAfford || isActive;

  return (
    <button
      onClick={onToggle}
      disabled={!canActivate}
      className={`
        w-full text-left p-3 rounded-lg transition-all
        ${isActive
          ? 'bg-green-900/50 border-2 border-green-500'
          : canAfford
            ? 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'
            : 'bg-gray-800/50 border border-gray-700 opacity-50'}
        ${!canActivate ? 'cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`font-medium text-sm ${isActive ? 'text-green-300' : 'text-gray-300'}`}>
          {stratagem.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <CostBadge cost={stratagem.cost} isActive={isActive} />
          {isActive && (
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      <p className={`text-xs mt-1 line-clamp-2 ${isActive ? 'text-green-200/70' : 'text-gray-500'}`}>
        {stratagem.description}
      </p>
    </button>
  );
}

// ============================================================================
// Cost Badge Component
// ============================================================================

interface CostBadgeProps {
  cost: number;
  isActive: boolean;
}

function CostBadge({ cost, isActive }: CostBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 text-xs font-bold rounded
        ${isActive
          ? 'bg-green-800 text-green-300'
          : 'bg-accent-900/50 text-accent-400'}
      `}
    >
      {cost} CP
    </span>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupByPhase(stratagems: Stratagem[]): Record<string, Stratagem[]> {
  const groups: Record<string, Stratagem[]> = {};

  // Define a phase order for sorting
  const phaseOrder = [
    'Command',
    'Movement',
    'Shooting',
    'Charge',
    'Fight',
    'Any',
    'Shooting/Fight',
  ];

  stratagems.forEach((stratagem) => {
    const phase = stratagem.phase || 'Any';
    if (!groups[phase]) {
      groups[phase] = [];
    }
    groups[phase].push(stratagem);
  });

  // Sort groups by phase order
  const sortedGroups: Record<string, Stratagem[]> = {};

  phaseOrder.forEach((phase) => {
    if (groups[phase]) {
      sortedGroups[phase] = groups[phase];
    }
  });

  // Add any remaining phases not in the order list
  Object.keys(groups).forEach((phase) => {
    if (!sortedGroups[phase]) {
      sortedGroups[phase] = groups[phase];
    }
  });

  return sortedGroups;
}
