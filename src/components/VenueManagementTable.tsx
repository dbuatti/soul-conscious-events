import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, MapPin, Plus, Sparkles, Trash2, Edit, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const venueSchema = z.object({
  name: z.string().min(1, "Name is required"),
  full_address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  hours: z.string().optional().or(z.literal('')),
  highlights: z.string().optional().or(z.literal('')),
});

type VenueFormValues = z.infer<typeof venueSchema>;

const VenueManagementTable = () => {
  const [venues, setVenues] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [editingVenue, setEditingVenue] = useState<Record<string, unknown> | null>(null);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: '',
      full_address: '',
      phone: '',
      website: '',
      hours: '',
      highlights: '',
    },
  });

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
    } catch (err: unknown) {
      toast.error('Failed to parse venue: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleEdit = (venue: Record<string, unknown>) => {
    setEditingVenue(venue);
    form.reset({
      name: venue.name || '',
      full_address: venue.full_address || '',
      phone: venue.phone || '',
      website: venue.website || '',
      hours: venue.hours || '',
      highlights: venue.highlights || '',
    });
  };

  const onUpdateSubmit = async (values: VenueFormValues) => {
    if (!editingVenue) return;

    const { error } = await supabase
      .from('venues')
      .update(values)
      .eq('id', editingVenue.id);

    if (error) {
      toast.error('Failed to update venue');
    } else {
      toast.success('Venue updated successfully');
      setEditingVenue(null);
      fetchVenues();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this venue?')) return;
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
              <DialogDescription>The AI will extract the name, address, and details automatically.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Textarea 
                placeholder="Paste the raw text from Google Maps here..." 
                className="min-h-[200px]"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
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
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingVenue} onOpenChange={(open) => !open && setEditingVenue(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>Update the details for this community venue.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="full_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Hours</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="highlights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Highlights / Notes</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingVenue(null)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueManagementTable;