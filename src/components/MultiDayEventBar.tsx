import React from 'react';
import { cn } from '@/lib/utils';
import { CircleDot } from 'lucide-react';

interface MultiDayEventBarProps {
  eventId: string;
  eventName: string;
  eventTime?: string;
  startDate: Date; // The actual start date of the event
  endDate: Date;   // The actual end date of the event
  calendarStartDate: Date; // The first date visible in the current calendar view (e.g., start of month/week)
  calendarEndDate: Date;   // The last date visible in the current calendar view (e.g., end of month/week)
  rowIndex: number; // The row index (0-based) this bar belongs to, for vertical positioning
  totalRows: number; // Total number of concurrent multi-day events in this segment, to calculate height
  colorClass?: string; // Optional class for custom coloring
  onClick: (eventId: string) => void;
}

const MultiDayEventBar: React.FC<MultiDayEventBarProps> = ({
  eventId,
  eventName,
  eventTime,
  startDate,
  endDate,
  calendarStartDate,
  calendarEndDate,
  rowIndex,
  totalRows,
  colorClass = 'bg-blue-600 text-white dark:bg-blue-800 dark:text-blue-100',
  onClick,
}) => {
  // Calculate the start and end columns within the visible calendar range (0-indexed)
  const calendarStartCol = 0;
  const calendarEndCol = Math.floor((calendarEndDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate the event's start and end columns relative to the calendar view
  const eventStartCol = Math.floor((startDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const eventEndCol = Math.floor((endDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine the visible start and end columns for this bar segment
  const startCol = Math.max(calendarStartCol, eventStartCol);
  const endCol = Math.min(calendarEndCol, eventEndCol);

  // If the event segment is completely outside the visible range, don't render
  if (startCol > calendarEndCol || endCol < calendarStartCol) {
    return null;
  }

  // Calculate the number of columns this bar segment spans
  const colSpan = endCol - startCol + 1;

  // Calculate vertical position and height (assuming 4px vertical spacing between bars)
  // The `top` and `height` are now the sole controllers of vertical position and size.
  const barHeight = `calc((100% - ${(totalRows - 1) * 4}px) / ${totalRows})`;
  const topPosition = `calc(${rowIndex * (100 / totalRows)}% + ${rowIndex * 4}px)`;

  // Determine if this bar segment represents the actual start or end of the event
  const isActualStart = startDate.getTime() === (new Date(calendarStartDate.getTime() + startCol * 24 * 60 * 60 * 1000)).getTime();
  const isActualEnd = endDate.getTime() === (new Date(calendarStartDate.getTime() + endCol * 24 * 60 * 60 * 1000)).getTime();

  return (
    <div
      className={cn(
        "absolute flex items-center px-1 py-0.5 text-xs font-medium truncate cursor-pointer",
        colorClass,
        isActualStart ? "rounded-l-md" : "rounded-l-none",
        isActualEnd ? "rounded-r-md" : "rounded-r-none"
      )}
      style={{
        gridColumnStart: startCol + 1, // CSS grid columns are 1-indexed
        gridColumnEnd: `span ${colSpan}`,
        height: barHeight,
        top: topPosition,
        zIndex: 10, // Ensure it's above the cell background but below day numbers
      }}
      onClick={(e) => {
        e.stopPropagation(); // Prevent day click
        onClick(eventId);
      }}
    >
      <div className="flex items-center w-full min-w-0">
        {isActualStart && <CircleDot className="h-2 w-2 mr-1 text-inherit" />}
        <span className="truncate">
          {isActualStart && eventTime && <span className="font-bold mr-1">{eventTime}</span>}
          {isActualStart ? eventName : '...continued'}
        </span>
      </div>
    </div>
  );
};

export default MultiDayEventBar;