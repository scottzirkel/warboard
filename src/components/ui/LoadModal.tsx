'use client';

import { useState, useCallback } from 'react';
import { Modal } from './Modal';
import type { SavedListInfo, CurrentList } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: SavedListInfo[];
  isLoading: boolean;
  onLoad: (filename: string) => Promise<CurrentList | null>;
  onDelete?: (filename: string) => Promise<boolean>;
  onListLoaded: (list: CurrentList) => void;
}

// ============================================================================
// Load Modal Component
// ============================================================================

export function LoadModal({
  isOpen,
  onClose,
  lists,
  isLoading,
  onLoad,
  onDelete,
  onListLoaded,
}: LoadModalProps) {
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setSelectedFilename(null);
    setIsProcessing(false);
    setDeleteConfirm(null);
    setError(null);
    onClose();
  }, [onClose]);

  // Load selected list
  const handleLoad = useCallback(async () => {
    if (!selectedFilename) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const loadedList = await onLoad(selectedFilename);

      if (loadedList) {
        onListLoaded(loadedList);
        handleClose();
      } else {
        setError('Failed to load list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load list');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFilename, onLoad, onListLoaded, handleClose]);

  // Delete list with confirmation
  const handleDelete = useCallback(async (filename: string) => {
    if (deleteConfirm !== filename) {
      // First click - show confirmation
      setDeleteConfirm(filename);

      return;
    }

    // Second click - perform delete
    if (!onDelete) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const success = await onDelete(filename);

      if (success) {
        setDeleteConfirm(null);

        if (selectedFilename === filename) {
          setSelectedFilename(null);
        }
      } else {
        setError('Failed to delete list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete list');
    } finally {
      setIsProcessing(false);
    }
  }, [deleteConfirm, onDelete, selectedFilename]);

  // Cancel delete confirmation
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Load Saved List" size="md">
      <div className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-6 w-6 text-accent-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="ml-2 text-white/60">Loading saved lists...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && lists.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-white/20 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-white/60">No saved lists found</p>
            <p className="text-sm text-white/40 mt-1">
              Save a list first to see it here
            </p>
          </div>
        )}

        {/* List of Saved Lists */}
        {!isLoading && lists.length > 0 && (
          <div className="card-depth max-h-64 overflow-y-auto">
            {lists.map((list) => (
              <div
                key={list.filename}
                className={`
                  list-row cursor-pointer touch-highlight
                  ${selectedFilename === list.filename ? 'bg-accent-tint-strong' : 'hover:bg-white/5'}
                `}
                onClick={() => setSelectedFilename(list.filename)}
                onDoubleClick={handleLoad}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <svg
                    className={`w-5 h-5 flex-shrink-0 ${selectedFilename === list.filename ? 'text-accent-400' : 'text-white/40'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className={`truncate ${selectedFilename === list.filename ? 'text-white' : 'text-white/80'}`}>
                    {list.name}
                  </span>
                </div>

                {/* Delete Button */}
                {onDelete && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {deleteConfirm === list.filename ? (
                      <>
                        <button
                          onClick={() => handleDelete(list.filename)}
                          className="btn-ios btn-ios-sm bg-red-600 text-white"
                          disabled={isProcessing}
                        >
                          Delete
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="btn-ios btn-ios-sm btn-ios-secondary"
                          disabled={isProcessing}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(list.filename)}
                        className="p-2 text-white/40 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Delete list"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
          <button className="btn-ios btn-ios-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn-ios btn-ios-primary"
            onClick={handleLoad}
            disabled={!selectedFilename || isLoading || isProcessing}
          >
            {isProcessing ? 'Loading...' : 'Load List'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
