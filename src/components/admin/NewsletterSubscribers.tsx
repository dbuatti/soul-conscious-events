import React, { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { CalendarDays, Download, Loader2, Mail, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { NewsletterSubscriber } from '@/types/database';
import { NEWSLETTER_CITIES } from '@/lib/cities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const NewsletterSubscribers: React.FC = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('id,email,city,source,created_at,unsubscribed_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching newsletter subscribers:', error);
      toast.error('Failed to load subscribers.');
    } else {
      setSubscribers((data || []) as NewsletterSubscriber[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchSubscribers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscribers.filter((subscriber) => {
      if (city !== 'all' && subscriber.city !== city) return false;
      if (!term) return true;
      return subscriber.email.toLowerCase().includes(term)
        || subscriber.source.toLowerCase().includes(term);
    });
  }, [subscribers, search, city]);

  const activeCount = subscribers.filter((subscriber) => !subscriber.unsubscribed_at).length;
  const weekCount = subscribers.filter((subscriber) =>
    !subscriber.unsubscribed_at && new Date(subscriber.created_at) >= subDays(new Date(), 7),
  ).length;

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info('No subscribers to export.');
      return;
    }

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ['Email', 'City', 'Source', 'Joined', 'Status'],
      ...filtered.map((subscriber) => [
        subscriber.email,
        subscriber.city,
        subscriber.source,
        subscriber.created_at,
        subscriber.unsubscribed_at ? 'unsubscribed' : 'active',
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soulflow_subscribers_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Subscriber list exported.');
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-heading font-semibold text-foreground">Weekly picks subscribers</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Export this list into Kit (or your email platform) to send the weekly city guide.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="rounded-full w-fit">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="organic-card rounded-2xl p-5">
          <Users className="h-5 w-5 text-primary mb-3" />
          <p className="text-3xl font-heading font-semibold text-foreground">{activeCount}</p>
          <p className="text-sm text-muted-foreground">Active subscribers</p>
        </div>
        <div className="organic-card rounded-2xl p-5">
          <CalendarDays className="h-5 w-5 text-primary mb-3" />
          <p className="text-3xl font-heading font-semibold text-foreground">{weekCount}</p>
          <p className="text-sm text-muted-foreground">Joined in the last 7 days</p>
        </div>
        <div className="organic-card rounded-2xl p-5">
          <MapPin className="h-5 w-5 text-primary mb-3" />
          <p className="text-3xl font-heading font-semibold text-foreground">
            {new Set(subscribers.filter((subscriber) => !subscriber.unsubscribed_at).map((subscriber) => subscriber.city)).size}
          </p>
          <p className="text-sm text-muted-foreground">Active city segments</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email or source…"
          className="rounded-full"
          aria-label="Search subscribers"
        />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="rounded-full sm:w-48" aria-label="Filter by city">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NEWSLETTER_CITIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading subscribers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="organic-card rounded-2xl py-16 text-center">
          <Mail className="h-10 w-10 text-primary/30 mx-auto mb-4" />
          <p className="font-semibold text-foreground">No subscribers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Share the homepage or a city guide to start collecting weekly-picks signups.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-card border border-border rounded-2xl">
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">{subscriber.email}</TableCell>
                  <TableCell className="capitalize">{subscriber.city}</TableCell>
                  <TableCell className="text-muted-foreground">{subscriber.source}</TableCell>
                  <TableCell>{format(new Date(subscriber.created_at), 'd MMM yyyy')}</TableCell>
                  <TableCell>
                    <span className={subscriber.unsubscribed_at ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}>
                      {subscriber.unsubscribed_at ? 'Unsubscribed' : 'Active'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default NewsletterSubscribers;
