import React, { useState, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format, eachDayOfInterval, parseISO, differenceInDays } from 'date-fns';
import { CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { cn, extractAustralianState } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eventTypes, australianStates } from '@/lib/constants';
import ImageUploadInput from '@/components/ImageUploadInput';
import VenueSelect from '@/components/VenueSelect';
import RecurringEventFields from './RecurringEventFields';
import { EventFormValues } from '@/lib/schemas';
import { formatPrice } from '@/utils/event-utils';

interface EventFormProps {
  form: UseFormReturn<EventFormValues>;
  onSubmit: (values: EventFormValues) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onPreview: () => void;
  currentImageUrl?: string | null;
}

type ScheduleDay = { date: string; start_time: string; end_time: string; notes: string };

const MAX_SCHEDULE_DAYS = 14;

const EventForm: React.FC<EventFormProps> = ({ form, onSubmit, isSubmitting, onBack, onPreview, currentImageUrl }) => {
  const descriptionValue = form.watch('description') || '';
  const specialNotesValue = form.watch('specialNotes') || '';
  const priceValue = form.watch('price') || '';
  const eventDateValue = form.watch('eventDate');
  const endDateValue = form.watch('endDate');

  const errors = form.formState.errors;

  // Derive stable date strings for effect deps to avoid Date reference churn
  const eventDateStr = eventDateValue ? format(eventDateValue, 'yyyy-MM-dd') : '';
  const endDateStr = endDateValue ? format(endDateValue, 'yyyy-MM-dd') : '';

  // Multi-day toggle — initialised from form values so edit mode opens correctly
  const [isMultiDay, setIsMultiDay] = useState(() => !!form.getValues('endDate'));
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  // Ref holds the authoritative schedule so the date-change effect can merge without
  // taking scheduleDays as a dep (which would cause an infinite loop)
  const prevDaysRef = useRef<ScheduleDay[]>([]);

  // On mount: restore schedule from form (covers edit / duplicate mode)
  useEffect(() => {
    const existing = form.getValues('eventDays');
    if (existing && existing.length > 0) {
      const normalized: ScheduleDay[] = existing.map(d => ({
        date: d.date,
        start_time: d.start_time || '',
        end_time: d.end_time || '',
        notes: d.notes || '',
      }));
      prevDaysRef.current = normalized;
      setScheduleDays(normalized);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When form is externally reset with an endDate (edit mode async load), open the toggle
  useEffect(() => {
    if (endDateValue && !isMultiDay) setIsMultiDay(true);
  }, [endDateValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate per-day schedule rows whenever start/end date changes
  useEffect(() => {
    if (!isMultiDay || !eventDateValue || !endDateValue || endDateValue < eventDateValue) return;
    const interval = eachDayOfInterval({ start: eventDateValue, end: endDateValue });
    if (interval.length > MAX_SCHEDULE_DAYS) return; // guarded in UI too

    const existingByDate: Record<string, ScheduleDay> = {};
    prevDaysRef.current.forEach(d => { existingByDate[d.date] = d; });

    const newDays: ScheduleDay[] = interval.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return existingByDate[dateStr] ?? { date: dateStr, start_time: '', end_time: '', notes: '' };
    });

    prevDaysRef.current = newDays;
    setScheduleDays(newDays);
    form.setValue('eventDays', newDays);
  }, [isMultiDay, eventDateStr, endDateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMultiDay = (checked: boolean) => {
    setIsMultiDay(checked);
    if (!checked) {
      form.setValue('endDate', undefined);
      form.setValue('eventDays', undefined);
      setScheduleDays([]);
      prevDaysRef.current = [];
    }
  };

  const updateScheduleRow = (index: number, field: keyof Omit<ScheduleDay, 'date'>, value: string) => {
    const updated = scheduleDays.map((day, i) =>
      i === index ? { ...day, [field]: value } : day
    );
    prevDaysRef.current = updated;
    setScheduleDays(updated);
    form.setValue('eventDays', updated);
  };

  const rangeExceedsLimit =
    isMultiDay &&
    !!eventDateValue &&
    !!endDateValue &&
    endDateValue > eventDateValue &&
    differenceInDays(endDateValue, eventDateValue) + 1 > MAX_SCHEDULE_DAYS;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-xs text-muted-foreground/80 font-medium">
          <span className="text-destructive font-bold mr-1">*</span>Indicates required fields
        </p>

        {/* Event Name */}
        <FormField
          control={form.control}
          name="eventName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="eventName" className="flex items-center gap-1">
                Event Name <span className="text-destructive font-bold">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="eventName"
                  placeholder="e.g., Sensory SOAK"
                  {...field}
                  className={cn(
                    "focus-visible:ring-primary",
                    errors.eventName && "border-destructive ring-2 ring-destructive/20 focus-visible:ring-destructive"
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date */}
        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel htmlFor="eventDate" className="flex items-center gap-1 mb-1">
                Start Date <span className="text-destructive font-bold">*</span>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      id="eventDate"
                      variant={'outline'}
                      className={cn(
                        'w-full md:w-1/2 pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        errors.eventDate && "border-destructive ring-2 ring-destructive/20 focus-visible:ring-destructive"
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Multi-day toggle */}
        <div className="flex items-center gap-3 py-1">
          <Switch
            id="multi-day-toggle"
            checked={isMultiDay}
            onCheckedChange={handleToggleMultiDay}
          />
          <label htmlFor="multi-day-toggle" className="text-sm font-medium cursor-pointer select-none">
            Multi-day event
          </label>
        </div>

        {/* Multi-day section: end date + per-day schedule */}
        {isMultiDay && (
          <div className="space-y-5 pl-4 border-l-2 border-primary/20">
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel htmlFor="endDate" className="mb-1">End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="endDate"
                          variant={'outline'}
                          className={cn(
                            'w-full md:w-1/2 pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick an end date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => eventDateValue ? date < eventDateValue : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rangeExceedsLimit && (
              <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                Schedule builder is limited to {MAX_SCHEDULE_DAYS} days. Your end date is saved — per-day times are only shown for shorter ranges.
              </p>
            )}

            {scheduleDays.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                  Per-day Schedule <span className="normal-case font-normal">(optional)</span>
                </p>
                {scheduleDays.map((day, index) => (
                  <div key={day.date} className="p-4 rounded-xl bg-secondary/30 space-y-2">
                    <p className="text-xs font-bold text-foreground">
                      {format(parseISO(day.date), 'EEEE, d MMMM')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Start time (e.g. 9:00 AM)"
                        value={day.start_time}
                        onChange={(e) => updateScheduleRow(index, 'start_time', e.target.value)}
                        className="focus-visible:ring-primary text-sm"
                      />
                      <Input
                        placeholder="End time (e.g. 5:00 PM)"
                        value={day.end_time}
                        onChange={(e) => updateScheduleRow(index, 'end_time', e.target.value)}
                        className="focus-visible:ring-primary text-sm"
                      />
                      <Input
                        placeholder="Notes (optional)"
                        value={day.notes}
                        onChange={(e) => updateScheduleRow(index, 'notes', e.target.value)}
                        className="focus-visible:ring-primary text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <RecurringEventFields form={form} />

        {/* Time */}
        <FormField
          control={form.control}
          name="eventTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="eventTime">Time</FormLabel>
              <FormControl>
                <Input id="eventTime" placeholder="e.g., 7-10 PM" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Place Name */}
        <FormField
          control={form.control}
          name="placeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="placeName">Place Name</FormLabel>
              <FormControl>
                <VenueSelect form={form} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address + State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="fullAddress">Address</FormLabel>
                <FormControl>
                  <Input
                    id="fullAddress"
                    placeholder="e.g., 123 Main St, Suburb, State, Postcode"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      const extractedState = extractAustralianState(e.target.value);
                      if (extractedState) {
                        form.setValue('geographicalState', extractedState, { shouldValidate: true });
                      }
                    }}
                    className="focus-visible:ring-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="geographicalState"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="geographicalState">State</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger id="geographicalState" className="focus-visible:ring-primary">
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="dark:bg-card dark:border-border">
                    {australianStates.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Google Maps Link */}
        <FormField
          control={form.control}
          name="googleMapsLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="googleMapsLink">Google Maps Link</FormLabel>
              <FormControl>
                <Input id="googleMapsLink" placeholder="e.g., https://maps.app.goo.gl/..." {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormDescription className="text-[11px] text-muted-foreground">
                Paste a link to the location on Google Maps to help attendees navigate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel htmlFor="description">Description</FormLabel>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", descriptionValue.length > 1000 ? "text-destructive" : "text-muted-foreground/60")}>
                  {descriptionValue.length} / 1000
                </span>
              </div>
              <FormControl>
                <Textarea id="description" placeholder="Purpose, vibe, activities..." {...field} className="focus-visible:ring-primary min-h-[120px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ticket Link */}
        <FormField
          control={form.control}
          name="ticketLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="ticketLink" className="flex items-center gap-1">
                Ticket/Booking Link <span className="text-destructive font-bold">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="ticketLink"
                  placeholder="e.g., www.eventbrite.com.au/e/..."
                  {...field}
                  className={cn(
                    "focus-visible:ring-primary",
                    errors.ticketLink && "border-destructive ring-2 ring-destructive/20 focus-visible:ring-destructive"
                  )}
                />
              </FormControl>
              <FormDescription className="text-[11px] text-muted-foreground">
                Where attendees can purchase tickets or RSVP (e.g., Eventbrite, Humanitix, or your website).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="price">Price</FormLabel>
              <FormControl>
                <Input id="price" placeholder="e.g., 90, Free, 15-20 donation" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-full"
                  onClick={() => form.setValue('price', 'Free', { shouldValidate: true })}>
                  Set to Free
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-full"
                  onClick={() => form.setValue('price', 'Donation', { shouldValidate: true })}>
                  Set to Donation
                </Button>
                {priceValue && (
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1 bg-secondary/40 px-2.5 py-1 rounded-full">
                    <Sparkles className="h-3 w-3 text-primary" /> Will display as: <strong className="text-foreground">{formatPrice(priceValue)}</strong>
                  </span>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Special Notes */}
        <FormField
          control={form.control}
          name="specialNotes"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel htmlFor="specialNotes">Special Notes</FormLabel>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", specialNotesValue.length > 300 ? "text-destructive" : "text-muted-foreground/60")}>
                  {specialNotesValue.length} / 300
                </span>
              </div>
              <FormControl>
                <Textarea id="specialNotes" placeholder="e.g., Bring a yoga mat, water bottle, and open heart." {...field} className="focus-visible:ring-primary min-h-[80px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Organizer Contact */}
        <FormField
          control={form.control}
          name="organizerContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="organizerContact">Organizer Name/Contact</FormLabel>
              <FormControl>
                <Input id="organizerContact" placeholder="e.g., Jenna, Ryan @ryanswizardry" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Type */}
        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="eventType">Event Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger id="eventType" className="focus-visible:ring-primary">
                    <SelectValue placeholder="Select an event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="dark:bg-card dark:border-border">
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Discount Code */}
        <FormField
          control={form.control}
          name="discountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="discountCode">Discount Code</FormLabel>
              <FormControl>
                <Input
                  id="discountCode"
                  placeholder="e.g., SOULFLOW10"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  className="focus-visible:ring-primary uppercase tracking-wider font-mono"
                />
              </FormControl>
              <FormDescription className="text-[11px] text-muted-foreground">
                Offer a special discount code for SoulFlow community members.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <ImageUploadInput form={form} currentImageUrl={currentImageUrl} name="imageFile" />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onBack} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            Back
          </Button>
          <Button type="button" variant="outline" onClick={onPreview} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            Preview
          </Button>
          <Button type="submit" disabled={isSubmitting} className="transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary/80 text-primary-foreground">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Submitting...' : 'Submit Event'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EventForm;
