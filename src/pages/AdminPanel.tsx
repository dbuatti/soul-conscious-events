import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventManagementTable from '@/components/EventManagementTable';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User as UserIcon, Mail, CalendarDays } from 'lucide-react'; // Import User, Mail, CalendarDays icons

interface ContactSubmission {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string; // Assuming email can be fetched or joined
  created_at: string; // Assuming created_at is available from auth.users or profiles
}

const AdminPanel = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoadingSubmissions(true);
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contact submissions:', error);
        toast.error('Failed to load submissions.');
      } else {
        setSubmissions(data || []);
      }
      setLoadingSubmissions(false);
    };

    const fetchUserProfiles = async () => {
      setLoadingUsers(true);
      // Fetch profiles directly, as email and created_at are now in the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user profiles:', error);
        toast.error('Failed to load user profiles.');
      } else {
        setUserProfiles(data as UserProfile[]);
      }
      setLoadingUsers(false);
    };

    fetchSubmissions();
    fetchUserProfiles();
  }, []);

  return (
    <div className="w-full max-w-screen-lg">
      <h2 className="text-3xl font-bold text-foreground text-center mb-6">Admin Panel</h2>
      <p className="text-center text-muted-foreground mb-8">
        Manage contact submissions, events, analytics, and users from here.
      </p>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4 dark:bg-secondary"> {/* Changed to 4 columns */}
          <TabsTrigger value="events">Manage Events</TabsTrigger>
          <TabsTrigger value="submissions">Contact Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger> {/* New tab for Users */}
        </TabsList>
        <TabsContent value="events" className="mt-6">
          <EventManagementTable />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          {loadingSubmissions ? (
            <div className="grid grid-cols-1 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-muted-foreground">No contact submissions found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {submissions.map((submission) => (
                <Card key={submission.id} className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-primary">{submission.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Submitted on: {format(new Date(submission.created_at), 'PPP p')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {submission.name && (
                      <p className="text-foreground">
                        <span className="font-medium">From:</span> {submission.name}
                      </p>
                    )}
                    {submission.email && (
                      <p className="text-foreground">
                        <span className="font-medium">Email:</span>{' '}
                        <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                          {submission.email}
                        </a>
                      </p>
                    )}
                    <p className="text-foreground">
                      <span className="font-medium">Message:</span> {submission.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent>
        <TabsContent value="users" className="mt-6"> {/* Content for Users tab */}
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-secondary rounded-lg border border-border">
              <Skeleton className="h-12 w-12 rounded-full mb-4" />
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : userProfiles.length === 0 ? (
            <p className="text-center text-muted-foreground">No user profiles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full bg-card border border-border rounded-lg shadow-lg">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Name</TableHead>
                    <TableHead className="text-foreground">Email</TableHead>
                    <TableHead className="text-foreground">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium text-foreground flex items-center">
                        <UserIcon className="mr-2 h-4 w-4 text-primary" />
                        {profile.first_name || profile.last_name ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-foreground flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-primary" />
                        {profile.email}
                      </TableCell>
                      <TableCell className="text-foreground flex items-center">
                        <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                        {profile.created_at !== 'N/A' ? format(new Date(profile.created_at), 'PPP') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;