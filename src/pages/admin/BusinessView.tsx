import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Camera,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Inbox,
  RefreshCw,
  Workflow,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';
import PageHeader from '@/components/v2/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Tone = 'supply' | 'decision' | 'product' | 'value';

interface FlowNode {
  title: string;
  detail: string;
  tone?: Tone;
}

interface FlowLaneProps {
  step: string;
  title: string;
  subtitle: string;
  nodes: FlowNode[];
}

interface EventPulseRow {
  id: string;
  event_date: string;
  end_date: string | null;
  approval_status: string | null;
  is_deleted: boolean | null;
  source_id: string | null;
}

interface RunPulseRow {
  started_at: string;
  events_added: number;
  sources_checked: number;
}

interface BatchPulseRow {
  kind: string;
  week_start: string;
  status: string;
  posted_at: string | null;
}

interface PulseCounts {
  live: number;
  upcoming: number;
  next7: number;
  pending: number;
  imported: number;
}

interface PulseState {
  loading: boolean;
  error: string | null;
  counts: PulseCounts | null;
  visits7d: number | null;
  lastRun: RunPulseRow | null;
  latestBatch: BatchPulseRow | null;
  fetchedAt: Date | null;
}

const toneDot: Record<Tone, string> = {
  supply: 'bg-sky-500',
  decision: 'bg-amber-500',
  product: 'bg-emerald-500',
  value: 'bg-primary',
};

const ago = (iso: string | null | undefined) => {
  if (!iso) return 'never';
  const date = parseISO(iso);
  return Number.isNaN(date.getTime()) ? 'unknown' : formatDistanceToNow(date, { addSuffix: true });
};

