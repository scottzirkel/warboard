interface ProgressBarProps {
  value: number;
  max: number;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantColors = {
  default: {
    bg: 'bg-accent-500',
    track: 'bg-gray-700',
  },
  success: {
    bg: 'bg-green-500',
    track: 'bg-gray-700',
  },
  warning: {
    bg: 'bg-yellow-500',
    track: 'bg-gray-700',
  },
  danger: {
    bg: 'bg-red-500',
    track: 'bg-gray-700',
  },
};

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  max,
  showLabel = false,
  variant = 'default',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = variantColors[variant];

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
      <div
        className={`
          ${colors.track} rounded-full overflow-hidden
          ${sizeStyles[size]}
        `}
      >
        <div
          className={`
            ${colors.bg} h-full rounded-full
            transition-all duration-300 ease-out
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface PointsProgressProps {
  current: number;
  limit: number;
  className?: string;
}

export function PointsProgress({
  current,
  limit,
  className = '',
}: PointsProgressProps) {
  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  const isOver = current > limit;
  const isNear = percentage >= 90 && !isOver;

  let variant: 'default' | 'warning' | 'danger' = 'default';
  if (isOver) variant = 'danger';
  else if (isNear) variant = 'warning';

  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-1">
        <span className={isOver ? 'text-red-400' : 'text-gray-300'}>
          {current} pts
        </span>
        <span className="text-gray-500">{limit} pts</span>
      </div>
      <ProgressBar value={current} max={limit} variant={variant} size="sm" />
    </div>
  );
}
