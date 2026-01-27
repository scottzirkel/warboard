'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import type { ArmyData, Detachment, Stratagem, MissionTwist } from '@/types';

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

  // Twists state (Chapter Approved)
  activeTwists: string[];
  onToggleTwist: (twistId: string) => void;
  availableTwists: MissionTwist[];

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
  activeTwists,
  onToggleTwist,
  availableTwists,
  armyData,
  detachmentId,
  className = '',
}: GameStatePanelProps) {
  const katahStances = getKatahStances(armyData);
  const detachment = getDetachment(armyData, detachmentId);
  const stratagems = getStratagems(detachment);

  // Collapse state: Stratagems default expanded, Detachment Rules default collapsed
  const [stratagemsSectionOpen, setStratagemsSectionOpen] = useState(true);
  const [detachmentRulesOpen, setDetachmentRulesOpen] = useState(false);

  // Selected stratagem for detail modal
  const [selectedStratagem, setSelectedStratagem] = useState<Stratagem | null>(null);

  // Handle using a stratagem (deduct CP and activate)
  const handleUseStratagem = (strat: Stratagem) => {
    if (commandPoints < strat.cost) {
      return; // Button should be disabled, but safety check
    }

    onCommandPointsChange(commandPoints - strat.cost);
    if (!activeStratagems.includes(strat.id)) {
      onToggleStratagem(strat.id);
    }
    setSelectedStratagem(null);
  };

  // Handle deactivating a stratagem (no CP refund)
  const handleDeactivateStratagem = (strat: Stratagem) => {
    if (activeStratagems.includes(strat.id)) {
      onToggleStratagem(strat.id);
    }
    setSelectedStratagem(null);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <h2 className="section-header-inline mb-4 shrink-0">Game State</h2>

      <div className="space-y-4 flex-1 overflow-y-auto scroll-smooth">
        {/* Combined Battle Round + Command Points */}
        <div className="card-depth p-4">
          <div className="flex items-center justify-between">
            {/* Round */}
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">Round</span>
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
              <span className="text-2xl font-bold text-white w-6 text-center">
                {battleRound}
              </span>
            </div>

            <div className="h-8 w-px bg-white/10" />

            {/* CP */}
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">CP</span>
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
              <span className="text-2xl font-bold text-accent-400 w-6 text-center">
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
          </div>
        )}

        {/* Stratagems - Collapsible, default expanded */}
        <div className="card-depth overflow-hidden">
          <button
            onClick={() => setStratagemsSectionOpen(!stratagemsSectionOpen)}
            className="section-header w-full flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
          >
            <span>Stratagems</span>
            <div className="flex items-center gap-2">
              <span className="badge">{stratagems.length}</span>
              <svg
                className={`w-3 h-3 text-white/40 transition-transform duration-200 ${stratagemsSectionOpen ? '' : '-rotate-90'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          <div className={`overflow-hidden transition-all duration-200 ${stratagemsSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
                    onClick={() => setSelectedStratagem(strat)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{strat.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">{strat.phase}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeStratagems.includes(strat.id) && (
                        <span className="text-xs text-accent-400 font-medium">Active</span>
                      )}
                      <span className="badge badge-accent">{strat.cost} CP</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mission Twists (Chapter Approved) */}
        {availableTwists.length > 0 && (
          <div className="card-depth overflow-hidden">
            <div className="section-header">Mission Twists</div>
            <div className="space-y-0">
              {availableTwists.map((twist) => (
                <div
                  key={twist.id}
                  className={`
                    inset-group-item cursor-pointer transition-colors touch-highlight
                    ${activeTwists.includes(twist.id) ? 'bg-accent-tint-strong' : 'hover:bg-white/5'}
                  `}
                  onClick={() => onToggleTwist(twist.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{twist.name}</div>
                    <div className="text-xs text-white/40 mt-0.5 capitalize">{twist.affects}</div>
                  </div>
                  {twist.modifiers && twist.modifiers.length > 0 && (
                    <span className="badge badge-accent">Modifier</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detachment Rules - Collapsible, default collapsed */}
        {detachment?.rules && detachment.rules.length > 0 && (
          <div className="card-depth overflow-hidden">
            <button
              onClick={() => setDetachmentRulesOpen(!detachmentRulesOpen)}
              className="section-header w-full flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span>Detachment Rules</span>
              <div className="flex items-center gap-2">
                <span className="badge">{detachment.rules.length}</span>
                <svg
                  className={`w-3 h-3 text-white/40 transition-transform duration-200 ${detachmentRulesOpen ? '' : '-rotate-90'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${detachmentRulesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 space-y-2">
                {detachment.rules.map((rule) => (
                  <div key={rule.id} className="text-sm">
                    <span className="font-semibold text-accent-300">{rule.name}: </span>
                    <span className="text-white/70">{rule.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stratagem Detail Modal */}
      <Modal
        isOpen={selectedStratagem !== null}
        onClose={() => setSelectedStratagem(null)}
        title={selectedStratagem?.name ?? 'Stratagem'}
        size="sm"
      >
        {selectedStratagem && (
          <div className="space-y-4">
            {/* Phase and Cost */}
            <div className="flex items-center gap-3">
              <span className="badge">{selectedStratagem.phase}</span>
              <span className="badge badge-accent">{selectedStratagem.cost} CP</span>
              {activeStratagems.includes(selectedStratagem.id) && (
                <span className="badge bg-green-600/20 text-green-400">Active</span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-white/70 leading-relaxed">
              {selectedStratagem.description}
            </p>

            {/* Insufficient CP Warning */}
            {commandPoints < selectedStratagem.cost && !activeStratagems.includes(selectedStratagem.id) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-red-400">
                  Not enough CP ({commandPoints}/{selectedStratagem.cost})
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedStratagem(null)}
                className="btn-ios btn-ios-secondary"
              >
                Cancel
              </button>
              {activeStratagems.includes(selectedStratagem.id) ? (
                <button
                  onClick={() => handleDeactivateStratagem(selectedStratagem)}
                  className="btn-ios bg-red-600 hover:bg-red-700 text-white"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => handleUseStratagem(selectedStratagem)}
                  disabled={commandPoints < selectedStratagem.cost}
                  className="btn-ios btn-ios-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use Stratagem
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
