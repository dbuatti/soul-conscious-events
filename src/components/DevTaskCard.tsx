import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DevTask } from '@/pages/DevSpace';
import EditDevTaskDialog from './EditDevTaskDialog';

interface DevTaskCardProps {
  task: DevTask;
  onTaskUpdated: () => void;
}

const DevTaskCard: React.FC<DevTaskCardProps> = ({ task, onTaskUpdated }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <Card className="bg-card shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-foreground">{task.title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {task.description && (
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{task.description}</p>
          )}
          <CardDescription>
            Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
          </CardDescription>
        </CardContent>
      </Card>
      <EditDevTaskDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={task}
        onTaskUpdated={() => {
          onTaskUpdated();
          setIsEditDialogOpen(false);
        }}
      />
    </>
  );
};

export default DevTaskCard;