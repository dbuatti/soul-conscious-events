import { useEffect, useMemo, useState } from 'react';
import { parseISO, isToday, isPast, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay } from 'date-fns';
import { Event } from '@/types/event';
import { FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';

/** Higher scores put the events the user actually named at the top. */
const searchScore = (event: Event, term: string): number => {
  const name = event.event_name.toLowerCase();
  const place = event.place_name?.toLowerCase() ?? '';
  const address = event.full_address?.toLowerCase() ?? '';
  const state = event.geographical_state?.toLowerCase() ?? '';
  const description = event.description?.toLowerCase() ?? '';

  if (name === term) return 100;
  if (name.startsWith(term)) return 80;
  if (name.includes(term)) return 60;
  if (place.startsWith(term)) return 50;
  if (place.includes(term)) return 40;
  if (address.includes(term)) return 30;
  if (state.includes(term)) return 20;
  if (description.includes(term)) return 10;
  return 0;
};

export const useEventFilters = (
  allEvents: Event[],
  defaultState?: string | null,
  externalSearchTerm?: string,
  stateOverride?: string,
) => {
  const preferredState = stateOverride || defaultState;
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterDropdownsV2Props['currentFilters']>({
    date: 'All Upcoming',
    category: [],
    venue: [],
    price: [],
    state: preferredState ? [preferredState] : [],
  });

  // Use externally-provided search term (debounced) when available, otherwise internal state.
  const searchTerm = externalSearchTerm ?? internalSearchTerm;

  // Re-apply the saved preference if it changes in Settings. City guides pin
  // their own state instead, so a user's home preference cannot move them to
  // another city's page.
  useEffect(() => {
    if (stateOverride) return;
    setFilters((current) => ({
      ...current,
      state: defaultState ? [defaultState] : [],
    }));
  }, [defaultState, stateOverride]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = addDays(now, 1);

    const result = allEvents.filter(event => {
      // 1. Search Term Filter
      if (searchTerm && searchScore(event, searchTerm.trim().toLowerCase()) === 0) return false;

      const eventDate = parseISO(event.event_date);

      // 2. Date Filter
      // A specific ISO date (YYYY-MM-DD) coming from the date wheel filters to
      // that single day; everything else falls through to the named presets.
      if (/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
        if (!isSameDay(eventDate, parseISO(filters.date))) return false;
      } else {
      switch (filters.date) {
        case 'Today': 
          if (!isToday(eventDate)) return false; 
          break;
        case 'Tomorrow': 
          if (!isSameDay(eventDate, tomorrow)) return false; 
          break;
        case 'This Weekend': {
          const dayOfWeek = now.getDay();
          let diffToFriday = (5 - dayOfWeek);
          if (dayOfWeek === 0) diffToFriday = -2;
          if (dayOfWeek === 6) diffToFriday = -1;
          
          const thisFri = addDays(now, diffToFriday);
          const thisSun = addDays(thisFri, 2);
          
          if (!(eventDate >= thisFri && eventDate <= thisSun)) return false;
          break;
        }
        case 'This Week': {
          const startW = startOfWeek(now, { weekStartsOn: 1 });
          const endW = endOfWeek(now, { weekStartsOn: 1 });
          if (!(eventDate >= startW && eventDate <= endW)) return false;
          break;
        }
        case 'This Month': {
          const startM = startOfMonth(now);
          const endM = endOfMonth(now);
          if (!(eventDate >= startM && eventDate <= endM)) return false;
          break;
        }
        case 'All Upcoming':
          if (isPast(eventDate) && !isToday(eventDate)) return false;
          break;
      }
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

    // Date order for browsing; best textual match first for a search.
    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      return result.sort((a, b) =>
        searchScore(b, term) - searchScore(a, term) || a.event_date.localeCompare(b.event_date));
    }
    return result;
  }, [allEvents, filters, searchTerm]);

  return {
    filters,
    setFilters,
    searchTerm,
    setSearchTerm: setInternalSearchTerm,
    filteredEvents,
    totalCount: allEvents.length
  };
};