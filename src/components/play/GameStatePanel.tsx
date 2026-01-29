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
  // Ka'tah state
  selectedKatah: string | null;
  onKatahChange: (katahId: string | null) => void;

  // Per-round confirmation state
  pendingConfirmations: Record<string, boolean>;
  onConfirmRoundSelection: (ruleId: string) => void;

  // Command points (for stratagem usage)
  commandPoints: number;
  onCommandPointsChange: (points: number) => void;

  // Stratagems state
  activeStratagems: string[];
  onToggleStratagem: (stratagemId: string) => void;

  // Stratagem usage tracking
  stratagemUsage: Record<string, number>;
  onIncrementStratagemUsage: (stratagemId: string) => void;

  // Twists state (Chapter Approved)
  activeTwists: string[];
  onToggleTwist: (twistId: string) => void;
  availableTwists: MissionTwist[];

  // Detachment rule choices
  activeRuleChoices: Record<string, string>;
  onSetRuleChoice: (ruleId: string, choiceId: string | null) => void;

  // Army data for dynamic content
  armyData: ArmyData | null;
  detachmentId: string;

  // Current game phase for highlighting relevant stratagems
  currentPhase?: string;

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

/**
 * Get the maximum uses for a stratagem based on its usageLimit property.
 */
function getMaxUses(stratagem: Stratagem): number {
  switch (stratagem.usageLimit) {
    case 'once_per_battle':
      return 1;
    case 'twice_per_battle':
      return 2;
    case 'once_per_phase':
      return Infinity; // Can use each phase
    case 'unlimited':
    default:
      return Infinity;
  }
}

/**
 * Determine the opacity class for a stratagem based on its usage.
 */
function getStratagemOpacity(stratagem: Stratagem, usageCount: number): string {
  const maxUses = getMaxUses(stratagem);

  if (maxUses === Infinity) {
    return ''; // No opacity change for unlimited stratagems
  }

  if (usageCount >= maxUses) {
    return 'opacity-25'; // Fully exhausted
  }

  if (usageCount > 0 && usageCount < maxUses) {
    return 'opacity-50'; // Partially used
  }

  return ''; // Not yet used
}

/**
 * Check if a stratagem can still be used this battle.
 */
function canUseStratagem(stratagem: Stratagem, usageCount: number): boolean {
  const maxUses = getMaxUses(stratagem);
  return usageCount < maxUses;
}

/**
 * Check if a stratagem matches the current game phase.
 * Returns true if the stratagem can be used in the current phase or is usable in "any" phase.
 */
function stratagemMatchesPhase(stratagem: Stratagem, currentPhase: string | undefined): boolean {
  if (!currentPhase) return true; // If no phase specified, show all

  const stratagemPhase = stratagem.phase.toLowerCase();
  const gamePhase = currentPhase.toLowerCase();

  // "Any phase" or "Any" stratagems are always relevant
  if (stratagemPhase.includes('any')) return true;

  // Check if the stratagem phase contains the current game phase
  // e.g., "Command phase" matches "command", "Shooting Phase" matches "shooting"
  return stratagemPhase.includes(gamePhase);
}

/**
 * Get the sort order for a stratagem based on its phase.
 * Follows the game flow: Any -> Command -> Movement -> Shooting -> Charge -> Fight
 */
function getPhaseOrder(stratagem: Stratagem): number {
  const phase = stratagem.phase.toLowerCase();

  if (phase.includes('any')) return 0;
  if (phase.includes('command')) return 1;
  if (phase.includes('movement')) return 2;
  if (phase.includes('shooting')) return 3;
  if (phase.includes('charge')) return 4;
  if (phase.includes('fight')) return 5;

  // Unknown phases go last
  return 99;
}

/**
 * Sort stratagems by phase order (game flow order).
 */
function sortStratagemsByPhase(stratagems: Stratagem[]): Stratagem[] {
  return [...stratagems].sort((a, b) => getPhaseOrder(a) - getPhaseOrder(b));
}

// ============================================================================
// Main Component
// ============================================================================

export function GameStatePanel({
  selectedKatah,
  onKatahChange,
  pendingConfirmations,
  onConfirmRoundSelection,
  commandPoints,
  onCommandPointsChange,
  activeStratagems,
  onToggleStratagem,
  stratagemUsage,
  onIncrementStratagemUsage,
  activeTwists,
  onToggleTwist,
  availableTwists,
  activeRuleChoices,
  onSetRuleChoice,
  armyData,
  detachmentId,
  currentPhase,
  className = '',
}: GameStatePanelProps) {
  const katahStances = getKatahStances(armyData);
  const detachment = getDetachment(armyData, detachmentId);
  const stratagems = sortStratagemsByPhase(getStratagems(detachment));

  // Collapse state: Detachment Rules and Stratagems default expanded, Twists default collapsed
  const [detachmentRulesOpen, setDetachmentRulesOpen] = useState(true);
  const [stratagemsSectionOpen, setStratagemsSectionOpen] = useState(true);
  const [twistsSectionOpen, setTwistsSectionOpen] = useState(false);

  // Selected stratagem for detail modal
  const [selectedStratagem, setSelectedStratagem] = useState<Stratagem | null>(null);

  // Handle using a stratagem (deduct CP, activate, and track usage)
  const handleUseStratagem = (strat: Stratagem) => {
    const usageCount = (stratagemUsage ?? {})[strat.id] || 0;

    if (commandPoints < strat.cost) {
      return; // Button should be disabled, but safety check
    }

    if (!canUseStratagem(strat, usageCount)) {
      return; // Already used max times this battle
    }

    onCommandPointsChange(commandPoints - strat.cost);
    onIncrementStratagemUsage(strat.id);

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
      <h2 className="section-header-inline mb-4 shrink-0">Army Rules</h2>

      <div className="space-y-4 flex-1 overflow-y-auto scroll-smooth">
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

        {/* Detachment Rules - Collapsible, default expanded */}
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
              <div className="px-4 pb-4 space-y-3">
                {detachment.rules.map((rule) => {
                  const isPending = rule.resetsEachRound && (pendingConfirmations[rule.id] ?? false);
                  const currentChoice = activeRuleChoices[rule.id];
                  const currentChoiceName = rule.choices?.find(c => c.id === currentChoice)?.name;

                  return (
                    <div
                      key={rule.id}
                      className={`text-sm rounded-lg transition-all ${isPending ? 'ring-2 ring-amber-500/50 p-3 -mx-1 bg-amber-500/5' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-accent-300">{rule.name}</div>
                        {isPending && (
                          <span className="text-xs text-amber-400 font-medium animate-pulse">
                            New Round
                          </span>
                        )}
                      </div>
                      <div className="text-white/70 text-xs mb-2">{rule.description}</div>
                      {/* Show choices for selection-type rules */}
                      {rule.type === 'selection' && rule.choices && rule.choices.length > 0 && (
                        <>
                          <div className="flex justify-center">
                            <div className="segmented-control">
                              <div
                                onClick={() => onSetRuleChoice(rule.id, null)}
                                className={`segmented-control-item ${!currentChoice ? 'active' : ''}`}
                              >
                                None
                              </div>
                              {rule.choices.map((choice) => (
                                <div
                                  key={choice.id}
                                  onClick={() => onSetRuleChoice(rule.id, choice.id)}
                                  className={`segmented-control-item ${currentChoice === choice.id ? 'active' : ''}`}
                                  title={choice.effect}
                                >
                                  {choice.name}
                                </div>
                              ))}
                            </div>
                          </div>
                          {isPending && currentChoice && (
                            <button
                              onClick={() => onConfirmRoundSelection(rule.id)}
                              className="w-full mt-3 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                            >
                              Confirm {currentChoiceName}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
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
                stratagems.map((strat) => {
                  const usageCount = (stratagemUsage ?? {})[strat.id] || 0;
                  const usageOpacityClass = getStratagemOpacity(strat, usageCount);
                  const maxUses = getMaxUses(strat);
                  const isExhausted = !canUseStratagem(strat, usageCount);
                  const matchesPhase = stratagemMatchesPhase(strat, currentPhase);
                  // Lowlight non-matching phase stratagems (unless exhausted which already has opacity)
                  const phaseOpacityClass = !matchesPhase && !usageOpacityClass ? 'opacity-40' : '';

                  return (
                    <div
                      key={strat.id}
                      className={`
                        inset-group-item cursor-pointer transition-colors touch-highlight
                        ${activeStratagems.includes(strat.id) ? 'bg-accent-tint-strong' : 'hover:bg-white/5'}
                        ${usageOpacityClass || phaseOpacityClass}
                      `}
                      onClick={() => setSelectedStratagem(strat)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{strat.name}</div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {strat.phase}
                          {maxUses !== Infinity && (
                            <span className="ml-2">
                              ({usageCount}/{maxUses} used)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExhausted && (
                          <span className="text-xs text-red-400 font-medium">Exhausted</span>
                        )}
                        {activeStratagems.includes(strat.id) && !isExhausted && (
                          <span className="text-xs text-accent-400 font-medium">Active</span>
                        )}
                        <span className="badge badge-accent">{strat.cost} CP</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Mission Twists (Chapter Approved) - Collapsible, default collapsed */}
        {availableTwists.length > 0 && (
          <div className="card-depth overflow-hidden">
            <button
              onClick={() => setTwistsSectionOpen(!twistsSectionOpen)}
              className="section-header w-full flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span>Mission Twists</span>
              <div className="flex items-center gap-2">
                <span className="badge">{availableTwists.length}</span>
                <svg
                  className={`w-3 h-3 text-white/40 transition-transform duration-200 ${twistsSectionOpen ? '' : '-rotate-90'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${twistsSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
        {selectedStratagem && (() => {
          const modalUsageCount = (stratagemUsage ?? {})[selectedStratagem.id] || 0;
          const modalMaxUses = getMaxUses(selectedStratagem);
          const modalIsExhausted = !canUseStratagem(selectedStratagem, modalUsageCount);
          const notEnoughCP = commandPoints < selectedStratagem.cost;
          const cannotUse = notEnoughCP || modalIsExhausted;

          return (
            <div className="space-y-4">
              {/* Phase, Cost, and Usage */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge">{selectedStratagem.phase}</span>
                <span className="badge badge-accent">{selectedStratagem.cost} CP</span>
                {activeStratagems.includes(selectedStratagem.id) && (
                  <span className="badge bg-green-600/20 text-green-400">Active</span>
                )}
                {modalMaxUses !== Infinity && (
                  <span className={`badge ${modalIsExhausted ? 'bg-red-600/20 text-red-400' : 'bg-gray-600/20 text-gray-400'}`}>
                    {modalUsageCount}/{modalMaxUses} used
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-white/70 leading-relaxed">
                {selectedStratagem.description}
              </p>

              {/* Exhausted Warning */}
              {modalIsExhausted && !activeStratagems.includes(selectedStratagem.id) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-sm text-red-400">
                    Stratagem exhausted for this battle
                  </span>
                </div>
              )}

              {/* Insufficient CP Warning */}
              {notEnoughCP && !modalIsExhausted && !activeStratagems.includes(selectedStratagem.id) && (
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
                    disabled={cannotUse}
                    className="btn-ios btn-ios-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use Stratagem
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
