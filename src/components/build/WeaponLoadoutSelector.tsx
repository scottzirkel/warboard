'use client';

import { Stepper } from '@/components/ui';
import type { LoadoutOption, LoadoutChoice } from '@/types';

interface WeaponLoadoutSelectorProps {
  option: LoadoutOption;
  modelCount: number;
  weaponCounts: Record<string, number>;
  onCountChange: (choiceId: string, count: number) => void;
  className?: string;
}

interface ChoiceRowProps {
  choice: LoadoutChoice;
  count: number;
  maxCount: number;
  onChange: (count: number) => void;
  isReplacement: boolean;
}

function ChoiceRow({ choice, count, maxCount, onChange, isReplacement }: ChoiceRowProps) {
  const effectiveMax = choice.maxModels !== undefined
    ? Math.min(choice.maxModels, maxCount)
    : maxCount;

  const hasMaxLimit = choice.maxModels !== undefined;

  return (
    <div
      className={`flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 ${
        !isReplacement ? 'border-l-2 border-green-500' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-300 truncate">{choice.name}</span>
        {choice.paired && (
          <span
            className="text-blue-400 text-xs"
            title="Paired loadout (equipped together)"
          >
            ⬡
          </span>
        )}
        {hasMaxLimit && (
          <span
            className="text-white/40 text-xs"
            title={`Max ${choice.maxModels} model(s) can take this option`}
          >
            (max {choice.maxModels})
          </span>
        )}
      </div>
      <Stepper
        value={count}
        min={0}
        max={effectiveMax}
        onChange={onChange}
        size="sm"
      />
    </div>
  );
}

export function WeaponLoadoutSelector({
  option,
  modelCount,
  weaponCounts,
  onCountChange,
  className = '',
}: WeaponLoadoutSelectorProps) {
  const isReplacement = option.pattern === 'replacement';

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Choices - filter out "none" as it's implied when no other choice is selected */}
      <div className="space-y-1">
        {option.choices
          .filter((choice) => choice.id !== 'none')
          .map((choice) => (
            <ChoiceRow
              key={choice.id}
              choice={choice}
              count={weaponCounts[choice.id] || 0}
              maxCount={modelCount}
              onChange={(count) => onCountChange(choice.id, count)}
              isReplacement={isReplacement}
            />
          ))}
      </div>
    </div>
  );
}
