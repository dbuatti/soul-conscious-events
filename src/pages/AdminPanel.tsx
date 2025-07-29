import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventManagementTable from '@/components/EventManagementTable'; // Will create this next

interface ContactSubmission {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
}

const AdminPanel = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

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

    fetchSubmissions();
  }, []);

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-foreground mb-6">Admin Panel</h2>
      <p className="text-center text-gray-600 mb-8">
        Manage contact submissions and events from here.
      </p>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="events">Manage Events</TabsTrigger>
          <TabsTrigger value="submissions">Contact Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-6">
          <EventManagementTable />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          {loadingSubmissions ? (
            <div className="grid grid-cols-1 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-md">
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
            <p className="text-center text-gray-600">No contact submissions found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {submissions.map((submission) => (
                <Card key={submission.id} className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-purple-700">{submission.subject}</CardTitle>
                    <p className="text-sm text-gray-500">
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
                        <a href={`mailto:${submission.email}`} className="text-blue-600 hover:underline">
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
      </Tabs>
    </div>
  );
};

export default AdminPanel;