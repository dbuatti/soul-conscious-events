import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
// Removed: import { useSession } from '@/components/SessionContextProvider';

const eventFormSchema = z.object({
  eventName: z.string().min(2, {
    message: 'Event name must be at least 2 characters.',
  }),
  eventDate: z.date({
    required_error: 'A date is required.',
  }),
  eventTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  ticketLink: z.string().url({ message: 'Invalid URL' }).optional().or(z.literal('')),
  price: z.string().optional(),
  specialNotes: z.string().optional(),
  organizerContact: z.string().optional(),
  eventType: z.string().optional(),
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
  // Removed: const { user, isLoading } = useSession();

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      eventName: '',
      eventTime: '',
      location: '',
      description: '',
      ticketLink: '',
      price: '',
      specialNotes: '',
      organizerContact: '',
      eventType: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    // Removed: if (isLoading) {
    // Removed:   toast.info("Loading user session, please wait...");
    // Removed:   return;
    // Removed: }
    // Removed: if (!user) {
    // Removed:   toast.error("You must be logged in to submit an event.");
    // Removed:   return;
    // Removed: }

    const { data, error } = await supabase.from('events').insert([
      {
        event_name: values.eventName,
        event_date: values.eventDate.toISOString().split('T')[0], // Format date to YYYY-MM-DD
        event_time: values.eventTime,
        location: values.location,
        description: values.description,
        ticket_link: values.ticketLink,
        price: values.price,
        special_notes: values.specialNotes,
        organizer_contact: values.organizerContact,
        event_type: values.eventType,
        user_id: null, // Set user_id to null as submission is now anonymous
      },
    ]);

    if (error) {
      console.error('Error submitting event:', error);
      toast.error('Failed to submit event. Please try again.');
    } else {
      toast.success('Event submitted successfully!');
      form.reset();
      navigate('/'); // Redirect to home or event list after submission
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    alert(
      `Preview:\nEvent Name: ${data.eventName}\nDate: ${data.eventDate ? format(data.eventDate, 'PPP') : 'N/A'}\nTime: ${data.eventTime}\nLocation: ${data.location}\nDescription: ${data.description}\nTicket Link: ${data.ticketLink}\nPrice: ${data.price}\nSpecial Notes: ${data.specialNotes}\nOrganizer: ${data.organizerContact}\nEvent Type: ${data.eventType}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Centre of You, Prahran" {...field} />
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
                    <Input placeholder="e.g., https://www.eventbrite.com.au/e/..." {...field} />
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
              <Button type="button" variant="outline" onClick={handlePreview}>
                Preview
              </Button>
              <Button type="submit">Submit Event</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default SubmitEvent;