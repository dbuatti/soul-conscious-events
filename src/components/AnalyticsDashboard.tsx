import React, { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { CalendarIcon, Download, BarChart, Loader2, Frown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface EventAnalytics {
  event_id: string;
  event_name: string;
  total_views: number;
  total_ticket_clicks: number;
  total_discount_copies: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<EventAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [timePeriod, setTimePeriod] = useState<string>('last_30_days');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('event_analytics_logs')
      .select(`
        event_id,
        log_type,
        logged_at,
        events (
          event_name
        )
      `);

    if (startDate) {
      query = query.gte('logged_at', format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
    }
    if (endDate) {
      query = query.lte('logged_at', format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching analytics logs:', logsError);
      toast.error('Failed to load analytics data.');
      setLoading(false);
      return;
    }

    // Fetch discount code usage logs separately
    let discountQuery = supabase
      .from('discount_code_usage_logs')
      .select(`
        event_id,
        copied_at
      `);

    if (startDate) {
      discountQuery = discountQuery.gte('copied_at', format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
    }
    if (endDate) {
      discountQuery = discountQuery.lte('copied_at', format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
    }

    const { data: discountLogs, error: discountError } = await discountQuery;

    if (discountError) {
      console.error('Error fetching discount logs:', discountError);
      toast.error('Failed to load discount usage data.');
      setLoading(false);
      return;
    }

    const aggregatedData: { [key: string]: EventAnalytics } = {};

    logs.forEach((log: any) => {
      const eventId = log.event_id;
      const eventName = log.events?.event_name || 'Unknown Event';

      if (!aggregatedData[eventId]) {
        aggregatedData[eventId] = {
          event_id: eventId,
          event_name: eventName,
          total_views: 0,
          total_ticket_clicks: 0,
          total_discount_copies: 0,
        };
      }

      if (log.log_type === 'view') {
        aggregatedData[eventId].total_views++;
      } else if (log.log_type === 'ticket_click') {
        aggregatedData[eventId].total_ticket_clicks++;
      }
    });

    discountLogs.forEach((log: any) => {
      const eventId = log.event_id;
      // We need to ensure eventName is populated for discount-only events
      // For simplicity, we'll assume events in discount_code_usage_logs also exist in event_analytics_logs or events table
      // A more robust solution would fetch event names for all unique event_ids from both logs
      if (aggregatedData[eventId]) {
        aggregatedData[eventId].total_discount_copies++;
      } else {
        // If an event only has discount copies but no views/clicks, we need its name
        // This is a simplified approach; ideally, fetch event names for all unique IDs
        aggregatedData[eventId] = {
          event_id: eventId,
          event_name: 'Unknown Event (Discount Only)', // Placeholder, could fetch actual name
          total_views: 0,
          total_ticket_clicks: 0,
          total_discount_copies: 1,
        };
      }
    });

    let finalData = Object.values(aggregatedData);

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      finalData = finalData.filter(item =>
        item.event_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        item.event_id.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    setAnalyticsData(finalData.sort((a, b) => b.total_views - a.total_views)); // Sort by views
    setLoading(false);
  }, [startDate, endDate, searchTerm]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value);
    const now = new Date();
    if (value === 'last_7_days') {
      setStartDate(subDays(now, 7));
      setEndDate(now);
    } else if (value === 'last_30_days') {
      setStartDate(subDays(now, 30));
      setEndDate(now);
    } else if (value === 'all_time') {
      setStartDate(undefined);
      setEndDate(undefined);
    } else if (value === 'custom') {
      // Keep current custom range or reset to a default if not set
      if (!startDate || !endDate) {
        setStartDate(subDays(now, 7));
        setEndDate(now);
      }
    }
  };

  const handleExportCsv = () => {
    if (analyticsData.length === 0) {
      toast.info('No data to export.');
      return;
    }

    const headers = ['Event ID', 'Event Name', 'Total Views', 'Total Ticket Clicks', 'Total Discount Copies'];
    const rows = analyticsData.map(row => [
      row.event_id,
      `"${row.event_name.replace(/"/g, '""')}"`, // Handle commas/quotes in names
      row.total_views,
      row.total_ticket_clicks,
      row.total_discount_copies,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `event_analytics_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics data exported successfully!');
    } else {
      toast.error('Your browser does not support downloading files directly.');
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-foreground text-center mb-6 flex items-center justify-center">
        <BarChart className="mr-3 h-7 w-7 text-primary" /> Event Analytics
      </h2>
      <p className="text-center text-muted-foreground mb-8">
        Gain insights into event engagement.
      </p>

      <div className="mb-6 p-4 bg-card rounded-lg shadow-md border border-border flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-1/3">
          <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
            <SelectTrigger className="w-full focus-visible:ring-primary">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent className="dark:bg-card dark:border-border">
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timePeriod === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-2/3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-card dark:border-border">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
        <Input
          placeholder="Search by event name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 focus-visible:ring-primary"
        />
        <Button onClick={fetchAnalytics} className="w-full md:w-auto bg-primary hover:bg-primary/80 text-primary-foreground">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart className="mr-2 h-4 w-4" />}
          {loading ? 'Loading...' : 'Apply Filters'}
        </Button>
        <Button variant="outline" onClick={handleExportCsv} disabled={analyticsData.length === 0} className="w-full md:w-auto transition-all duration-300 ease-in-out transform hover:scale-105">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-secondary rounded-lg border border-border">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-xl font-semibold text-foreground">Fetching analytics...</p>
        </div>
      ) : analyticsData.length === 0 ? (
        <div className="p-8 bg-secondary rounded-lg border border-border text-center">
          <Frown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-4">No analytics data found for the selected period.</p>
          <Button onClick={() => { setTimePeriod('all_time'); setStartDate(undefined); setEndDate(undefined); setSearchTerm(''); }} className="bg-primary hover:bg-primary/80 text-primary-foreground">
            View All Time Data
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-card border border-border rounded-lg shadow-lg">
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Event Name</TableHead>
                <TableHead className="text-foreground">Total Views</TableHead>
                <TableHead className="text-foreground">Ticket Clicks</TableHead>
                <TableHead className="text-foreground">Discount Copies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData.map((data) => (
                <TableRow key={data.event_id}>
                  <TableCell className="font-medium text-foreground">{data.event_name}</TableCell>
                  <TableCell className="text-foreground">{data.total_views}</TableCell>
                  <TableCell className="text-foreground">{data.total_ticket_clicks}</TableCell>
                  <TableCell className="text-foreground">{data.total_discount_copies}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;