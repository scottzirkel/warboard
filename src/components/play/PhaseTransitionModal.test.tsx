import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseTransitionModal } from './PhaseTransitionModal';
import type { PhaseReminder } from '@/lib/phaseReminders';

describe('PhaseTransitionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    phase: 'command' as const,
    reminders: [] as PhaseReminder[],
  };

  it('renders nothing when closed', () => {
    const { container } = render(
      <PhaseTransitionModal {...defaultProps} isOpen={false} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders phase name in title', () => {
    render(<PhaseTransitionModal {...defaultProps} phase="fight" />);
    expect(screen.getByText('Fight Phase')).toBeTruthy();
  });

  it('renders selection reminders with selections required header', () => {
    const reminders: PhaseReminder[] = [{
      type: 'selection',
      source: 'detachment_rule',
      title: 'Martial Mastery',
      description: 'Select a stance for this round.',
    }];

    render(<PhaseTransitionModal {...defaultProps} reminders={reminders} />);
    expect(screen.getByText('Selections Required')).toBeTruthy();
    expect(screen.getByText('Martial Mastery')).toBeTruthy();
  });

  it('renders reminder items with unit name', () => {
    const reminders: PhaseReminder[] = [{
      type: 'reminder',
      source: 'ability',
      unitName: 'Draxus',
      title: 'Psychic Veil',
      description: 'Roll a D6 for each enemy unit.',
    }];

    render(<PhaseTransitionModal {...defaultProps} reminders={reminders} />);
    expect(screen.getByText('Reminders')).toBeTruthy();
    expect(screen.getByText('Psychic Veil')).toBeTruthy();
    expect(screen.getByText('(Draxus)')).toBeTruthy();
  });

  it('calls onClose when Got it is clicked', () => {
    const onClose = vi.fn();

    render(<PhaseTransitionModal {...defaultProps} onClose={onClose} reminders={[{
      type: 'reminder',
      source: 'ability',
      title: 'Test',
      description: 'Test desc',
    }]} />);

    fireEvent.click(screen.getByText('Got it'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
