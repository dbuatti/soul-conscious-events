import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Loader2, Frown, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AiLog {
  id: string;
  created_at: string;
  input_text: string;
  parsed_data: any;
  error_message: string | null;
}

const AiLogsTable = () => {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_parsing_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching AI logs:', error);
      toast.error('Failed to load AI logs.');
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-foreground">Recent AI Parsing Attempts</h3>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Logs'}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-secondary rounded-lg border border-border">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-xl font-semibold text-foreground">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 bg-secondary rounded-lg border border-border text-center">
          <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">No AI logs found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-card border border-border rounded-lg shadow-lg">
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Time</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Input Snippet</TableHead>
                <TableHead className="text-right text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {log.error_message ? (
                      <div className="flex items-center text-destructive">
                        <AlertCircle className="mr-1 h-4 w-4" /> Error
                      </div>
                    ) : (
                      <div className="flex items-center text-green-600">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Success
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {log.input_text}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4 mr-1" /> View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>AI Parsing Detail</DialogTitle>
            <DialogDescription>
              Raw input and output for debugging.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-4">
            <div className="space-y-6 py-4">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Input Text</h4>
                <div className="p-4 bg-secondary rounded-lg text-sm whitespace-pre-wrap border border-border">
                  {selectedLog?.input_text}
                </div>
              </div>
              
              {selectedLog?.error_message && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-destructive mb-2">Error Message</h4>
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Parsed JSON Output</h4>
                <pre className="p-4 bg-black text-green-400 rounded-lg text-xs overflow-x-auto border border-white/10">
                  {JSON.stringify(selectedLog?.parsed_data, null, 2)}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AiLogsTable;