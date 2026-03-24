import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import EventForm from '@/components/EventForm';
import AiParsingSection from '@/components/AiParsingSection';
import EventPreviewDialog from '@/components/EventPreviewDialog';
import { format } from 'date-fns';
import { eventFormSchema, EventFormValues } from '@/lib/schemas';

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
      geographicalState: '',
      imageUrl: '',
      discountCode: '',
      googleMapsLink: '',
      recurringPattern: 'NONE',
    },
  });

  useEffect(() => {
    const logPageVisit = async () => {
      await supabase.from('page_visit_logs').insert([
        {
          user_id: user?.id || null,
          page_path: '/submit-event',
          action_type: 'page_view',
        },
      ]);
    };
    logPageVisit();
  }, [user?.id]);

  const handleAiParseComplete = (response: any) => {
    const parsedData = response?.parsed_data;
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

    if (eventDate && isNaN(eventDate.getTime())) eventDate = undefined;
    if (endDate && isNaN(endDate.getTime())) endDate = undefined;

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
      geographicalState: parsedData.geographicalState || '',
      imageUrl: parsedData.imageUrl || '',
      discountCode: parsedData.discountCode || '',
      googleMapsLink: parsedData.googleMapsLink || '',
      recurringPattern: parsedData.recurringPattern || 'NONE',
    });
    
    if (parsedData.imageUrl) {
      setImagePreviewUrl(parsedData.imageUrl);
    }
  };

  const handlePreview = () => {
    const data = form.getValues();
    setPreviewData(data);
    const currentImageFile = form.getValues('imageFile');
    const currentImageUrlField = form.getValues('imageUrl');
    if (currentImageFile) {
      setImagePreviewUrl(URL.createObjectURL(currentImageFile));
    } else if (currentImageUrlField) {
      setImagePreviewUrl(currentImageUrlField);
    } else {
      setImagePreviewUrl(null);
    }
    setIsPreviewOpen(true);
  };

  const onSubmit = async (values: EventFormValues) => {
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

        if (uploadError) throw uploadError;

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

      const recurringPattern = values.recurringPattern === 'NONE' ? null : values.recurringPattern;

      const { error } = await supabase.from('events').insert([{
        event_name: values.eventName,
        event_date: format(values.eventDate, 'yyyy-MM-dd'),
        end_date: values.endDate ? format(values.endDate, 'yyyy-MM-dd') : null,
        event_time: values.eventTime || null,
        place_name: values.placeName || null,
        full_address: values.fullAddress || null,
        description: values.description || null,
        ticket_link: formattedTicketLink || null,
        price: values.price || null,
        special_notes: values.specialNotes || null,
        organizer_contact: values.organizerContact || null,
        event_type: values.eventType || null,
        geographical_state: values.geographicalState || null,
        image_url: finalImageUrl,
        discount_code: values.discountCode || null,
        google_maps_link: values.googleMapsLink || null,
        recurring_pattern: recurringPattern,
        user_id: user?.id || null,
        approval_status: 'approved',
      }]);

      if (error) throw error;

      toast.success('Event created successfully!', { id: loadingToastId });
      navigate('/');
    } catch (error: any) {
      console.error('Error during event submission:', error);
      toast.error(`An unexpected error occurred: ${error.message}`, { id: loadingToastId });
    }
  };

  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-12 text-center space-y-4">
        <h2 className="text-5xl font-black text-foreground font-heading tracking-tight">Submit Your Event</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
          Share your soulful event with the community.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AiParsingSection onAiParseComplete={handleAiParseComplete} />

        <div className="bg-card p-8 sm:p-12 rounded-[3rem] shadow-xl border border-border organic-card">
          <EventForm
            form={form}
            onSubmit={onSubmit}
            isSubmitting={form.formState.isSubmitting}
            onBack={() => navigate('/')}
            onPreview={handlePreview}
            currentImageUrl={imagePreviewUrl}
          />
        </div>
      </div>

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