import React, { useState, useRef, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Image as ImageIcon, XCircle, MapPin } from 'lucide-react'; // Added MapPin icon
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { eventTypes, australianStates } from '@/lib/constants'; // Import australianStates

// Define the schema locally to avoid import issues
const eventFormSchema = z.object({
  eventName: z.string().min(2, { message: 'Event name must be at least 2 characters.' }),
  eventDate: z.date({ required_error: 'A date is required.' }),
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
  geographicalState: z.string().optional().or(z.literal('')), // New field
  imageFile: z.any().optional(),
  imageUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  discountCode: z.string().optional().or(z.literal('')),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  form: UseFormReturn<EventFormValues>;
  onSubmit: (values: EventFormValues) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onPreview: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ form, onSubmit, isSubmitting, onBack, onPreview }) => {
  const placeNameInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');

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
      form.setValue('imageUrl', '');
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(null);
      form.setValue('imageFile', undefined);
    }
  };

  const handleImageUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue('imageUrl', url);
    if (url) {
      setImagePreviewUrl(url);
      setSelectedImage(null);
      form.setValue('imageFile', undefined);
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    form.setValue('imageFile', undefined);
    form.setValue('imageUrl', '');
  };

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
                      onSelect={(date) => {
                        field.onChange(date);
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

        <FormField
          control={form.control}
          name="geographicalState" // New field
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="geographicalState">Australian State (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <FormField
          control={form.control}
          name="discountCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="discountCode">Discount Code (Optional)</FormLabel>
              <FormControl>
                <Input id="discountCode" placeholder="e.g., SOULFLOW10" {...field} className="focus-visible:ring-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Event Image (Optional)</FormLabel>
          <Tabs
            value={imageInputMode}
            onValueChange={(value) => {
              setImageInputMode(value as 'upload' | 'url');
              if (value === 'upload') {
                form.setValue('imageUrl', '');
                setImagePreviewUrl(selectedImage ? URL.createObjectURL(selectedImage) : null);
              } else {
                setSelectedImage(null);
                form.setValue('imageFile', undefined);
                setImagePreviewUrl(form.getValues('imageUrl') || null);
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 dark:bg-secondary">
              <TabsTrigger value="upload">Upload Image</TabsTrigger>
              <TabsTrigger value="url">Image URL</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <label htmlFor="image-upload" className="flex items-center justify-between px-4 py-2 rounded-md border border-input bg-background text-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200">
                <span className="flex items-center">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {selectedImage ? selectedImage.name : 'No file chosen'}
                </span>
                <Button type="button" variant="outline" size="sm" className="ml-4">
                  Choose File
                </Button>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="sr-only"
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
                      id="imageUrl"
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