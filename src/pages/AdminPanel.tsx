import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventManagementTable from '@/components/EventManagementTable';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import AiLogsTable from '@/components/AiLogsTable'; // Import the new component
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User as UserIcon, Mail, CalendarDays, Edit, Trash2, RefreshCw, Key, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import EditUserDialog from '@/components/EditUserDialog';

export interface ContactSubmission {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  subject: string;
  message: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
}

const AdminPanel = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

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

  useEffect(() => {
    fetchSubmissions();
    fetchUserProfiles();
  }, []);

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const loadingToastId = toast.loading('Deleting user...');
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('User deleted successfully!', { id: loadingToastId });
      fetchUserProfiles();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`, { id: loadingToastId });
    }
  };

  const handleResendConfirmation = async (email: string) => {
    const loadingToastId = toast.loading('Resending confirmation...');
    try {
      const response = await supabase.functions.invoke('resend-confirmation', {
        body: { email },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Confirmation email sent!', { id: loadingToastId });
    } catch (error: any) {
      console.error('Error resending confirmation:', error);
      toast.error(`Failed to resend confirmation: ${error.message}`, { id: loadingToastId });
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password for this user:');
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    const loadingToastId = toast.loading('Resetting password...');
    try {
      const response = await supabase.functions.invoke('reset-password-admin', {
        body: { userId, newPassword },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Password reset successfully!', { id: loadingToastId });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(`Failed to reset password: ${error.message}`, { id: loadingToastId });
    }
  };

  return (
    <div className="w-full max-w-6xl px-4">
      <h2 className="text-4xl font-bold text-foreground text-center mb-6 font-heading">Admin Panel</h2>
      <p className="text-center text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
        Manage contact submissions, events, analytics, and users from here.
      </p>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-secondary/50 p-1 rounded-2xl mb-8">
          <TabsTrigger value="events" className="rounded-xl">Events</TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-xl">Contact</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl">Analytics</TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl">Users</TabsTrigger>
          <TabsTrigger value="ai-logs" className="rounded-xl flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> AI Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="events" className="mt-0">
          <EventManagementTable />
        </TabsContent>
        
        <TabsContent value="submissions" className="mt-0">
          {loadingSubmissions ? (
            <div className="grid grid-cols-1 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="organic-card rounded-[2rem]">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-muted-foreground p-12 organic-card rounded-[2rem]">No contact submissions found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {submissions.map((submission) => (
                <Card key={submission.id} className="organic-card rounded-[2rem]">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary font-heading">{submission.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Submitted on: {format(new Date(submission.created_at), 'PPP p')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {submission.name && (
                      <p className="text-foreground">
                        <span className="font-black uppercase text-[10px] tracking-widest text-muted-foreground block mb-1">From</span> 
                        {submission.name}
                      </p>
                    )}
                    {submission.email && (
                      <p className="text-foreground">
                        <span className="font-black uppercase text-[10px] tracking-widest text-muted-foreground block mb-1">Email</span>
                        <a href={`mailto:${submission.email}`} className="text-primary hover:underline font-medium">
                          {submission.email}
                        </a>
                      </p>
                    )}
                    <p className="text-foreground leading-relaxed">
                      <span className="font-black uppercase text-[10px] tracking-widest text-muted-foreground block mb-1">Message</span>
                      {submission.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-0">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="ai-logs" className="mt-0">
          <AiLogsTable />
        </TabsContent>
        
        <TabsContent value="users" className="mt-0">
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-secondary rounded-lg border border-border">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-xl font-semibold text-foreground">Loading users...</p>
            </div>
          ) : userProfiles.length === 0 ? (
            <p className="text-center text-muted-foreground p-12 organic-card rounded-[2rem]">No user profiles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead className="text-foreground font-bold">Name</TableHead>
                    <TableHead className="text-foreground font-bold">Email</TableHead>
                    <TableHead className="text-foreground font-bold">Joined</TableHead>
                    <TableHead className="text-right text-foreground font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfiles.map((profile) => (
                    <TableRow key={profile.id} className="hover:bg-secondary/10 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                            <UserIcon className="h-4 w-4 text-primary" />
                          </div>
                          {profile.first_name || profile.last_name ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          {profile.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex items-center">
                          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                          {profile.created_at !== 'N/A' ? format(new Date(profile.created_at), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit User" onClick={() => handleEditUser(profile)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Resend Confirmation" onClick={() => handleResendConfirmation(profile.email)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Reset Password" onClick={() => handleResetPassword(profile.id)} className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                            <Key className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete User" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-heading">Delete User?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user
                                  and all their associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(profile.id)} className="bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-xl">Delete User</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditUserDialog
        isOpen={isEditUserDialogOpen}
        onClose={() => setIsEditUserDialogOpen(false)}
        user={selectedUser}
        onUserUpdated={() => {
          fetchUserProfiles();
          setIsEditUserDialogOpen(false);
        }}
      />
    </div>
  );
};

export default AdminPanel;