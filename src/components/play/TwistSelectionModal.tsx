'use client';

import { Modal, Badge } from '@/components/ui';
import type { MissionTwist } from '@/types';

interface TwistSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  twists: MissionTwist[];
  activeTwistId: string | null;
  onSelect: (twistId: string | null) => void;
}

const itemStyles = `
  py-3 px-4 min-h-[44px] flex items-center
  border-b border-[rgba(84,84,88,0.65)] last:border-b-0
  cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent]
`;

export function TwistSelectionModal({
  isOpen,
  onClose,
  twists,
  activeTwistId,
  onSelect,
}: TwistSelectionModalProps) {
  const handleSelect = (twistId: string | null) => {
    onSelect(twistId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mission Twist" size="md">
      <div className="text-xs text-white/50 mb-3">
        Optional twist from Chapter Approved. Select one or skip.
      </div>
      <div className="rounded-xl overflow-hidden bg-white/[0.04] max-h-[60vh] overflow-y-auto">
        {/* No Twist option */}
        <div
          className={`${itemStyles} ${activeTwistId === null ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-white/5'}`}
          onClick={() => handleSelect(null)}
        >
          <div className="flex-1">
            <div className="font-medium text-sm text-white/70">No Twist</div>
          </div>
          {activeTwistId === null && (
            <svg className="w-5 h-5 text-accent-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Twist options */}
        {twists.map((twist) => {
          const isActive = activeTwistId === twist.id;

          return (
            <div
              key={twist.id}
              className={`${itemStyles} ${isActive ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-white/5'}`}
              onClick={() => handleSelect(twist.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{twist.name}</span>
                  <Badge>{twist.affects}</Badge>
                  {twist.modifiers && twist.modifiers.length > 0 && (
                    <Badge variant="accent">Modifier</Badge>
                  )}
                </div>
                <div className="text-xs text-white/50 mt-1 line-clamp-2">{twist.description}</div>
              </div>
              {isActive && (
                <svg className="w-5 h-5 text-accent-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
