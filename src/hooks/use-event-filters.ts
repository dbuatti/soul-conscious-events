import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay } from 'date-fns';
import { Event } from '@/types/event';
import { FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';

export const useEventFilters = (allEvents: Event[]) => {
  const [filters, setFilters] = useState<FilterDropdownsV2Props['currentFilters']>({
    date: 'All Upcoming',
    category: [],
    venue: [],
    price: [],
    state: [],
  });

  const filteredEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);

    return allEvents.filter(event => {
      const eventDate = parseISO(event.event_date);

      // Date Filtering
      switch (filters.date) {
        case 'Today': if (!isToday(eventDate)) return false; break;
        case 'Tomorrow': if (!isSameDay(eventDate, tomorrow)) return false; break;
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

      // Category Filtering
      if (filters.category.length > 0 && !filters.category.includes(event.event_type || '')) return false;
      
      // Venue Filtering
      if (filters.venue.length > 0 && !filters.venue.includes(event.place_name || '')) return false;
      
      // Price Filtering
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
      
      // State Filtering
      if (filters.state.length > 0 && !filters.state.includes(event.geographical_state || '')) return false;
      
      return true;
    });
  }, [allEvents, filters]);

  return {
    filters,
    setFilters,
    filteredEvents,
  };
};