'use client';

import { useState, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { CurrentList } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (list: CurrentList) => void;
}

// ============================================================================
// Yellowscribe Import Modal
// ============================================================================

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setJsonInput('');
    setError(null);
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  // Parse and validate imported JSON
  const handleImport = useCallback(() => {
    setError(null);
    setIsProcessing(true);

    try {
      const trimmed = jsonInput.trim();

      if (!trimmed) {
        setError('Please paste your Yellowscribe JSON export');
        setIsProcessing(false);

        return;
      }

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        setError('Invalid JSON format. Please check your input.');
        setIsProcessing(false);

        return;
      }

      // Validate structure - Yellowscribe exports have a specific format
      // We expect at minimum: name, units array
      if (!parsed || typeof parsed !== 'object') {
        setError('Invalid data format. Expected an object.');
        setIsProcessing(false);

        return;
      }

      const data = parsed as Record<string, unknown>;

      // Check for required fields
      if (!Array.isArray(data.units)) {
        setError('Invalid list format: missing units array.');
        setIsProcessing(false);

        return;
      }

      // Build CurrentList from imported data
      const importedList: CurrentList = {
        name: typeof data.name === 'string' ? data.name : 'Imported List',
        army: typeof data.army === 'string' ? data.army : 'custodes',
        pointsLimit: typeof data.pointsLimit === 'number' ? data.pointsLimit : 500,
        format: data.format === 'colosseum' ? 'colosseum' : 'standard',
        detachment: typeof data.detachment === 'string' ? data.detachment : '',
        units: data.units.map((unit: unknown) => {
          const u = unit as Record<string, unknown>;

          return {
            unitId: typeof u.unitId === 'string' ? u.unitId : '',
            modelCount: typeof u.modelCount === 'number' ? u.modelCount : 1,
            enhancement: typeof u.enhancement === 'string' ? u.enhancement : '',
            loadout: u.loadout as Record<string, string> | undefined,
            weaponCounts: u.weaponCounts as Record<string, number> | undefined,
            currentWounds: null,
            leaderCurrentWounds: null,
            attachedLeader: null,
          };
        }),
      };

      // Pass to parent
      onImport(importedList);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import list');
    } finally {
      setIsProcessing(false);
    }
  }, [jsonInput, onImport, handleClose]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;

      if (typeof content === 'string') {
        setJsonInput(content);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import from Yellowscribe" size="lg">
      <div className="space-y-4">
        {/* Instructions */}
        <p className="text-sm text-gray-400">
          Paste your Yellowscribe JSON export below, or upload a JSON file.
        </p>

        {/* File Upload */}
        <div>
          <label
            htmlFor="json-file"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 text-gray-200 cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Upload JSON File
          </label>
          <input
            id="json-file"
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Text Area */}
        <div>
          <label htmlFor="json-input" className="sr-only">
            JSON Input
          </label>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setError(null);
            }}
            placeholder='{"name": "My List", "units": [...] }'
            rows={10}
            className={`
              w-full px-3 py-2 rounded font-mono text-sm
              bg-gray-900 border text-gray-200 placeholder-gray-600
              focus:outline-none focus:ring-1
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-gray-600 focus:border-accent-500 focus:ring-accent-500/50'}
            `}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded bg-red-900/30 border border-red-700">
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
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            isLoading={isProcessing}
            disabled={!jsonInput.trim()}
          >
            Import List
          </Button>
        </div>
      </div>
    </Modal>
  );
}
