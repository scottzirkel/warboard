'use client';

import { useState, useCallback, useMemo } from 'react';
import { Modal } from './Modal';
import { exportToPlainText, exportToJson } from '@/lib/plainTextExport';
import type { CurrentList, ArmyData } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'plaintext' | 'json' | 'yellowscribe';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: CurrentList;
  armyData: ArmyData;
  // Yellowscribe-specific props
  yellowscribeCode: string | null;
  yellowscribeLoading: boolean;
  yellowscribeError: string | null;
  onExportYellowscribe: () => void;
}

// ============================================================================
// Format Selection
// ============================================================================

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'plaintext',
    name: 'Plain Text',
    description: 'Markdown format, good for sharing',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'Structured data format',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
  },
  {
    id: 'yellowscribe',
    name: 'Yellowscribe',
    description: 'For Tabletop Simulator',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
        />
      </svg>
    ),
  },
];

// ============================================================================
// Export Modal
// ============================================================================

export function ExportModal({
  isOpen,
  onClose,
  list,
  armyData,
  yellowscribeCode,
  yellowscribeLoading,
  yellowscribeError,
  onExportYellowscribe,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate export content based on format
  const exportContent = useMemo(() => {
    if (!selectedFormat || selectedFormat === 'yellowscribe') return null;

    if (selectedFormat === 'plaintext') {
      return exportToPlainText(list, armyData);
    }

    if (selectedFormat === 'json') {
      return exportToJson(list, armyData);
    }

    return null;
  }, [selectedFormat, list, armyData]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedFormat(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    setSelectedFormat(null);
    setCopied(false);
  }, []);

  const handleSelectFormat = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);

    if (format === 'yellowscribe') {
      onExportYellowscribe();
    }
  }, [onExportYellowscribe]);

  // Determine modal title
  const modalTitle = selectedFormat
    ? `Export as ${FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.name}`
    : 'Export Army List';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="md">
      <div className="space-y-4">
        {/* Format Selection */}
        {!selectedFormat && (
          <div className="grid grid-cols-1 gap-3">
            {FORMAT_OPTIONS.map((format) => (
              <button
                key={format.id}
                onClick={() => handleSelectFormat(format.id)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent-400/50 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center text-accent-400">
                  {format.icon}
                </div>
                <div>
                  <div className="font-medium text-white">{format.name}</div>
                  <div className="text-sm text-white/50">{format.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Plain Text / JSON Export */}
        {selectedFormat && selectedFormat !== 'yellowscribe' && exportContent && (
          <>
            <div className="relative">
              <pre className="bg-black/40 border border-white/10 rounded-lg p-4 text-sm text-white/80 overflow-auto max-h-80 font-mono whitespace-pre-wrap">
                {exportContent}
              </pre>
              <button
                onClick={() => handleCopy(exportContent)}
                className="absolute top-2 right-2 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {copied && (
              <p className="text-sm text-green-400 text-center">Copied to clipboard!</p>
            )}

            <div className="flex justify-between pt-2">
              <button className="btn-ios btn-ios-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-ios btn-ios-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          </>
        )}

        {/* Yellowscribe Export */}
        {selectedFormat === 'yellowscribe' && (
          <>
            {/* Loading State */}
            {yellowscribeLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-400" />
              </div>
            )}

            {/* Error State */}
            {yellowscribeError && !yellowscribeLoading && (
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
                <div>
                  <p className="text-sm text-red-300">{yellowscribeError}</p>
                  <p className="text-xs text-red-300/60 mt-1">
                    Yellowscribe may be temporarily unavailable. Try again later.
                  </p>
                </div>
              </div>
            )}

            {/* Success State */}
            {yellowscribeCode && !yellowscribeLoading && !yellowscribeError && (
              <>
                <p className="text-sm text-white/60">
                  Your Yellowscribe code is ready. Use this code in Tabletop Simulator to spawn your army.
                </p>

                <div className="relative">
                  <div className="bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-2xl text-center text-accent-400 tracking-widest">
                    {yellowscribeCode}
                  </div>
                  <button
                    onClick={() => handleCopy(yellowscribeCode)}
                    className="absolute top-2 right-2 p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="text-sm text-green-400 text-center">Copied to clipboard!</p>
                )}

                <div className="text-xs text-white/40 space-y-1">
                  <p><strong>Note:</strong> Codes expire after 10 minutes.</p>
                  <p>In TTS, use the Yellowscribe mod and paste this code to spawn your army.</p>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <button className="btn-ios btn-ios-secondary" onClick={handleBack}>
                Back
              </button>
              <button className="btn-ios btn-ios-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
