import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ContactSubmission {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
}

const AdminContactSubmissions = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
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
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-xl border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Contact Submissions (Admin)</h2>
      <p className="text-center text-gray-600 mb-8">
        Here you can view all messages submitted through the contact form.
      </p>

      {loading ? (
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
                  <p className="text-gray-700">
                    <span className="font-medium">From:</span> {submission.name}
                  </p>
                )}
                {submission.email && (
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span>{' '}
                    <a href={`mailto:${submission.email}`} className="text-blue-600 hover:underline">
                      {submission.email}
                    </a>
                  </p>
                )}
                <p className="text-gray-700">
                  <span className="font-medium">Message:</span> {submission.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminContactSubmissions;