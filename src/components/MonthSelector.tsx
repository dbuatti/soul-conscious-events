import React from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Event } from '@/types/event';

interface MonthSelectorProps {
  events: Event[];
  selectedMonth: string | null; // Format: 'YYYY-MM'
  onMonthSelect: (month: string | null) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ events, selectedMonth, onMonthSelect }) => {
  const uniqueMonths = Array.from(
    new Set(
      events
        .map(event => format(parseISO(event.event_date), 'yyyy-MM'))
        .sort() // Sort months chronologically
    )
  );

  return (
    <div className="mb-6 flex flex-wrap gap-2 justify-center sm:justify-start">
      <Button
        variant={selectedMonth === null ? 'default' : 'outline'}
        onClick={() => onMonthSelect(null)}
        className={cn(
          "transition-all duration-300 ease-in-out transform hover:scale-105",
          selectedMonth === null ? "bg-primary text-primary-foreground" : "text-foreground"
        )}
      >
        All Months
      </Button>
      {uniqueMonths.map(month => (
        <Button
          key={month}
          variant={selectedMonth === month ? 'default' : 'outline'}
          onClick={() => onMonthSelect(month)}
          className={cn(
            "transition-all duration-300 ease-in-out transform hover:scale-105",
            selectedMonth === month ? "bg-primary text-primary-foreground" : "text-foreground"
          )}
        >
          {format(parseISO(`${month}-01`), 'MMM yyyy')}
        </Button>
      ))}
    </div>
  );
};

export default MonthSelector;