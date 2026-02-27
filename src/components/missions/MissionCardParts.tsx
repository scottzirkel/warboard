'use client';

import { ReactNode } from 'react';
import type { ScoringBlock, MissionAction } from '@/types';

// ============================================================================
// Shared building blocks for mission card rendering
// ============================================================================

interface MissionHeaderProps {
  left: string;
  right?: string;
  variant?: 'maroon' | 'blue';
}

export function MissionHeader({ left, right, variant = 'maroon' }: MissionHeaderProps) {
  const bg = variant === 'maroon' ? 'bg-[#3e0602]' : 'bg-[#0a506f]';

  return (
    <div className={`${bg} flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/90`}>
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

interface VpBadgeProps {
  vp: string;
  label?: string;
  className?: string;
}

export function VpBadge({ vp, label, className = '' }: VpBadgeProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span className="text-sm font-bold text-white">{vp}</span>
      {label && <span className="text-[9px] uppercase tracking-wide text-white/50">{label}</span>}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <div className="h-px flex-1 bg-[#752b2b]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#c4756e]">OR</span>
      <div className="h-px flex-1 bg-[#752b2b]" />
    </div>
  );
}

interface ConditionRowProps {
  condition: string;
  vp: string;
  fixedVp?: string;
  tacticalVp?: string;
  cumulative?: boolean;
  maxVp?: string;
  showSplitVp?: boolean;
}

function ConditionRow({ condition, vp, fixedVp, tacticalVp, cumulative, maxVp, showSplitVp }: ConditionRowProps) {
  const hasSplitVp = showSplitVp && (fixedVp || tacticalVp);

  return (
    <div className="flex items-start gap-3 px-3 py-1.5 text-xs">
      <div className="flex-1 text-white/80">
        {condition}
        {cumulative && <span className="ml-1 text-white/50">(cumulative)</span>}
        {maxVp && <span className="ml-1 text-white/50">(up to {maxVp})</span>}
      </div>

      {hasSplitVp ? (
        <div className="flex gap-2 shrink-0">
          <VpBadge vp={fixedVp || vp} label="Fixed" />
          <VpBadge vp={tacticalVp || vp} label="Tactical" />
        </div>
      ) : (
        <span className="shrink-0 font-bold text-white">{vp}</span>
      )}
    </div>
  );
}

interface ScoringTableProps {
  block: ScoringBlock;
  showSplitVp?: boolean;
}

export function ScoringTable({ block, showSplitVp }: ScoringTableProps) {
  return (
    <div>
      <MissionHeader left={block.round} right="Victory Points" />
      <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-white/50">
        {block.when}
      </div>

      {block.conditions.map((cond, i) => (
        <div key={i}>
          {i > 0 && <OrDivider />}
          <ConditionRow
            condition={cond.condition}
            vp={cond.vp}
            fixedVp={cond.fixedVp}
            tacticalVp={cond.tacticalVp}
            cumulative={cond.cumulative}
            maxVp={cond.maxVp}
            showSplitVp={showSplitVp}
          />
        </div>
      ))}
    </div>
  );
}

interface ActionBoxProps {
  action: MissionAction;
}

export function ActionBox({ action }: ActionBoxProps) {
  return (
    <div className="mx-3 my-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <svg className="h-4 w-4 text-yellow-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">{action.name}</span>
      </div>

      <div className="space-y-1 text-[11px] text-white/70">
        <div><span className="font-semibold text-white/50">Starts:</span> {action.starts}</div>
        <div><span className="font-semibold text-white/50">Units:</span> {action.units}</div>
        <div><span className="font-semibold text-white/50">Completes:</span> {action.completes}</div>
        <div><span className="font-semibold text-white/50">If completed:</span> {action.ifCompleted}</div>
      </div>
    </div>
  );
}

interface CpDiamondProps {
  cost: number;
}

export function CpDiamond({ cost }: CpDiamondProps) {
  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      <div className="absolute inset-0 rotate-45 rounded-sm bg-[#0a506f] border border-white/20" />
      <span className="relative text-xs font-bold text-white">{cost}</span>
    </div>
  );
}

interface CardShellProps {
  children: ReactNode;
  className?: string;
}

export function CardShell({ children, className = '' }: CardShellProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1e] ${className}`}>
      {children}
    </div>
  );
}
