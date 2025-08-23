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
import { eventTypes, australianStates } from '@/lib/constants'; // Ensure australianStates is imported
import { Filter as FilterIcon, X } from 'lucide-react';

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: {
    searchTerm: string;
    eventType: string;
    state: string; // This is now geographicalState
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
  const [localGeographicalState, setLocalGeographicalState] = useState(currentFilters.state); // New state for geographical state
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
      state: localGeographicalState, // Pass new geographical state
      dateFilter: localDateFilter,
    });
    onClose();
  };

  const handleClear = () => {
    setLocalSearchTerm('');
    setLocalEventType('All');
    setLocalGeographicalState('All'); // Clear new geographical state
    setLocalDateFilter('All Upcoming');
    onClearAllFilters(); // Also trigger parent clear all
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
          <div className="grid gap-2">
            <Label htmlFor="search-term" className="text-foreground">Search Term</Label>
            <Input
              id="search-term"
              placeholder="Event name, description, location..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="focus-visible:ring-primary"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-type" className="text-foreground">Event Type</Label>
            <Select value={localEventType} onValueChange={setLocalEventType}>
              <SelectTrigger id="event-type" className="focus-visible:ring-primary">
                <SelectValue placeholder="Select an event type" />
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="geographical-state" className="text-foreground">Australian State</Label>
            <Select value={localGeographicalState} onValueChange={setLocalGeographicalState}>
              <SelectTrigger id="geographical-state" className="focus-visible:ring-primary">
                <SelectValue placeholder="Select a state" />
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date-filter" className="text-foreground">Date Filter</Label>
            <Select value={localDateFilter} onValueChange={setLocalDateFilter}>
              <SelectTrigger id="date-filter" className="focus-visible:ring-primary">
                <SelectValue placeholder="Select a date range" />
              </SelectTrigger>
              <SelectContent className="dark:bg-card dark:border-border">
                {dateFilterOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleClear} className="w-full sm:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
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