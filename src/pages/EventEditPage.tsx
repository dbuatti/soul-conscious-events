"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Event } from '@/types/event';
import EventForm from '@/components/EventForm';
import EventPreviewDialog from '@/components/EventPreviewDialog';
import { eventFormSchema, EventFormValues } from '@/lib/schemas';
import { isValidEventId, getBaseEventId } from '@/utils/event-utils';

const EventEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isSessionLoading } = useSession();
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<EventFormValues | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const isDuplicating = location.pathname.startsWith('/duplicate-event');
  const eventId = id || '';
  const isIdValid = isValidEventId(eventId);

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
    const fetchEvent = async () => {
      if (!isIdValid) {
        toast.error('Invalid event ID format.');
        navigate('/404');
        return;
      }

      setLoadingEvent(true);
      const baseId = getBaseEventId(eventId);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', baseId)
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
          eventName: isDuplicating ? `COPY of ${data.event_name}` : data.event_name,
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
          googleMapsLink: data.google_maps_link || '',
          recurringPattern: data.recurring_pattern || 'NONE',
        });
        setImagePreviewUrl(data.image_url || null);
      }
      setLoadingEvent(false);
    };

    if (isIdValid) {
      fetchEvent();
    } else {
      setLoadingEvent(false);
    }
  }, [eventId, navigate, form, isDuplicating, isIdValid]);

  const onSubmit = async (values: EventFormValues) => {
    if (!currentEvent) return;

    const baseId = getBaseEventId(eventId);
    if (!isDuplicating && !isValidEventId(baseId)) {
      toast.error('Cannot save changes: Invalid event ID.');
      return;
    }

    const loadingToastId = toast.loading(isDuplicating ? 'Creating duplicate event...' : 'Saving changes...');

    try {
      let finalImageUrl: string | null = currentEvent.image_url || null;
      
      if (values.imageFile) {
        const fileExtension = values.imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, values.imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        finalImageUrl = publicUrlData.publicUrl;
      } else if (values.imageUrl) {
        finalImageUrl = values.imageUrl;
      }

      const eventData = {
        event_name: values.eventName,
        event_date: format(values.eventDate, 'yyyy-MM-dd'),
        end_date: values.endDate ? format(values.endDate, 'yyyy-MM-dd') : null,
        event_time: values.eventTime || null,
        place_name: values.placeName || null,
        full_address: values.fullAddress || null,
        description: values.description || null,
        ticket_link: values.ticketLink || null,
        price: values.price || null,
        special_notes: values.specialNotes || null,
        organizer_contact: values.organizerContact || null,
        event_type: values.eventType || null,
        geographical_state: values.geographicalState || null,
        image_url: finalImageUrl,
        discount_code: values.discountCode || null,
        google_maps_link: values.googleMapsLink || null,
        recurring_pattern: values.recurringPattern === 'NONE' ? null : values.recurringPattern,
        user_id: user?.id || null,
        approval_status: 'approved',
      };

      let error;
      if (isDuplicating) {
        const { error: insertError } = await supabase.from('events').insert([eventData]);
        error = insertError;
      } else {
        const { error: updateError } = await supabase.from('events').update(eventData).eq('id', baseId);
        error = updateError;
      }

      if (error) throw error;

      toast.success(isDuplicating ? 'Event duplicated!' : 'Event updated!', { id: loadingToastId });
      navigate('/');
    } catch (error: any) {
      console.error('Error during event submission:', error);
      toast.error(`An error occurred: ${error.message}`, { id: loadingToastId });
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
    }
    setIsPreviewOpen(true);
  };

  if (isSessionLoading || loadingEvent) {
    return (
      <div className="w-full max-w-6xl px-4">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-12 text-center">
        <h2 className="text-5xl font-black text-foreground font-heading tracking-tight">
          {isDuplicating ? 'Duplicate Event' : 'Edit Event'}
        </h2>
      </div>

      <div className="bg-card p-8 sm:p-12 rounded-[3rem] shadow-xl border border-border organic-card">
        <EventForm
          form={form}
          onSubmit={onSubmit}
          isSubmitting={form.formState.isSubmitting}
          onBack={() => navigate(-1)}
          onPreview={handlePreview}
          currentImageUrl={currentEvent?.image_url}
        />
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

export default EventEditPage;