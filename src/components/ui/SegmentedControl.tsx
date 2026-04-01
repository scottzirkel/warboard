import { ReactNode } from 'react';

export interface SegmentedControlOption<T extends string | null = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedControlProps<T extends string | null = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string | null = string>({
  options,
  value,
  onChange,
  className = '',
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`
        flex items-stretch bg-cm-surface-hover rounded-lg p-0.5
        ${className}
      `}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const isDisabled = disabled || option.disabled;

        return (
          <div
            key={String(option.value)}
            onClick={() => !isDisabled && onChange(option.value)}
            title={option.title}
            style={isActive ? {
              backgroundColor: 'var(--cm-control-active, rgba(255,255,255,0.12))',
              color: 'var(--cm-control-active-text, var(--cm-text))',
              boxShadow: 'var(--cm-shadow-ring)',
            } : undefined}
            className={`
              flex-1 flex flex-col items-center justify-center px-3 py-2
              rounded-md text-sm font-medium transition-all select-none text-center
              ${isActive
                ? ''
                : 'text-cm-text-secondary hover:text-cm-text hover:bg-cm-surface-hover-subtle cursor-pointer'
              }
              ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
          </div>
        );
      })}
    </div>
  );
}
