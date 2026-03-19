'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { parseVP, parseMaxVP } from '@/lib/vpParser';
import type { PrimaryMission, SecondaryMission, ScoringBlock } from '@/types';

interface MissionScoringPanelProps {
  primaryMission: PrimaryMission | null;
  secondaryMissions: SecondaryMission[];
  scoredConditions: Record<number, Record<string, number>>;
  currentRound: number;
  currentPhase: string;
  onScoreCondition: (missionId: string, blockIdx: number, condIdx: number, vp: number, type: 'primary' | 'secondary') => void;
  onUnscoreCondition: (key: string, round: number, type: 'primary' | 'secondary') => void;
  onDiscardSecondary: (id: string) => void;
  onChangeSecondaries: () => void;
}

function roundMatches(blockRound: string, currentRound: number): boolean {
  const r = blockRound.toUpperCase();
  if (r.includes('ANY')) return true;
  if (r.includes('FIRST') && currentRound >= 1) return true;
  if (r.includes('SECOND') && currentRound >= 2) return true;
  if (r.includes('THIRD') && currentRound >= 3) return true;
  if (r.includes('FOURTH') && currentRound >= 4) return true;
  if (r.includes('FIFTH') && currentRound >= 5) return true;
  // Try to extract a number
  const numMatch = r.match(/(\d+)/);
  if (numMatch) {
    const roundNum = parseInt(numMatch[1], 10);
    if (r.includes('ONWARDS') || r.includes('+')) return currentRound >= roundNum;
    return currentRound === roundNum;
  }
  return true;
}

function getRoundLabel(blockRound: string): string {
  const r = blockRound.toUpperCase();
  if (r.includes('ANY')) return 'Any Round';
  if (r.includes('FIRST')) return 'Round 1+';
  if (r.includes('SECOND')) return 'Round 2+';
  if (r.includes('THIRD')) return 'Round 3+';
  if (r.includes('FOURTH')) return 'Round 4+';
  if (r.includes('FIFTH')) return 'Round 5';
  return blockRound;
}

/** Get the total VP scored for a cumulative condition across all rounds */
function getCumulativeTotal(
  missionId: string,
  blockIdx: number,
  condIdx: number,
  scoredConditions: Record<number, Record<string, number>>,
): number {
  let total = 0;
  const baseKey = `${missionId}:${blockIdx}:${condIdx}`;
  for (const roundConds of Object.values(scoredConditions)) {
    for (const [key, vp] of Object.entries(roundConds)) {
      if (key === baseKey || key.startsWith(`${baseKey}:`)) {
        total += vp;
      }
    }
  }
  return total;
}

/** Check if a non-cumulative condition is scored in the current round */
function isScoredThisRound(
  missionId: string,
  blockIdx: number,
  condIdx: number,
  round: number,
  scoredConditions: Record<number, Record<string, number>>,
): boolean {
  const key = `${missionId}:${blockIdx}:${condIdx}`;
  return scoredConditions[round]?.[key] !== undefined;
}

/** Check if a cumulative condition is scored in the current round */
function getCumulativeCountThisRound(
  missionId: string,
  blockIdx: number,
  condIdx: number,
  round: number,
  scoredConditions: Record<number, Record<string, number>>,
): number {
  let count = 0;
  const baseKey = `${missionId}:${blockIdx}:${condIdx}`;
  const roundConds = scoredConditions[round] || {};
  for (const key of Object.keys(roundConds)) {
    if (key === baseKey || key.startsWith(`${baseKey}:`)) {
      count++;
    }
  }
  return count;
}

