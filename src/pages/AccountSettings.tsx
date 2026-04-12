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