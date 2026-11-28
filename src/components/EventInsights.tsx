import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EventAnalyticsLog, DiscountCodeUsageLog } from '@/types/database';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/event';
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, PlusCircle, Eye, MousePointerClick, Tag, Frown, Edit, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventMetrics {
  views: number;
  ticketClicks: number;
  discountCopies: number;
}

const statusStyle = (status?: string) => {
  if (status === 'approved') return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
  if (status === 'pending') return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
  if (status === 'rejected') return 'bg-destructive/10 text-destructive border border-destructive/20';
  return 'bg-muted text-muted-foreground border border-border';
};

/**
 * Performance snapshot of the signed-in host's events. Embedded in the
 * Account hub so there is a single destination for everything "mine".
 */
const EventInsights: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, EventMetrics>>({});
  const [thisWeekViews, setThisWeekViews] = useState(0);
  const [lastWeekViews, setLastWeekViews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadFailed, setLoadFailed] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('event_date', { ascending: false });

    if (eventsError) {
      toast.error('Failed to load your events.');
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    setLoadFailed(false);

    const validEvents = (eventsData || []).filter(e => e.id && e.id.length > 30) as Event[];
    setEvents(validEvents);
    setVisibleCount(5);
    if (validEvents.length === 0) { setLoading(false); return; }

    const eventIds = validEvents.map(e => e.id);
    const [analyticsResult, discountResult] = await Promise.all([
      supabase.from('event_analytics_logs').select('event_id, log_type, logged_at').in('event_id', eventIds),
      supabase.from('discount_code_usage_logs').select('event_id, copied_at').in('event_id', eventIds),
    ]);

    if (analyticsResult.error) toast.error('Failed to load view data.');
    if (discountResult.error) toast.error('Failed to load discount data.');

    const metrics: Record<string, EventMetrics> = {};
    validEvents.forEach(e => { metrics[e.id] = { views: 0, ticketClicks: 0, discountCopies: 0 }; });
    (analyticsResult.data || []).forEach((log: EventAnalyticsLog) => {
      const id = log.event_id as string;
      if (!metrics[id]) return;
      if (log.log_type === 'view') metrics[id].views++;
      else if (log.log_type === 'ticket_click') metrics[id].ticketClicks++;
    });
    (discountResult.data || []).forEach((log: DiscountCodeUsageLog) => {
      if (metrics[log.event_id as string]) metrics[log.event_id as string].discountCopies++;
    });
    setMetricsMap(metrics);

    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    let thisWeek = 0;
    let lastWeek = 0;
    (analyticsResult.data || []).forEach((log: EventAnalyticsLog) => {
      if (log.log_type !== 'view') return;
      const d = parseISO(log.logged_at);
      if (d >= thisWeekStart && d <= thisWeekEnd) thisWeek++;
      else if (d >= lastWeekStart && d <= lastWeekEnd) lastWeek++;
    });
    setThisWeekViews(thisWeek);
    setLastWeekViews(lastWeek);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isSessionLoading) fetchData();
  }, [isSessionLoading, fetchData]);

  if (isSessionLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-[2rem]" />
        <Skeleton className="h-28 w-full rounded-[2rem]" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="p-10 organic-card rounded-[2rem] text-center border-dashed border-destructive/20">
        <AlertCircle className="h-12 w-12 text-destructive/40 mx-auto mb-4" />
        <p className="text-muted-foreground mb-6">We couldn't load your event insights.</p>
        <Button onClick={fetchData} variant="outline" className="rounded-full">Try again</Button>
      </div>
    );
  }

  const trend = thisWeekViews > lastWeekViews ? 'up' : thisWeekViews < lastWeekViews ? 'down' : 'flat';
  const trendLabel = (() => {
    if (lastWeekViews === 0 && thisWeekViews === 0) return 'No views yet this week';
    if (lastWeekViews === 0) return 'New activity this week!';
    const pct = Math.round(Math.abs((thisWeekViews - lastWeekViews) / lastWeekViews) * 100);
    if (trend === 'flat') return 'No change vs last week';
    return `${pct}% ${trend === 'up' ? 'increase' : 'decrease'} vs last week`;
  })();

  if (events.length === 0) {
    return (
      <div className="p-10 sm:p-16 organic-card rounded-[2rem] text-center border-dashed border-primary/20">
        <Frown className="h-14 w-14 text-primary/20 mx-auto mb-6" />
        <h3 className="text-2xl font-heading font-semibold text-foreground mb-3">No events yet</h3>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          Submit your first event to start seeing performance data here.
        </p>
        <Link to="/submit-event">
          <Button className="rounded-full px-6">
            <PlusCircle className="mr-2 h-4 w-4" /> Submit your first event
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="organic-card rounded-[2rem] p-6 sm:p-8">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em] mb-6">
          Views — this week vs last week
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">This week</p>
            <p className="text-5xl sm:text-6xl font-semibold font-heading text-foreground leading-none">{thisWeekViews}</p>
          </div>
          <div className="hidden sm:block w-px h-14 bg-border flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Last week</p>
            <p className="text-5xl sm:text-6xl font-semibold font-heading text-foreground leading-none">{lastWeekViews}</p>
          </div>
          <div className={cn(
            'flex items-center gap-3 px-5 py-3 rounded-2xl',
            trend === 'up' && 'bg-emerald-500/10',
            trend === 'down' && 'bg-destructive/10',
            trend === 'flat' && 'bg-muted',
          )}>
            {trend === 'up' && <TrendingUp className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
            {trend === 'down' && <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0" />}
            {trend === 'flat' && <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
            <span className={cn(
              'text-sm font-semibold',
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-destructive',
              trend === 'flat' && 'text-muted-foreground',
            )}>{trendLabel}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {events.slice(0, visibleCount).map((event) => {
          const m = metricsMap[event.id] || { views: 0, ticketClicks: 0, discountCopies: 0 };
          return (
            <div key={event.id} className="organic-card rounded-[1.5rem] p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest', statusStyle(event.approval_status))}>
                      {event.approval_status || 'pending'}
                    </span>
                    {event.event_type && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-primary/10 text-primary">
                        {event.event_type}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg sm:text-xl font-semibold font-heading text-foreground leading-snug truncate">
                    {event.event_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(event.event_date), 'MMM d, yyyy')}
                    {event.place_name && ` · ${event.place_name}`}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-shrink-0">
                  {[
                    { icon: Eye, value: m.views, label: 'Views' },
                    { icon: MousePointerClick, value: m.ticketClicks, label: 'Clicks' },
                    { icon: Tag, value: m.discountCopies, label: 'Discounts' },
                  ].map(({ icon: Icon, value, label }) => (
                    <div key={label} className="text-center space-y-1">
                      <Icon className="h-4 w-4 text-primary/40 mx-auto" />
                      <p className={cn("text-2xl sm:text-3xl font-bold leading-none", value === 0 ? "text-muted-foreground/30" : "text-foreground")}>{value}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex-shrink-0">
                  <Link to={`/edit-event/${event.id}`}>
                    <Button variant="outline" size="sm" className="rounded-xl w-full sm:w-auto">
                      <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {events.length > visibleCount && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + 5)}
            className="rounded-full h-10 px-6 font-semibold bg-card"
          >
            Show more ({events.length - visibleCount} remaining)
          </Button>
          <span className="text-xs text-muted-foreground">Showing {Math.min(visibleCount, events.length)} of {events.length}</span>
        </div>
      )}
    </div>
  );
};

export default EventInsights;
