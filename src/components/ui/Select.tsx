import { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Select({
  options,
  placeholder,
  size: _size,
  className = '',
  ...props
}: SelectProps) {
  return (
    <select
      className={`
        w-full
        bg-cm-stat-bg border border-cm-border-input rounded-[10px]
        px-4 py-2.5 pr-10
        text-cm-text text-[15px]
        focus:outline-none focus:border-cm-border
        ${className}
      `}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
