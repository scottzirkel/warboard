'use client';

import { Select } from '@/components/ui';
import type { Detachment } from '@/types';

interface DetachmentSelectorProps {
  value: string;
  onChange: (detachment: string) => void;
  detachments: Record<string, Detachment>;
  className?: string;
}

export function DetachmentSelector({
  value,
  onChange,
  detachments,
  className = '',
}: DetachmentSelectorProps) {
  const options = Object.entries(detachments).map(([id, detachment]) => ({
    value: id,
    label: detachment.name,
  }));

  if (options.length === 0) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No detachments available
      </div>
    );
  }

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder="Select detachment..."
      size="sm"
      className={className}
    />
  );
}
