'use client';

import { Badge, Button } from '@/components/ui';

interface BattleRoundControlProps {
  round: number;
  onRoundChange: (round: number) => void;
  maxRound?: number;
  className?: string;
}

export function BattleRoundControl({
  round,
  onRoundChange,
  maxRound = 5,
  className = '',
}: BattleRoundControlProps) {
  const handlePrevRound = () => {
    if (round > 1) {
      onRoundChange(round - 1);
    }
  };

  const handleNextRound = () => {
    if (round < maxRound) {
      onRoundChange(round + 1);
    }
  };

  return (
    <div className={`bg-gray-700/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Battle Round
        </span>
        <Badge variant="accent" size="sm">
          {round} / {maxRound}
        </Badge>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrevRound}
          disabled={round <= 1}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <div className="flex items-center gap-2">
          {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
            <button
              key={r}
              onClick={() => onRoundChange(r)}
              className={`
                w-10 h-10 rounded-full font-bold text-lg transition-all
                ${r === round
                  ? 'bg-accent-500 text-gray-900 ring-2 ring-accent-400 ring-offset-2 ring-offset-gray-800'
                  : r < round
                    ? 'bg-gray-600 text-gray-400'
                    : 'bg-gray-700 text-gray-500 hover:bg-gray-600'}
              `}
            >
              {r}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleNextRound}
          disabled={round >= maxRound}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      <p className="text-center text-xs text-gray-500 mt-3">
        {round === 1 && 'Game begins'}
        {round === 2 && 'Early game'}
        {round === 3 && 'Mid game'}
        {round === 4 && 'Late game'}
        {round === 5 && 'Final round'}
      </p>
    </div>
  );
}
