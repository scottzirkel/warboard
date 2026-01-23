'use client';

import { Select } from '@/components/ui';
import type { Enhancement } from '@/types';

interface EnhancementSelectorProps {
  value: string;
  onChange: (enhancementId: string) => void;
  enhancements: Enhancement[];
  className?: string;
}

export function EnhancementSelector({
  value,
  onChange,
  enhancements,
  className = '',
}: EnhancementSelectorProps) {
  const options = [
    { value: '', label: 'None' },
    ...enhancements.map((enhancement) => ({
      value: enhancement.id,
      label: `${enhancement.name} (+${enhancement.points}pts)`,
    })),
  ];

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      size="sm"
      className={className}
    />
  );
}
