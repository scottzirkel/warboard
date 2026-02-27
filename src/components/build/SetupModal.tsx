'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import type { GameFormat } from '@/types';

interface SetupModalProps {
  isOpen: boolean;
  onConfirm: (format: GameFormat, pointsLimit: number, detachment: string) => void;
  detachments: { id: string; name: string }[];
  defaultDetachment: string;
}

const gameFormats: { id: GameFormat; name: string; pointsOptions: number[] }[] = [
  { id: 'standard', name: 'Standard', pointsOptions: [500, 1000, 2000] },
  { id: 'colosseum', name: 'Colosseum', pointsOptions: [500] },
];

export function SetupModal({
  isOpen,
  onConfirm,
  detachments,
  defaultDetachment,
}: SetupModalProps) {
  const [format, setFormat] = useState<GameFormat>('standard');
  const [pointsLimit, setPointsLimit] = useState(500);
  const [detachment, setDetachment] = useState(defaultDetachment);

  const handleFormatChange = (newFormat: GameFormat) => {
    setFormat(newFormat);
    // Reset points if current selection isn't valid for new format
    const formatConfig = gameFormats.find(f => f.id === newFormat);
    if (formatConfig && !formatConfig.pointsOptions.includes(pointsLimit)) {
      setPointsLimit(formatConfig.pointsOptions[0]);
    }
  };

  // Use defaultDetachment if local state doesn't match any available detachment
  const effectiveDetachment = detachments.some(d => d.id === detachment)
    ? detachment
    : defaultDetachment;

  const currentFormatConfig = gameFormats.find(f => f.id === format)!;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Game Setup"
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <div className="space-y-5">
        {/* Format */}
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">Game Type</label>
          <div className="grid grid-cols-2 gap-2">
            {gameFormats.map(f => (
              <button
                key={f.id}
                onClick={() => handleFormatChange(f.id)}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  format === f.id
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Points Limit */}
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">Points</label>
          <div className="grid grid-cols-3 gap-2">
            {currentFormatConfig.pointsOptions.map(pts => (
              <button
                key={pts}
                onClick={() => setPointsLimit(pts)}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  pointsLimit === pts
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                }`}
              >
                {pts} pts
              </button>
            ))}
          </div>
        </div>

        {/* Detachment */}
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">Detachment</label>
          <div className="space-y-2">
            {detachments.map(d => (
              <button
                key={d.id}
                onClick={() => setDetachment(d.id)}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left transition-all ${
                  effectiveDetachment === d.id
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm */}
        <button
          onClick={() => onConfirm(format, pointsLimit, effectiveDetachment)}
          disabled={!effectiveDetachment}
          className="btn-ios btn-ios-primary w-full py-3 text-base font-semibold"
        >
          Start Building
        </button>
      </div>
    </Modal>
  );
}
