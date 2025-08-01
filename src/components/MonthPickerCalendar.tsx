import React from 'react';
import { DayPicker, ClassNames } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  className?: string;
  classNames?: ClassNames;
  showOutsideDays?: boolean;
}

const MonthPickerCalendar: React.FC<MonthPickerCalendarProps> = ({
  selected,
  onSelect,
  defaultMonth,
  className,
  classNames,
  showOutsideDays = true,
}) => {
  const defaultDayPickerClassNames: ClassNames = {
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
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
    row: "flex w-full mt-2",
    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
    day: cn(
      buttonVariants({ variant: "ghost" }),
      "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
    ),
    day_range_start: "day-range-start",
    day_range_end: "day-range-end",
    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
    day_today: "bg-accent text-accent-foreground",
    day_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
    day_disabled: "text-muted-foreground opacity-50",
    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
    day_hidden: "invisible",
    // These are for when view="month" is active
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

  return (
    <DayPicker
      mode="default" // Changed from removed "single" to "default" to enable 'view' prop
      view="month" // This forces the calendar to always show the month grid
      selected={selected} // Pass selected prop
      onSelect={onSelect} // Pass onSelect prop directly
      defaultMonth={defaultMonth} // Pass defaultMonth prop
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaultDayPickerClassNames,
        ...classNames, // Merge with any passed classNames
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
    />
  );
};
MonthPickerCalendar.displayName = "MonthPickerCalendar";

export { MonthPickerCalendar };