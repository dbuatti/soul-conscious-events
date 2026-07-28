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
import SEO from '@/components/SEO';

const defaultCoverImages = [
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=80',
  'https://images.unsplash.com/photo-1470071459604-7b8ec44ffd5b?w=600&q=80',
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80',
];

const scrapeOgImage = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SoulFlow/1.0)' },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const html = await response.text();

    const ogMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch?.[1]) return ogMatch[1];

    const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch?.[1]) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld.image) {
          return Array.isArray(ld.image) ? ld.image[0] : (typeof ld.image === 'string' ? ld.image : ld.image?.url);
        }
      } catch { /* ignore */ }
    }
    return null;
  } catch {
    return null;
  }
};

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

  const handleAiParseComplete = (response: Record<string, unknown>) => {
    const parsedData = response?.parsed_data as Record<string, unknown> | undefined;
    if (!parsedData) {
      toast.error('AI parsing returned no data.');
      return;
    }

    let eventDate: Date | undefined;
    let endDate: Date | undefined;

    if (parsedData.eventDate) {
      eventDate = new Date(parsedData.eventDate);
    }
    if (parsedData.endDate) {
      endDate = new Date(parsedData.endDate);
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

      // Auto-scrape ticket link for image if no cover image is set
      if (!finalImageUrl && formattedTicketLink) {
        toast.loading('Looking for event image...', { id: loadingToastId });
        const scrapedImage = await scrapeOgImage(formattedTicketLink);
        if (scrapedImage) {
          finalImageUrl = scrapedImage;
        }
      }

      // Final fallback: assign a random default cover image
      if (!finalImageUrl) {
        finalImageUrl = defaultCoverImages[Math.floor(Math.random() * defaultCoverImages.length)];
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
        recurring_end_date: values.recurringEndDate ? format(values.recurringEndDate, 'yyyy-MM-dd') : null,
        event_days: values.eventDays || null,
        user_id: user?.id || null,
        approval_status: 'approved',
      }]);

      if (error) throw error;

      toast.success('Your event has been submitted! It will appear in the listing shortly.', { id: loadingToastId, duration: 5000 });
      navigate('/');
    } catch (error: unknown) {
      console.error('Error during event submission:', error);
      toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`, { id: loadingToastId });
    }
  };

  return (
    <div className="w-full max-w-6xl px-4">
      <SEO
        title="Submit Your Event | SoulFlow Australia"
        description="Share your soulful gathering with the community. Use our AI Event Assistant to auto-fill details from flyers or emails instantly."
      />
      <div className="mb-12 text-center">
        <h2 className="text-5xl font-black text-foreground font-heading tracking-tight">Submit Your Event</h2>
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