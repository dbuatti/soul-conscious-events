import {
  format, parseISO, addDays, addMonths, startOfToday,
  differenceInCalendarDays, differenceInCalendarMonths,
} from 'date-fns';
import { Event } from '@/types/event';

const MAX_RECURRENCE_INSTANCES = 10;

const RECURRENCE_STEP_DAYS: Partial<Record<NonNullable<Event['recurring_pattern']>, number>> = {
  DAILY: 1,
  WEEKLY: 7,
  FORTNIGHTLY: 14,
};

/** The nth occurrence after `start`, computed from the start to avoid month-end drift. */
const nthOccurrence = (start: Date, pattern: Event['recurring_pattern'], n: number): Date | null => {
  if (pattern === 'MONTHLY') return addMonths(start, n);
  const step = pattern ? RECURRENCE_STEP_DAYS[pattern] : undefined;
  return step ? addDays(start, step * n) : null;
};

/**
 * Expands a recurring event into its next upcoming occurrences (excluding the
 * base event itself), up to MAX_RECURRENCE_INSTANCES and no later than
 * recurring_end_date (or 3 months from today when unset).
 */
export const generateRecurringInstances = (event: Event): Event[] => {
  const pattern = event.recurring_pattern;
  if (!pattern || !nthOccurrence(new Date(0), pattern, 1)) return [];

  const start = parseISO(event.event_date);
  if (isNaN(start.getTime())) return [];

  const originalEndDate = event.end_date ? parseISO(event.end_date) : start;
  const durationDays = differenceInCalendarDays(originalEndDate, start);
  const today = startOfToday();
  const endCap = event.recurring_end_date
    ? parseISO(event.recurring_end_date)
    : addMonths(today, 3);

  // Jump close to today so long-running series still produce upcoming
  // instances instead of exhausting the cap on past dates.
  let n = 1;
  if (start < today) {
    const step = RECURRENCE_STEP_DAYS[pattern];
    const elapsed = step
      ? Math.floor(differenceInCalendarDays(today, start) / step)
      : differenceInCalendarMonths(today, start);
    n = Math.max(1, elapsed);
  }

  const instances: Event[] = [];
  while (instances.length < MAX_RECURRENCE_INSTANCES) {
    const nextDate = nthOccurrence(start, pattern, n++)!;
    if (nextDate > endCap) break;
    if (nextDate < today) continue;

    instances.push({
      ...event,
      id: `${event.id}-${format(nextDate, 'yyyyMMdd')}`,
      event_date: format(nextDate, 'yyyy-MM-dd'),
      end_date: event.end_date ? format(addDays(nextDate, durationDays), 'yyyy-MM-dd') : undefined,
      is_recurring_instance: true,
    });
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
// Event times are free text, so exports are all-day events. All-day ranges
// use bare dates (no time or 'Z'), with an exclusive end date.
const getAllDayRange = (event: Event) => {
  const start = parseISO(event.event_date);
  const lastDay = event.end_date ? parseISO(event.end_date) : start;
  return {
    start: format(start, 'yyyyMMdd'),
    end: format(addDays(lastDay, 1), 'yyyyMMdd'),
  };
};

const getCalendarDetails = (event: Event) =>
  [event.event_time && `Time: ${event.event_time}`, event.description, event.ticket_link]
    .filter(Boolean)
    .join('\n\n');

export const getGoogleCalendarUrl = (event: Event) => {
  const { start, end } = getAllDayRange(event);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.event_name,
    details: getCalendarDetails(event),
    location: event.full_address || event.place_name || '',
    dates: `${start}/${end}`,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

export const downloadIcalFile = (event: Event) => {
  const { start, end } = getAllDayRange(event);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SoulFlow//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@soulflow`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeIcsText(event.event_name)}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `DESCRIPTION:${escapeIcsText(getCalendarDetails(event))}`,
    `LOCATION:${escapeIcsText(event.full_address || event.place_name || '')}`,
    ...(event.ticket_link ? [`URL:${event.ticket_link}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.event_name.replace(/[^\w-]+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};