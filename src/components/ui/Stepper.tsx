interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  size?: 'sm' | 'md';  // Kept for compatibility, styling is consistent
  className?: string;
}

export function Stepper({
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  disabled = false,
  showValue = true,
  className = '',
}: StepperProps) {
  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  const handleDecrement = () => {
    if (canDecrement) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="stepper">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          className="stepper-btn"
          aria-label="Decrease"
        >
          −
        </button>
        <div className="stepper-divider" />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          className="stepper-btn"
          aria-label="Increase"
        >
          +
        </button>
      </div>
      {showValue && (
        <span className="text-white font-semibold min-w-[24px] text-center">
          {value}
        </span>
      )}
    </div>
  );
}
