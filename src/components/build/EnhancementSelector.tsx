'use client';

import { useState } from 'react';
import { Modal, Badge } from '@/components/ui';
import { AccordionItem } from '@/components/ui/AccordionGroup';
import type { Enhancement } from '@/types';

interface EnhancementSelectorProps {
  value: string;
  onChange: (enhancementId: string) => void;
  enhancements: Enhancement[];
  className?: string;
}

export function EnhancementSelector({
  value,
  onChange,
  enhancements,
  className = '',
}: EnhancementSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selected = enhancements.find((e) => e.id === value);
  const label = selected ? `${selected.name} (+${selected.points}pts)` : 'None';

  const handleSelect = (enhancementId: string) => {
    onChange(enhancementId);
    setIsOpen(false);
  };

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`
          w-full text-left px-3 py-1.5 rounded-lg text-sm
          bg-cm-surface-hover-subtle border border-cm-border-input text-cm-text
          hover:bg-cm-surface-hover transition-colors cursor-pointer
          ${className}
        `}
      >
        {label}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Enhancement"
        size="sm"
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`
              w-full text-left px-3 py-2 rounded-lg text-sm font-medium
              transition-colors cursor-pointer
              ${value === '' ? 'bg-accent-500/20 text-accent-400' : 'bg-cm-surface-hover text-cm-text hover:bg-cm-surface-hover-subtle'}
            `}
          >
            None
          </button>

          {enhancements.map((enhancement) => (
            <AccordionItem
              key={enhancement.id}
              id={enhancement.id}
              title={enhancement.name}
              isOpen={expandedId === enhancement.id}
              onToggle={handleToggle}
              variant={value === enhancement.id ? 'activated' : 'default'}
              rightContent={
                <Badge variant="accent">+{enhancement.points}pts</Badge>
              }
            >
              <p className="text-sm text-cm-text-secondary mb-3">
                {enhancement.description}
              </p>
              <button
                type="button"
                onClick={() => handleSelect(enhancement.id)}
                className={`
                  w-full py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${value === enhancement.id
                    ? 'bg-green-600/30 text-green-400'
                    : 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'}
                `}
              >
                {value === enhancement.id ? 'Selected' : 'Select'}
              </button>
            </AccordionItem>
          ))}
        </div>
      </Modal>
    </>
  );
}
