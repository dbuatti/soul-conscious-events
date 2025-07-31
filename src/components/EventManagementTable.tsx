import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Edit, Trash2, PlusCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string; // Added end_date
  event_time?: string;
  place_name?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string; // Added state
  image_url?: string;
  user_id?: string; // Added user_id
}

const eventFormSchema = z.object({
  id: z.string(),
  eventName: z.string().min(2, {
    message: 'Event name must be at least 2 characters.',
  }),
  eventDate: z.date({
    required_error: 'A date is required.',
  }),
  endDate: z.date().optional(), // Added endDate to schema
  eventTime: z.string().optional().or(z.literal('')),
  placeName: z.string().optional().or(z.literal('')),
  fullAddress: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  ticketLink: z.string().optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')),
  specialNotes: z.string().optional().or(z.literal('')),
  organizerContact: z.string().optional().or(z.literal('')),
  eventType: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')), // Added state to schema
  image_url: z.string().optional().or(z.literal('')),
});

const eventTypes = [
  'Music', 'Workshop', 'Meditation', 'Open Mic', 'Sound Bath', 'Foraging',
  'Community Gathering', 'Other',
];

const eventStates = [
  'approved', 'pending', 'rejected'
];

const EventManagementTable = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      eventName: '',
      eventTime: '',
      placeName: '',
      fullAddress: '',
      description: '',
      ticketLink: '',
      price: '',
      specialNotes: '',
      organizerContact: '',
      eventType: '',
      state: '', // Added state to defaultValues
      image_url: '',
    },
  });

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event.');
    } else {
      toast.success('Event deleted successfully!');
      fetchEvents(); // Re-fetch events to update the list
    }
  };

  const handleEdit = (event: Event) => {
    setCurrentEvent(event);
    form.reset({
      id: event.id,
      eventName: event.event_name,
      eventDate: new Date(event.event_date),
      endDate: event.end_date ? new Date(event.end_date) : undefined, // Set endDate
      eventTime: event.event_time || '',
      placeName: event.place_name || '',
      fullAddress: event.full_address || '',
      description: event.description || '',
      ticketLink: event.ticket_link || '',
      price: event.price || '',
      specialNotes: event.special_notes || '',
      organizerContact: event.organizer_contact || '',
      eventType: event.event_type || '',
      state: event.state || '', // Set state
      image_url: event.image_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    let formattedTicketLink = values.ticketLink;
    if (formattedTicketLink && !/^https?:\/\//i.test(formattedTicketLink)) {
      formattedTicketLink = `https://${formattedTicketLink}`;
    }

    const { error } = await supabase
      .from('events')
      .update({
        event_name: values.eventName,
        event_date: values.eventDate.toISOString().split('T')[0],
        end_date: values.endDate ? values.endDate.toISOString().split('T')[0] : null, // Save end_date
        event_time: values.eventTime || null,
        place_name: values.placeName || null,
        full_address: values.fullAddress || null,
        description: values.description || null,
        ticket_link: formattedTicketLink || null,
        price: values.price || null,
        special_notes: values.specialNotes || null,
        organizer_contact: values.organizerContact || null,
        event_type: values.eventType || null,
        state: values.state || null, // Save state
      })
      .eq('id', values.id);

    if (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event.');
    } else {
      toast.success('Event updated successfully!');
      setIsEditDialogOpen(false);
      fetchEvents();
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'default'; // Greenish
      case 'pending':
        return 'secondary'; // Grayish
      case 'rejected':
        return 'destructive'; // Reddish
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/submit-event">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-600">No events found.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Event Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium text-foreground">{event.event_name}</TableCell>
                  <TableCell className="text-foreground">{event.event_date ? format(new Date(event.event_date), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-foreground">{event.end_date ? format(new Date(event.end_date), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-foreground">{event.event_time || 'N/A'}</TableCell>
                  <TableCell className="text-foreground">{event.place_name || event.full_address || 'N/A'}</TableCell>
                  <TableCell className="text-foreground">{event.event_type || 'N/A'}</TableCell>
                  <TableCell>
                    {event.image_url ? (
                      <img src={event.image_url} alt="Event" className="w-12 h-12 object-cover rounded-md" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(event.state)}>
                      {event.state || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground text-sm">{event.user_id || 'N/A'}</TableCell>
                  <TableCell className="text-right flex justify-end space-x-2">
                    <Link to={`/events/${event.id}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" title="View Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(event)} title="Edit Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" title="Delete Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the event
                            and remove its data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(event.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Make changes to the event details here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
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
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            key={field.name}
                            mode="single"
                            selected={field.value as Date | undefined}
                            onSelect={(date) => field.onChange(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Place Name (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Full Address (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Ticket/Booking Link (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Price (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Special Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Organizer Name/Contact (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="focus-visible:ring-purple-500" />
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
                    <FormLabel>Event Type (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-purple-500">
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
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-purple-500">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state.charAt(0).toUpperCase() + state.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentEvent?.image_url && (
                <FormItem>
                  <FormLabel>Current Image</FormLabel>
                  <div className="w-full h-32 overflow-hidden rounded-md border border-gray-200 flex items-center justify-center bg-gray-50">
                    <img src={currentEvent.image_url} alt="Event Image" className="max-h-full max-w-full object-contain" />
                  </div>
                  <FormDescription>Image can only be updated by submitting a new event.</FormDescription>
                </FormItem>
              )}
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting} className="transition-all duration-300 ease-in-out transform hover:scale-105">
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManagementTable;