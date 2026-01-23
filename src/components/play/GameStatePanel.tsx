'use client';

import { Panel } from '@/components/ui';
import { BattleRoundControl } from './BattleRoundControl';
import { CommandPointsControl } from './CommandPointsControl';
import { MartialKatahSelector } from './MartialKatahSelector';
import { StrategemsToggleList } from './StrategemsToggleList';
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

/**
 * Get the Ka'tah stances from army rules (Custodes-specific)
 */
function getKatahStances(armyData: ArmyData | null): KatahStance[] {
  if (!armyData?.armyRules?.martial_katah?.stances) {
    return [];
  }

  return armyData.armyRules.martial_katah.stances;
}

/**
 * Get the Ka'tah rule name from army rules
 */
function getKatahRuleName(armyData: ArmyData | null): string {
  if (!armyData?.armyRules?.martial_katah?.name) {
    return 'Army Rule';
  }

  return armyData.armyRules.martial_katah.name;
}

/**
 * Get the current detachment from army data
 */
function getDetachment(armyData: ArmyData | null, detachmentId: string): Detachment | null {
  if (!armyData?.detachments) {
    return null;
  }

  return armyData.detachments[detachmentId] ?? null;
}

/**
 * Get stratagems from the current detachment
 */
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
  const katahRuleName = getKatahRuleName(armyData);
  const detachment = getDetachment(armyData, detachmentId);
  const stratagems = getStratagems(detachment);

  return (
    <Panel
      title="Game State"
      headerRight={
        <span className="text-sm text-gray-400">
          {detachment?.name ?? 'No Detachment'}
        </span>
      }
      className={className}
    >
      <div className="p-3 space-y-4">
        {/* Battle Round Control */}
        <BattleRoundControl
          round={battleRound}
          onRoundChange={onBattleRoundChange}
        />

        {/* Command Points Control */}
        <CommandPointsControl
          points={commandPoints}
          onPointsChange={onCommandPointsChange}
        />

        {/* Martial Ka'tah Selector (only shows if stances available) */}
        {katahStances.length > 0 && (
          <MartialKatahSelector
            selectedKatah={selectedKatah}
            onKatahChange={onKatahChange}
            stances={katahStances}
            ruleName={katahRuleName}
          />
        )}

        {/* Stratagems Toggle List */}
        <StrategemsToggleList
          stratagems={stratagems}
          activeStratagems={activeStratagems}
          commandPoints={commandPoints}
          onToggleStratagem={onToggleStratagem}
        />
      </div>
    </Panel>
  );
}
