'use client';

import { useState } from 'react';
import type { SecondaryMission } from '@/types';
import { CardShell, ScoringTable, ActionBox } from './MissionCardParts';

interface SecondaryMissionCardProps {
  mission: SecondaryMission;
  className?: string;
}

export function SecondaryMissionCard({ mission, className = '' }: SecondaryMissionCardProps) {
  const [showFlavor, setShowFlavor] = useState(false);

  const hasSplitVp = mission.scoringBlocks.some(block =>
    block.conditions.some(c => c.fixedVp || c.tacticalVp)
  );

  return (
    <CardShell className={className}>
      {/* Card title */}
      <div className="bg-[#3e0602] px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-white/60">Secondary Mission</div>
        <div className="text-sm font-bold uppercase tracking-wide text-white">{mission.name}</div>
      </div>

      {/* Restrictions badge */}
      {(mission.fixedOnly || mission.tacticalOnly || mission.noFixedTournament) && (
        <div className="flex gap-1.5 px-3 py-1.5">
          {mission.fixedOnly && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">Fixed Only</span>
          )}
          {mission.tacticalOnly && (
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">Tactical Only</span>
          )}
          {mission.noFixedTournament && (
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">No Fixed (Tournament)</span>
          )}
        </div>
      )}

      {/* Flavor text (collapsible) */}
      {mission.flavor && (
        <button
          onClick={() => setShowFlavor(!showFlavor)}
          className="w-full px-3 py-1 text-left text-[10px] text-white/30 hover:text-white/50 transition-colors"
        >
          {showFlavor ? mission.flavor : '▸ Flavor text...'}
        </button>
      )}

      {/* When drawn note */}
      {mission.whenDrawn && (
        <div className="mx-3 mb-1 rounded bg-white/5 px-2 py-1 text-[10px] text-white/50">
          <span className="font-semibold text-white/60">When Drawn:</span> {mission.whenDrawn}
        </div>
      )}

      {/* Action box */}
      {mission.action && <ActionBox action={mission.action} />}

      {/* Scoring blocks */}
      {mission.scoringBlocks.map((block, i) => (
        <div key={i}>
          {i > 0 && <div className="h-px bg-white/5" />}
          <ScoringTable block={block} showSplitVp={hasSplitVp} />
        </div>
      ))}

      {/* Bottom padding */}
      <div className="h-2" />
    </CardShell>
  );
}
