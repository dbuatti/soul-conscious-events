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
import { Edit, Trash2, PlusCircle, ExternalLink, Image as ImageIcon, Loader2, Frown, RefreshCw } from 'lucide-react';
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
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import EventDetailDialog from './EventDetailDialog';

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  place_name?: string;
  full_address?: string;
  description?: string;
  ticket_link?: string;
  price?: string;
  special_notes?: string;
  organizer_contact?: string;
  event_type?: string;
  state?: string;
  image_url?: string;
  user_id?: string;
  is_deleted: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const eventFormSchema = z.object({
  id: z.string(),
  eventName: z.string().min(2, {
    message: 'Event name must be at least 2 characters.',
  }),
  eventDate: z.date({
    required_error: 'A date is required.',
  }),
  endDate: z.date().optional(),
  eventTime: z.string().optional().or(z.literal('')),
  placeName: z.string().optional().or(z.literal('')),
  fullAddress: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  ticketLink: z.string().optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')),
  specialNotes: z.string().optional().or(z.literal('')),
  organizerContact: z.string().optional().or(z.literal('')),
  eventType: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
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
  const location = useLocation();

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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
      state: '',
      image_url: '',
    },
  });

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events.');
    } else {
      setEvents(data as Event[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ is_deleted: false })
      .eq('id', id);

    if (error) {
      console.error('Error restoring event:', error);
      toast.error('Failed to restore event.');
    } else {
      toast.success('Event restored successfully!');
      fetchEvents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to move event to trash.');
    } else {
      toast.success('Event moved to trash successfully!');
      fetchEvents();
    }
  };

  const handleEdit = (event: Event) => {
    setCurrentEvent(event);
    form.reset({
      id: event.id,
      eventName: event.event_name,
      eventDate: new Date(`${event.event_date}T00:00:00`),
      endDate: event.end_date ? new Date(`${event.end_date}T00:00:00`) : undefined,
      eventTime: event.event_time || '',
      placeName: event.place_name || '',
      fullAddress: event.full_address || '',
      description: event.description || '',
      ticketLink: event.ticket_link || '',
      price: event.price || '',
      specialNotes: event.special_notes || '',
      organizerContact: event.organizer_contact || '',
      eventType: event.event_type || '',
      state: event.state || '',
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
        end_date: values.endDate ? values.endDate.toISOString().split('T')[0] : null,
        event_time: values.eventTime || null,
        place_name: values.placeName || null,
        full_address: values.fullAddress || null,
        description: values.description || null,
        ticket_link: formattedTicketLink || null,
        price: values.price || null,
        special_notes: values.specialNotes || null,
        organizer_contact: values.organizerContact || null,
        event_type: values.eventType || null,
        state: values.state || null,
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
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/submit-event">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-secondary rounded-lg border border-border">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-xl font-semibold text-foreground">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 bg-secondary rounded-lg border border-border text-center">
          <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-4">No events found.</p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <PlusCircle className="mr-2 h-4 w-4" /> Add the First Event!
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-card border border-border rounded-lg shadow-lg">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] text-foreground">Event Name</TableHead>
                <TableHead className="text-foreground">Start Date</TableHead>
                <TableHead className="text-foreground">Location</TableHead>
                <TableHead className="text-foreground">Image</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Submitted By</TableHead>
                <TableHead className="text-right text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className={cn(event.is_deleted && "bg-muted/50 text-muted-foreground opacity-70")}>
                  <TableCell className="font-medium text-foreground">{event.event_name}</TableCell>
                  <TableCell className="text-foreground">{event.event_date ? format(new Date(event.event_date), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-foreground">{event.place_name || event.full_address || 'N/A'}</TableCell>
                  <TableCell>
                    {event.image_url ? (
                      <img src={event.image_url} alt={`Image for ${event.event_name}`} className="w-12 h-12 object-cover rounded-md" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" aria-label="No image available" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(event.state)}>
                      {event.state || 'N/A'}
                    </Badge>
                    {event.is_deleted && (
                      <Badge variant="destructive" className="ml-2">
                        Deleted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground text-sm">
                    {event.profiles ? `${event.profiles.first_name || ''} ${event.profiles.last_name || ''}`.trim() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right flex justify-end space-x-2">
                    {event.is_deleted ? (
                      <Button variant="outline" size="sm" title="Restore Event" onClick={() => handleRestore(event.id)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" title="View Event" className="transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => handleViewDetails(event)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Edit Event" className="transition-all duration-300 ease-in-out transform hover:scale-105" onClick={() => handleEdit(event)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" title="Delete Event" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="dark:bg-card dark:border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                This will move the event to the trash. It will be hidden from public view but can be restored from this panel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(event.id)} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground">Move to Trash</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                        <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border">
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
                        <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border">
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                      <Textarea {...field} className="focus-visible:ring-primary" />
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                      <Textarea {...field} className="focus-visible:ring-primary" />
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
                      <Input {...field} className="focus-visible:ring-primary" />
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
                        <SelectTrigger className="focus-visible:ring-primary">
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
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-primary">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="dark:bg-card dark:border-border">
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
                  <div className="w-full h-32 overflow-hidden rounded-md border border-border flex items-center justify-center bg-secondary">
                    <img src={currentEvent.image_url} alt={`Current image for ${currentEvent.event_name}`} className="max-h-full max-w-full object-contain" />
                  </div>
                  <FormDescription className="text-muted-foreground">Image can only be updated by submitting a new event.</FormDescription>
                </FormItem>
              )}
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting} className="transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary/80 text-primary-foreground">
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <EventDetailDialog
        event={selectedEvent}
        isOpen={isEventDetailDialogOpen}
        onClose={() => setIsEventDetailDialogOpen(false)}
      />
    </div>
  );
};

export default EventManagementTable;