const checkmarkIcon = (
  <svg className="w-4 h-4 text-accent-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

function MissionSection({
  mission,
  type,
  scoredConditions,
  currentRound,
  onScoreCondition,
  onUnscoreCondition,
  onDiscard,
}: {
  mission: PrimaryMission | SecondaryMission;
  type: 'primary' | 'secondary';
  scoredConditions: Record<number, Record<string, number>>;
  currentRound: number;
  onScoreCondition: (missionId: string, blockIdx: number, condIdx: number, vp: number, type: 'primary' | 'secondary') => void;
  onUnscoreCondition: (key: string, round: number, type: 'primary' | 'secondary') => void;
  onDiscard?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const blocks = mission.scoringBlocks || [];

  const handleConditionTap = (block: ScoringBlock, blockIdx: number, condIdx: number) => {
    const condition = block.conditions[condIdx];
    const vp = parseVP(condition.vp);
    const isCumulative = condition.cumulative === true;
    const maxVp = parseMaxVP(condition.maxVp);

    if (isCumulative) {
      const totalSoFar = getCumulativeTotal(mission.id, blockIdx, condIdx, scoredConditions);
      if (maxVp !== null && totalSoFar >= maxVp) return; // at max
      // Store auto-increments keys for cumulative conditions
      onScoreCondition(mission.id, blockIdx, condIdx, vp, type);
      return;
    }

    // Non-cumulative: check if already scored this round
    const key = `${mission.id}:${blockIdx}:${condIdx}`;
    if (isScoredThisRound(mission.id, blockIdx, condIdx, currentRound, scoredConditions)) {
      onUnscoreCondition(key, currentRound, type);
      return;
    }

    // Mutually exclusive: unscore other conditions in the same block for this round
    for (let ci = 0; ci < block.conditions.length; ci++) {
      if (ci !== condIdx) {
        const otherKey = `${mission.id}:${blockIdx}:${ci}`;
        if (scoredConditions[currentRound]?.[otherKey] !== undefined) {
          onUnscoreCondition(otherKey, currentRound, type);
        }
      }
    }

    onScoreCondition(mission.id, blockIdx, condIdx, vp, type);
  };

  return (
    <div>
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between py-2 px-3 text-sm font-semibold text-white/80 hover:bg-white/5 transition-colors cursor-pointer [-webkit-tap-highlight-color:transparent]"
        >
          <div className="flex items-center gap-2">
            <span>{mission.name}</span>
            <Badge variant={type === 'primary' ? 'accent' : 'default'}>
              {type === 'primary' ? 'Primary' : 'Secondary'}
            </Badge>
          </div>
          <svg
            className={`w-3 h-3 text-white/40 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {onDiscard && (
          <button
            onClick={onDiscard}
            className="px-2 py-2 mr-1 text-[10px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors [-webkit-tap-highlight-color:transparent]"
            title="Discard and gain 1 CP"
          >
            Discard (+1 CP)
          </button>
        )}
      </div>

      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {blocks.map((block, blockIdx) => {
          const eligible = roundMatches(block.round, currentRound);
          return (
            <div key={blockIdx} className={`px-3 pb-2 ${!eligible ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wide">
                  {getRoundLabel(block.round)}
                </span>
                <span className="text-[10px] text-white/30">{block.when}</span>
              </div>
              {block.conditions.map((cond, condIdx) => {
                const vp = parseVP(cond.vp);
                const isCumulative = cond.cumulative === true;
                const maxVp = parseMaxVP(cond.maxVp);
                const scored = !isCumulative && isScoredThisRound(mission.id, blockIdx, condIdx, currentRound, scoredConditions);
                const cumulativeTotal = isCumulative ? getCumulativeTotal(mission.id, blockIdx, condIdx, scoredConditions) : 0;
                const cumulativeThisRound = isCumulative ? getCumulativeCountThisRound(mission.id, blockIdx, condIdx, currentRound, scoredConditions) : 0;
                const atMax = isCumulative && maxVp !== null && cumulativeTotal >= maxVp;

                return (
                  <button
                    key={condIdx}
                    disabled={!eligible || (isCumulative && atMax)}
                    onClick={() => eligible && handleConditionTap(block, blockIdx, condIdx)}
                    className={`
                      w-full text-left py-2 px-3 rounded-lg mb-1 min-h-[44px] flex items-center gap-2
                      transition-colors [-webkit-tap-highlight-color:transparent] cursor-pointer
                      ${scored ? 'bg-[color-mix(in_srgb,var(--accent-500)_15%,transparent)]' : 'hover:bg-white/5'}
                      ${!eligible || (isCumulative && atMax) ? 'cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/70 leading-relaxed">{cond.condition}</div>
                      {isCumulative && (
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {cumulativeTotal}{maxVp !== null ? `/${maxVp}` : ''} VP scored
                          {cumulativeThisRound > 0 && ` (${cumulativeThisRound} this round)`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(scored || (isCumulative && cumulativeThisRound > 0)) && checkmarkIcon}
                      <span className={`text-xs font-medium ${scored || (isCumulative && cumulativeThisRound > 0) ? 'text-accent-400' : 'text-white/40'}`}>
                        {vp}VP
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MissionScoringPanel({
  primaryMission,
  secondaryMissions,
  scoredConditions,
  currentRound,
  currentPhase,
  onScoreCondition,
  onUnscoreCondition,
  onDiscardSecondary,
  onChangeSecondaries,
}: MissionScoringPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasMissions = primaryMission || secondaryMissions.length > 0;
  const canDiscard = currentPhase === 'command';

  if (!hasMissions) return null;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-[13px] font-semibold text-white/55 uppercase tracking-[0.5px] py-3 px-4 pt-3 pb-2 w-full flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
      >
        <span>Missions</span>
        <div className="flex items-center gap-2">
          <Badge>{(primaryMission ? 1 : 0) + secondaryMissions.length}</Badge>
          <svg
            className={`w-3 h-3 text-white/40 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {primaryMission && (
          <MissionSection
            mission={primaryMission}
            type="primary"
            scoredConditions={scoredConditions}
            currentRound={currentRound}
            onScoreCondition={onScoreCondition}
            onUnscoreCondition={onUnscoreCondition}
          />
        )}
        {secondaryMissions.map((mission) => (
          <MissionSection
            key={mission.id}
            mission={mission}
            type="secondary"
            scoredConditions={scoredConditions}
            currentRound={currentRound}
            onScoreCondition={onScoreCondition}
            onUnscoreCondition={onUnscoreCondition}
            onDiscard={canDiscard ? () => onDiscardSecondary(mission.id) : undefined}
          />
        ))}
        {secondaryMissions.length < 2 && (
          <button
            onClick={onChangeSecondaries}
            className="w-full py-2.5 px-3 text-xs font-medium text-accent-400 hover:bg-white/5 transition-colors [-webkit-tap-highlight-color:transparent]"
          >
            Select Secondary Missions
          </button>
        )}
      </div>
    </Card>
  );
}
