import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlusCircle, Lightbulb, Zap, CheckCircle, UserPlus, Loader2 } from 'lucide-react';
import AddDevTaskDialog from '@/components/AddDevTaskDialog';
import DevTaskCard from '@/components/DevTaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/components/SessionContextProvider';

export interface DevTask {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

const DevSpace = () => {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const { user: currentUser } = useSession();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dev_tasks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching dev tasks:', error);
      toast.error('Failed to load tasks.');
    } else {
      setTasks(data as DevTask[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTestUser = async () => {
    if (!currentUser || currentUser.email !== 'daniele.buatti@gmail.com') {
      toast.error('Only the admin can create test users.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const timestamp = Date.now();
      const email = `testuser_${timestamp}@example.com`;
      const password = `password${timestamp}`;
      const firstName = `Test`;
      const lastName = `User ${timestamp.toString().slice(-4)}`;

      const { data, error } = await supabase.functions.invoke('create-test-user', {
        body: { email, password, first_name: firstName, last_name: lastName },
      });

      if (error) {
        console.error('Error creating test user via Edge Function:', error);
        toast.error(`Failed to create test user: ${error.message}`);
      } else {
        const { userId, email: createdEmail, password: createdPassword } = data;
        toast.success(`Test user created: ${createdEmail} (Password: ${createdPassword})`);
        console.log(`Created Test User: Email: ${createdEmail}, Password: ${createdPassword}, ID: ${userId}`);
      }
    } catch (error: any) {
      console.error('Error invoking create-test-user function:', error);
      toast.error(`Failed to create test user: ${error.message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const columns = {
    idea: tasks.filter(task => task.status === 'idea'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    completed: tasks.filter(task => task.status === 'completed'),
  };

  const onTaskChange = () => {
    fetchTasks();
  };

  const renderColumn = (title: string, tasks: DevTask[], icon: React.ReactNode) => (
    <div className="flex-1 p-6 bg-card rounded-[2rem] min-w-[300px] shadow-lg border border-border">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center font-heading">
        {icon}
        <span className="ml-3">{title} ({tasks.length})</span>
      </h2>
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        ) : (
          tasks.map(task => (
            <DevTaskCard key={task.id} task={task} onTaskUpdated={onTaskChange} />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-5xl font-black text-foreground font-heading tracking-tight">Dev Space</h1>
          <p className="text-muted-foreground font-medium">Internal roadmap and testing tools.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleCreateTestUser} disabled={isCreatingUser} variant="outline" className="h-12 rounded-xl px-6 font-bold transition-all hover:bg-blue-50 hover:text-blue-600 border-blue-200">
            {isCreatingUser ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
            {isCreatingUser ? 'Creating...' : 'Create Test User'}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="h-12 rounded-xl px-8 bg-primary hover:bg-primary/80 text-primary-foreground font-bold shadow-lg transition-transform hover:scale-105">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Idea
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {renderColumn('Ideas', columns.idea, <Lightbulb className="h-7 w-7 text-yellow-500" />)}
        {renderColumn('In Progress', columns.in_progress, <Zap className="h-7 w-7 text-blue-500" />)}
        {renderColumn('Completed', columns.completed, <CheckCircle className="h-7 w-7 text-green-500" />)}
      </div>

      <AddDevTaskDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onTaskAdded={() => {
          onTaskChange();
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
};

export default DevSpace;