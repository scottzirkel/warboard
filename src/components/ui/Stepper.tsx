interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  size?: 'sm' | 'md';
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
  size: _size,
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

  const btnStyles = `
    w-11 h-9 flex items-center justify-center
    text-accent-400 text-[22px] font-light
    transition-colors
    active:bg-[rgba(118,118,128,0.4)]
    disabled:opacity-30 disabled:cursor-not-allowed
  `;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="inline-flex bg-[rgba(118,118,128,0.24)] rounded-[9px] overflow-hidden">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          className={btnStyles}
          aria-label="Decrease"
        >
          −
        </button>
        <div className="w-px bg-[rgba(84,84,88,0.65)]" />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          className={btnStyles}
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
