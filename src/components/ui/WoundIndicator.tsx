interface WoundIndicatorProps {
  currentWounds: number;
  maxWounds: number;
  woundsPerModel: number;
  modelsAlive: number;
  totalModels: number;
  label?: string;
  variant?: 'default' | 'leader';
  onAdjust?: (delta: number) => void;
  className?: string;
}

function WoundPips({
  current,
  max,
  variant = 'default',
}: {
  current: number;
  max: number;
  variant?: 'default' | 'leader';
}) {
  const pips = [];
  const colorFull = variant === 'leader' ? 'bg-purple-500' : 'bg-green-500';
  const colorEmpty = 'bg-cm-surface-inset';

  for (let i = 0; i < max; i++) {
    const isFilled = i < current;
    pips.push(
      <div
        key={i}
        className={`
          w-2.5 h-2.5 rounded-full transition-colors
          ${isFilled ? colorFull : colorEmpty}
        `}
      />
    );
  }

  return <div className="flex gap-1 flex-wrap">{pips}</div>;
}

interface AdjustButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant: 'increase' | 'decrease';
}

function AdjustButton({ onClick, disabled = false, variant }: AdjustButtonProps) {
  const isIncrease = variant === 'increase';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-7 h-7 rounded flex items-center justify-center text-lg font-bold
        transition-colors
        ${disabled
          ? 'bg-cm-surface-inset text-cm-text-muted cursor-not-allowed'
          : isIncrease
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-red-600 hover:bg-red-500 text-white'
        }
      `}
    >
      {isIncrease ? '+' : '-'}
    </button>
  );
}

export function WoundIndicator({
  currentWounds,
  maxWounds,
  woundsPerModel,
  modelsAlive,
  totalModels,
  label,
  variant = 'default',
  onAdjust,
  className = '',
}: WoundIndicatorProps) {
  const currentModelWounds = currentWounds > 0
    ? ((currentWounds - 1) % woundsPerModel) + 1
    : 0;

  const canDecrease = currentWounds > 0;
  const canIncrease = currentWounds < maxWounds;

  const borderColor = variant === 'leader' ? 'border-purple-500/30' : 'border-cm-border-subtle';
  const bgColor = variant === 'leader' ? 'bg-purple-500/8' : 'bg-cm-surface-card';
  const labelColor = variant === 'leader' ? 'text-purple-400' : 'text-cm-text-muted';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3 ${className}`}>
      {label && (
        <div className={`text-xs uppercase tracking-wider mb-2 font-medium ${labelColor}`}>
          {label}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-cm-text-muted text-sm">Models:</span>
            <span className="text-cm-text font-medium">
              {modelsAlive} / {totalModels}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-cm-text-muted text-sm">Current Model:</span>
            <WoundPips
              current={currentModelWounds}
              max={woundsPerModel}
              variant={variant}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-cm-text-muted text-sm">Total:</span>
            <span className="text-cm-text font-medium">
              {currentWounds} / {maxWounds}
            </span>
          </div>
        </div>

        {onAdjust && (
          <div className="flex flex-col gap-1">
            <AdjustButton
              variant="increase"
              onClick={() => onAdjust(1)}
              disabled={!canIncrease}
            />
            <AdjustButton
              variant="decrease"
              onClick={() => onAdjust(-1)}
              disabled={!canDecrease}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface SimpleWoundBarProps {
  current: number;
  max: number;
  className?: string;
}

export function SimpleWoundBar({ current, max, className = '' }: SimpleWoundBarProps) {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const colorClass =
    percentage >= 100
      ? 'bg-green-500'
      : percentage >= 50
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className={`h-2 bg-cm-surface-inset rounded overflow-hidden ${className}`}>
      <div
        className={`h-full transition-all ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
