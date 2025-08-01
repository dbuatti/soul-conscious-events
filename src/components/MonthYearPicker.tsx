import React from 'react';
import { format, setMonth, setYear } from 'date-fns'; // Import setYear
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface MonthYearPickerProps {
  date: Date; // Changed from defaultMonth
  onDateChange: (date: Date) => void; // Changed from onSelect
  className?: string;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  date, // Use 'date'
  onDateChange, // Use 'onDateChange'
  className,
}) => {
  const months = [
    'JAN', 'FEB', 'MAR', 'APR',
    'MAY', 'JUN', 'JUL', 'AUG',
    'SEP', 'OCT', 'NOV', 'DEC'
  ];

  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();

  // Generate years for selection (e.g., current year +/- 5 years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className={cn("p-4", className)}>
      {/* Year Selector */}
      <div className="mb-4">
        <select
          value={currentYear}
          onChange={(e) => onDateChange(setYear(date, parseInt(e.target.value)))}
          className="w-full p-2 border rounded-md bg-background text-foreground focus:ring-purple-500 focus:border-purple-500"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-4 gap-2">
        {months.map((month, index) => {
          const monthDate = setMonth(date, index);
          const isSelected = index === currentMonth;

          return (
            <button
              key={month}
              onClick={() => onDateChange(monthDate)}
              className={cn(
                buttonVariants({ variant: isSelected ? "default" : "ghost" }),
                "h-16 w-full p-0 font-normal flex items-center justify-center text-sm rounded-md",
                isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground hover:bg-accent hover:text-accent-foreground"
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