import React from 'react';
import { cn } from '@/lib/utils';
import { australianStates } from '@/lib/constants';

interface StateChipsProps {
  /** Currently selected states. */
  value: string[];
  onChange: (states: string[]) => void;
  className?: string;
}

/**
 * Horizontal, scrollable row of state chips. Single-select: clicking a chip
 * replaces the selection; clicking the active chip clears it (show all).
 * The default state is shown as selected without any "default" wording.
 */
const StateChips: React.FC<StateChipsProps> = ({ value, onChange, className }) => {
  const selected = value[0] ?? '';

  const handleSelect = (state: string) => {
    if (selected === state) onChange([]);
    else onChange([state]);
  };

  return (
    <div
      className={cn('flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1', className)}
      role="tablist"
      aria-label="Filter by location"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value.length === 0}
        onClick={() => onChange([])}
        className={cn(
          'shrink-0 px-3.5 h-9 rounded-full border text-xs font-semibold transition-colors',
          value.length === 0
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-card border-border/70 text-foreground hover:border-primary/40 hover:text-primary',
        )}
      >
        All Australia
      </button>
      {australianStates.map((state) => {
        const active = selected === state;
        return (
          <button
            key={state}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => handleSelect(state)}
            className={cn(
              'shrink-0 px-3.5 h-9 rounded-full border text-xs font-semibold transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border/70 text-foreground hover:border-primary/40 hover:text-primary',
            )}
          >
            {state}
          </button>
        );
      })}
    </div>
  );
};

export default StateChips;