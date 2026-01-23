'use client';

import { useState, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
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
            <span className="ml-2 text-gray-400">Loading saved lists...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && lists.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-600 mb-3"
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
            <p className="text-gray-400">No saved lists found</p>
            <p className="text-sm text-gray-500 mt-1">
              Save a list first to see it here
            </p>
          </div>
        )}

        {/* List of Saved Lists */}
        {!isLoading && lists.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-1 rounded border border-gray-700 bg-gray-900/50 p-1">
            {lists.map((list) => (
              <div
                key={list.filename}
                className={`
                  flex items-center justify-between p-2 rounded cursor-pointer
                  transition-colors
                  ${selectedFilename === list.filename ? 'bg-accent-500/20 border border-accent-500/50' : 'hover:bg-gray-700/50 border border-transparent'}
                `}
                onClick={() => setSelectedFilename(list.filename)}
                onDoubleClick={handleLoad}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    className={`w-4 h-4 flex-shrink-0 ${selectedFilename === list.filename ? 'text-accent-400' : 'text-gray-500'}`}
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
                  <span className={`truncate ${selectedFilename === list.filename ? 'text-gray-100' : 'text-gray-300'}`}>
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
                          className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                          disabled={isProcessing}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-200 transition-colors"
                          disabled={isProcessing}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDelete(list.filename)}
                        className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-gray-700/50 transition-colors"
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
            onClick={handleLoad}
            isLoading={isProcessing}
            disabled={!selectedFilename || isLoading}
          >
            Load List
          </Button>
        </div>
      </div>
    </Modal>
  );
}
