import React from 'react';
import { DayPicker, DayPickerProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthYearPickerProps {
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  className?: string;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  onSelect,
  defaultMonth,
  className,
}) => {
  const classNames: any = { // Assert to 'any' to resolve TypeScript error for months_grid/month_cell
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-medium",
    nav: "space-x-1 flex items-center",
    nav_button: cn(
      buttonVariants({ variant: "outline" }),
      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
    ),
    nav_button_previous: "absolute left-1",
    nav_button_next: "absolute right-1",
    // Specific classes for month view
    months_grid: "grid w-full grid-cols-3 gap-1",
    month_cell: cn(
      buttonVariants({ variant: "ghost" }),
      "h-16 w-full p-0 font-normal aria-selected:opacity-100 flex items-center justify-center text-sm rounded-md"
    ),
    month_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
    month_today: "bg-accent text-accent-foreground",
    month_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
    month_disabled: "text-muted-foreground opacity-50",
  };

  const dayPickerProps = {
    view: "months",
    onSelect: onSelect, // Corrected: Use onSelect for month selection in 'months' view
    defaultMonth: defaultMonth,
    numberOfMonths: 1, // Crucial: Set to 1 to display only one year's months (4x3 grid)
    className: cn("p-3", className),
    classNames: classNames,
    components: {
      IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
      IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
    },
  };

  return (
    <DayPicker {...dayPickerProps} />
  );
};

MonthYearPicker.displayName = "MonthYearPicker";

export { MonthYearPicker };