'use client';

import { useState, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { SavedListInfo } from '@/types';
import { getLocalStorageList, removeLocalStorageLists } from '@/hooks/useSavedLists';

// ============================================================================
// Props
// ============================================================================

interface MigrateListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  localLists: SavedListInfo[];
  onMigrationComplete: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function MigrateListsModal({
  isOpen,
  onClose,
  localLists,
  onMigrationComplete,
}: MigrateListsModalProps) {
  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(
    () => new Set(localLists.map(l => l.filename))
  );
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migratedCount, setMigratedCount] = useState(0);

  const toggleSelection = useCallback((filename: string) => {
    setSelectedFilenames(prev => {
      const next = new Set(prev);

      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }

      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedFilenames.size === localLists.length) {
      setSelectedFilenames(new Set());
    } else {
      setSelectedFilenames(new Set(localLists.map(l => l.filename)));
    }
  }, [selectedFilenames.size, localLists]);

  const handleMigrate = useCallback(async () => {
    if (selectedFilenames.size === 0) {
      return;
    }

    setIsMigrating(true);
    setError(null);
    setMigratedCount(0);

    const migratedFilenames: string[] = [];

    for (const filename of selectedFilenames) {
      const listData = getLocalStorageList(filename);

      if (!listData) {
        continue;
      }

      try {
        const res = await fetch('/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listData),
        });

        if (res.ok) {
          migratedFilenames.push(filename);
          setMigratedCount(prev => prev + 1);
        }
      } catch {
        // Continue with remaining lists
      }
    }

    if (migratedFilenames.length > 0) {
      removeLocalStorageLists(migratedFilenames);
    }

    if (migratedFilenames.length < selectedFilenames.size) {
      setError(`Migrated ${migratedFilenames.length} of ${selectedFilenames.size} lists. Some failed to import.`);
    }

    setIsMigrating(false);
    onMigrationComplete();

    if (migratedFilenames.length === selectedFilenames.size) {
      onClose();
    }
  }, [selectedFilenames, onMigrationComplete, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Local Lists" size="md">
      <div className="space-y-4">
        <p className="text-sm text-white/70">
          You have {localLists.length} list{localLists.length !== 1 ? 's' : ''} saved locally.
          Would you like to import them to your account?
        </p>

        {/* Select All */}
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <button
            onClick={toggleAll}
            className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
          >
            {selectedFilenames.size === localLists.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-white/40">
            {selectedFilenames.size} of {localLists.length} selected
          </span>
        </div>

        {/* List of local lists with checkboxes */}
        <div className="card-depth max-h-64 overflow-y-auto">
          {localLists.map((list) => (
            <label
              key={list.filename}
              className="list-row cursor-pointer hover:bg-white/5 flex items-center gap-3"
            >
              <input
                type="checkbox"
                checked={selectedFilenames.has(list.filename)}
                onChange={() => toggleSelection(list.filename)}
                className="rounded border-white/30 bg-white/5 text-accent-500 focus:ring-accent-500"
                disabled={isMigrating}
              />
              <span className="text-white/80 truncate">{list.name}</span>
            </label>
          ))}
        </div>

        {/* Progress */}
        {isMigrating && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <svg
              className="animate-spin h-4 w-4 text-accent-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Importing {migratedCount} of {selectedFilenames.size}...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isMigrating}>
            Skip
          </Button>
          <Button
            variant="primary"
            onClick={handleMigrate}
            disabled={selectedFilenames.size === 0 || isMigrating}
          >
            {isMigrating ? 'Importing...' : `Import ${selectedFilenames.size} List${selectedFilenames.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
