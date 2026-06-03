import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format, addMonths, isFuture, isToday } from 'date-fns';
import { Repeat, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { generateRecurringInstances } from '@/utils/event-utils';
import { Event } from '@/types/event';

interface RecurringEventFieldsProps {
  form: UseFormReturn<any>;
}

const recurrenceOptions = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const patternToFreqLabel = (pattern: string, eventDate?: Date): string => {
  if (!eventDate) return pattern.toLowerCase();
  const dayName = format(eventDate, 'EEEE');
  switch (pattern) {
    case 'DAILY':      return 'every day';
    case 'WEEKLY':     return `every ${dayName}`;
    case 'FORTNIGHTLY':return `every other ${dayName}`;
    case 'MONTHLY':    return `every month`;
    default:           return pattern.toLowerCase();
  }
};

const RecurringEventFields: React.FC<RecurringEventFieldsProps> = ({ form }) => {
  const recurringPattern = form.watch('recurringPattern');
  const eventDate: Date | undefined = form.watch('eventDate');
  const recurringEndDate: Date | undefined = form.watch('recurringEndDate');

  const isRecurring = !!(recurringPattern && recurringPattern !== 'NONE' && recurringPattern !== '');

  const occurrencePreview = useMemo(() => {
    if (!isRecurring || !(eventDate instanceof Date)) return null;

    const mockEvent: Partial<Event> = {
      id: 'preview',
      event_name: 'preview',
      event_date: format(eventDate, 'yyyy-MM-dd'),
      recurring_pattern: recurringPattern as Event['recurring_pattern'],
      recurring_end_date: recurringEndDate instanceof Date
        ? format(recurringEndDate, 'yyyy-MM-dd')
        : undefined,
    };

    const instances = generateRecurringInstances(mockEvent as Event);
    const baseIsUpcoming = isFuture(eventDate) || isToday(eventDate);
    const totalCount = instances.length + (baseIsUpcoming ? 1 : 0);

    const capDate = recurringEndDate instanceof Date
      ? recurringEndDate
      : addMonths(new Date(), 3);

    return {
      totalCount,
      endDateLabel: format(capDate, 'd MMM yyyy'),
      freqLabel: patternToFreqLabel(recurringPattern, eventDate),
    };
  }, [isRecurring, eventDate, recurringPattern, recurringEndDate]);

  return (
    <div className="space-y-4">
      {/* Recurrence pattern */}
      <FormField
        control={form.control}
        name="recurringPattern"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center">
              <Repeat className="mr-2 h-4 w-4 text-muted-foreground" /> Recurrence (Optional)
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value || 'NONE'}>
              <FormControl>
                <SelectTrigger id="recurringPattern" className="focus-visible:ring-primary">
                  <SelectValue placeholder="Does this event repeat?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="dark:bg-card dark:border-border">
                <SelectItem value="NONE">Does not repeat</SelectItem>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Repeat-until date picker — only shown when a pattern is selected */}
      {isRecurring && (
        <FormField
          control={form.control}
          name="recurringEndDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="mb-1">Repeat Until (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full md:w-1/2 pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value instanceof Date
                        ? format(field.value, 'PPP')
                        : <span>No end date (shows ~3 months)</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value instanceof Date ? field.value : undefined}
                    onSelect={field.onChange}
                    disabled={(date) => {
                      const start = form.getValues('eventDate');
                      return start instanceof Date ? date <= start : false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {field.value instanceof Date && (
                <button
                  type="button"
                  onClick={() => field.onChange(undefined)}
                  className="text-[11px] text-muted-foreground hover:text-destructive text-left mt-1 w-fit transition-colors"
                >
                  Remove end date
                </button>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Live occurrence preview */}
      {occurrencePreview && (
        <p className="text-xs text-muted-foreground bg-secondary/50 px-3 py-2.5 rounded-lg flex items-start gap-2">
          <Repeat className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
          <span>
            This will show{' '}
            <strong className="text-foreground">{occurrencePreview.freqLabel}</strong>{' '}
            through{' '}
            <strong className="text-foreground">{occurrencePreview.endDateLabel}</strong>{' '}
            — up to{' '}
            <strong className="text-foreground">{occurrencePreview.totalCount}</strong>{' '}
            upcoming date{occurrencePreview.totalCount !== 1 ? 's' : ''}
          </span>
        </p>
      )}
    </div>
  );
};

export default RecurringEventFields;
