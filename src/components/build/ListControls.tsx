'use client';

import { Button } from '@/components/ui';

interface ListControlsProps {
  onImport: () => void;
  onExport: () => void;
  onLoad: () => void;
  onSave: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
  canSave?: boolean;
  canExport?: boolean;
  className?: string;
}

export function ListControls({
  onImport,
  onExport,
  onLoad,
  onSave,
  isSaving = false,
  isExporting = false,
  canSave = true,
  canExport = false,
  className = '',
}: ListControlsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onImport}
        title="Import from Yellowscribe"
      >
        <svg
          className="w-4 h-4 mr-1"
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
        Import
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        disabled={!canExport}
        isLoading={isExporting}
        title="Export army list"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onLoad}
        title="Load saved list"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        Load
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={onSave}
        disabled={!canSave}
        isLoading={isSaving}
        title="Save current list"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        Save
      </Button>
    </div>
  );
}
