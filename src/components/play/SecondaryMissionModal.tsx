'use client';

import { Modal } from '@/components/ui';
import type { SecondaryMission } from '@/types';

interface SecondaryMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  secondaryMissions: SecondaryMission[];
  selectedSecondaryMissionIds: string[];
  discardedSecondaryMissionIds: string[];
  onSecondaryMissionToggle: (id: string) => void;
  onRandomize: () => void;
}

const itemStyles = `
  py-3 px-4 min-h-[44px] flex items-center
  border-b border-[rgba(84,84,88,0.65)] last:border-b-0
  cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent]
`;

const checkmark = (
  <svg className="w-5 h-5 text-accent-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export function SecondaryMissionModal({
  isOpen,
  onClose,
  secondaryMissions,
  selectedSecondaryMissionIds,
  discardedSecondaryMissionIds,
  onSecondaryMissionToggle,
  onRandomize,
}: SecondaryMissionModalProps) {
  const canConfirm = selectedSecondaryMissionIds.length === 2;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Secondary Missions" size="md">
      <div className="space-y-4">
        <p className="text-xs text-cm-text-secondary">
          Choose 2 secondary missions for this battle round. Discarded missions cannot be re-selected.
        </p>

        <div className="flex items-center justify-between">
          <div className="text-xs text-cm-text-secondary uppercase tracking-wide">
            Secondary Missions ({selectedSecondaryMissionIds.length}/2)
          </div>
          <button
            type="button"
            onClick={onRandomize}
            className="text-xs text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
              <circle cx="13" cy="7" r="1" fill="currentColor" stroke="none" />
              <circle cx="7" cy="13" r="1" fill="currentColor" stroke="none" />
              <circle cx="13" cy="13" r="1" fill="currentColor" stroke="none" />
              <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
            </svg>
            Randomize
          </button>
        </div>

        <div className="rounded-xl overflow-hidden bg-cm-surface-hover-subtle max-h-[50vh] overflow-y-auto">
          {secondaryMissions.map((mission) => {
            const isSelected = selectedSecondaryMissionIds.includes(mission.id);
            const isDiscarded = discardedSecondaryMissionIds.includes(mission.id);
            const atMax = selectedSecondaryMissionIds.length >= 2 && !isSelected;
            const disabled = isDiscarded || atMax;

            return (
              <div
                key={mission.id}
                className={`${itemStyles} ${
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]'
                    : disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-cm-surface-hover-subtle'
                }`}
                onClick={() => !disabled && onSecondaryMissionToggle(mission.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{mission.name}</span>
                    {isDiscarded && (
                      <span className="text-[10px] text-red-400/70 uppercase tracking-wide">Discarded</span>
                    )}
                  </div>
                  <div className="text-xs text-cm-text-secondary mt-0.5 line-clamp-1">{mission.flavor}</div>
                </div>
                {isSelected && checkmark}
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          disabled={!canConfirm}
          className={`btn-ios btn-ios-primary w-full py-3 text-base font-semibold ${!canConfirm ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Confirm Secondaries
        </button>
      </div>
    </Modal>
  );
}
