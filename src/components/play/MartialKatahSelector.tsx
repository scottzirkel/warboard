'use client';

import { Badge } from '@/components/ui';

interface KatahStance {
  id: string;
  name: string;
  description: string;
}

interface MartialKatahSelectorProps {
  selectedKatah: string | null;
  onKatahChange: (katahId: string | null) => void;
  stances: KatahStance[];
  ruleName?: string;
  className?: string;
}

export function MartialKatahSelector({
  selectedKatah,
  onKatahChange,
  stances,
  ruleName = 'Martial Ka\'tah',
  className = '',
}: MartialKatahSelectorProps) {
  // Don't render if no stances are available
  if (!stances || stances.length === 0) {
    return null;
  }

  const handleSelect = (stanceId: string) => {
    if (selectedKatah === stanceId) {
      onKatahChange(null); // Deselect if clicking active stance
    } else {
      onKatahChange(stanceId);
    }
  };

  const activeStance = stances.find(s => s.id === selectedKatah);

  return (
    <div className={`bg-gray-700/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {ruleName}
        </span>
        {activeStance && (
          <Badge variant="purple" size="sm">
            Active
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {stances.map((stance) => {
          const isActive = selectedKatah === stance.id;

          return (
            <button
              key={stance.id}
              onClick={() => handleSelect(stance.id)}
              className={`
                w-full text-left p-3 rounded-lg transition-all
                ${isActive
                  ? 'bg-purple-900/50 border-2 border-purple-500 ring-1 ring-purple-400'
                  : 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'}
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isActive ? 'text-purple-300' : 'text-gray-300'}`}>
                  {stance.name}
                </span>
                {isActive && (
                  <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <p className={`text-sm mt-1 ${isActive ? 'text-purple-200/80' : 'text-gray-500'}`}>
                {stance.description}
              </p>
            </button>
          );
        })}
      </div>

      {!selectedKatah && (
        <p className="text-center text-xs text-gray-500 mt-3">
          Select a stance at the start of the Fight phase
        </p>
      )}
    </div>
  );
}
