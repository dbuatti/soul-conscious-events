import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlusCircle, Lightbulb, Zap, CheckCircle, UserPlus, Loader2 } from 'lucide-react'; // Added Loader2 icon
import AddDevTaskDialog from '@/components/AddDevTaskDialog';
import DevTaskCard from '@/components/DevTaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession

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
  const [isCreatingUser, setIsCreatingUser] = useState(false); // New state for user creation loading
  const { session, user: currentUser } = useSession(); // Get session and current user

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
      const password = `password${timestamp}`; // A simple password for testing
      const firstName = `Test`;
      const lastName = `User ${timestamp.toString().slice(-4)}`;

      const { data, error } = await supabase.rpc('create_test_user', {
        user_email: email,
        user_password: password,
        first_name: firstName,
        last_name: lastName,
      });

      if (error) {
        console.error('Error creating test user:', error);
        toast.error(`Failed to create test user: ${error.message}`);
      } else {
        toast.success(`Test user created: ${email} (Password: ${password})`);
        // You might want to log this info somewhere accessible for testing
        console.log(`Created Test User: Email: ${email}, Password: ${password}, ID: ${data}`);
      }
    } catch (error: any) {
      console.error('Error invoking create_test_user function:', error);
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
    <div className="flex-1 p-4 bg-secondary/50 rounded-lg min-w-[300px]">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center">
        {icon}
        <span className="ml-2">{title} ({tasks.length})</span>
      </h2>
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
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
    <div className="w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-4xl font-bold text-foreground">Dev Space</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleCreateTestUser} disabled={isCreatingUser} className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
            {isCreatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isCreatingUser ? 'Creating User...' : 'Create Test User'}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Idea
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {renderColumn('Ideas', columns.idea, <Lightbulb className="h-6 w-6 text-yellow-400" />)}
        {renderColumn('In Progress', columns.in_progress, <Zap className="h-6 w-6 text-blue-400" />)}
        {renderColumn('Completed', columns.completed, <CheckCircle className="h-6 w-6 text-green-400" />)}
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