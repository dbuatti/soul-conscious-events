import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn, extractAustralianState } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eventTypes, australianStates } from '@/lib/constants';
import ImageUploadInput from '@/components/ImageUploadInput';
import GooglePlaceAutocomplete from '@/components/GooglePlaceAutocomplete';
import RecurringEventFields from './RecurringEventFields';
import { EventFormValues } from '@/lib/schemas';

interface EventFormProps {
  form: UseFormReturn<EventFormValues>;
  onSubmit: (values: EventFormValues) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onPreview: () => void;
  currentImageUrl?: string | null;
}

const EventForm: React.FC<EventFormProps> = ({ form, onSubmit, isSubmitting, onBack, onPreview, currentImageUrl }) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="eventName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="eventName">Event Name</FormLabel>
              <FormControl>
                <Input id="eventName" placeholder="e.g., Sensory SOAK" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel htmlFor="eventDate">Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        id="eventDate"
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal transition-all duration-300 ease-in-out transform hover:scale-102',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel htmlFor="endDate">End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        id="endDate"
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal transition-all duration-300 ease-in-out transform hover:scale-102',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <RecurringEventFields form={form} />

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

        <FormField
          control={form.control}
          name="placeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="placeName">Place Name</FormLabel>
              <FormControl>
                <GooglePlaceAutocomplete
                  form={form}
                  name="placeName"
                  addressName="fullAddress"
                  stateName="geographicalState"
                  placeholder="e.g., Art of Living Centre"
                  className="focus-visible:ring-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="googleMapsLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="googleMapsLink">Google Maps Link</FormLabel>
              <FormControl>
                <Input id="googleMapsLink" placeholder="e.g., https://maps.app.goo.gl/..." {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="description">Description</FormLabel>
              <FormControl>
                <Textarea id="description" placeholder="Purpose, vibe, activities..." {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ticketLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="ticketLink">Ticket/Booking Link</FormLabel>
              <FormControl>
                <Input id="ticketLink" placeholder="e.g., www.eventbrite.com.au/e/..." {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="price">Price</FormLabel>
              <FormControl>
                <Input id="price" placeholder="e.g., 90, Free, 15-20 donation" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="specialNotes">Special Notes</FormLabel>
              <FormControl>
                <Textarea id="specialNotes" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="discountCode">Discount Code</FormLabel>
              <FormControl>
                <Input id="discountCode" placeholder="e.g., SOULFLOW10" {...field} className="focus-visible:ring-primary" />
              </FormControl>
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