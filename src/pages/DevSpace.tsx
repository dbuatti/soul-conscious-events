import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlusCircle, Lightbulb, Zap, CheckCircle, Database } from 'lucide-react'; // Import Database icon
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
  const [isSeeding, setIsSeeding] = useState(false);
  const { session } = useSession(); // Get session to pass auth token

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

  const handleSeedData = async () => {
    if (!session) {
      toast.error('You must be logged in to seed data.');
      return;
    }

    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`, // Pass the user's access token
        },
      });

      if (error) {
        console.error('Error seeding data:', error);
        toast.error(`Failed to seed data: ${error.message}`);
      } else {
        toast.success('Database seeded successfully!');
        // Optionally refresh tasks or other data after seeding
        fetchTasks();
      }
    } catch (error: any) {
      console.error('Error invoking seed-data function:', error);
      toast.error(`Failed to invoke seed function: ${error.message}`);
    } finally {
      setIsSeeding(false);
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
          <Button onClick={handleSeedData} disabled={isSeeding} className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105">
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {isSeeding ? 'Seeding...' : 'Seed Data'}
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