import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eventTypes, australianStates } from '@/lib/constants';
import { Filter as FilterIcon, X, Search, Tag, MapPin, CalendarDays } from 'lucide-react'; // Added icons for labels

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: {
    searchTerm: string;
    eventType: string;
    state: string;
    dateFilter: string;
  };
  onApplyFilters: (filters: { searchTerm: string; eventType: string; state: string; dateFilter: string; }) => void;
  onClearAllFilters: () => void;
}

const dateFilterOptions = [
  'All Upcoming', 'Today', 'This Week', 'This Month', 'Past Events', 'All Events'
];

const FilterOverlay: React.FC<FilterOverlayProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  onClearAllFilters,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(currentFilters.searchTerm);
  const [localEventType, setLocalEventType] = useState(currentFilters.eventType);
  const [localGeographicalState, setLocalGeographicalState] = useState(currentFilters.state);
  const [localDateFilter, setLocalDateFilter] = useState(currentFilters.dateFilter);

  useEffect(() => {
    setLocalSearchTerm(currentFilters.searchTerm);
    setLocalEventType(currentFilters.eventType);
    setLocalGeographicalState(currentFilters.state);
    setLocalDateFilter(currentFilters.dateFilter);
  }, [currentFilters]);

  const handleApply = () => {
    onApplyFilters({
      searchTerm: localSearchTerm,
      eventType: localEventType,
      state: localGeographicalState,
      dateFilter: localDateFilter,
    });
    onClose();
  };

  const handleClearIndividual = (filterType: 'search' | 'eventType' | 'state' | 'dateFilter') => {
    switch (filterType) {
      case 'search': setLocalSearchTerm(''); break;
      case 'eventType': setLocalEventType('All'); break;
      case 'state': setLocalGeographicalState('All'); break;
      case 'dateFilter': setLocalDateFilter('All Upcoming'); break;
    }
  };

  const handleClearAll = () => {
    setLocalSearchTerm('');
    setLocalEventType('All');
    setLocalGeographicalState('All');
    setLocalDateFilter('All Upcoming');
    onClearAllFilters();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md dark:bg-sidebar-background dark:border-sidebar-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center">
            <FilterIcon className="mr-2 h-5 w-5" /> Filter Events
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Refine your event search with various criteria.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          {/* Search Term Filter */}
          <div className="space-y-2 border-b pb-4 border-border last:border-b-0">
            <Label htmlFor="search-term" className="text-foreground flex items-center font-semibold">
              <Search className="mr-2 h-4 w-4" /> Search Term
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="search-term"
                placeholder="Event name, description, location..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="focus-visible:ring-primary"
              />
              {localSearchTerm !== '' && (
                <Button variant="ghost" size="icon" onClick={() => handleClearIndividual('search')} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Event Type Filter */}
          <div className="space-y-2 border-b pb-4 border-border last:border-b-0">
            <Label htmlFor="event-type" className="text-foreground flex items-center font-semibold">
              <Tag className="mr-2 h-4 w-4" /> Event Type
            </Label>
            <div className="flex items-center space-x-2">
              <Select value={localEventType} onValueChange={setLocalEventType}>
                <SelectTrigger id="event-type" className="focus-visible:ring-primary">
                  <SelectValue>
                    {localEventType === 'All' ? 'All Types' : localEventType || 'Select an event type'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-card dark:border-border">
                  <SelectItem value="All">All Types</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localEventType !== 'All' && (
                <Button variant="ghost" size="icon" onClick={() => handleClearIndividual('eventType')} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Australian State Filter */}
          <div className="space-y-2 border-b pb-4 border-border last:border-b-0">
            <Label htmlFor="geographical-state" className="text-foreground flex items-center font-semibold">
              <MapPin className="mr-2 h-4 w-4" /> Australian State
            </Label>
            <div className="flex items-center space-x-2">
              <Select value={localGeographicalState} onValueChange={setLocalGeographicalState}>
                <SelectTrigger id="geographical-state" className="focus-visible:ring-primary">
                  <SelectValue>
                    {localGeographicalState === 'All' ? 'All States' : localGeographicalState || 'Select a state'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-card dark:border-border">
                  <SelectItem value="All">All States</SelectItem>
                  {australianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localGeographicalState !== 'All' && (
                <Button variant="ghost" size="icon" onClick={() => handleClearIndividual('state')} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="date-filter" className="text-foreground flex items-center font-semibold">
              <CalendarDays className="mr-2 h-4 w-4" /> Date Filter
            </Label>
            <div className="flex items-center space-x-2">
              <Select value={localDateFilter} onValueChange={setLocalDateFilter}>
                <SelectTrigger id="date-filter" className="focus-visible:ring-primary">
                  <SelectValue>
                    {localDateFilter === 'All Upcoming' ? 'All Upcoming' : localDateFilter || 'Select a date range'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-card dark:border-border">
                  {dateFilterOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localDateFilter !== 'All Upcoming' && (
                <Button variant="ghost" size="icon" onClick={() => handleClearIndividual('dateFilter')} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <SheetFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleClearAll} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
            <X className="mr-2 h-4 w-4" /> Clear All
          </Button>
          <Button onClick={handleApply} className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterOverlay;