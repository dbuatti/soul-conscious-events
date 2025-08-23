import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Filter as FilterIcon, List, CalendarDays, Map, X } from 'lucide-react';
import { eventTypes } from '@/lib/constants';
import FilterOverlay from '@/components/FilterOverlay';
import { australianStates } from '@/lib/constants';

interface EventFilterBarProps {
  searchTerm: string;
  eventType: string;
  stateFilter: string; // This is now geographicalStateFilter
  dateFilter: string;
  viewMode: 'list' | 'calendar' | 'map';
  onViewModeChange: (mode: 'list' | 'calendar' | 'map') => void;
  onApplyFilters: (filters: { searchTerm: string; eventType: string; state: string; dateFilter: string; }) => void;
  onClearAllFilters: () => void;
}

const EventFilterBar: React.FC<EventFilterBarProps> = ({
  searchTerm,
  eventType,
  stateFilter, // This is now geographicalStateFilter
  dateFilter,
  viewMode,
  onViewModeChange,
  onApplyFilters,
  onClearAllFilters,
}) => {
  const [isFilterOverlayOpen, setIsFilterOverlayOpen] = useState(false);

  const hasActiveFilters = searchTerm !== '' || eventType !== 'All' || stateFilter !== 'All' || dateFilter !== 'All Upcoming';

  const removeFilter = (filterType: 'search' | 'eventType' | 'state' | 'dateFilter') => {
    switch (filterType) {
      case 'search': onApplyFilters({ searchTerm: '', eventType, state: stateFilter, dateFilter }); break;
      case 'eventType': onApplyFilters({ searchTerm, eventType: 'All', state: stateFilter, dateFilter }); break;
      case 'state': onApplyFilters({ searchTerm, eventType, state: 'All', dateFilter }); break; // Clears geographicalStateFilter
      case 'dateFilter': onApplyFilters({ searchTerm, eventType, state: stateFilter, dateFilter: 'All Upcoming' }); break;
    }
  };

  return (
    <div className="mb-8 rounded-xl shadow-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button onClick={() => setIsFilterOverlayOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-2 px-4 rounded-md shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 text-sm sm:text-base">
          <FilterIcon className="mr-2 h-4 w-4" /> Filter Events
        </Button>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label htmlFor="view-mode" className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-right">View Mode</label>
          <ToggleGroup id="view-mode" type="single" value={viewMode} onValueChange={(value: 'list' | 'calendar' | 'map') => value && onViewModeChange(value)} className="w-full sm:w-auto justify-center sm:justify-end">
            <ToggleGroupItem value="calendar" aria-label="Calendar View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><CalendarDays className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><List className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Map View" className="h-8 w-8 sm:h-9 sm:w-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"><Map className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {hasActiveFilters && (
        <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-1 sm:gap-2 items-center">
          <span className="text-xs sm:text-sm font-medium text-foreground">Active Filters:</span>
          {searchTerm && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">Search: "{searchTerm}"<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('search')}><X className="h-2.5 w-2.5" /></Button></Badge>}
          {eventType !== 'All' && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">Type: {eventType}<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('eventType')}><X className="h-2.5 w-2.5" /></Button></Badge>}
          {stateFilter !== 'All' && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">State: {stateFilter}<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('state')}><X className="h-2.5 w-2.5" /></Button></Badge>}
          {dateFilter !== 'All Upcoming' && <Badge variant="secondary" className="bg-accent text-accent-foreground flex items-center gap-1 text-xs sm:text-sm py-0.5 px-1 sm:py-1 sm:px-2">Date: {dateFilter}<Button variant="ghost" size="sm" className="h-3 w-3 p-0" onClick={() => removeFilter('dateFilter')}><X className="h-2.5 w-2.5" /></Button></Badge>}
          {hasActiveFilters && <Button variant="outline" onClick={onClearAllFilters} className="w-full sm:w-auto transition-all text-sm sm:text-base mt-2 sm:mt-0">Clear All</Button>}
        </div>
      )}
      <FilterOverlay
        isOpen={isFilterOverlayOpen}
        onClose={() => setIsFilterOverlayOpen(false)}
        currentFilters={{ searchTerm, eventType, state: stateFilter, dateFilter }}
        onApplyFilters={onApplyFilters}
        onClearAllFilters={onClearAllFilters}
      />
    </div>
  );
};

export default EventFilterBar;