import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Ban, Handshake, MessageCircleWarning, Heart, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

const CommunityGuidelines = () => {
  return (
    <div className="w-full max-w-6xl px-4">
      <SEO 
        title="Community Guidelines | SoulFlow Australia"
        description="Read the guidelines that keep SoulFlow a safe, positive, and soulful space for personal growth, community connection, and conscious gatherings."
      />
      <div className="mb-16 text-center space-y-4">
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">Community Guidelines</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
          SoulFlow is a space dedicated to fostering personal growth, community connection, creativity, and well-being.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="organic-card rounded-[2.5rem] p-6 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-destructive flex items-center font-heading">
              <Ban className="mr-3 h-8 w-8" /> Not Allowed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex gap-4">
              <p className="text-lg"><span className="font-black">Hate speech</span>, discrimination, or violence toward any person or group is strictly prohibited.</p>
            </div>
            <div className="flex gap-4">
              <p className="text-lg">Any intent to <span className="font-black">incite conflict</span>, aggression, or harm will result in immediate removal.</p>
            </div>
            <div className="flex gap-4">
              <p className="text-lg">Primary <span className="font-black">political rallies</span>, protests, or campaigns are not the focus of this platform.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-6 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-green-600 flex items-center font-heading">
              <Handshake className="mr-3 h-8 w-8" /> We Welcome
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex gap-4">
              <Heart className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-lg">Events that bring people together in <span className="font-black">mutual respect</span> and shared understanding.</p>
            </div>
            <div className="flex gap-4">
              <Sparkles className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-lg">Gatherings encouraging <span className="font-black">self-expression</span>, creativity, and personal healing.</p>
            </div>
            <div className="flex gap-4">
              <Users className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-lg">Initiatives promoting <span className="font-black">harmony</span>, compassion, and community unity.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-8 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <ListChecks className="mr-3 h-8 w-8 text-primary" /> Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed text-lg">
            <p>
              All submissions are reviewed by our team and may be declined at our discretion to ensure they align with our mission and these guidelines. We reserve the right to remove any content that compromises the safety or spirit of the community.
            </p>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-8 md:col-span-2 bg-secondary/30 border-dashed text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground flex items-center justify-center font-heading">
              <MessageCircleWarning className="mr-3 h-8 w-8 text-accent" /> Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-6 max-w-2xl mx-auto">
            <p className="text-lg">
              If you encounter any content or events that violate these guidelines, please let us know. Your help keeps SoulFlow a safe and positive community.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-10 py-8 text-xl font-black shadow-xl transition-transform hover:scale-105">
              <Link to="/contact">
                Contact Us to Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommunityGuidelines;
</dyad-file>

<dyad-write path="src/pages/SubmitEvent.tsx" description="Integrating SEO tags into the Submit Event page">
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
</dyad-file>

<dyad-chat-summary>Developing dynamic SEO and social sharing tags across all pages</dyad-chat-summary>

I have created a reusable, lightweight `SEO` component that dynamically updates document titles, descriptions, Open Graph, and Twitter Card tags, and integrated it across all key pages (including dynamic event detail pages).<dyad-write path="src/pages/AccountSettings.tsx" description="Integrating SEO tags into the Account Settings page">
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User as UserIcon, SunMoon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { countries } from '@/lib/countries';
import { ThemeToggle } from '@/components/ThemeToggle';
import SEO from '@/components/SEO';

const formSchema = z.object({
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).optional().or(z.literal('')),
  email: z.string().email({ message: "Invalid email address." }),
  country: z.string().optional().or(z.literal('')),
});

type AccountSettingsFormValues = z.infer<typeof formSchema>;

const AccountSettings = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [loadingProfile, setLoadingProfile] = useState(true);

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      country: '',
    },
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, username, email, country')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile.');
      } else if (data) {
        form.reset({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          username: data.username || '',
          email: data.email || user.email || '',
          country: data.country || '',
        });
      } else {
        form.reset({ email: user.email || '' });
      }
      setLoadingProfile(false);
    };

    if (!isSessionLoading) {
      fetchUserProfile();
    }
  }, [user, isSessionLoading, form]);

  const onSubmit = async (values: AccountSettingsFormValues) => {
    if (!user) return;

    const loadingToastId = toast.loading('Updating profile...');
    try {
      const response = await supabase.functions.invoke('update-user-metadata', {
        body: {
          userId: user.id,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          username: values.username,
          country: values.country,
        },
      });

      if (response.error) throw new Error(response.error.message);
      toast.success('Profile updated!', { id: loadingToastId });
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`, { id: loadingToastId });
    }
  };

  if (isSessionLoading || loadingProfile) {
    return (
      <div className="w-full max-w-6xl px-4">
        <Skeleton className="h-16 w-1/3 mb-12" />
        <div className="max-w-2xl mx-auto space-y-8">
          <Skeleton className="h-[400px] w-full rounded-[3rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-4">
      <SEO 
        title="Account Settings | SoulFlow Australia"
        description="Manage your SoulFlow profile, update your personal information, and customize your appearance settings."
      />
      <div className="mb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">Account Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="organic-card rounded-[3rem] p-8 sm:p-12">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <UserIcon className="mr-3 h-8 w-8 text-primary" /> General Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-none focus-visible:ring-primary">
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {countries.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-14 rounded-2xl text-lg font-black shadow-xl transition-transform hover:scale-105">
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Save Changes'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[3rem] p-8 sm:p-12">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <SunMoon className="mr-3 h-8 w-8 text-primary" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 flex items-center justify-between">
            <p className="text-lg font-medium">Toggle between light and dark mode:</p>
            <ThemeToggle />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;