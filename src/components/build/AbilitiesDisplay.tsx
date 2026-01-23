'use client';

import { Badge } from '@/components/ui';
import type { Ability } from '@/types';

interface AbilitiesDisplayProps {
  abilities: Ability[];
  className?: string;
}

export function AbilitiesDisplay({ abilities, className = '' }: AbilitiesDisplayProps) {
  if (abilities.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 text-sm ${className}`}>
        No abilities.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {abilities.map((ability) => (
        <div
          key={ability.id}
          className="p-3 bg-gray-800/50 rounded border border-gray-700/30"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-200">{ability.name}</span>
                {ability.id === 'leader' && (
                  <Badge variant="purple" size="sm">
                    Leader
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {ability.description}
              </p>
              {ability.eligibleUnits && ability.eligibleUnits.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Can lead: </span>
                  {ability.eligibleUnits.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
