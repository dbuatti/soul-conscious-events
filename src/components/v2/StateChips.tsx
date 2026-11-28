import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { australianStates } from '@/lib/constants';

interface StateChipsProps {
  /** Currently selected states. */
  value: string[];
  onChange: (states: string[]) => void;
  className?: string;
}

const chipClass = (active: boolean) =>
  cn(
    'shrink-0 px-3.5 h-9 rounded-full border text-xs font-semibold transition-colors',
    active
      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
      : 'bg-card border-border/70 text-foreground hover:border-primary/40 hover:text-primary',
  );

/**
 * Horizontal, scrollable row of state chips. Clicking a chip selects only
 * that state; clicking the active chip clears it (show all). Selected states
 * (your default included) always lead the row, before "All Australia", so the
 * active choice is visible without scrolling.
 */
const StateChips: React.FC<StateChipsProps> = ({ value, onChange, className }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const selected = australianStates.filter((s) => value.includes(s));
  const others = australianStates.filter((s) => !value.includes(s));
  const selectionKey = selected.join(',');

  // The row may be scrolled sideways; bring the newly ordered start into view.
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [selectionKey]);

  const handleSelect = (state: string) => {
    if (value.length === 1 && value[0] === state) onChange([]);
    else onChange([state]);
  };

  const stateChip = (state: string) => {
    const active = value.includes(state);
    return (
      <button
        key={state}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => handleSelect(state)}
        className={chipClass(active)}
      >
        {state}
      </button>
    );
  };

  return (
    <div
      ref={rowRef}
      className={cn('flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1', className)}
      role="tablist"
      aria-label="Filter by location"
    >
      {selected.map(stateChip)}
      <button
        type="button"
        role="tab"
        aria-selected={value.length === 0}
        onClick={() => onChange([])}
        className={chipClass(value.length === 0)}
      >
        All Australia
      </button>
      {others.map(stateChip)}
    </div>
  );
};

export default StateChips;
