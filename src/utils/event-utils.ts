import {
  format, parseISO, addDays, addMonths, startOfToday, isSameDay, isWeekend, endOfWeek,
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

/**
 * Expands recurring events into their upcoming instances and returns the whole
 * set sorted chronologically. Rows whose id is not a full UUID are dropped.
 */
export const expandRecurringEvents = (events: Event[]): Event[] => {
  const combined: Event[] = [];
  for (const event of events) {
    if (typeof event.id !== 'string' || event.id.length <= 30) continue;
    combined.push(event);
    if (event.recurring_pattern) combined.push(...generateRecurringInstances(event));
  }
  return combined.sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime());
};

/** Unique, alphabetically sorted venue names for the filter dropdown. */
export const getAvailableVenues = (events: Event[]): string[] => {
  const names = new Set<string>();
  for (const event of events) {
    if (typeof event.id === 'string' && event.id.length > 30 && event.place_name) {
      names.add(event.place_name);
    }
  }
  return [...names].sort();
};

export interface EventTimeBucket {
  key: string;
  label: string;
  sublabel?: string;
  events: Event[];
}

/**
 * Groups chronological events into "what's on" reading buckets (Today,
 * Tomorrow, This weekend, Next week, Later in Month…), preserving input order
 * within each bucket. `today` is injectable for deterministic tests.
 */
export const groupEventsByTimeBucket = (events: Event[], today: Date = startOfToday()): EventTimeBucket[] => {
  const tomorrow = addDays(today, 1);
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekEnd = addDays(thisWeekEnd, 7);

  const bucketFor = (date: Date): { key: string; label: string; sublabel?: string } => {
    if (isSameDay(date, today)) return { key: 'today', label: 'Today', sublabel: format(date, 'EEEE d MMMM') };
    if (isSameDay(date, tomorrow)) return { key: 'tomorrow', label: 'Tomorrow', sublabel: format(date, 'EEEE d MMMM') };
    if (date <= thisWeekEnd) {
      return isWeekend(date)
        ? { key: 'weekend', label: 'This weekend' }
        : { key: 'week', label: 'Later this week' };
    }
    if (date <= nextWeekEnd) return { key: 'next-week', label: 'Next week' };
    const sameMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    return sameMonth
      ? { key: 'month', label: `Later in ${format(date, 'MMMM')}` }
      : { key: format(date, 'yyyy-MM'), label: format(date, 'MMMM'), sublabel: date.getFullYear() !== today.getFullYear() ? format(date, 'yyyy') : undefined };
  };

  const groups: EventTimeBucket[] = [];
  for (const event of events) {
    const bucket = bucketFor(parseISO(event.event_date));
    const last = groups[groups.length - 1];
    if (last && last.key === bucket.key) last.events.push(event);
    else groups.push({ ...bucket, events: [event] });
  }
  return groups;
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