'use client';

import { Stepper, TooltipBadge } from '@/components/ui';
import type { LoadoutOption, LoadoutChoice } from '@/types';

interface WeaponLoadoutSelectorProps {
  option: LoadoutOption;
  modelCount: number;
  weaponCounts: Record<string, number>;
  onCountChange: (choiceId: string, count: number) => void;
  /** Number of models excluded from this option by other options */
  excludedModels?: number;
  className?: string;
  showDivider?: boolean;
}

interface ChoiceRowProps {
  choice: LoadoutChoice;
  count: number;
  maxCount: number;
  onChange: (count: number) => void;
}

function ChoiceRow({ choice, count, maxCount, onChange }: ChoiceRowProps) {
  const effectiveMax = choice.maxModels !== undefined
    ? Math.min(choice.maxModels, maxCount)
    : maxCount;

  const hasMaxLimit = choice.maxModels !== undefined;

  return (
    <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-300 truncate">{choice.name}</span>
        {hasMaxLimit && (
          <span className="text-white/40 text-xs">
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
  excludedModels = 0,
  className = '',
  showDivider = false,
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
    <div className={className}>
      {showDivider && (
        <div className="border-t border-gray-700/50 my-2" />
      )}

      {/* Section header */}
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
          {option.name}
        </span>
        {groupMax !== undefined && (
          <TooltipBadge
            tooltip={`${groupConstraint!.max} replacement${groupConstraint!.max > 1 ? 's' : ''} per ${groupConstraint!.per} models. With ${modelCount} models, ${groupMax} total allowed.`}
          >
            {totalNonDefault}/{groupMax} {option.pattern === 'addition' ? 'equipped' : 'replaced'}
          </TooltipBadge>
        )}
      </div>

      {/* Default label for optional options (e.g., "Bolt Rifle (default)") */}
      {option.type === 'optional' && (() => {
        const defaultChoice = option.choices.find(c => c.default && c.id === 'none');
        const anyNonDefaultSelected = option.choices
          .filter(c => c.id !== 'none')
          .some(c => (weaponCounts[c.id] || 0) > 0);
        if (defaultChoice && defaultChoice.name !== 'None') {
          return (
            <div className="text-sm text-white/40 px-3 py-1">
              {anyNonDefaultSelected ? <s>{defaultChoice.name}</s> : defaultChoice.name}
              {!anyNonDefaultSelected && <span className="text-white/25 ml-1">(default)</span>}
            </div>
          );
        }
        return null;
      })()}

      {/* Choices */}
      <div className="space-y-1">
        {option.choices
          .filter((choice) => choice.id !== 'none')
          .map((choice) => {
            const isNonDefault = !choice.default;
            const currentCount = weaponCounts[choice.id] || 0;

            // Calculate effective max for this choice
            // Use maxModels cap or modelCount minus excluded models
            const allCapped = option.choices.every(c => c.maxModels !== undefined);
            let choiceMax = allCapped
              ? Math.max(...option.choices.map(c => c.maxModels!))
              : modelCount - excludedModels;

            // For non-default choices under a group constraint, limit to group remaining
            if (isNonDefault && groupRemaining !== undefined) {
              choiceMax = Math.min(choiceMax, currentCount + groupRemaining);
            }

            return (
              <ChoiceRow
                key={choice.id}
                choice={choice}
                count={currentCount}
                maxCount={choiceMax}
                onChange={(count) => onCountChange(choice.id, count)}
              />
            );
          })}
      </div>
    </div>
  );
}
