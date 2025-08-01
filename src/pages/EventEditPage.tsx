import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Sparkles, Image as ImageIcon, XCircle } from 'lucide-react';
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
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // Import useLocation
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { eventTypes } from '@/lib/constants'; // Import from constants

const australianStates = [
  'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'
];

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
}

const eventFormSchema = z.object({
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
  imageFile: z.any().optional(), // For new image upload
  imageUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')), // For image URL input
});

const EventEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // Get location object to access state
  const { user, isLoading: isSessionLoading } = useSession();
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<z.infer<typeof eventFormSchema> | null>(null);
  const placeNameInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload'); // New state for tabs


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
      imageUrl: '', // Initialize new field
    },
  });

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        toast.error('Event ID is missing.');
        navigate('/404');
        return;
      }

      setLoadingEvent(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details.');
        navigate('/404');
      } else if (data) {
        setCurrentEvent(data);
        form.reset({
          eventName: data.event_name,
          eventDate: new Date(data.event_date),
          endDate: data.end_date ? new Date(data.end_date) : undefined,
          eventTime: data.event_time || '',
          placeName: data.place_name || '',
          fullAddress: data.full_address || '',
          description: data.description || '',
          ticketLink: data.ticket_link || '',
          price: data.price || '',
          specialNotes: data.special_notes || '',
          organizerContact: data.organizer_contact || '',
          eventType: data.event_type || '',
          imageUrl: data.image_url || '', // Set imageUrl from fetched data
        });
        setImagePreviewUrl(data.image_url || null); // Set initial preview URL
        if (data.image_url) {
          // Determine if the existing image is a Supabase storage URL or an external URL
          if (data.image_url.includes('supabase.co/storage/v1/object/public/event-images')) {
            setImageInputMode('upload'); // Treat as if it was uploaded (even if it's a URL, it's from our storage)
            // We don't have the original file, so selectedImage remains null.
            // The preview will show the URL.
          } else {
            setImageInputMode('url'); // It's an external URL
          }
        } else {
          setImageInputMode('upload'); // Default to upload if no image
        }
      } else {
        navigate('/404');
      }
      setLoadingEvent(false);
    };

    fetchEvent();
  }, [id, navigate, form]);

  useEffect(() => {
    if (placeNameInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      const melbourneBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-38.2, 144.5),
        new window.google.maps.LatLng(-37.5, 145.5)
      );

      const autocomplete = new window.google.maps.places.Autocomplete(placeNameInputRef.current, {
        bounds: melbourneBounds,
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        form.setValue('placeName', place.name || '', { shouldValidate: true });
        form.setValue('fullAddress', place.formatted_address || '', { shouldValidate: true });
      });
    }
  }, [form]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      form.setValue('imageFile', file);
      form.setValue('imageUrl', ''); // Clear URL field if file is selected
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(currentEvent?.image_url || null); // Revert to original if cleared
      form.setValue('imageFile', undefined);
    }
  };

  const handleImageUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue('imageUrl', url);
    if (url) {
      setImagePreviewUrl(url);
      setSelectedImage(null); // Clear file if URL is entered
      form.setValue('imageFile', undefined);
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    form.setValue('imageFile', undefined);
    form.setValue('imageUrl', ''); // Clear the URL field
  };

  const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    if (!currentEvent) return;

    let finalImageUrl: string | null = null;
    
    if (selectedImage) { // If a new file was selected, upload it
      // Delete old image if it exists and is different
      if (currentEvent.image_url && currentEvent.image_url.includes('supabase.co/storage/v1/object/public/event-images')) {
        const oldFileName = currentEvent.image_url.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage.from('event-images').remove([oldFileName]);
          if (deleteError) {
            console.error('Error deleting old image:', deleteError);
            // Don't stop submission, just log the error
          }
        }
      }

      const fileExtension = selectedImage.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading new image:', uploadError);
        toast.error(`Failed to upload new image: ${uploadError.message}. Please try again.`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      finalImageUrl = publicUrlData.publicUrl;
    } else if (values.imageUrl) { // If a URL was provided
      // If the old image was a file and a new URL is provided, delete the old file
      if (currentEvent.image_url && currentEvent.image_url.includes('supabase.co/storage/v1/object/public/event-images')) { // Check if it's a Supabase storage URL
        const oldFileName = currentEvent.image_url.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage.from('event-images').remove([oldFileName]);
          if (deleteError) {
            console.error('Error deleting old image:', deleteError);
          }
        }
      }
      finalImageUrl = values.imageUrl;
    } else if (currentEvent.image_url && !selectedImage && !values.imageUrl) { // If no new image and no URL, but there was an old image
      // This means the user explicitly removed the image or it was never set
      if (currentEvent.image_url.includes('supabase.co/storage/v1/object/public/event-images')) {
        const oldFileName = currentEvent.image_url.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage.from('event-images').remove([oldFileName]);
          if (deleteError) {
            console.error('Error deleting old image:', deleteError);
          }
        }
      }
      finalImageUrl = null;
    } else { // Keep existing image if no changes
      finalImageUrl = currentEvent.image_url;
    }


    let formattedTicketLink = values.ticketLink;
    if (formattedTicketLink && !/^https?:\/\//i.test(formattedTicketLink)) {
      formattedTicketLink = `https://${formattedTicketLink}`;
    }

    const { error } = await supabase.from('events').update({
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
      image_url: finalImageUrl,
    }).eq('id', id);

    if (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event.');
    } else {
      toast.success('Event updated successfully!');
      // Redirect back to the 'from' location, or default to '/'
      navigate(location.state?.from || '/');
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    setPreviewData(data);
    setIsPreviewOpen(true);
  };

  if (isSessionLoading || loadingEvent) {
    return (
      <div className="w-full max-w-screen-lg">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  // Check if the current user is the event creator or an admin
  const isCreatorOrAdmin = user?.id === currentEvent?.user_id || user?.email === 'daniele.buatti@gmail.com';

  if (!isCreatorOrAdmin) {
    toast.error('You do not have permission to edit this event.');
    navigate('/');
    return null;
  }

  return (
    <div className="w-full max-w-screen-lg">
      <h2 className="text-3xl font-bold text-foreground mb-6 text-center">Edit Event</h2>

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
                        onSelect={(date) => {
                          field.onChange(date);
                          // If endDate is not set, set it to the same as eventDate
                          if (date && !form.getValues('endDate')) {
                            form.setValue('endDate', date);
                          }
                        }}
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
                  <FormLabel htmlFor="endDate">End Date (Optional)</FormLabel>
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
                <FormLabel htmlFor="eventTime">Time (Optional)</FormLabel>
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
                <FormLabel htmlFor="placeName">Place Name (Optional)</FormLabel>
                <FormControl>
                  <Input id="placeName" placeholder="e.g., Art of Living Centre" {...field} ref={placeNameInputRef} className="focus-visible:ring-primary" />
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
                <FormLabel htmlFor="fullAddress">Full Address (Optional)</FormLabel>
                <FormControl>
                  <Input
                    id="fullAddress"
                    placeholder="e.g., 123 Main St, Suburb, State, Postcode"
                    {...field}
                    onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
                    className="focus-visible:ring-primary"
                  />
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
                <FormLabel htmlFor="description">Description (Optional)</FormLabel>
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
                <FormLabel htmlFor="ticketLink">Ticket/Booking Link (Optional)</FormLabel>
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
                <FormLabel htmlFor="price">Price (Optional)</FormLabel>
                <FormControl>
                  <Input id="price" placeholder="e.g., $90, Free, $15-$20 donation" {...field} className="focus-visible:ring-primary" />
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
                <FormLabel htmlFor="specialNotes">Special Notes (Optional)</FormLabel>
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
                <FormLabel htmlFor="organizerContact">Organizer Name/Contact (Optional)</FormLabel>
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
                <FormLabel htmlFor="eventType">Event Type (Optional)</FormLabel>
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

          {/* Image Upload/URL Field */}
          <FormItem>
            <FormLabel>Event Image (Optional)</FormLabel>
            <Tabs value={imageInputMode} onValueChange={(value) => {
              setImageInputMode(value as 'upload' | 'url');
              // Clear the other input type when switching tabs
              if (value === 'upload') {
                form.setValue('imageUrl', '');
                setImagePreviewUrl(selectedImage ? URL.createObjectURL(selectedImage) : null);
              } else { // value === 'url'
                setSelectedImage(null);
                form.setValue('imageFile', undefined);
                setImagePreviewUrl(form.getValues('imageUrl') || null);
              }
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 dark:bg-secondary">
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="url">Image URL</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-4">
                <label htmlFor="image-upload" className="flex items-center justify-between px-4 py-2 rounded-md border border-input bg-background text-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200">
                  <span className="flex items-center">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {selectedImage ? selectedImage.name : (currentEvent?.image_url && currentEvent.image_url.includes('supabase.co/storage/v1/object/public/event-images') ? currentEvent.image_url.split('/').pop() : 'No file chosen')}
                  </span>
                  <Button type="button" variant="outline" size="sm" className="ml-4">
                    Choose File
                  </Button>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="sr-only" // Hide the default input
                  />
                </label>
              </TabsContent>
              <TabsContent value="url" className="mt-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        id="imageUrl" // Added ID
                        placeholder="e.g., https://example.com/image.jpg"
                        {...field}
                        onChange={handleImageUrlInputChange}
                        className="focus-visible:ring-primary"
                      />
                    </FormControl>
                  )}
                />
              </TabsContent>
            </Tabs>
            {imagePreviewUrl && (
              <div className="mt-2 flex items-center space-x-2">
                <img src={imagePreviewUrl} alt="Current Event Image" className="h-20 w-20 object-cover rounded-md border border-border shadow-md" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="text-destructive hover:text-destructive/80 transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  <XCircle className="mr-1 h-4 w-4" /> Remove
                </Button>
              </div>
            )}
            <FormMessage />
          </FormItem>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => navigate(location.state?.from || '/')} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Back to Events
            </Button>
            <Button type="button" variant="outline" onClick={handlePreview} className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Preview
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary/80 text-primary-foreground">
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[425px] dark:bg-card dark:border-border">
          <DialogHeader>
            <DialogTitle>Event Preview</DialogTitle>
            <DialogDescription>
              Review your event details before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {previewData && (
              <>
                {imagePreviewUrl && (
                  <div className="col-span-full flex justify-center mb-4">
                    <a href={imagePreviewUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={imagePreviewUrl}
                        alt="Event Preview"
                        className="max-w-full h-auto rounded-lg shadow-lg"
                      />
                    </a>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="text-right font-medium text-foreground">Event Name:</p>
                  <p className="col-span-3 text-foreground">{previewData.eventName}</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <p className="text-right font-medium text-foreground">Date:</p>
                  <p className="col-span-3 text-foreground">
                    {previewData.eventDate ? format(previewData.eventDate, 'PPP') : 'N/A'}
                    {previewData.endDate && ` - ${format(previewData.endDate, 'PPP')}`}
                  </p>
                </div>
                {previewData.eventTime && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Time:</p>
                    <p className="col-span-3 text-foreground">{previewData.eventTime}</p>
                  </div>
                )}
                {previewData.placeName && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Place Name:</p>
                    <p className="col-span-3 text-foreground">{previewData.placeName}</p>
                  </div>
                )}
                {previewData.fullAddress && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Address:</p>
                    <p className="col-span-3 text-foreground">{previewData.fullAddress}</p>
                  </div>
                )}
                {previewData.description && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <p className="text-right font-medium text-foreground">Description:</p>
                    <p className="col-span-3 break-words text-foreground">{previewData.description}</p>
                  </div>
                )}
                {previewData.ticketLink && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Ticket Link:</p>
                    <a href={previewData.ticketLink} target="_blank" rel="noopener noreferrer" className="col-span-3 text-primary hover:underline break-all">
                      {previewData.ticketLink}
                    </a>
                  </div>
                )}
                {previewData.price && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Price:</p>
                    <p className="col-span-3 text-foreground">{previewData.price}</p>
                  </div>
                )}
                {previewData.specialNotes && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <p className="text-right font-medium text-foreground">Special Notes:</p>
                    <p className="col-span-3 break-words text-foreground">{previewData.specialNotes}</p>
                  </div>
                )}
                {previewData.organizerContact && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Organizer:</p>
                    <p className="col-span-3 text-foreground">{previewData.organizerContact}</p>
                  </div>
                )}
                {previewData.eventType && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <p className="text-right font-medium text-foreground">Event Type:</p>
                    <p className="col-span-3 text-foreground">{previewData.eventType}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventEditPage;