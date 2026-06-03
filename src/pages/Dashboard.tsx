import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Event } from '@/types/event';
import SEO from '@/components/SEO';
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, PlusCircle, Eye, MousePointerClick, Tag, Frown, Edit } from 'lucide-react';
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

const Dashboard: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, EventMetrics>>({});
  const [thisWeekViews, setThisWeekViews] = useState(0);
  const [lastWeekViews, setLastWeekViews] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
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
      setLoading(false);
      return;
    }

    const validEvents = (eventsData || []).filter(e => e.id && e.id.length > 30) as Event[];
    setEvents(validEvents);

    if (validEvents.length === 0) {
      setLoading(false);
      return;
    }

    const eventIds = validEvents.map(e => e.id);

    const [analyticsResult, discountResult] = await Promise.all([
      supabase
        .from('event_analytics_logs')
        .select('event_id, log_type, logged_at')
        .in('event_id', eventIds),
      supabase
        .from('discount_code_usage_logs')
        .select('event_id, copied_at')
        .in('event_id', eventIds),
    ]);

    if (analyticsResult.error) toast.error('Failed to load view data.');
    if (discountResult.error) toast.error('Failed to load discount data.');

    const analyticsLogs = analyticsResult.data || [];
    const discountLogs = discountResult.data || [];

    // Per-event aggregation
    const metrics: Record<string, EventMetrics> = {};
    validEvents.forEach(e => {
      metrics[e.id] = { views: 0, ticketClicks: 0, discountCopies: 0 };
    });

    analyticsLogs.forEach((log: any) => {
      if (!metrics[log.event_id]) return;
      if (log.log_type === 'view') metrics[log.event_id].views++;
      else if (log.log_type === 'ticket_click') metrics[log.event_id].ticketClicks++;
    });

    discountLogs.forEach((log: any) => {
      if (metrics[log.event_id]) metrics[log.event_id].discountCopies++;
    });

    setMetricsMap(metrics);

    // Weekly view summary
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    let thisWeek = 0;
    let lastWeek = 0;
    analyticsLogs.forEach((log: any) => {
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
    if (!isSessionLoading) fetchDashboardData();
  }, [isSessionLoading, fetchDashboardData]);

  const trend = thisWeekViews > lastWeekViews ? 'up' : thisWeekViews < lastWeekViews ? 'down' : 'flat';

  const trendLabel = (() => {
    if (lastWeekViews === 0 && thisWeekViews === 0) return 'No views yet this week';
    if (lastWeekViews === 0) return 'New activity this week!';
    const pct = Math.round(Math.abs((thisWeekViews - lastWeekViews) / lastWeekViews) * 100);
    if (trend === 'flat') return 'No change vs last week';
    return `${pct}% ${trend === 'up' ? 'increase' : 'decrease'} vs last week`;
  })();

  if (isSessionLoading || loading) {
    return (
      <div className="w-full max-w-6xl px-4">
        <Skeleton className="h-16 w-1/3 mb-4 rounded-2xl" />
        <Skeleton className="h-6 w-1/4 mb-12 rounded-xl" />
        <Skeleton className="h-40 w-full mb-12 rounded-[2rem]" />
        <Skeleton className="h-8 w-1/4 mb-6 rounded-xl" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-4">
      <SEO
        title="Producer Dashboard | SoulFlow Australia"
        description="Track views, ticket clicks, and engagement for your SoulFlow events."
      />

      <div className="mb-10 sm:mb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">Your Dashboard</h1>
        <p className="text-muted-foreground mt-4 font-medium">Track how your events are performing.</p>
      </div>

      {events.length === 0 ? (
        <div className="p-16 sm:p-24 organic-card rounded-[3rem] sm:rounded-[4rem] text-center border-dashed border-primary/20">
          <Frown className="h-16 w-16 sm:h-24 sm:w-24 text-primary/20 mx-auto mb-8" />
          <h3 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">No events yet</h3>
          <p className="text-muted-foreground mb-10 text-lg max-w-sm mx-auto font-medium">
            Submit your first event to start seeing performance data here.
          </p>
          <Link to="/submit-event">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-10 py-7 text-xl font-black shadow-2xl transition-transform hover:scale-105">
              <PlusCircle className="mr-2 h-6 w-6" /> Submit Your First Event
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Weekly summary card */}
          <div className="organic-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 mb-10 sm:mb-16">
            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-6">Views — This Week vs Last Week</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">This Week</p>
                <p className="text-5xl sm:text-6xl font-black font-heading text-foreground leading-none">{thisWeekViews}</p>
                <p className="text-xs text-muted-foreground font-medium">views</p>
              </div>

              <div className="hidden sm:block w-px h-14 bg-border flex-shrink-0" />

              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Last Week</p>
                <p className="text-5xl sm:text-6xl font-black font-heading text-foreground leading-none">{lastWeekViews}</p>
                <p className="text-xs text-muted-foreground font-medium">views</p>
              </div>

              <div className="hidden sm:block w-px h-14 bg-border flex-shrink-0" />

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
                  'text-sm font-bold',
                  trend === 'up' && 'text-emerald-600',
                  trend === 'down' && 'text-destructive',
                  trend === 'flat' && 'text-muted-foreground',
                )}>
                  {trendLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Events list */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-10 gap-4">
            <h2 className="text-2xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">Your Events</h2>
            <Link to="/submit-event">
              <Button className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-xl px-6 py-4 font-black shadow-lg transition-transform hover:scale-105">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
              </Button>
            </Link>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {events.map((event) => {
              const m = metricsMap[event.id] || { views: 0, ticketClicks: 0, discountCopies: 0 };
              return (
                <div key={event.id} className="organic-card rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">

                    {/* Event info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest', statusStyle(event.approval_status))}>
                          {event.approval_status || 'pending'}
                        </span>
                        {event.event_type && (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-primary/10 text-primary">
                            {event.event_type}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg sm:text-xl font-black font-heading text-foreground leading-snug truncate">
                        {event.event_name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        {format(parseISO(event.event_date), 'MMM d, yyyy')}
                        {event.place_name && ` · ${event.place_name}`}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-shrink-0">
                      <div className="text-center space-y-1">
                        <Eye className="h-4 w-4 text-primary/40 mx-auto" />
                        <p className="text-2xl sm:text-3xl font-black text-foreground leading-none">{m.views}</p>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Views</p>
                      </div>
                      <div className="text-center space-y-1">
                        <MousePointerClick className="h-4 w-4 text-primary/40 mx-auto" />
                        <p className="text-2xl sm:text-3xl font-black text-foreground leading-none">{m.ticketClicks}</p>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Clicks</p>
                      </div>
                      <div className="text-center space-y-1">
                        <Tag className="h-4 w-4 text-primary/40 mx-auto" />
                        <p className="text-2xl sm:text-3xl font-black text-foreground leading-none">{m.discountCopies}</p>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Discounts</p>
                      </div>
                    </div>

                    {/* Edit */}
                    <div className="flex-shrink-0 sm:pl-2">
                      <Link to={`/edit-event/${event.id}`}>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold w-full sm:w-auto">
                          <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
