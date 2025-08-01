import React from 'react';
import { cn } from '@/lib/utils';
import { CircleDot } from 'lucide-react';

interface MultiDayEventBarProps {
  eventId: string;
  eventName: string;
  eventTime?: string;
  startDate: Date;
  endDate: Date;
  calendarStartDate: Date;
  calendarEndDate: Date;
  rowIndex: number;
  totalRows: number;
  colorClass?: string;
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
  colorClass = 'bg-blue-600 text-white',
  onClick,
}) => {
  const totalCols = Math.floor((calendarEndDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const startColIndex = Math.max(0, Math.floor((startDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24)));
  const endColIndex = Math.min(totalCols - 1, Math.floor((endDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  if (endColIndex < 0 || startColIndex >= totalCols) return null;

  const colSpan = endColIndex - startColIndex + 1;
  const barHeight = `calc((100% - ${(totalRows - 1) * 5}px) / ${totalRows})`;
  const topPosition = `calc(${rowIndex * (100 / totalRows)}% + ${rowIndex * 5}px)`;
  
  const isActualStart = startColIndex === Math.floor((startDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const isActualEnd = endColIndex === Math.floor((endDate.getTime() - calendarStartDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      className={cn(
        "absolute flex items-center px-1 py-0.5 text-xs font-medium truncate cursor-pointer",
        colorClass,
        isActualStart ? "rounded-l-md" : "rounded-l-none",
        isActualEnd ? "rounded-r-md" : "rounded-r-none"
      )}
      style={{
        gridColumnStart: startColIndex + 1,
        gridColumnEnd: `span ${colSpan}`,
        height: barHeight,
        top: topPosition,
        zIndex: 10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(eventId);
      }}
    >
      <div className="flex items-center w-full min-w-0">
        {isActualStart && <CircleDot className="h-2 w-2 mr-1 flex-shrink-0" />}
        <span className="truncate">
          {isActualStart && eventTime && <span className="font-bold mr-1">{eventTime}</span>}
          {isActualStart ? eventName : '...continued'}
        </span>
      </div>
    </div>
  );
};

export default MultiDayEventBar;