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

/**
 * Extracts the base UUID from an event ID.
 * Standard UUIDs have 4 hyphens (5 parts). 
 * Recurring instances append a date suffix (e.g., UUID-20231027).
 */
export const getBaseEventId = (id: string): string => {
  if (!id) return '';
  const parts = id.split('-');
  // A standard UUID has 5 parts. If we have more, the rest is likely a suffix.
  if (parts.length > 5) {
    return parts.slice(0, 5).join('-');
  }
  return id;
};

export const isValidEventId = (id: string): boolean => {
  const baseId = getBaseEventId(id);
  // A standard UUID is 36 characters long. We check for at least 30 to be safe.
  return baseId.length >= 30 && baseId.includes('-');
};

// Calendar Export Utilities
export const getGoogleCalendarUrl = (event: Event) => {
  const start = format(parseISO(event.event_date), "yyyyMMdd'T'HHmm00'Z'");
  const end = event.end_date 
    ? format(parseISO(event.end_date), "yyyyMMdd'T'HHmm00'Z'")
    : format(addDays(parseISO(event.event_date), 1), "yyyyMMdd'T'HHmm00'Z'");
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.event_name,
    details: event.description || '',
    location: event.full_address || event.place_name || '',
    dates: `${start}/${end}`,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

export const downloadIcalFile = (event: Event) => {
  const start = format(parseISO(event.event_date), "yyyyMMdd'T'HHmm00'Z'");
  const end = event.end_date 
    ? format(parseISO(event.end_date), "yyyyMMdd'T'HHmm00'Z'")
    : format(addDays(parseISO(event.event_date), 1), "yyyyMMdd'T'HHmm00'Z'");

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${event.event_name}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.full_address || event.place_name || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${event.event_name.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};