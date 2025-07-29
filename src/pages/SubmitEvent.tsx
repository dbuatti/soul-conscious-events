import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const australianStates = [
  'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'
];

const eventFormSchema = z.object({
  eventName: z.string().min(2, {
    message: 'Event name must be at least 2 characters.',
  }),
  eventDate: z.date({
    required_error: 'A date is required.',
  }),
  eventTime: z.string().optional(),
  placeName: z.string().optional(), // New field for place name
  fullAddress: z.string().optional(),
  description: z.string().optional(),
  ticketLink: z.string().optional(),
  price: z.string().optional(),
  specialNotes: z.string().optional(),
  organizerContact: z.string().optional(),
  eventType: z.string().optional(),
  state: z.string().optional(),
});

const eventTypes = [
  'Music',
  'Workshop',
  'Meditation',
  'Open Mic',
  'Sound Bath',
  'Foraging',
  'Community Gathering',
  'Other',
];

const SubmitEvent = () => {
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<z.infer<typeof eventFormSchema> | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null); // Ref for the input

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      eventName: '',
      eventTime: '',
      placeName: '', // Initialize new field
      fullAddress: '',
      description: '',
      ticketLink: '',
      price: '',
      specialNotes: '',
      organizerContact: '',
      eventType: '',
      state: '',
    },
  });

  useEffect(() => {
    if (addressInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      const melbourneBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-38.2, 144.5),
        new window.google.maps.LatLng(-37.5, 145.5)
      );

      const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        bounds: melbourneBounds,
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'name'], // Request 'name' field
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          form.setValue('fullAddress', place.formatted_address, { shouldValidate: true });
        } else {
          form.setValue('fullAddress', '', { shouldValidate: true });
        }
        // Set the place name
        form.setValue('placeName', place.name || '', { shouldValidate: true });
      });
    }
  }, [form]);

  const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    let formattedTicketLink = values.ticketLink;
    if (formattedTicketLink && !/^https?:\/\//i.test(formattedTicketLink)) {
      formattedTicketLink = `https://${formattedTicketLink}`;
    }

    const { data, error } = await supabase.from('events').insert([
      {
        event_name: values.eventName,
        event_date: values.eventDate.toISOString().split('T')[0],
        event_time: values.eventTime,
        place_name: values.placeName, // Save place name
        full_address: values.fullAddress,
        description: values.description,
        ticket_link: formattedTicketLink,
        price: values.price,
        special_notes: values.specialNotes,
        organizer_contact: values.organizerContact,
        event_type: values.eventType,
        state: values.state,
        user_id: null,
      },
    ]);

    if (error) {
      console.error('Error submitting event:', error);
      toast.error('Failed to submit event. Please try again.');
    } else {
      toast.success('Event submitted successfully!');
      form.reset();
      navigate('/');
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    setPreviewData(data);
    setIsPreviewOpen(true);
  };

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Submit a SoulFlow Event</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sensory SOAK" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
            name="eventTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 7-10 PM" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 123 Main St, Suburb, State, Postcode"
                    {...field}
                    ref={addressInputRef}
                    onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="placeName" // New field for place name
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place Name (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Art of Living Centre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Purpose, vibe, activities..." {...field} />
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
                <FormLabel>Ticket/Booking Link</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., www.eventbrite.com.au/e/..." {...field} />
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
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., $90, Free, $15-$20 donation" {...field} />
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
                <FormLabel>Special Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., discount code: community, bring a blanket" {...field} />
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
                <FormLabel>Organizer Name/Contact</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Jenna, Ryan @ryanswizardry" {...field} />
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
                <FormLabel>Event Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Back to Events
            </Button>
            <Button type="button" variant="outline" onClick={handlePreview}>
              Preview
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? 'Submitting...' : 'Submit Event'}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Event Preview</DialogTitle>
            <DialogDescription>
              Review your event details before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {previewData && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="text-right font-medium">Event Name:</p>
                  <p className="col-span-3">{previewData.eventName}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="text-right font-medium">Date:</p>
                  <p className="col-span-3">{previewData.eventDate ? format(previewData.eventDate, 'PPP') : 'N/A'}</p>
                </div>
                {previewData.eventTime && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Time:</p>
                    <p className="col-span-3">{previewData.eventTime}</p>
                  </div>
                )}
                {previewData.placeName && ( // Display place name in preview
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Place Name:</p>
                    <p className="col-span-3">{previewData.placeName}</p>
                  </div>
                )}
                {previewData.fullAddress && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Address:</p>
                    <p className="col-span-3">{previewData.fullAddress}</p>
                  </div>
                )}
                {previewData.state && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">State:</p>
                    <p className="col-span-3">{previewData.state}</p>
                  </div>
                )}
                {previewData.description && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <p className="text-right font-medium">Description:</p>
                    <p className="col-span-3 break-words">{previewData.description}</p>
                  </div>
                )}
                {previewData.ticketLink && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Ticket Link:</p>
                    <a href={previewData.ticketLink} target="_blank" rel="noopener noreferrer" className="col-span-3 text-blue-600 hover:underline break-all">
                      {previewData.ticketLink}
                    </a>
                  </div>
                )}
                {previewData.price && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Price:</p>
                    <p className="col-span-3">{previewData.price}</p>
                  </div>
                )}
                {previewData.specialNotes && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <p className="text-right font-medium">Special Notes:</p>
                    <p className="col-span-3 break-words">{previewData.specialNotes}</p>
                  </div>
                )}
                {previewData.organizerContact && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Organizer:</p>
                    <p className="col-span-3">{previewData.organizerContact}</p>
                  </div>
                )}
                {previewData.eventType && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium">Event Type:</p>
                    <p className="col-span-3">{previewData.eventType}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmitEvent;