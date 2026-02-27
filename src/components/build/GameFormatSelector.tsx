'use client';

import { GAME_FORMATS } from '@/types';
import type { GameFormat } from '@/types';

interface GameFormatSelectorProps {
  value: GameFormat;
  onChange: (format: GameFormat) => void;
  className?: string;
}

export function GameFormatSelector({
  value,
  onChange,
  className = '',
}: GameFormatSelectorProps) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {GAME_FORMATS.map((format) => (
        <button
          key={format.id}
          type="button"
          onClick={() => onChange(format.id)}
          title={format.points !== null ? `${format.points} pts` : 'Custom points'}
          className={`
            flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors
            ${
              value === format.id
                ? 'bg-accent-500 text-gray-900'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }
          `}
        >
          {format.name}
        </button>
      ))}
    </div>
  );
}