/** One horizontal lane of the model diagram. Stacks vertically on small screens. */
const FlowLane = ({ step, title, subtitle, nodes }: FlowLaneProps) => (
  <section className="mb-6">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
      <span className="font-heading text-xs font-bold uppercase tracking-widest text-primary">{step}</span>
      <h3 className="font-heading text-xl font-semibold text-foreground">{title}</h3>
      <span className="text-sm text-muted-foreground">{subtitle}</span>
    </div>
    <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-0">
      {nodes.map((node, index) => (
        <Fragment key={node.title}>
          <div className="organic-card rounded-[var(--radius)] flex-1 p-4 md:min-w-0">
            <p className="flex items-center gap-2 font-heading font-semibold text-foreground leading-snug">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', toneDot[node.tone ?? 'product'])} aria-hidden="true" />
              {node.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{node.detail}</p>
          </div>
          {index < nodes.length - 1 && (
            <div className="flex items-center justify-center md:w-9 shrink-0 py-0.5 text-primary" aria-hidden="true">
              <ArrowRight className="h-4 w-4 rotate-90 md:rotate-0" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  </section>
);

interface MetricCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Inbox;
  to?: string;
}

const MetricCard = ({ label, value, hint, icon: Icon, to }: MetricCardProps) => {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" aria-hidden="true" />
      </div>
      <p className="mt-2 font-heading text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p>
    </>
  );
  const classes = 'organic-card rounded-[var(--radius)] p-4 transition-transform';
  return to ? (
    <Link to={to} className={cn(classes, 'hover:-translate-y-0.5')}>
      {inner}
    </Link>
  ) : (
    <div className={classes}>{inner}</div>
  );
};

interface ActionLinkProps {
  to: string;
  icon: typeof Inbox;
  title: string;
  detail: string;
}

const ActionLink = ({ to, icon: Icon, title, detail }: ActionLinkProps) => (
  <Link
    to={to}
    className="organic-card rounded-[var(--radius)] p-4 flex items-start gap-4 transition-transform hover:-translate-y-0.5"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold text-foreground">{title}</span>
      <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>
    </span>
    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </Link>
);

interface GuideLinkProps {
  to?: string;
  href?: string;
  title: string;
  detail: string;
  icon: typeof BookOpen;
}

const GuideLink = ({ to, href, title, detail, icon: Icon }: GuideLinkProps) => {
  const inner = (
    <>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          {title}
          {href && <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>
      </span>
    </>
  );
  const classes = 'organic-card rounded-[var(--radius)] p-4 flex items-start gap-3 transition-transform hover:-translate-y-0.5';
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>{inner}</a>;
  }
  return <Link to={to!} className={classes}>{inner}</Link>;
};

const SECTIONS = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'today', label: 'Today' },
  { id: 'model', label: 'Model' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'guides', label: 'Guides' },
];

/**
 * The single admin landing page for the business: live pulse, today's loop,
 * how the machine works, the strategy/paid-tier decisions and the guides.
 * Admin-only route; deliberately no public-facing chrome beyond the app shell.
 */
const BusinessView = () => {
  const location = useLocation();
  const [pulse, setPulse] = useState<PulseState>({
    loading: true,
    error: null,
    counts: null,
    visits7d: null,
    lastRun: null,
    latestBatch: null,
    fetchedAt: null,
  });

  const loadPulse = useCallback(async () => {
    setPulse((current) => ({ ...current, loading: true, error: null }));

    const today = format(new Date(), 'yyyy-MM-dd');
    const in7 = format(new Date(Date.now() + 7 * 86_400_000), 'yyyy-MM-dd');
    const since = subDays(new Date(), 7).toISOString();

    const [eventsRes, runsRes, batchesRes, visitsRes] = await Promise.allSettled([
      supabase
        .from('events')
        .select('id, event_date, end_date, approval_status, is_deleted, source_id')
        .eq('is_deleted', false),
      supabase
        .from('event_import_runs')
        .select('started_at, events_added, sources_checked')
        .order('started_at', { ascending: false })
        .limit(1),
      supabase
        .from('ig_slide_batches')
        .select('kind, week_start, status, posted_at')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('page_visit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'visit')
        .gte('logged_at', since),
    ]);

    let error: string | null = null;
    let counts: PulseCounts | null = null;

    const eventsOutcome = eventsRes.status === 'fulfilled' ? eventsRes.value : null;
    if (eventsOutcome?.error) {
      error = eventsOutcome.error.message;
    } else {
      const rows = (eventsOutcome?.data ?? []) as unknown as EventPulseRow[];
      const live = rows.filter((row) => row.approval_status === 'approved');
      const upcoming = live.filter((row) => (row.end_date || row.event_date) >= today);
      counts = {
        live: live.length,
        upcoming: upcoming.length,
        next7: upcoming.filter((row) => row.event_date <= in7).length,
        pending: rows.filter((row) => row.approval_status === 'pending').length,
        imported: live.filter((row) => Boolean(row.source_id)).length,
      };
    }

    const runsOutcome = runsRes.status === 'fulfilled' ? runsRes.value : null;
    if (runsOutcome?.error && !error) error = runsOutcome.error.message;
    const batchesOutcome = batchesRes.status === 'fulfilled' ? batchesRes.value : null;
    if (batchesOutcome?.error && !error) error = batchesOutcome.error.message;
    const visitsOutcome = visitsRes.status === 'fulfilled' ? visitsRes.value : null;
    if (visitsOutcome?.error && !error) error = visitsOutcome.error.message;

    setPulse({
      loading: false,
      error,
      counts,
      visits7d: visitsOutcome?.error ? null : visitsOutcome?.count ?? null,
      lastRun: (runsOutcome?.data?.[0] as unknown as RunPulseRow) ?? null,
      latestBatch: (batchesOutcome?.data?.[0] as unknown as BatchPulseRow) ?? null,
      fetchedAt: new Date(),
    });
  }, []);

  useEffect(() => {
    loadPulse();
  }, [loadPulse]);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth' }));
  }, [location.hash]);

  return (
    <div className="w-full max-w-6xl px-4 pb-20">
      <SEO
        title="Business view | Admin | SoulFlow"
        description="Daily admin view: live pulse, today's loop, the business model, strategy decisions and guides."
      />

      <PageHeader
        eyebrow="Admin · every morning"
        title="Business view"
        description="One place to see how SoulFlow is going, what needs doing today, and what we already decided."
      />

      <nav aria-label="Business view sections" className="flex flex-wrap gap-2 mb-8">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {section.label}
          </a>
        ))}
      </nav>

      {/* 01 — Morning pulse */}
      <section id="pulse" className="organic-card rounded-[var(--radius)] p-6 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Live numbers</p>
            <h2 className="font-heading text-2xl font-semibold text-foreground">Morning pulse</h2>
          </div>
          <div className="flex items-center gap-3">
            {pulse.fetchedAt && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Updated {ago(pulse.fetchedAt.toISOString())}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={loadPulse} disabled={pulse.loading} aria-label="Refresh business metrics">
              <RefreshCw className={cn('h-4 w-4', pulse.loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {pulse.error && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Some numbers could not load: {pulse.error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {pulse.loading && !pulse.counts ? (
            [...Array(6)].map((_, index) => <Skeleton key={index} className="h-28 rounded-[var(--radius)]" />)
          ) : (
            <>
              <MetricCard label="Live events" value={pulse.counts?.live ?? '—'} hint="approved, not deleted" icon={Inbox} />
              <MetricCard label="Upcoming" value={pulse.counts?.upcoming ?? '—'} hint="not ended yet" icon={CalendarCheck} />
              <MetricCard label="Next 7 days" value={pulse.counts?.next7 ?? '—'} hint="what a visitor sees first" icon={CalendarCheck} />
              <MetricCard label="Pending review" value={pulse.counts?.pending ?? '—'} hint="imports + submissions" icon={Inbox} to="/admin/panel?tab=imports" />
              <MetricCard label="Imported" value={pulse.counts?.imported ?? '—'} hint="auto-sourced, live" icon={Workflow} />
              <MetricCard label="Visits · 7d" value={pulse.visits7d ?? '—'} hint="page_visit_logs" icon={BarChart3} to="/admin/panel?tab=analytics" />
            </>
          )}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-secondary/50 p-4">
            <p className="eyebrow mb-1">Last importer run</p>
            <p className="font-semibold text-foreground">
              {pulse.lastRun
                ? `${pulse.lastRun.events_added} added from ${pulse.lastRun.sources_checked} sources`
                : 'No run recorded'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pulse.lastRun ? ago(pulse.lastRun.started_at) : 'The daily job has not reported yet.'}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-4">
            <p className="eyebrow mb-1">Latest Instagram batch</p>
            <p className="font-semibold text-foreground">
              {pulse.latestBatch ? `${pulse.latestBatch.kind} · ${pulse.latestBatch.status}` : 'No batch yet'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pulse.latestBatch?.posted_at
                ? `Posted ${ago(pulse.latestBatch.posted_at)}`
                : 'Not posted yet — check after the 22:00 UTC run.'}
            </p>
          </div>
        </div>
      </section>

      {/* 02 — Today's loop */}
      <section id="today" className="mt-8 scroll-mt-24">
        <p className="eyebrow mb-1">Daily loop</p>
        <h2 className="font-heading text-2xl font-semibold text-foreground mb-4">What to do today</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <ActionLink
            to="/admin/panel?tab=imports"
            icon={Inbox}
            title={
              pulse.counts?.pending
                ? `Review ${pulse.counts.pending} pending event${pulse.counts.pending === 1 ? '' : 's'}`
                : 'Check the review inbox'
            }
            detail="Publish the on-topic ones, decline the rest. This is the only human step in the pipeline."
          />
          <ActionLink
            to="/admin/panel?tab=slides"
            icon={Camera}
            title="Check the Instagram batch"
            detail="Confirm the daily carousel was generated and posted; the 24-hour guard prevents doubles."
          />
          <ActionLink
            to="/admin/panel?tab=analytics"
            icon={BarChart3}
            title="Read the traffic signal"
            detail="Visits, saves and ticket clicks decide when paid tiers are worth revisiting."
          />
          <ActionLink
            to="/my-events"
            icon={CalendarCheck}
            title="Keep the calendar full"
            detail="Mark your own monthly events as recurring — that is the January cliff fix."
          />
        </div>
      </section>

      {/* 03 — How the machine works */}
      <section id="model" className="mt-12 scroll-mt-24">
        <div className="flex items-center gap-2 mb-1">
          <Workflow className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="eyebrow">The model at a glance</p>
        </div>
        <h2 className="font-heading text-2xl font-semibold text-foreground mb-5">How the machine works</h2>

        <FlowLane
          step="01 · Supply"
          title="Where events come from"
          subtitle="Three inputs, one list"
          nodes={[
            { title: 'Auto-import', detail: 'The importer checks two of the least-recently-run sources each day: Eventbrite, Humanitix and public calendars.', tone: 'supply' },
            { title: 'Host submissions', detail: 'A host pastes a ticket link or flyer. The AI assistant fills in the form; the host reviews before publishing.', tone: 'supply' },
            { title: 'Your own events', detail: 'Piano by Heart and Resonance listings are added directly, so the guide always has something worth seeing.', tone: 'supply' },
          ]}
        />

        <FlowLane
          step="02 · Triage"
          title="Every event gets a verdict"
          subtitle="Curation happens here, not later"
          nodes={[
            { title: 'On topic → live', detail: 'A clear practice or wellbeing signal publishes immediately. No admin action needed.', tone: 'decision' },
            { title: 'Unsure → review', detail: 'Weak signals such as “mindful” on their own wait in the admin inbox for a human decision.', tone: 'decision' },
            { title: 'Off topic → rejected', detail: 'Concerts, conferences and clinical events are stored as rejected so they never get imported again.', tone: 'decision' },
          ]}
        />

        <FlowLane
          step="03 · Product"
          title="What visitors actually get"
          subtitle="One approved dataset, three views"
          nodes={[
            { title: 'List · Calendar · Map', detail: 'The same approved, upcoming events shown three ways. Filters cover date, category, venue, price and state.', tone: 'product' },
            { title: 'A reason to return', detail: 'Saved events, a weekly Instagram carousel and a next-7-days count keep the guide useful between visits.', tone: 'product' },
            { title: 'A way to act', detail: 'Booking goes to the host: tickets, Instagram DM, email or phone. SoulFlow never sells the ticket.', tone: 'product' },
          ]}
        />

        <FlowLane
          step="04 · Value"
          title="Where it pays for itself"
          subtitle="A marketing channel, not a business of its own"
          nodes={[
            { title: 'Free for browsers', detail: 'No paywall and no booking commission. The audience is the asset.', tone: 'value' },
            { title: 'Your own events', detail: 'Piano by Heart, Resonance and Dharma Piano get a permanent, free listing channel in front of the right people.', tone: 'value' },
            { title: 'Audience + signal', detail: 'Page visits, saves and ticket clicks feed the host dashboard and shape what gets posted on Instagram.', tone: 'value' },
            { title: 'Only later', detail: 'Featured listings ($15–30/week) or an email signup once real traffic exists — not before.', tone: 'value' },
          ]}
        />
      </section>

      {/* 04 — Strategy and decisions */}
      <section id="strategy" className="mt-12 scroll-mt-24">
        <div className="flex items-center gap-2 mb-1">
          <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="eyebrow">Strategy &amp; decisions</p>
        </div>
        <h2 className="font-heading text-2xl font-semibold text-foreground mb-5">What we already decided</h2>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="organic-card rounded-[var(--radius)] p-6">
            <p className="eyebrow mb-3">In one sentence</p>
            <h3 className="font-heading text-xl font-semibold mb-3">The business model</h3>
            <p className="text-base leading-relaxed text-foreground">
              SoulFlow is a free community guide that earns its keep by bringing the right people to your own
              events and building an audience you can use later.
            </p>
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Explicitly not in scope</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                App stores · charging browsers · paid placement today · building a second business.
              </p>
            </div>
          </div>

          <div className="organic-card rounded-[var(--radius)] p-6">
            <p className="eyebrow mb-3">Name &amp; domain</p>
            <h3 className="font-heading text-xl font-semibold mb-3">Still blocked on a decision</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              “Soul Flow” is an active Human Design app (<code>soul-flow.app</code>, App Store ID 6754518611,
              10K+ Play downloads, $9.99–$59.99 subscriptions, updated Nov 2026). <code>soulflow.au</code> and{' '}
              <code>soulflow.com.au</code> are parked; <code>soulflowau.com</code> appears unregistered.
            </p>
            <p className="mt-4 text-sm font-semibold text-foreground">
              Do not spend on branding until this is resolved.
            </p>
          </div>
        </div>

        <div id="paid-tiers" className="organic-card rounded-[var(--radius)] p-6 mt-5 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <p className="eyebrow mb-1">Monetisation · parked</p>
              <h3 className="font-heading text-xl font-semibold text-foreground">Paid tiers — for review, not live</h3>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Decision only
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground mb-5">
            Nothing here is built or charged. This is the decision parked on 21 November 2026, kept in one place
            so it is easy to revisit after the next traffic check.
          </p>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>What would have to be true</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Standard listing</TableCell>
                  <TableCell>Free, always</TableCell>
                  <TableCell><span className="text-emerald-700 dark:text-emerald-400">Live</span></TableCell>
                  <TableCell>Baseline. Hosts publish themselves; bookings stay with them.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Featured listing</TableCell>
                  <TableCell>$15–30 / week</TableCell>
                  <TableCell><span className="text-amber-700 dark:text-amber-400">Parked</span></TableCell>
                  <TableCell>Only after Analytics shows real traffic. Pin at the top of a category or state, or in weekly picks. No billing exists.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Weekly picks email</TableCell>
                  <TableCell>Free</TableCell>
                  <TableCell><span className="text-amber-700 dark:text-amber-400">Parked</span></TableCell>
                  <TableCell>Kit signup once there is an audience. Used to promote your own events, not to sell access.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Booking commission</TableCell>
                  <TableCell>0%</TableCell>
                  <TableCell><span className="text-destructive">Rejected</span></TableCell>
                  <TableCell>Never take a cut of tickets. SoulFlow sends people to the host.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Browser subscriptions</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell><span className="text-destructive">Rejected</span></TableCell>
                  <TableCell>Do not copy the competing “Soul Flow” app’s $9.99–$59.99 subscriptions; the name/domain collision is unresolved.</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">App-store app</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell><span className="text-destructive">Rejected</span></TableCell>
                  <TableCell>Capacitor scaffold stays dormant. No app stores.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">Trigger to revisit:</span> check the pulse above. If visits, saves and
              ticket clicks are meaningful, price one featured tier first — don’t build billing until a host asks.
            </p>
          </div>
        </div>

        <div className="organic-card rounded-[var(--radius)] p-6 mt-5">
          <p className="eyebrow mb-3">Automations</p>
          <h3 className="font-heading text-xl font-semibold mb-4">What runs itself</h3>
          <ul className="grid gap-3 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
            <li><span className="font-semibold text-foreground">Daily content →</span> generates a carousel and Story from approved events.</li>
            <li><span className="font-semibold text-foreground">Instagram →</span> posts it once a day, with a 24-hour guard against double-posting.</li>
            <li><span className="font-semibold text-foreground">Discovery →</span> sends people back to the guide and to your own listings.</li>
            <li><span className="font-semibold text-foreground">Admin review →</span> clears the queue and keeps the feed on-topic.</li>
          </ul>
        </div>
      </section>

      {/* 05 — Guides */}
      <section id="guides" className="mt-12 scroll-mt-24">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="eyebrow">Reference</p>
        </div>
        <h2 className="font-heading text-2xl font-semibold text-foreground mb-5">Guides &amp; source material</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <GuideLink
            href="https://github.com/dbuatti/soul-conscious-events/blob/main/docs/SOULFLOW-AUDIT-2026-11-21.md"
            title="Full audit & backlog"
            detail="Confirmed metrics, corrections, production verification and the original analysis."
            icon={BookOpen}
          />
          <GuideLink
            to="/community-guidelines"
            title="Community guidelines"
            detail="What is welcome, what is not, and how moderation works."
            icon={BookOpen}
          />
          <GuideLink to="/privacy" title="Privacy policy" detail="What is collected and why." icon={BookOpen} />
          <GuideLink to="/terms" title="Terms of service" detail="The rules for hosts and browsers." icon={BookOpen} />
          <GuideLink
            to="/admin/panel?tab=analytics"
            title="Analytics tab"
            detail="Deeper visit, save and ticket-click breakdowns."
            icon={BarChart3}
          />
          <div className="organic-card rounded-[var(--radius)] p-4 flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Systems repo</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <code>~/systems-repo/INDEX.md</code> and <code>STATUS.md</code> hold the setup index and P4 backlog on the local machine.
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-10 text-center">
        <Link to="/admin/panel" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to the admin panel
        </Link>
      </p>
    </div>
  );
};

export default BusinessView;
