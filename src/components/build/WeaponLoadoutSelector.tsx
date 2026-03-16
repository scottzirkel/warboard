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
  groupLimited?: boolean;
}

function ChoiceRow({ choice, count, maxCount, onChange, groupLimited }: ChoiceRowProps) {
  const effectiveMax = choice.maxModels !== undefined
    ? Math.min(choice.maxModels, maxCount)
    : maxCount;

  const finalMax = groupLimited !== undefined ? Math.min(effectiveMax, maxCount) : effectiveMax;
  const hasMaxLimit = choice.maxModels !== undefined;

  return (
    <div
      className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-300 truncate">{choice.name}</span>
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
        max={finalMax}
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
  // Calculate group non-default constraint
  const groupConstraint = option.maxNonDefaultPerModels;
  const groupMax = groupConstraint
    ? Math.floor(modelCount / groupConstraint.per) * groupConstraint.max
    : undefined;
  const totalNonDefault = groupConstraint
    ? option.choices
        .filter(c => !c.default && c.id !== 'none')
        .reduce((sum, c) => sum + (weaponCounts[c.id] || 0), 0)
    : 0;
  const groupRemaining = groupMax !== undefined ? groupMax - totalNonDefault : undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      {groupMax !== undefined && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <span className="text-xs text-white/50">
            {totalNonDefault}/{groupMax} upgrade{groupMax !== 1 ? 's' : ''} used
          </span>
          <span
            className="text-white/30 text-xs cursor-help"
            title={`${groupConstraint!.max} per ${groupConstraint!.per} models — for ${modelCount} models, ${groupMax} total allowed`}
          >
            info
          </span>
        </div>
      )}
      {/* Choices - filter out "none" as it's implied when no other choice is selected */}
      <div className="space-y-1">
        {option.choices
          .filter((choice) => choice.id !== 'none')
          .map((choice) => {
            const isNonDefault = !choice.default;
            const currentCount = weaponCounts[choice.id] || 0;
            // For non-default choices under a group constraint, limit the max
            let choiceMax = modelCount;
            if (isNonDefault && groupRemaining !== undefined) {
              choiceMax = Math.min(modelCount, currentCount + groupRemaining);
            }

            return (
              <ChoiceRow
                key={choice.id}
                choice={choice}
                count={currentCount}
                maxCount={choiceMax}
                onChange={(count) => onCountChange(choice.id, count)}
                groupLimited={isNonDefault && groupMax !== undefined}
              />
            );
          })}
      </div>
    </div>
  );
}
