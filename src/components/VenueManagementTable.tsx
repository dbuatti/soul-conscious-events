import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Loader2, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react';

const VenueManagementTable = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [rawText, setRawText] = useState('');

  const fetchVenues = async () => {
    setLoading(true);
    const { data } = await supabase.from('venues').select('*').order('name');
    setVenues(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleAiAdd = async () => {
    if (!rawText.trim()) return;
    setIsAiParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-venue-details', {
        body: { text: rawText }
      });
      if (error) throw error;

      const { error: insertError } = await supabase.from('venues').insert([data]);
      if (insertError) throw insertError;

      toast.success('Venue added successfully!');
      setRawText('');
      fetchVenues();
    } catch (err: any) {
      toast.error('Failed to parse venue: ' + err.message);
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (!error) {
      toast.success('Venue removed');
      fetchVenues();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Pre-filled Venues</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="mr-2 h-4 w-4" /> Add via Google Maps</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Paste Google Maps Info</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Textarea 
                placeholder="Paste the raw text from Google Maps here..." 
                className="min-h-[200px]"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground italic">The AI will extract the name, address, and details automatically.</p>
            </div>
            <DialogFooter>
              <Button onClick={handleAiAdd} disabled={isAiParsing}>
                {isAiParsing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Parse & Add Venue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-bold">{v.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.full_address}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VenueManagementTable;