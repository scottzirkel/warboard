'use client';

import type { ChallengerCard as ChallengerCardType } from '@/types';
import { CardShell, MissionHeader, ScoringTable, ActionBox, CpDiamond, OrDivider } from './MissionCardParts';

interface ChallengerCardProps {
  card: ChallengerCardType;
  className?: string;
}

export function ChallengerCard({ card, className = '' }: ChallengerCardProps) {
  return (
    <CardShell className={className}>
      {/* Card title */}
      <div className="bg-[#0a506f] px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-white/60">Challenger Card</div>
        <div className="text-sm font-bold uppercase tracking-wide text-white">{card.name}</div>
      </div>

      {/* Stratagem section */}
      <div className="border-b border-white/10">
        <MissionHeader left="Challenger Stratagem" variant="blue" />
        <div className="flex items-start gap-3 px-3 py-2">
          <CpDiamond cost={card.stratagem.cost} />
          <div className="flex-1">
            <div className="mb-1 text-xs font-bold text-white">{card.stratagem.name}</div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">{card.stratagem.phase}</div>
            <div className="text-[11px] text-white/60">
              <span className="font-semibold text-white/50">When:</span> {card.stratagem.when}
            </div>
            <div className="mt-1 text-[11px] text-white/70">{card.stratagem.effect}</div>
          </div>
        </div>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a506f]/30">
        <div className="h-px flex-1 bg-[#0a506f]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5bb8d4]">
          Challenger Stratagem OR Challenger Mission
        </span>
        <div className="h-px flex-1 bg-[#0a506f]" />
      </div>

      {/* Mission section */}
      <div>
        <MissionHeader left="Challenger Mission" variant="maroon" />

        {card.mission.action && <ActionBox action={card.mission.action} />}

        {card.mission.scoringBlocks?.map((block, i) => (
          <div key={i}>
            {i > 0 && <OrDivider />}
            <ScoringTable block={block} />
          </div>
        ))}
      </div>

      <div className="h-2" />
    </CardShell>
  );
}
