import React from 'react';
import { Button } from '@/components/ui/button';
import { eventTypes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Filter, XCircle } from 'lucide-react';

interface EventSidebarProps {
  selectedEventType: string;
  onSelectEventType: (type: string) => void;
}

const EventSidebar: React.FC<EventSidebarProps> = ({ selectedEventType, onSelectEventType }) => {
  return (
    <div className="w-full lg:w-64 bg-white p-6 rounded-xl shadow-lg border border-border flex-shrink-0">
      <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center">
        <Filter className="mr-2 h-6 w-6 text-primary" /> Event Types
      </h3>
      <div className="space-y-2">
        {eventTypes.map((type) => (
          <Button
            key={type}
            variant="ghost"
            className={cn(
              "w-full justify-start text-lg py-2 px-4 rounded-lg transition-all duration-200 ease-in-out",
              selectedEventType === type
                ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                : "text-foreground hover:bg-muted"
            )}
            onClick={() => onSelectEventType(type)}
          >
            {type}
          </Button>
        ))}
      </div>
      {selectedEventType !== 'All' && (
        <Button
          variant="outline"
          className="w-full mt-6 text-destructive hover:text-destructive-foreground hover:bg-destructive/10 transition-all duration-300 ease-in-out transform hover:scale-105"
          onClick={() => onSelectEventType('All')}
        >
          <XCircle className="mr-2 h-4 w-4" /> Clear Type Filter
        </Button>
      )}
    </div>
  );
};

export default EventSidebar;