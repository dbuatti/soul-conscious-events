import React from 'react';
import { format, setMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface MonthYearPickerProps {
  defaultMonth: Date;
  onSelect: (month: Date) => void;
  className?: string;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  defaultMonth,
  onSelect,
  className,
}) => {
  const months = [
    'JAN', 'FEB', 'MAR', 'APR',
    'MAY', 'JUN', 'JUL', 'AUG',
    'SEP', 'OCT', 'NOV', 'DEC'
  ];

  const currentYear = defaultMonth.getFullYear();
  const currentMonth = defaultMonth.getMonth();

  return (
    <div className={cn("p-4", className)}>
      <div className="grid grid-cols-4 gap-2">
        {months.map((month, index) => {
          const monthDate = setMonth(new Date(currentYear, 0), index);
          const isSelected = index === currentMonth;

          return (
            <button
              key={month}
              onClick={() => onSelect(monthDate)}
              className={cn(
                buttonVariants({ variant: isSelected ? "default" : "ghost" }),
                "h-16 w-full p-0 font-normal flex items-center justify-center text-sm rounded-md",
                isSelected ? "bg-primary text-primary-foreground" : "text-foreground"
              )}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );
};

MonthYearPicker.displayName = "MonthYearPicker";

export { MonthYearPicker };