import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // Corrected import path
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn, extractAustralianState } from '@/lib/utils'; // Import extractAustralianState
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { eventTypes, australianStates } from '@/lib/constants';
import { Event } from '@/types/event';
import ImageUploadInput from '@/components/ImageUploadInput'; // Import the new component
import GooglePlaceAutocomplete from '@/components/GooglePlaceAutocomplete'; // Import new component

const eventFormSchema = z.object({
  eventName: z.string().min(2, { message: 'Event name must be at least 2 characters.' }),
  eventDate: z.date({ required_error: 'A date is required.' }),
  endDate: z.date().optional(),
  eventTime: z.string().optional().or(z.literal('')),
  placeName: z.string().optional().or(z.literal('')),
  fullAddress: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  ticketLink: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')), // Removed the refine rule
  specialNotes: z.string().optional().or(z.literal('')),
  organizerContact: z.string().optional().or(z.literal('')),
  eventType: z.string().optional().or(z.literal('')),
  geographicalState: z.string().optional().or(z.literal('')),
  imageFile: z.any().optional(),
  imageUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  discountCode: z.string().optional().or(z.literal('')),
  googleMapsLink: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')), // New field
});

const EventEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isSessionLoading } = useSession();
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<z.infer<typeof eventFormSchema> | null>(null);
  // Removed placeNameInputRef as it's now handled by GooglePlaceAutocomplete
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // State for preview URL

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
      geographicalState: '',
      imageUrl: '',
      discountCode: '',
      googleMapsLink: '', // Initialize new field
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
        
        const eventDate = new Date(`${data.event_date}T00:00:00`);
        const endDate = data.end_date ? new Date(`${data.end_date}T00:00:00`) : undefined;

        form.reset({
          eventName: data.event_name,
          eventDate: eventDate,
          endDate: endDate,
          eventTime: data.event_time || '',
          placeName: data.place_name || '',
          fullAddress: data.full_address || '',
          description: data.description || '',
          ticketLink: data.ticket_link || '',
          price: data.price || '',
          specialNotes: data.special_notes || '',
          organizerContact: data.organizer_contact || '',
          eventType: data.event_type || '',
          geographicalState: data.geographical_state || '',
          imageUrl: data.image_url || '',
          discountCode: data.discount_code || '',
          googleMapsLink: data.google_maps_link || '', // Set new field from fetched data
        });
        setImagePreviewUrl(data.image_url || null); // Set initial preview URL
      } else {
        navigate('/404');
      }
      setLoadingEvent(false);
    };

    fetchEvent();
  }, [id, navigate, form]);

  // Removed useEffect for Autocomplete, now handled by GooglePlaceAutocomplete component

  const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    if (!currentEvent) return;

    let finalImageUrl: string | null = null;
    
    // Handle image upload/URL logic
    const imageFile = form.getValues('imageFile');
    const imageUrlField = form.getValues('imageUrl');

    if (imageFile) { // If a new file was selected, upload it
      // Delete old image if it exists and is a Supabase storage URL
      if (currentEvent.image_url && currentEvent.image_url.includes('supabase.co/storage/v1/object/public/event-images')) {
        const oldFileName = currentEvent.image_url.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage.from('event-images').remove([oldFileName]);
          if (deleteError) {
            console.error('Error deleting old image:', deleteError);
          }
        }
      }

      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, imageFile, {
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
    } else if (imageUrlField) { // If a URL was provided
      // If the old image was a file and a new URL is provided, delete the old file
      if (currentEvent.image_url && currentEvent.image_url.includes('supabase.co/storage/v1/object/public/event-images')) {
        const oldFileName = currentEvent.image_url.split('/').pop();
        if (oldFileName) {
          const { error: deleteError } = await supabase.storage.from('event-images').remove([oldFileName]);
          if (deleteError) {
            console.error('Error deleting old image:', deleteError);
          }
        }
      }
      finalImageUrl = imageUrlField;
    } else if (currentEvent.image_url && !imageFile && !imageUrlField) { // If no new image and no URL, but there was an old image
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

    const dateToSave = format(values.eventDate, 'yyyy-MM-dd');
    const endDateToSave = values.endDate ? format(values.endDate, 'yyyy-MM-dd') : null;

    const { error } = await supabase.from('events').update({
      event_name: values.eventName,
      event_date: dateToSave,
      end_date: endDateToSave,
      event_time: values.eventTime || null,
      place_name: values.placeName || null,
      full_address: values.fullAddress || null,
      description: values.description || null,
      ticket_link: formattedTicketLink || null,
      price: values.price || null,
      special_notes: values.specialNotes || null,
      organizer_contact: values.organizerContact || null,
      event_type: values.eventType || null,
      geographicalState: values.geographicalState || null,
      image_url: finalImageUrl,
      discount_code: values.discountCode || null,
      google_maps_link: values.googleMapsLink || null, // Include new field
    }).eq('id', id);

    if (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event.');
    } else {
      toast.success('Event updated successfully!');
      navigate('/'); // Redirect to V2 main events page
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    setPreviewData(data);
    // Update imagePreviewUrl from form values for the dialog
    const currentImageFile = form.getValues('imageFile');
    const currentImageUrlField = form.getValues('imageUrl');
    if (currentImageFile) {
      setImagePreviewUrl(URL.createObjectURL(currentImageFile));
    } else if (currentImageUrlField) {
      setImagePreviewUrl(currentImageUrlField);
    } else {
      setImagePreviewUrl(currentEvent?.image_url || null); // Fallback to original event image
    }
    setIsPreviewOpen(true);
  };

  if (isSessionLoading || loadingEvent) {
    return (
      <div className="w-full max-w-2xl">
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

  const isCreatorOrAdmin = user?.id === currentEvent?.user_id || user?.email === 'daniele.buatti@gmail.com';

  if (!isCreatorOrAdmin) {
    toast.error('You do not have permission to edit this event.');
    navigate('/');
    return null;
  }

  return (
    <div className="w-full max-w-2xl">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* New wrapper for Address and State */}
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
                    onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => {
                      field.onChange(e);
                      const extractedState = extractAustralianState(e.target.value);
                      if (extractedState) {
                        form.setValue('geographicalState', extractedState, { shouldValidate: true });
                      } else {
                        form.setValue('geographicalState', '', { shouldValidate: true });
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

        <ImageUploadInput form={form} currentImageUrl={currentEvent?.image_url} name="imageFile" />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => navigate(location.state?.from || '/')} className="transition-all duration-300 ease-in-out transform hover:scale-105">
            Back
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
              <p className="col-span-3 text-foreground">{previewData?.eventName}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-right font-medium text-foreground">Date:</p>
              <p className="col-span-3 text-foreground">
                {previewData?.eventDate ? format(new Date(previewData.eventDate), 'PPP') : 'N/A'}
                {previewData?.endDate && ` - ${format(new Date(previewData.endDate), 'PPP')}`}
              </p>
            </div>
            {previewData?.eventTime && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Time:</p>
                <p className="col-span-3 text-foreground">{previewData.eventTime}</p>
              </div>
            )}
            {previewData?.placeName && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Place Name:</p>
                <p className="col-span-3 text-foreground">{previewData.placeName}</p>
              </div>
            )}
            {previewData?.fullAddress && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Address:</p>
                <p className="col-span-3 text-foreground">{previewData.fullAddress}</p>
              </div>
            )}
            {previewData?.googleMapsLink && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Google Maps Link:</p>
                <a href={previewData.googleMapsLink} target="_blank" rel="noopener noreferrer" className="col-span-3 text-primary hover:underline break-all">
                  {previewData.googleMapsLink}
                </a>
              </div>
            )}
            {previewData?.description && (
              <div className="grid grid-cols-4 items-start gap-4">
                <p className="text-right font-medium text-foreground">Description:</p>
                <p className="col-span-3 whitespace-pre-wrap text-foreground">{previewData.description}</p>
              </div>
            )}
            {previewData?.ticketLink && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Ticket Link:</p>
                <a href={previewData.ticketLink} target="_blank" rel="noopener noreferrer" className="col-span-3 text-primary hover:underline break-all">
                  {previewData.ticketLink}
                </a>
              </div>
            )}
            {previewData?.price && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Price:</p>
                <p className="col-span-3 text-foreground">{previewData.price}</p>
              </div>
            )}
            {previewData?.specialNotes && (
              <div className="grid grid-cols-4 items-start gap-4">
                <p className="text-right font-medium text-foreground">Special Notes:</p>
                <p className="col-span-3 whitespace-pre-wrap text-foreground">{previewData.specialNotes}</p>
              </div>
            )}
            {previewData?.organizerContact && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Organizer:</p>
                <p className="col-span-3 text-foreground">{previewData.organizerContact}</p>
              </div>
            )}
            {previewData?.eventType && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Event Type:</p>
                <p className="col-span-3 text-foreground">{previewData.eventType}</p>
              </div>
            )}
            {previewData?.geographicalState && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">State:</p>
                <p className="col-span-3 text-foreground">{previewData.geographicalState}</p>
              </div>
            )}
            {previewData?.discountCode && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-right font-medium text-foreground">Discount Code:</p>
                <p className="col-span-3 text-foreground">{previewData.discountCode}</p>
              </div>
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