import { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SEO from '@/components/SEO';
import PageHeader from '@/components/v2/PageHeader';
import { Button } from '@/components/ui/button';
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

const toneDot: Record<Tone, string> = {
  supply: 'bg-sky-500',
  decision: 'bg-amber-500',
  product: 'bg-emerald-500',
  value: 'bg-primary',
};

/** One horizontal lane of the diagram. Stacks vertically on small screens. */
const FlowLane = ({ step, title, subtitle, nodes }: FlowLaneProps) => (
  <section className="mb-6">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
      <span className="font-heading text-xs font-bold uppercase tracking-widest text-primary">{step}</span>
      <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
      <span className="text-sm text-muted-foreground">{subtitle}</span>
    </div>
    <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-0">
      {nodes.map((node, index) => (
        <Fragment key={node.title}>
          <div className="organic-card rounded-[var(--radius)] flex-1 p-4 md:min-w-0">
            <p className="flex items-center gap-2 font-heading font-semibold text-foreground leading-snug">
              <span className={`h-2 w-2 shrink-0 rounded-full ${toneDot[node.tone ?? 'product']}`} aria-hidden="true" />
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

/**
 * An admin-only one-page map of the product: what feeds it, what happens to an
 * event, what a visitor gets, and where the value ends up. Kept deliberately
 * diagram-first — no charts, no live queries, readable in one glance.
 */
const HowItWorks = () => {
  // The admin panel links straight to the paid-tiers card with a hash. Lazy
  // loading means the element may not exist when the browser first tries.
  useEffect(() => {
    if (window.location.hash === '#paid-tiers') {
      document.getElementById('paid-tiers')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="w-full max-w-6xl px-4 pb-16">
    <SEO
      title="How SoulFlow works | Admin | SoulFlow"
      description="A one-page functional and business model map for SoulFlow administrators."
    />

    <PageHeader
      eyebrow="Admin · overview"
      title="How SoulFlow works"
      description="One page: where events come from, what happens to them, what visitors get, and where the value goes."
    />

    <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
      <p className="text-sm text-muted-foreground">
        Snapshot taken 21 November 2026: 585 public events · 135 upcoming · around 500 auto-imported · 7 outside hosts.
      </p>
      <Button asChild variant="outline" className="rounded-full">
        <Link to="/admin/panel">Back to admin panel</Link>
      </Button>
    </div>

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
        { title: 'Unsure → review', detail: 'Weak signals such as "mindful" on their own wait in the admin inbox for a human decision.', tone: 'decision' },
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

    <div className="grid gap-5 lg:grid-cols-2 mt-10">
      <section className="organic-card rounded-[var(--radius)] p-6">
        <p className="eyebrow mb-3">The loops</p>
        <h3 className="font-heading text-xl font-semibold mb-4">What runs itself</h3>
        <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li><span className="font-semibold text-foreground">Daily content →</span> generates a carousel and Story from approved events.</li>
          <li><span className="font-semibold text-foreground">Instagram →</span> posts it once a day, with a 24-hour guard against double-posting.</li>
          <li><span className="font-semibold text-foreground">Discovery →</span> sends people back to the guide and to your own listings.</li>
          <li><span className="font-semibold text-foreground">Admin review →</span> clears the queue and keeps the feed on-topic.</li>
        </ul>
      </section>

      <section className="organic-card rounded-[var(--radius)] p-6">
        <p className="eyebrow mb-3">In one sentence</p>
        <h3 className="font-heading text-xl font-semibold mb-4">The business model</h3>
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
      </section>
    </div>

    <section id="paid-tiers" className="organic-card rounded-[var(--radius)] p-6 mt-5 scroll-mt-24">
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
              <TableCell>Only after Admin → Analytics shows real traffic. Pin at the top of a category or state, or in weekly picks. No billing exists.</TableCell>
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
          <span className="font-semibold">Trigger to revisit:</span> check Admin → Analytics. If visits, saves and
          ticket clicks are meaningful, price one featured tier first — don’t build billing until a host asks.
        </p>
      </div>
    </section>

    <p className="mt-8 text-center">
      <Link to="/admin/panel" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to the admin panel
      </Link>
    </p>
    </div>
  );
};

export default HowItWorks;
