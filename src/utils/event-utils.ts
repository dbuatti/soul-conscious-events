import { format, parseISO, isToday, isFuture, addDays, addWeeks, addMonths } from 'date-fns';
import { Event } from '@/types/event';

const MAX_RECURRENCE_INSTANCES = 10;

export const generateRecurringInstances = (event: Event): Event[] => {
  if (!event.recurring_pattern) return [];

  const originalStartDate = parseISO(event.event_date);
  const originalEndDate = event.end_date ? parseISO(event.end_date) : originalStartDate;
  const duration = originalEndDate.getTime() - originalStartDate.getTime();
  
  const instances: Event[] = [];
  let currentDate = originalStartDate;
  let count = 0;

  while (count < MAX_RECURRENCE_INSTANCES) {
    let nextDate: Date;

    switch (event.recurring_pattern) {
      case 'DAILY':
        nextDate = addDays(currentDate, 1);
        break;
      case 'WEEKLY':
        nextDate = addWeeks(currentDate, 1);
        break;
      case 'FORTNIGHTLY':
        nextDate = addWeeks(currentDate, 2);
        break;
      case 'MONTHLY':
        nextDate = addMonths(currentDate, 1);
        break;
      default:
        return instances;
    }

    if (nextDate > addMonths(new Date(), 3)) {
      break;
    }

    if (isFuture(nextDate) || isToday(nextDate)) {
      const newEvent: Event = {
        ...event,
        id: `${event.id}-${format(nextDate, 'yyyyMMdd')}`,
        event_date: format(nextDate, 'yyyy-MM-dd'),
        end_date: event.end_date ? format(new Date(nextDate.getTime() + duration), 'yyyy-MM-dd') : undefined,
        is_recurring_instance: true,
      };
      instances.push(newEvent);
    }
    
    currentDate = nextDate;
    count++;
  }
  return instances;
};

export const formatPrice = (price?: string | null) => {
  if (!price) return 'N/A';
  const lowerCasePrice = price.toLowerCase();
  if (lowerCasePrice === 'free' || lowerCasePrice === 'donation') {
    return price;
  }
  if (/\d/.test(price) && !price.startsWith('$')) {
    return `$${price}`;
  }
  return price;
};

export const getBaseEventId = (id: string): string => {
  return id.split('-')[0];
};

export const isValidEventId = (id: string): boolean => {
  const baseId = getBaseEventId(id);
  // Heuristic: UUIDs are 36 chars. We allow some flexibility but block obviously corrupted short IDs.
  return baseId.length >= 30 && baseId.includes('-');
};