import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2, User as UserIcon, Mail, Globe, SunMoon } from 'lucide-react'; // Added SunMoon icon
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
import { ThemeToggle } from '@/components/ThemeToggle'; // Import ThemeToggle

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

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile information.');
      } else if (data) {
        form.reset({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          username: data.username || '',
          email: data.email || user.email || '', // Fallback to auth.user email
          country: data.country || '',
        });
      } else {
        // If no profile exists, populate with auth.user email
        form.reset({
          email: user.email || '',
        });
      }
      setLoadingProfile(false);
    };

    if (!isSessionLoading) {
      fetchUserProfile();
    }
  }, [user, isSessionLoading, form]);

  const onSubmit = async (values: AccountSettingsFormValues) => {
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      return;
    }

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

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Profile updated successfully!', { id: loadingToastId });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`, { id: loadingToastId });
    }
  };

  if (isSessionLoading || loadingProfile) {
    return (
      <div className="w-full max-w-2xl">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-6" />
        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">Account Settings</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        Manage your profile and preferences here.
      </p>

      <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <Settings className="mr-3 h-6 w-6 text-primary" /> General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-foreground leading-relaxed">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" /> First Name (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="focus-visible:ring-primary" />
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
                    <FormLabel className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Last Name (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="focus-visible:ring-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Username (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} className="focus-visible:ring-primary" />
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
                    <FormLabel className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email Address
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} className="focus-visible:ring-primary" />
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
                    <FormLabel className="flex items-center">
                      <Globe className="mr-2 h-4 w-4 text-muted-foreground" /> Country (Optional)
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-primary">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="dark:bg-card dark:border-border">
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
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting} className="transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary/80 text-primary-foreground">
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* New Card for Theme Settings */}
      <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary flex items-center">
            <SunMoon className="mr-3 h-6 w-6 text-primary" /> Theme Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-foreground leading-relaxed flex items-center justify-between">
          <p>Toggle between light and dark mode:</p>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;