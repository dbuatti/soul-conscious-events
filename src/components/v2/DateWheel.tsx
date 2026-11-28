import React, { useMemo, useRef } from 'react';
import { format, addDays, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateWheelProps {
  /** 'all' or a YYYY-MM-DD date string. */
  value: string;
  onChange: (value: string) => void;
  /** Number of days to show after "All". */
  days?: number;
  /** Set of YYYY-MM-DD dates that have at least one event. Days without events are de-emphasised. */
  eventDates?: Set<string>;
  className?: string;
}

/**
 * Horizontal, scrollable row of date chips. First chip is "All" (every
 * upcoming event), then today and the next N days. Selecting a chip filters
 * the event list to that single day.
 */
const DateWheel: React.FC<DateWheelProps> = ({ value, onChange, days = 14, eventDates, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const chips = useMemo(() => {
    const today = startOfToday();
    const list: { key: string; label: string; sub: string }[] = [
      { key: 'all', label: 'All', sub: 'upcoming' },
    ];
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      let label = format(d, 'EEE');
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';
      list.push({ key, label, sub: format(d, 'd MMM') });
    }
    return list;
  }, [days]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 scroll-smooth',
        className,
      )}
      role="tablist"
      aria-label="Filter by date"
    >
      {chips.map((chip) => {
        const active = value === chip.key;
        const hasEvent = chip.key === 'all' || !eventDates || eventDates.has(chip.key);
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={chip.key !== 'all' && !hasEvent}
            onClick={() => hasEvent && onChange(chip.key)}
            className={cn(
              'shrink-0 flex flex-col items-center justify-center min-w-[76px] h-14 rounded-xl border text-xs font-semibold transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : hasEvent
                  ? 'bg-card border-border/70 text-foreground hover:border-primary/40 hover:text-primary'
                  : 'bg-card/40 border-border/40 text-muted-foreground/40 cursor-not-allowed',
            )}
          >
            <span className="text-[10px] uppercase tracking-wide leading-none">{chip.label}</span>
            <span className={cn('text-[9px] mt-1.5 leading-none', active ? 'text-primary-foreground/80' : hasEvent ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
              {chip.sub}
            </span>
            {hasEvent && chip.key !== 'all' && (
              <span className={cn('mt-1 h-1 w-1 rounded-full', active ? 'bg-primary-foreground/80' : 'bg-primary/60')} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DateWheel;