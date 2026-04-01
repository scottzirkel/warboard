'use client';

import { Modal } from '@/components/ui/Modal';
import type { PhaseReminder } from '@/lib/phaseReminders';
import type { GamePhase } from '@/types';

interface PhaseTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  phase: GamePhase;
  reminders: PhaseReminder[];
}

const PHASE_LABELS: Record<GamePhase, string> = {
  deployment: 'Deployment',
  command: 'Command Phase',
  movement: 'Movement Phase',
  shooting: 'Shooting Phase',
  charge: 'Charge Phase',
  fight: 'Fight Phase',
};

export function PhaseTransitionModal({
  isOpen,
  onClose,
  phase,
  reminders,
}: PhaseTransitionModalProps) {
  const selections = reminders.filter((r) => r.type === 'selection');
  const reminderItems = reminders.filter((r) => r.type === 'reminder');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={PHASE_LABELS[phase]} size="md">
      <div className="space-y-4">
        {/* Selections Required */}
        {selections.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-amber-400">
              Selections Required
            </div>
            {selections.map((item, i) => (
              <div
                key={`sel-${i}`}
                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
              >
                <div className="text-sm font-medium text-amber-300">{item.title}</div>
                <div className="text-xs text-cm-text-secondary mt-1">{item.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Reminders */}
        {reminderItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-cm-text-secondary">
              Reminders
            </div>
            {reminderItems.map((item, i) => (
              <div key={`rem-${i}`} className="bg-cm-stat-bg rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-accent-300">{item.title}</span>
                  {item.unitName && (
                    <span className="text-[10px] text-cm-text-muted">({item.unitName})</span>
                  )}
                </div>
                <div className="text-xs text-cm-text-secondary mt-1">{item.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Dismiss */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-ios btn-ios-primary">
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}
