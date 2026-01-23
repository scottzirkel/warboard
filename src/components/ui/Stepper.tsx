interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeStyles = {
  sm: {
    button: 'w-6 h-6 text-xs',
    input: 'w-8 text-xs',
  },
  md: {
    button: 'w-8 h-8 text-sm',
    input: 'w-12 text-sm',
  },
};

export function Stepper({
  value,
  min = 0,
  max = 99,
  step = 1,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}: StepperProps) {
  const styles = sizeStyles[size];
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={!canDecrement}
        className={`
          ${styles.button}
          flex items-center justify-center rounded
          bg-gray-700 hover:bg-gray-600 text-gray-300
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        disabled={disabled}
        className={`
          ${styles.input}
          text-center bg-gray-800 border border-gray-600 rounded
          text-gray-200 focus:outline-none focus:border-accent-500
          disabled:opacity-50
          [appearance:textfield]
          [&::-webkit-outer-spin-button]:appearance-none
          [&::-webkit-inner-spin-button]:appearance-none
        `}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={!canIncrement}
        className={`
          ${styles.button}
          flex items-center justify-center rounded
          bg-gray-700 hover:bg-gray-600 text-gray-300
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
