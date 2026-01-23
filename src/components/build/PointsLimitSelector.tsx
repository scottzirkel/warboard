'use client';

import { Select } from '@/components/ui';

interface PointsLimitSelectorProps {
  value: number;
  onChange: (limit: number) => void;
  className?: string;
}

const pointsLimits = [
  { value: 500, label: '500 pts' },
  { value: 1000, label: '1000 pts' },
  { value: 1500, label: '1500 pts' },
  { value: 2000, label: '2000 pts' },
  { value: 2500, label: '2500 pts' },
  { value: 3000, label: '3000 pts' },
];

export function PointsLimitSelector({
  value,
  onChange,
  className = '',
}: PointsLimitSelectorProps) {
  return (
    <Select
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      options={pointsLimits.map((limit) => ({
        value: String(limit.value),
        label: limit.label,
      }))}
      size="sm"
      className={className}
    />
  );
}
