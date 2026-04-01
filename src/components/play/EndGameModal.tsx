'use client';

import { useState } from 'react';
import { Modal, SegmentedControl, Input, Button } from '@/components/ui';
import type { GameResultOutcome } from '@/types';

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryVP: number;
  secondaryVP: number;
  primaryMissionName: string;
  onConfirm: (opponentFaction: string, result: GameResultOutcome) => void;
}

function EndGameModalContent({
  onClose,
  primaryVP,
  secondaryVP,
  primaryMissionName,
  onConfirm,
}: Omit<EndGameModalProps, 'isOpen'>) {
  const [opponentFaction, setOpponentFaction] = useState('');
  const [result, setResult] = useState<GameResultOutcome>('win');

  const totalVP = primaryVP + secondaryVP;
  const canSave = opponentFaction.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* VP Summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-cm-surface-hover-subtle rounded-lg p-3">
          <div className="text-xs text-cm-text-muted uppercase">Primary</div>
          <div className="text-xl font-bold mt-1">{primaryVP}</div>
        </div>
        <div className="bg-cm-surface-hover-subtle rounded-lg p-3">
          <div className="text-xs text-cm-text-muted uppercase">Secondary</div>
          <div className="text-xl font-bold mt-1">{secondaryVP}</div>
        </div>
        <div className="bg-accent-500/20 rounded-lg p-3">
          <div className="text-xs text-accent-400 uppercase">Total</div>
          <div className="text-xl font-bold text-accent-400 mt-1">{totalVP}</div>
        </div>
      </div>

      {primaryMissionName && (
        <div className="text-xs text-cm-text-muted text-center">
          Mission: {primaryMissionName}
        </div>
      )}

      {/* Opponent Faction */}
      <Input
        label="Opponent Faction"
        placeholder="e.g. Space Marines, Tyranids..."
        value={opponentFaction}
        onChange={(e) => setOpponentFaction(e.target.value)}
        autoFocus
      />

      {/* Result */}
      <div>
        <label className="text-xs text-cm-text-secondary uppercase tracking-wide block mb-2">
          Result
        </label>
        <SegmentedControl
          options={[
            { value: 'win', label: 'Win' },
            { value: 'loss', label: 'Loss' },
            { value: 'draw', label: 'Draw' },
          ]}
          value={result}
          onChange={(val) => setResult(val as GameResultOutcome)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm(opponentFaction.trim(), result)}
          disabled={!canSave}
        >
          Save &amp; End
        </Button>
      </div>
    </div>
  );
}

export function EndGameModal({
  isOpen,
  onClose,
  ...contentProps
}: EndGameModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="End Game" size="sm">
      {/* Key forces remount on open, resetting state */}
      {isOpen && (
        <EndGameModalContent
          onClose={onClose}
          {...contentProps}
        />
      )}
    </Modal>
  );
}
