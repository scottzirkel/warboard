'use client';

import { useState, useCallback, useEffect } from 'react';
import { Modal } from './Modal';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<boolean>;
  initialName?: string;
  existingNames?: string[];
}

export function SaveModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  existingNames = [],
}: SaveModalProps) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialName]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter a name for your list');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await onSave(trimmedName);

      if (success) {
        onClose();
      } else {
        setError('Failed to save list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save list');
    } finally {
      setIsSaving(false);
    }
  }, [name, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    }
  }, [handleSave, isSaving]);

  const isExistingName = existingNames.includes(name.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Army List" size="sm">
      <div className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="text-sm text-white/60 block mb-2">List Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a name for your list"
            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-accent-500"
            autoFocus
          />
          {isExistingName && (
            <p className="text-xs text-yellow-400 mt-1">
              A list with this name exists and will be overwritten
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            className="btn-ios btn-ios-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="btn-ios btn-ios-primary"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? 'Saving...' : isExistingName ? 'Overwrite' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
