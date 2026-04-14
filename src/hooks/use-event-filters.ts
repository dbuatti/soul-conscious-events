import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, isFriday, isSaturday, isSunday, nextSaturday } from 'date-fns';
import { Event } from '@/types/event';
import { FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';

export const useEventFilters = (allEvents: Event[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterDropdownsV2Props['currentFilters']>({
    date: 'All Upcoming',
    category: [],
    venue: [],
    price: [],
    state: [],
  });

  const filteredEvents = useMemo(() => {
    console.log('[useEventFilters] Starting filtering process...');
    console.log('[useEventFilters] Input events count:', allEvents.length);
    console.log('[useEventFilters] Active filters:', filters);
    console.log('[useEventFilters] Search term:', searchTerm);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);

    const result = allEvents.filter(event => {
      // 1. Search Term Filter
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = 
          event.event_name.toLowerCase().includes(lowerSearch) ||
          (event.description?.toLowerCase().includes(lowerSearch)) ||
          (event.place_name?.toLowerCase().includes(lowerSearch)) ||
          (event.geographical_state?.toLowerCase().includes(lowerSearch));
        
        if (!matchesSearch) return false;
      }

      const eventDate = parseISO(event.event_date);

      // 2. Date Filter
      switch (filters.date) {
        case 'Today': if (!isToday(eventDate)) return false; break;
        case 'Tomorrow': if (!isSameDay(eventDate, tomorrow)) return false; break;
        case 'This Weekend':
          const sat = nextSaturday(now);
          const sun = addDays(sat, 1);
          const fri = addDays(sat, -1);
          if (!(isSameDay(eventDate, fri) || isSameDay(eventDate, sat) || isSameDay(eventDate, sun))) return false;
          break;
        case 'This Week':
          const startW = startOfWeek(now, { weekStartsOn: 1 });
          const endW = endOfWeek(now, { weekStartsOn: 1 });
          if (!(eventDate >= startW && eventDate <= endW)) return false;
          break;
        case 'This Month':
          const startM = startOfMonth(now);
          const endM = endOfMonth(now);
          if (!(eventDate >= startM && eventDate <= endM)) return false;
          break;
        case 'All Upcoming':
          if (isPast(eventDate) && !isToday(eventDate)) return false;
          break;
      }

      // 3. Category Filter
      if (filters.category.length > 0 && !filters.category.includes(event.event_type || '')) return false;
      
      // 4. Venue Filter
      if (filters.venue.length > 0 && !filters.venue.includes(event.place_name || '')) return false;
      
      // 5. Price Filter
      if (filters.price.length > 0) {
        const lowerCasePrice = event.price?.toLowerCase() || '';
        const isFree = lowerCasePrice.includes('free');
        const isDonation = lowerCasePrice.includes('donation');
        const isPaid = !isFree && !isDonation && !!lowerCasePrice;

        let priceMatch = false;
        if (filters.price.includes('Free') && isFree) priceMatch = true;
        if (filters.price.includes('Paid') && isPaid) priceMatch = true;
        if (filters.price.includes('Donation') && isDonation) priceMatch = true;
        if (!priceMatch) return false;
      }
      
      // 6. State Filter
      if (filters.state.length > 0 && !filters.state.includes(event.geographical_state || '')) return false;
      
      return true;
    });

    console.log('[useEventFilters] Filtering complete. Result count:', result.length);
    if (allEvents.length > 0 && result.length === 0) {
      console.warn('[useEventFilters] All events were filtered out! Check filter logic.');
    }
    return result;
  }, [allEvents, filters, searchTerm]);

  return {
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    filteredEvents,
  };
};