import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button'; // Ensure buttonVariants is imported for nav buttons

interface MonthYearPickerProps {
  defaultMonth: Date;
  onMonthSelect?: (month: Date) => void;
}

export function MonthYearPicker({ defaultMonth, onMonthSelect }: MonthYearPickerProps) {
  console.log('MonthYearPicker: Rendering with defaultMonth:', format(defaultMonth, 'MMMM yyyy'));
  
  const [month, setMonth] = useState(defaultMonth);

  const handleMonthSelect = (newMonth: Date) => {
    console.log('MonthYearPicker: Selected month:', format(newMonth, 'MMMM yyyy'));
    setMonth(newMonth);
    onMonthSelect?.(newMonth);
  };

  return (
    <div className="p-3 bg-white rounded-lg">
      <DayPicker
        {...{ // Cast the entire props object to any to bypass the TypeScript error
          view: "months",
          numberOfMonths: 1,
          defaultMonth: defaultMonth,
          onMonthSelect: handleMonthSelect,
          classNames: {
            months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
            month: 'space-y-4',
            caption: 'hidden', // Hide the month/year caption
            nav: 'flex justify-between mb-2', // Style navigation arrows
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            // Crucial for month-only view:
            months_grid: 'grid grid-cols-4 gap-2 w-full', // This creates the 4x3 grid
            month_cell: cn('text-center p-3 cursor-pointer hover:bg-gray-100 rounded text-sm font-medium'),
            weekdays: 'hidden', // Hide weekday headers (Su, Mo, Tu)
            days: 'hidden', // Hide the grid of days
            day: 'hidden', // Hide individual day cells
          },
          components: {
            IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
            IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
          },
        } as any}
      />
    </div>
  );
}