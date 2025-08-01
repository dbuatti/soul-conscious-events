import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { eventTypes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Filter, XCircle, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EventSidebarProps {
  selectedEventType: string;
  onSelectEventType: (type: string) => void;
}

const EventSidebar: React.FC<EventSidebarProps> = ({ selectedEventType, onSelectEventType }) => {
  const [isEventTypeFilterOpen, setIsEventTypeFilterOpen] = useState(true); // State to manage toggle

  return (
    <div className="w-full lg:w-64 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex-shrink-0">
      <Collapsible
        open={isEventTypeFilterOpen}
        onOpenChange={setIsEventTypeFilterOpen}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-foreground flex items-center">
            <Filter className="mr-2 h-6 w-6 text-purple-600" /> Event Types
          </h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0 text-purple-700 hover:bg-purple-100">
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isEventTypeFilterOpen ? 'rotate-180' : ''}`} />
              <span className="sr-only">Toggle event types</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="CollapsibleContent">
          <div className="space-y-2">
            {eventTypes.map((type) => (
              <Button
                key={type}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-lg py-2 px-4 rounded-lg transition-all duration-200 ease-in-out",
                  selectedEventType === type
                    ? "bg-purple-100 text-purple-800 font-semibold hover:bg-purple-200"
                    : "text-gray-700 hover:bg-gray-100"
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
              className="w-full mt-6 text-red-600 hover:text-red-800 hover:bg-red-50 transition-all duration-300 ease-in-out transform hover:scale-105"
              onClick={() => onSelectEventType('All')}
            >
              <XCircle className="mr-2 h-4 w-4" /> Clear Type Filter
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default EventSidebar;