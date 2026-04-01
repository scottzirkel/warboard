'use client';

import { Modal, SegmentedControl } from '@/components/ui';
import { DeploymentMapImage } from './DeploymentMapImage';
import type { MissionTwist, PrimaryMission, MissionDeployment, GameFormat } from '@/types';

interface GameStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Game setup
  goingFirst: boolean;
  onGoingFirstChange: (goingFirst: boolean) => void;
  isAttacker: boolean;
  onIsAttackerChange: (isAttacker: boolean) => void;
  // Deployment selection
  deployments: MissionDeployment[];
  selectedDeploymentId: string | null;
  onDeploymentSelect: (id: string | null) => void;
  // Twist
  twists: MissionTwist[];
  activeTwistId: string | null;
  onTwistSelect: (twistId: string | null) => void;
  // Primary mission selection
  primaryMissions: PrimaryMission[];
  selectedPrimaryMissionId: string | null;
  onPrimaryMissionSelect: (id: string | null) => void;
  // Pregame checklist
  detachmentSelected: boolean;
  warlordDesignated: boolean;
  enhancementsAssigned: boolean;
  format: GameFormat;
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

function DiceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="p-1 rounded-md hover:bg-cm-surface-hover transition-colors"
      title="Randomize"
    >
      <svg className="w-4 h-4 text-cm-text-secondary hover:text-cm-text" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="7" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

export function GameStartModal({
  isOpen,
  onClose,
  goingFirst,
  onGoingFirstChange,
  isAttacker,
  onIsAttackerChange,
  deployments,
  selectedDeploymentId,
  onDeploymentSelect,
  twists,
  activeTwistId,
  onTwistSelect,
  primaryMissions,
  selectedPrimaryMissionId,
  onPrimaryMissionSelect,
  detachmentSelected,
  warlordDesignated,
  enhancementsAssigned,
  format,
}: GameStartModalProps) {
  const canStart = selectedPrimaryMissionId !== null;

  const checklistItems = [
    { label: 'Detachment', done: detachmentSelected },
    { label: 'Warlord', done: warlordDesignated || format === 'colosseum', hint: format !== 'colosseum' ? '(required)' : undefined },
    { label: 'Enhancements', done: enhancementsAssigned, hint: '(optional)' },
    { label: 'Deployment', done: !!selectedDeploymentId, hint: '(optional)' },
    { label: 'Primary Mission', done: !!selectedPrimaryMissionId },
    { label: 'First Turn', done: true },
    { label: 'Role', done: true },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Game Setup" size="md">
      <div className="space-y-5">
        {/* Pregame Checklist */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {checklistItems.map(({ label, done, hint }) => (
            <div key={label} className="flex items-center gap-1.5 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-cm-surface-hover'}`}>
                {done && (
                  <svg className="w-3 h-3 text-cm-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={done ? 'text-cm-text-secondary' : 'text-cm-text-muted'}>
                {label}
              </span>
              {hint && !done && (
                <span className="text-[10px] text-cm-text-faint">{hint}</span>
              )}
            </div>
          ))}
        </div>

        {/* Going First */}
        <div>
          <label className="text-xs text-cm-text-secondary uppercase tracking-wide block mb-2">
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
          <label className="text-xs text-cm-text-secondary uppercase tracking-wide block mb-2">
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

        {/* Deployment */}
        {deployments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-cm-text-secondary uppercase tracking-wide">
                Deployment
              </label>
              <DiceButton onClick={() => {
                const idx = Math.floor(Math.random() * deployments.length);
                onDeploymentSelect(deployments[idx].id);
              }} />
            </div>
            <div className="rounded-xl overflow-hidden bg-cm-surface-hover-subtle max-h-[30vh] overflow-y-auto">
              {deployments.map((deployment) => {
                const isSelected = selectedDeploymentId === deployment.id;
                return (
                  <div
                    key={deployment.id}
                    className={`${itemStyles} ${isSelected ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-cm-surface-hover-subtle'}`}
                    onClick={() => onDeploymentSelect(isSelected ? null : deployment.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{deployment.name}</span>
                    </div>
                    {isSelected && checkmark}
                  </div>
                );
              })}
            </div>
            {selectedDeploymentId && (
              <div className="mt-3">
                <DeploymentMapImage
                  deploymentId={selectedDeploymentId}
                  deploymentName={deployments.find(d => d.id === selectedDeploymentId)?.name ?? ''}
                />
              </div>
            )}
          </div>
        )}

        {/* Primary Mission */}
        {primaryMissions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-cm-text-secondary uppercase tracking-wide">
                Primary Mission
              </label>
              <DiceButton onClick={() => {
                const idx = Math.floor(Math.random() * primaryMissions.length);
                onPrimaryMissionSelect(primaryMissions[idx].id);
              }} />
            </div>
            <div className="rounded-xl overflow-hidden bg-cm-surface-hover-subtle max-h-[30vh] overflow-y-auto">
              {primaryMissions.map((mission) => {
                const isSelected = selectedPrimaryMissionId === mission.id;
                return (
                  <div
                    key={mission.id}
                    className={`${itemStyles} ${isSelected ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-cm-surface-hover-subtle'}`}
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-cm-text-secondary uppercase tracking-wide">
                Mission Twist
              </label>
              <DiceButton onClick={() => {
                const idx = Math.floor(Math.random() * twists.length);
                onTwistSelect(twists[idx].id);
              }} />
            </div>
            <div className="rounded-xl overflow-hidden bg-cm-surface-hover-subtle max-h-[30vh] overflow-y-auto">
              {/* No Twist option */}
              <div
                className={`${itemStyles} ${activeTwistId === null ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-cm-surface-hover-subtle'}`}
                onClick={() => onTwistSelect(null)}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-cm-text-secondary">No Twist</div>
                </div>
                {activeTwistId === null && checkmark}
              </div>

              {/* Twist options */}
              {twists.map((twist) => {
                const isActive = activeTwistId === twist.id;
                return (
                  <div
                    key={twist.id}
                    className={`${itemStyles} ${isActive ? 'bg-[color-mix(in_srgb,var(--accent-500)_20%,transparent)]' : 'hover:bg-cm-surface-hover-subtle'}`}
                    onClick={() => onTwistSelect(twist.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{twist.name}</span>
                      </div>
                      <div className="text-xs text-cm-text-secondary mt-1 line-clamp-2">{twist.description}</div>
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
