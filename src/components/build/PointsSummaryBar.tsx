'use client';

import { ProgressBar } from '@/components/ui';

interface PointsSummaryBarProps {
  name: string;
  currentPoints: number;
  pointsLimit: number;
  className?: string;
}

export function PointsSummaryBar({
  name,
  currentPoints,
  pointsLimit,
  className = '',
}: PointsSummaryBarProps) {
  const percentage = pointsLimit > 0 ? (currentPoints / pointsLimit) * 100 : 0;
  const isOver = currentPoints > pointsLimit;
  const isNear = percentage >= 90 && !isOver;

  let variant: 'default' | 'warning' | 'danger' = 'default';
  if (isOver) variant = 'danger';
  else if (isNear) variant = 'warning';

  return (
    <div
      className={`
        bg-gray-800/50 border-b border-gray-700/50
        px-4 py-3
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-100">
            {name || 'Untitled List'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`
              text-lg font-mono font-bold
              ${isOver ? 'text-red-400' : isNear ? 'text-yellow-400' : 'text-accent-400'}
            `}
          >
            {currentPoints}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400 font-mono">{pointsLimit} pts</span>
        </div>
      </div>
      <ProgressBar value={currentPoints} max={pointsLimit} variant={variant} size="sm" />
    </div>
  );
}
