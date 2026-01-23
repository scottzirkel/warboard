'use client';

import type { ArmyData, Detachment, Stratagem } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface KatahStance {
  id: string;
  name: string;
  description: string;
}

interface GameStatePanelProps {
  // Battle round state
  battleRound: number;
  onBattleRoundChange: (round: number) => void;

  // Command points state
  commandPoints: number;
  onCommandPointsChange: (points: number) => void;

  // Ka'tah state
  selectedKatah: string | null;
  onKatahChange: (katahId: string | null) => void;

  // Stratagems state
  activeStratagems: string[];
  onToggleStratagem: (stratagemId: string) => void;

  // Army data for dynamic content
  armyData: ArmyData | null;
  detachmentId: string;

  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getKatahStances(armyData: ArmyData | null): KatahStance[] {
  if (!armyData?.armyRules?.martial_katah?.stances) {
    return [];
  }
  return armyData.armyRules.martial_katah.stances;
}

function getDetachment(armyData: ArmyData | null, detachmentId: string): Detachment | null {
  if (!armyData?.detachments) {
    return null;
  }
  return armyData.detachments[detachmentId] ?? null;
}

function getStratagems(detachment: Detachment | null): Stratagem[] {
  if (!detachment?.stratagems) {
    return [];
  }
  return detachment.stratagems;
}

// ============================================================================
// Main Component
// ============================================================================

export function GameStatePanel({
  battleRound,
  onBattleRoundChange,
  commandPoints,
  onCommandPointsChange,
  selectedKatah,
  onKatahChange,
  activeStratagems,
  onToggleStratagem,
  armyData,
  detachmentId,
  className = '',
}: GameStatePanelProps) {
  const katahStances = getKatahStances(armyData);
  const detachment = getDetachment(armyData, detachmentId);
  const stratagems = getStratagems(detachment);

  const activeStance = katahStances.find((s) => s.id === selectedKatah);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <h2 className="section-header-inline mb-4 shrink-0">Game State</h2>

      <div className="space-y-4 flex-1 overflow-y-auto scroll-smooth">
        {/* Battle Round */}
        <div className="card-depth p-4">
          <div className="flex justify-between items-center">
            <span className="text-white/60 font-medium">Battle Round</span>
            <div className="flex items-center gap-4">
              <div className="stepper">
                <button
                  onClick={() => onBattleRoundChange(Math.max(1, battleRound - 1))}
                  className="stepper-btn"
                  disabled={battleRound <= 1}
                >
                  -
                </button>
                <div className="stepper-divider" />
                <button
                  onClick={() => onBattleRoundChange(Math.min(5, battleRound + 1))}
                  className="stepper-btn"
                  disabled={battleRound >= 5}
                >
                  +
                </button>
              </div>
              <span className="text-4xl font-bold text-white w-8 text-center">
                {battleRound}
              </span>
            </div>
          </div>
        </div>

        {/* Command Points */}
        <div className="card-depth p-4">
          <div className="flex justify-between items-center">
            <span className="text-white/60 font-medium">Command Points</span>
            <div className="flex items-center gap-4">
              <div className="stepper">
                <button
                  onClick={() => onCommandPointsChange(Math.max(0, commandPoints - 1))}
                  className="stepper-btn"
                  disabled={commandPoints <= 0}
                >
                  -
                </button>
                <div className="stepper-divider" />
                <button
                  onClick={() => onCommandPointsChange(commandPoints + 1)}
                  className="stepper-btn"
                >
                  +
                </button>
              </div>
              <span className="text-4xl font-bold text-accent-400 w-8 text-center">
                {commandPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Martial Ka'tah (if stances available) */}
        {katahStances.length > 0 && (
          <div className="card-depth overflow-hidden">
            <div className="p-4 pb-3">
              <div className="text-white/60 font-medium mb-3">Martial Ka&apos;tah</div>
              <div className="segmented-control">
                <div
                  onClick={() => onKatahChange(null)}
                  className={`segmented-control-item ${!selectedKatah ? 'active' : ''}`}
                >
                  None
                </div>
                {katahStances.map((stance) => (
                  <div
                    key={stance.id}
                    onClick={() => onKatahChange(stance.id)}
                    className={`segmented-control-item ${selectedKatah === stance.id ? 'active' : ''}`}
                  >
                    {stance.name.replace(' Stance', '')}
                  </div>
                ))}
              </div>
            </div>
            {activeStance && (
              <div className="px-4 py-2 bg-accent-tint flex items-center justify-between">
                <span className="text-xs font-medium text-accent-300">
                  {activeStance.name.replace(' Stance', '')}
                </span>
                <span className="text-xs text-accent-400">
                  {activeStance.description.replace('Melee weapons gain ', '')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stratagems */}
        <div className="card-depth overflow-hidden">
          <div className="section-header">Stratagems</div>
          <div className="space-y-0">
            {stratagems.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/40 text-sm">
                No stratagems available
              </div>
            ) : (
              stratagems.map((strat) => (
                <div
                  key={strat.id}
                  className={`
                    inset-group-item cursor-pointer transition-colors touch-highlight
                    ${activeStratagems.includes(strat.id) ? 'bg-accent-tint-strong' : 'hover:bg-white/5'}
                  `}
                  onClick={() => onToggleStratagem(strat.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{strat.name}</div>
                    <div className="text-xs text-white/40 mt-0.5">{strat.phase}</div>
                  </div>
                  <span className="badge badge-accent">{strat.cost} CP</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detachment Rules */}
        {detachment?.rules && detachment.rules.length > 0 && (
          <div className="card-depth overflow-hidden">
            <div className="section-header">Detachment Rules</div>
            <div className="px-4 pb-4 space-y-2">
              {detachment.rules.map((rule) => (
                <div key={rule.id} className="text-sm">
                  <span className="font-semibold text-accent-300">{rule.name}: </span>
                  <span className="text-white/70">{rule.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
