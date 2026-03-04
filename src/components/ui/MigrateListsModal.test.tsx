import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MigrateListsModal } from './MigrateListsModal';

const mockLists = [
  { filename: 'one.json', name: 'One' },
  { filename: 'two.json', name: 'Two' },
];

describe('MigrateListsModal', () => {
  it('updates selection counts when local lists change', () => {
    const { rerender } = render(
      <MigrateListsModal
        isOpen
        onClose={vi.fn()}
        localLists={mockLists}
        onMigrationComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Import 2 Lists/i })).toBeInTheDocument();

    rerender(
      <MigrateListsModal
        isOpen
        onClose={vi.fn()}
        localLists={[mockLists[0]]}
        onMigrationComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Import 1 List/i })).toBeInTheDocument();
  });

  it('calls onClose when local lists become empty', () => {
    const handleClose = vi.fn();

    const { rerender } = render(
      <MigrateListsModal
        isOpen
        onClose={handleClose}
        localLists={mockLists}
        onMigrationComplete={vi.fn()}
      />
    );

    rerender(
      <MigrateListsModal
        isOpen
        onClose={handleClose}
        localLists={[]}
        onMigrationComplete={vi.fn()}
      />
    );

    expect(handleClose).toHaveBeenCalled();
  });
});
