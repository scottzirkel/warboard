'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import { GAME_FORMATS } from '@/types';
import type { GameFormat } from '@/types';

interface SetupModalProps {
  isOpen: boolean;
  onConfirm: (format: GameFormat, pointsLimit: number, detachment: string) => void;
  detachments: { id: string; name: string }[];
  defaultDetachment: string;
}

export function SetupModal({
  isOpen,
  onConfirm,
  detachments,
  defaultDetachment,
}: SetupModalProps) {
  const [format, setFormat] = useState<GameFormat>('strike-force');
  const [customPoints, setCustomPoints] = useState('2000');
  const [detachment, setDetachment] = useState(defaultDetachment);

  const handleFormatChange = (newFormat: GameFormat) => {
    setFormat(newFormat);
    // Initialize custom points input to the format's default
    const formatConfig = GAME_FORMATS.find(f => f.id === newFormat);
    if (formatConfig?.points) {
      setCustomPoints(String(formatConfig.points));
    }
  };

  // Use defaultDetachment if local state doesn't match any available detachment
  const effectiveDetachment = detachments.some(d => d.id === detachment)
    ? detachment
    : defaultDetachment;

  // Resolve the points limit based on the selected format
  const formatConfig = GAME_FORMATS.find(f => f.id === format);
  const pointsLimit = formatConfig?.points ?? (parseInt(customPoints, 10) || 2000);

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
          <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">Game Format</label>
          <div className="space-y-2">
            {GAME_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => handleFormatChange(f.id)}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left transition-all flex justify-between items-center ${
                  format === f.id
                    ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                }`}
              >
                <span>{f.name}</span>
                {f.points !== null && (
                  <span className="text-white/40 text-xs">{f.points} pts</span>
                )}
              </button>
            ))}
          </div>

          {/* Custom points input */}
          {format === 'custom' && (
            <div className="mt-3">
              <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">Points Limit</label>
              <input
                type="number"
                min="1"
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                className="w-full p-3 rounded-xl text-sm font-medium bg-white/5 text-white border border-white/10 focus:border-accent-500/50 focus:outline-none"
                placeholder="Enter points limit"
              />
            </div>
          )}
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
