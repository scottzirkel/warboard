'use client';

import type { GameFormat } from '@/types';

interface GameFormatSelectorProps {
  value: GameFormat;
  onChange: (format: GameFormat) => void;
  className?: string;
}

const formats: { value: GameFormat; label: string; description: string }[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Standard matched play',
  },
  {
    value: 'colosseum',
    label: 'Colosseum',
    description: '500pt narrative format',
  },
];

export function GameFormatSelector({
  value,
  onChange,
  className = '',
}: GameFormatSelectorProps) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {formats.map((format) => (
        <button
          key={format.value}
          type="button"
          onClick={() => onChange(format.value)}
          title={format.description}
          className={`
            flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors
            ${
              value === format.value
                ? 'bg-accent-500 text-gray-900'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }
          `}
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}
