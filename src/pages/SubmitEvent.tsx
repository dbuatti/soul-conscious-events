import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import EventForm from '@/components/EventForm';
import AiParsingSection from '@/components/AiParsingSection';
import EventPreviewDialog from '@/components/EventPreviewDialog';
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

const SubmitEvent = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<EventFormValues | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const form = useForm<EventFormValues>({
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
      geographicalState: '', // Default for new field
      imageUrl: '',
      discountCode: '',
    },
  });

  useEffect(() => {
    const logPageVisit = async () => {
      const { error } = await supabase.from('page_visit_logs').insert([
        {
          user_id: user?.id || null,
          page_path: '/submit-event',
          action_type: 'page_view',
        },
      ]);
      if (error) {
        console.error('Error logging page visit:', error);
      }
    };
    logPageVisit();
  }, [user?.id]);

  const handleAiParseComplete = (response: any) => {
    const parsedData = response?.parsed_data; // Access the nested parsed_data object
    if (!parsedData) {
      toast.error('AI parsing returned no data.');
      return;
    }

    let eventDate: Date | undefined;
    let endDate: Date | undefined;

    if (parsedData.eventDate) {
      const dateParts = String(parsedData.eventDate).split(/ & | - /).map(s => s.trim());
      if (dateParts.length > 1) {
        eventDate = new Date(dateParts[0]);
        endDate = new Date(dateParts[1]);
      } else {
        eventDate = new Date(parsedData.eventDate);
      }
    }

    // Ensure dates are valid, otherwise set to undefined
    if (eventDate && isNaN(eventDate.getTime())) eventDate = undefined;
    if (endDate && isNaN(endDate.getTime())) endDate = undefined;

    // Map parsed data to form fields
    form.reset({
      eventName: parsedData.eventName || '',
      eventDate: eventDate,
      endDate: endDate,
      eventTime: parsedData.eventTime || '',
      placeName: parsedData.placeName || '',
      fullAddress: parsedData.fullAddress || '',
      description: parsedData.description || '',
      ticketLink: parsedData.ticketLink || '',
      price: parsedData.price || '',
      specialNotes: parsedData.specialNotes || '',
      organizerContact: parsedData.organizerContact || '',
      eventType: parsedData.eventType || '',
      geographicalState: parsedData.geographicalState || '', // Map to new field
      imageUrl: parsedData.imageUrl || '',
      discountCode: parsedData.discountCode || '',
    });
    
    // Set image preview if URL was parsed
    if (parsedData.imageUrl) {
      setImagePreviewUrl(parsedData.imageUrl);
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    setPreviewData(data);
    setIsPreviewOpen(true);
  };

  const onSubmit = async (values: EventFormValues) => {
    // Removed the check for logged-in user here.
    // Events can now be submitted by unauthenticated users.

    const loadingToastId = toast.loading('Submitting your event...');

    try {
      let finalImageUrl: string | null = null;

      if (values.imageFile) {
        const fileExtension = values.imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, values.imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast.error(`Failed to upload image: ${uploadError.message}. Please try again.`, { id: loadingToastId });
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      } else if (values.imageUrl) {
        finalImageUrl = values.imageUrl;
      }

      let formattedTicketLink = values.ticketLink;
      if (formattedTicketLink && !/^https?:\/\//i.test(formattedTicketLink)) {
        formattedTicketLink = `https://${formattedTicketLink}`;
      }

      const { error } = await supabase.from('events').insert([
        {
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
          geographical_state: values.geographicalState || null, // Save new field
          image_url: finalImageUrl,
          discount_code: values.discountCode || null,
          user_id: user?.id || null, // Set user_id to null if no user is logged in
          approval_status: 'pending', // Renamed from 'state'
        },
      ]);

      if (error) {
        console.error('Error submitting event:', error);
        toast.error('Failed to submit event. Please try again.', { id: loadingToastId });
      } else {
        toast.success('Event submitted successfully! It will be reviewed by an admin.', { id: loadingToastId });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Unexpected error submitting event:', error);
      toast.error(`An unexpected error occurred: ${error.message}`, { id: loadingToastId });
    }
  };

  return (
    <div className="w-full max-w-screen-lg">
      <h2 className="text-3xl font-bold text-foreground mb-6 text-center">Submit Your Event</h2>
      <p className="text-xl text-muted-foreground mb-8 text-center">
        Share your soulful event with the community.
      </p>

      <AiParsingSection onAiParseComplete={handleAiParseComplete} />

      <EventForm
        form={form}
        onSubmit={onSubmit}
        isSubmitting={form.formState.isSubmitting}
        onBack={() => navigate('/')}
        onPreview={handlePreview}
      />

      <EventPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
        imagePreviewUrl={imagePreviewUrl}
      />
    </div>
  );
};

export default SubmitEvent;