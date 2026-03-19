'use client';

import { Modal, SegmentedControl } from '@/components/ui';
import type { MissionTwist, PrimaryMission } from '@/types';

interface GameStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Game setup
  goingFirst: boolean;
  onGoingFirstChange: (goingFirst: boolean) => void;
  isAttacker: boolean;
  onIsAttackerChange: (isAttacker: boolean) => void;
  // Twist
  twists: MissionTwist[];
  activeTwistId: string | null;
  onTwistSelect: (twistId: string | null) => void;
  // Primary mission selection
  primaryMissions: PrimaryMission[];
  selectedPrimaryMissionId: string | null;
  onPrimaryMissionSelect: (id: string | null) => void;
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

export function GameStartModal({
  isOpen,
  onClose,
  goingFirst,
  onGoingFirstChange,
  isAttacker,
  onIsAttackerChange,
  twists,
  activeTwistId,
  onTwistSelect,
  primaryMissions,
  selectedPrimaryMissionId,
  onPrimaryMissionSelect,
}: GameStartModalProps) {
  const canStart = selectedPrimaryMissionId !== null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Game Setup" size="md">
      <div className="space-y-5">
        {/* Going First */}
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">
            Are you going first?
          </label>
          <SegmentedControl
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            value={goingFirst ? 'yes' : 'no'}
            onChange={(val) => onGoingFirstChange(val === 'yes')}
          />
        </div>

        {/* Attacker / Defender */}
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">
            Are you the attacker or defender?
          </label>
          <SegmentedControl
            options={[
              { value: 'attacker', label: 'Attacker' },
              { value: 'defender', label: 'Defender' },
            ]}
            value={isAttacker ? 'attacker' : 'defender'}
            onChange={(val) => onIsAttackerChange(val === 'attacker')}
          />
        </div>

        {/* Primary Mission */}
        {primaryMissions.length > 0 && (
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">
              Primary Mission
            </label>
            <div className="rounded-xl overflow-hidden bg-white/[0.04] max-h-[30vh] overflow-y-auto">
              {primaryMissions.map((mission) => {
                const isSelected = selectedPrimaryMissionId === mission.id;
                return (
                  <div
                    key={mission.id}
                    className={`${itemStyles} ${isSelected ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-white/5'}`}
                    onClick={() => onPrimaryMissionSelect(isSelected ? null : mission.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{mission.name}</span>
                    </div>
                    {isSelected && checkmark}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mission Twist */}
        {twists.length > 0 && (
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide block mb-2">
              Mission Twist
            </label>
            <div className="rounded-xl overflow-hidden bg-white/[0.04] max-h-[30vh] overflow-y-auto">
              {/* No Twist option */}
              <div
                className={`${itemStyles} ${activeTwistId === null ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-white/5'}`}
                onClick={() => onTwistSelect(null)}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-white/70">No Twist</div>
                </div>
                {activeTwistId === null && checkmark}
              </div>

              {/* Twist options */}
              {twists.map((twist) => {
                const isActive = activeTwistId === twist.id;
                return (
                  <div
                    key={twist.id}
                    className={`${itemStyles} ${isActive ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-white/5'}`}
                    onClick={() => onTwistSelect(twist.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{twist.name}</span>
                      </div>
                      <div className="text-xs text-white/50 mt-1 line-clamp-2">{twist.description}</div>
                    </div>
                    {isActive && checkmark}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Start Game */}
        <button
          onClick={onClose}
          disabled={!canStart}
          className={`btn-ios btn-ios-primary w-full py-3 text-base font-semibold ${!canStart ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Start Game
        </button>
      </div>
    </Modal>
  );
}
