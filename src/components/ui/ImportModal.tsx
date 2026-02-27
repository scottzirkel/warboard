'use client';

import { useState, useCallback } from 'react';
import { Modal } from './Modal';
import { importNewRecruitJSON } from '@/lib/newRecruitParser';
import { importPlainText } from '@/lib/plainTextParser';
import type { CurrentList, ArmyData } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (list: CurrentList) => void;
  armyData: ArmyData | null;
  armyId: string;
}

// ============================================================================
// Format Detection
// ============================================================================

type ImportFormat = 'native' | 'newrecruit' | 'plaintext' | 'unknown';

function detectFormat(input: string): ImportFormat {
  const trimmed = input.trim();

  // Try to parse as JSON first
  try {
    const data = JSON.parse(trimmed);

    if (data && typeof data === 'object') {
      // New Recruit format has a "roster" object with "forces"
      if (data.roster && typeof data.roster === 'object') {
        const roster = data.roster as Record<string, unknown>;

        if (Array.isArray(roster.forces)) {
          return 'newrecruit';
        }
      }

      // Native format has "units" array at top level
      if (Array.isArray(data.units)) {
        return 'native';
      }
    }
  } catch {
    // Not JSON, check if it's plain text format
    // Plain text typically has unit names with points, model counts, etc.
    const lines = trimmed.split('\n').filter((l) => l.trim());

    if (lines.length > 0) {
      // Check for table format (has | separators) or list format
      const hasTableFormat = lines.some((l) => l.includes('|'));
      const hasListMarkers = lines.some((l) => /^[\d]+[.)]\s*|^[-*•]\s*/.test(l.trim()));
      const hasPoints = lines.some((l) => /\d+\s*(?:pts?|points?)/i.test(l));
      const hasModelCounts = lines.some((l) => /\bx\s*\d+|\d+\s*x\b/i.test(l));

      if (hasTableFormat || hasListMarkers || hasPoints || hasModelCounts) {
        return 'plaintext';
      }

      // If it has multiple lines that look like they could be unit names, treat as plain text
      if (lines.length >= 1) {
        return 'plaintext';
      }
    }
  }

  return 'unknown';
}

// ============================================================================
// Import Modal
// ============================================================================

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  armyData,
  armyId,
}: ImportModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setJsonInput('');
    setError(null);
    setWarnings([]);
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  // Parse native format (existing Yellowscribe/Army Tracker format)
  const parseNativeFormat = useCallback(
    (data: Record<string, unknown>): CurrentList => {
      if (!Array.isArray(data.units)) {
        throw new Error('Invalid list format: missing units array.');
      }

      return {
        name: typeof data.name === 'string' ? data.name : 'Imported List',
        army: typeof data.army === 'string' ? data.army : armyId,
        pointsLimit:
          typeof data.pointsLimit === 'number' ? data.pointsLimit : 500,
        format: data.format === 'colosseum' ? 'colosseum' : 'strike-force',
        detachment:
          typeof data.detachment === 'string' ? data.detachment : '',
        units: data.units.map((unit: unknown) => {
          const u = unit as Record<string, unknown>;

          return {
            unitId: typeof u.unitId === 'string' ? u.unitId : '',
            modelCount: typeof u.modelCount === 'number' ? u.modelCount : 1,
            enhancement:
              typeof u.enhancement === 'string' ? u.enhancement : '',
            loadout: u.loadout as Record<string, string> | undefined,
            weaponCounts: u.weaponCounts as Record<string, number> | undefined,
            currentWounds: null,
            leaderCurrentWounds: null,
            attachedLeader: null,
          };
        }),
      };
    },
    [armyId]
  );

  // Parse and validate imported JSON
  const handleImport = useCallback(() => {
    setError(null);
    setWarnings([]);
    setIsProcessing(true);

    try {
      const trimmed = jsonInput.trim();

      if (!trimmed) {
        setError('Please paste JSON data to import');
        setIsProcessing(false);

        return;
      }

      const format = detectFormat(trimmed);

      let importedList: CurrentList;

      if (format === 'newrecruit') {
        // New Recruit / BattleScribe format
        if (!armyData) {
          setError('Army data not loaded. Please try again.');
          setIsProcessing(false);

          return;
        }

        const result = importNewRecruitJSON(trimmed, armyData, armyId);

        importedList = result.list;

        if (result.warnings.length > 0) {
          setWarnings(result.warnings);
        }

        if (result.unmatchedUnits.length > 0 && result.list.units.length === 0) {
          setError(
            `Could not match any units. Unrecognized: ${result.unmatchedUnits.join(', ')}`
          );
          setIsProcessing(false);

          return;
        }
      } else if (format === 'native') {
        // Native Army Tracker format
        const data = JSON.parse(trimmed) as Record<string, unknown>;

        importedList = parseNativeFormat(data);
      } else if (format === 'plaintext') {
        // Plain text format (from AI chatbots, etc.)
        if (!armyData) {
          setError('Army data not loaded. Please try again.');
          setIsProcessing(false);

          return;
        }

        const result = importPlainText(trimmed, armyData, armyId);

        importedList = result.list;

        if (result.warnings.length > 0) {
          setWarnings(result.warnings);
        }

        if (result.unmatchedUnits.length > 0 && result.list.units.length === 0) {
          setError(
            `Could not match any units. Unrecognized: ${result.unmatchedUnits.join(', ')}`
          );
          setIsProcessing(false);

          return;
        }
      } else {
        setError(
          'Unrecognized format. Supported: New Recruit JSON, Army Tracker JSON, Plain Text'
        );
        setIsProcessing(false);

        return;
      }

      // Pass to parent
      onImport(importedList);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import list');
    } finally {
      setIsProcessing(false);
    }
  }, [jsonInput, onImport, handleClose, armyData, armyId, parseNativeFormat]);

  // Handle file upload
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
          setWarnings([]);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
      };

      reader.readAsText(file);

      // Reset input so same file can be selected again
      event.target.value = '';
    },
    []
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Army List" size="lg">
      <div className="space-y-4">
        {/* Instructions */}
        <div className="text-sm text-white/60 space-y-1">
          <p>
            <strong>Supported formats:</strong>
          </p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>New Recruit / BattleScribe JSON export</li>
            <li>Army Tracker native JSON</li>
            <li>Plain text (AI chatbot output, lists with unit names)</li>
          </ul>
        </div>

        {/* File Upload */}
        <div>
          <label
            htmlFor="json-file"
            className="btn-ios btn-ios-tinted inline-flex cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
              setWarnings([]);
            }}
            placeholder='Paste JSON or plain text army list here...'
            rows={10}
            className={`
              w-full input-dark font-mono text-sm
              ${error ? 'border-red-500 focus:border-red-500' : ''}
            `}
          />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <svg
              className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm text-yellow-300 font-medium">Import warnings:</p>
              <ul className="text-xs text-yellow-300/80 mt-1 space-y-0.5">
                {warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 5 && (
                  <li>...and {warnings.length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          <button className="btn-ios btn-ios-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn-ios btn-ios-primary"
            onClick={handleImport}
            disabled={!jsonInput.trim() || isProcessing}
          >
            {isProcessing ? 'Importing...' : 'Import List'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
