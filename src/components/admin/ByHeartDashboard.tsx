import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Piano, MapPin, Mail, Copy, Check, TrendingUp, Calculator, CalendarDays, Sparkles, Music2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  name: string;
  suburb: string;
  address?: string;
  piano: string;
  hasPiano: boolean;
  floor: string;
  capacity: number | null;
  rate: string;
  cost3h: number | null;
  contact: string;
  email?: string;
  notes: string;
}

const VENUES: Venue[] = [
  { name: 'Hello Music Studio', suburb: 'Prahran, VIC', address: '75 Greville St', piano: 'Grand', hasPiano: true, floor: 'Carpet', capacity: 30, rate: '$35/hr (3hr min)', cost3h: 105, contact: '0414 776 613', notes: 'Grand piano; rate from your enquiry, not published online' },
  { name: 'Body Voice Centre', suburb: 'Footscray, VIC', address: '50 Wolverhampton St', piano: 'Baby grand', hasPiano: true, floor: 'Sprung timber', capacity: 30, rate: '$45 first 2hrs + $17.50/hr', cost3h: 63, contact: 'John Howard · 0430 120 436', email: 'jdhoward37@gmail.com', notes: '4m ceilings, blackout, kitchenette' },
  { name: 'Russian House Crystal Hall', suburb: 'Fitzroy, VIC', address: '118 Greeves St', piano: 'Grand (by request)', hasPiano: true, floor: 'Polished timber', capacity: 130, rate: '$125/hr wkday · $160/hr wknd', cost3h: 480, contact: 'Nikita Aleshin · 0401 633 173', notes: 'Chandelier hall, BYO catering/alcohol, 100 seated' },
  { name: 'Melbourne Academy of Performing Arts', suburb: 'Spotswood, VIC', address: '140 Hall St', piano: 'Grand', hasPiano: true, floor: 'Sprung (mirrors)', capacity: 100, rate: '$40/hr + $30/hr after hours', cost3h: 120, contact: '(03) 8560 4334', notes: 'Brochure rates; piano is in the smaller Studio 6' },
  { name: 'Large Studio with Grand Piano', suburb: 'Seaford, VIC', piano: 'Grand', hasPiano: true, floor: 'Hardwood', capacity: 20, rate: '$80/hr', cost3h: 240, contact: 'Via Peerspace', notes: 'Grand, intimate (20 cap)' },
  { name: 'Music Valley, Studio 705', suburb: 'Point Cook, VIC', piano: 'Baby grand', hasPiano: true, floor: 'Not stated', capacity: 65, rate: '$97/hr', cost3h: 291, contact: 'Via Tagvenue', notes: 'Baby grand, 65 cap' },
  { name: 'St John\u2019s Toorak, Buxton Hall', suburb: 'Toorak, VIC', piano: 'Ask', hasPiano: true, floor: 'Ask', capacity: 100, rate: '$550 flat / 2hrs', cost3h: 550, contact: '(03) 9826 1434', notes: 'Post-service rate, near home' },
  { name: 'Opera Australia, Studio 2', suburb: 'Southbank, VIC', address: '35–47 City Rd', piano: 'Yamaha C2 grand', hasPiano: true, floor: 'Sprung', capacity: 90, rate: '$145/hr + $100 clean + $60/hr Sunday security', cost3h: 715, contact: 'studio.hire@opera.org.au', email: 'studio.hire@opera.org.au', notes: 'Beautiful, but expensive on Sunday' },
  { name: 'Christ Church Mission, Baxter Hall', suburb: 'St Kilda, VIC', address: '14 Acland St', piano: 'Piano', hasPiano: true, floor: 'Not stated', capacity: 100, rate: 'Community rates (reduced for groups)', cost3h: null, contact: 'communitycentre@ccm.org.au · 03 9534 9250', email: 'communitycentre@ccm.org.au', notes: 'Piano confirmed, 80 seated / 100 auditorium, kitchen' },
  { name: 'St Brigid\u2019s Parish Hall', suburb: 'Fitzroy North, VIC', piano: 'Ask', hasPiano: true, floor: 'Ask', capacity: 100, rate: 'Not published', cost3h: null, contact: 'Via the parish', notes: 'Already hosts sound healing' },
  { name: 'Paradiso', suburb: 'Ubud, Bali', piano: 'Upright + grand', hasPiano: true, floor: 'Wooden', capacity: 50, rate: 'TBC (dance 200k IDR)', cost3h: null, contact: 'Instagram / WhatsApp', notes: 'Origin of the idea' },
  { name: 'HUMM', suburb: 'St Kilda, VIC', address: '144 St Kilda Rd', piano: 'None (bring in)', hasPiano: false, floor: '—', capacity: null, rate: 'Not published', cost3h: null, contact: 'Sharon · sharonbkanor@gmail.com', email: 'sharonbkanor@gmail.com', notes: 'BYO piano' },
  { name: 'Infinite Co', suburb: 'St Kilda, VIC', address: '14 Pakington St', piano: 'None (BYO + 2 JBL speakers)', hasPiano: false, floor: '—', capacity: null, rate: 'On enquiry', cost3h: null, contact: 'Elle · hello@infiniteco.com.au · 0498 668 236', email: 'hello@infiniteco.com.au', notes: 'Studio/room hire; hosts $44–$139 paid wellness events' },
];

const EMAIL_TEMPLATE = `Subject: By Heart — an hour of improvised piano at [Venue]

Hi [first name],

My name is Daniele Buatti — Melbourne pianist and music director with 12+ years in music theatre. I'm launching "By Heart", a one-hour improvised piano sound journey: people lie or sit on mats in a dim room while I play a single continuous, unbroken improvisation. No set list, no talking — a short welcome, an hour of live music, then a gentle close.

I came across [Venue] and think the space could be a beautiful fit.

Practical details:
- Format: ~1h45 total (doors ~6:45, playing 7:15–8:15, quiet close by 9)
- Setup: minimal — piano (I can bring a quality digital if needed), mats, low lighting, water
- Day/time: aiming for a Sunday 7pm start, fortnightly if the trial lands
- Proposal: happy to discuss flat room hire or a revenue share
- Audience: the existing sound-bath / meditation community

Would you be open to a quick chat or a walkthrough of the space? I can share a short recording of the music.

Warmly,
Daniele Buatti
[phone]
[email]`;

const RUN_OF_SHOW = [
  ['Arrive & settle (15 min)', 'Dim, natural light, water out, soft piano already playing. Welcome on mic from the piano.'],
  ['Permission (a few words)', 'Voice is welcome, movement is welcome, stillness is welcome.'],
  ['The improvisation (60 min)', 'Daniele plays and follows the room — one continuous piece.'],
  ['Landing', 'Music softens into a short guided relaxation.'],
  ['Integrate & connect (30 min)', 'Gentle close, then quiet time. Tea and fruit if possible.'],
] as const;

const MIC_WELCOME = `Welcome to By Heart. Find a spot, lie down or sit, and let yourself arrive. For the next hour there's nothing you need to do. No phones, no talking. Just be with whatever you need. If your body wants to move, move. If a sound wants to come out, let it. And if it meets the sounds around you, that's welcome too. Stillness is welcome. Tears are welcome. I'll be here at the piano. Let's begin.`;

const NAMES = [
  { name: 'By Heart', tag: 'Current pick', verdict: 'Cleanest and most evocative. "By heart" is improvisation itself — no sheet music. Doesn\u2019t name the piano, so the description line carries that.', best: true },
  { name: 'Piano by Heart', tag: 'Best of the four', verdict: 'Flows better than "Heart by Piano", keeps the musical pun, and names the piano. Use if you want piano in the title.', best: true },
  { name: 'The Held Note', tag: 'Top new pick', verdict: 'Musical sustain plus being safely held. Speaks directly to a safe, open container.', best: true },
  { name: 'Sustain', tag: 'One word', verdict: 'Piano pedal + emotional support. Perfect for the flat, bold, sans-serif look. Slightly abstract.', best: false },
  { name: 'Heart & Piano', tag: 'Literal', verdict: 'Clearest and warmest — lowest risk, lowest poetry. Reads as a two-act bill rather than one continuous piece.', best: false },
  { name: 'Still Keys', tag: 'Clever', verdict: 'Stillness + piano keys. Memorable and on-brief; leans a little punny.', best: false },
  { name: 'Heartstrings', tag: 'Crowd-friendly', verdict: 'Unmistakably musical and emotional, but the most clich\u00e9d of the lot.', best: false },
  { name: 'Senza Parole', tag: 'Elegant', verdict: '"Without words" names the no-talking element directly. Italian — harder to spell and search.', best: false },
  { name: 'Heart x Piano', tag: 'Drop', verdict: 'Reads as a logo lockup, not a spoken name; the "x" undercuts the stillness.', best: false },
  { name: 'Heart by Piano', tag: 'Drop', verdict: 'Grammatically mushy and passive — the meaning doesn\u2019t land cleanly.', best: false },
];

const money = (n: number) => (Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-AU') : '—');
const pct = (n: number) => (Number.isFinite(n) ? Math.round(n) + '%' : '—');

function venueScore(v: Venue): number {
  let s = 0;
  if (v.hasPiano) s += 40;
  if (/timber|sprung|wood|hardwood/i.test(v.floor)) s += 15;
  const c = v.capacity ?? 0;
  s += c >= 25 && c <= 60 ? 20 : c > 0 ? 5 : 0;
  const r = v.cost3h;
  if (r != null) {
    if (r <= 120) s += 25;
    else if (r <= 270) s += 15;
    else if (r <= 400) s += 8;
  }
  return s;
}

function NumField({ label, value, onChange, prefix, hint }: { label: string; value: number; onChange: (n: number) => void; prefix?: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>}
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={prefix ? 'pl-7' : ''}
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
    </div>
  );
}

const ByHeartDashboard = () => {
  const [venueName, setVenueName] = useState(VENUES[0].name);
  const [capacity, setCapacity] = useState(30);
  const [ticketPrice, setTicketPrice] = useState(30);
  const [fillRate, setFillRate] = useState(60);
  const [venueCost, setVenueCost] = useState(105);
  const [marketing, setMarketing] = useState(30);
  const [refreshments, setRefreshments] = useState(20);
  const [helper, setHelper] = useState(0);
  const [performerFee, setPerformerFee] = useState(0);
  const [copied, setCopied] = useState(false);

  const [startDate, setStartDate] = useState('2026-11-15');
  const [frequency, setFrequency] = useState<'weekly' | 'fortnightly'>('fortnightly');
  const [sessions, setSessions] = useState(8);
  const [slot, setSlot] = useState('7:00–9:00pm · doors 6:45 · playing 7:15–8:15');

  const selectedVenue = VENUES.find((v) => v.name === venueName) ?? VENUES[0];

  const pickVenue = (name: string) => {
    const v = VENUES.find((x) => x.name === name);
    if (!v) return;
    setVenueName(v.name);
    if (v.capacity) setCapacity(v.capacity);
    if (v.cost3h != null) setVenueCost(v.cost3h);
  };

  const totalFixed = venueCost + marketing + refreshments + helper + performerFee;
  const breakEvenAttendees = ticketPrice > 0 ? Math.ceil(totalFixed / ticketPrice) : 0;
  const breakEvenFill = capacity > 0 ? (breakEvenAttendees / capacity) * 100 : 0;
  const projectedAttendees = Math.round(capacity * (fillRate / 100));
  const projectedRevenue = projectedAttendees * ticketPrice;
  const projectedProfit = projectedRevenue - totalFixed;

  const fillLevels = [0.4, 0.5, 0.6, 0.7, 0.85, 1.0];

  const priceAlternatives = [20, 25, 30, 35, 40, 45, 50].map((p) => {
    const be = p > 0 ? Math.ceil(totalFixed / p) : 0;
    const fill = capacity > 0 ? (be / capacity) * 100 : 0;
    return { price: p, be, fill, ok: fill <= 70 };
  });

  const sortedVenues = useMemo(() => [...VENUES].sort((a, b) => venueScore(b) - venueScore(a)), []);
  const bestBets = sortedVenues.slice(0, 3);

  const dates = useMemo(() => {
    const base = new Date(startDate + 'T00:00:00');
    const step = frequency === 'weekly' ? 7 : 14;
    return Array.from({ length: sessions }, (_, i) => {
      const d = addDays(base, i * step);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const avoid = (m === 12 && day >= 20) || (m === 1 && day <= 5);
      return { d, avoid };
    });
  }, [startDate, frequency, sessions]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL_TEMPLATE);
      setCopied(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Music2 className="h-3.5 w-3.5" /> By Heart
        </span>
        <span className="text-sm text-muted-foreground">An hour of improvised piano to rest, move and sound.</span>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full h-auto flex-wrap justify-start gap-1 bg-secondary/50 p-1 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="names" className="rounded-xl"><Music2 className="h-3.5 w-3.5 mr-1.5" />Names</TabsTrigger>
          <TabsTrigger value="readout" className="rounded-xl"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Best bets</TabsTrigger>
          <TabsTrigger value="venues" className="rounded-xl"><MapPin className="h-3.5 w-3.5 mr-1.5" />Venues</TabsTrigger>
          <TabsTrigger value="money" className="rounded-xl"><Calculator className="h-3.5 w-3.5 mr-1.5" />Money</TabsTrigger>
          <TabsTrigger value="dates" className="rounded-xl"><CalendarDays className="h-3.5 w-3.5 mr-1.5" />Dates</TabsTrigger>
          <TabsTrigger value="email" className="rounded-xl"><Mail className="h-3.5 w-3.5 mr-1.5" />Email</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">The concept</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-foreground">
                <p>One hour of live, improvised piano in a calm, dim room where people rest, move or make sound however they need. No phones, no talking, no demands. Daniele is the channel at the piano.</p>
                <p><span className="font-semibold">Name:</span> By Heart. <span className="text-muted-foreground">Improvising is playing by heart, and the heart is where the music is aimed.</span></p>
                <p><span className="font-semibold">Description line:</span> An hour of improvised piano to rest, move and sound.</p>
                <p className="text-muted-foreground">The thread underneath comes from Music of the Spheres: light reaches us first, but what touches us deeper is sound.</p>
              </CardContent>
            </Card>

            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">Who it&apos;s for</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground">
                <p>Someone looking for healing, expression and embodiment, with no demands placed on them.</p>
                <p><span className="font-semibold">They leave:</span> calm, tranquil, more connected to their heart.</p>
                <p><span className="font-semibold">Why they come:</span> a safe, open container where anyone can simply be themselves.</p>
                <p><span className="font-semibold">Success:</span> people feel connected and calm, something has shifted, and Daniele&apos;s own heart feels more open.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary">Run of show <span className="text-sm font-normal text-muted-foreground">(~1h45 total)</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {RUN_OF_SHOW.map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3 text-sm">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <span className="font-semibold">{title}.</span> <span className="text-muted-foreground">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">Mic welcome (~30s)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{MIC_WELCOME}</p>
              </CardContent>
            </Card>

            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">Pros &amp; cons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-green-600 dark:text-green-400 mb-1">Pros</p>
                  <ul className="list-disc list-inside space-y-1 text-foreground">
                    <li>Minimal setup — one pianist, one room, mats, low light</li>
                    <li>Very low running cost (venue hire is the main expense)</li>
                    <li>Piano in the room solves the hardest logistics problem</li>
                    <li>Highly repeatable → recurring fortnightly/weekly slot</li>
                    <li>Point of difference: no one runs live improvised piano like this in Melbourne</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Cons</p>
                  <ul className="list-disc list-inside space-y-1 text-foreground">
                    <li>Single point of failure — one pianist, no redundancy</li>
                    <li>Niche; needs strong marketing to fill the room</li>
                    <li>Small per-session revenue vs a workshop/retreat</li>
                    <li>Depends on a good piano or a quality digital + PA</li>
                  </ul>
                </div>
                <p className="text-muted-foreground text-xs italic border-t border-border pt-3">Reframe: the room isn&apos;t asking for variety, it&apos;s asking for presence. An hour of listening, improvised piano is the offering.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Names */}
        <TabsContent value="names" className="mt-4">
          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary flex items-center gap-2"><Music2 className="h-5 w-5" />Name shortlist</CardTitle>
              <CardDescription>Run an Instagram / domain clash check on your final pick before committing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {NAMES.map((n) => (
                <div key={n.name} className={cn('rounded-2xl border p-4', n.best ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/30')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold font-heading text-foreground">{n.name}</span>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', n.best ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>{n.tag}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{n.verdict}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best bets readout */}
        <TabsContent value="readout" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="organic-card rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-widest">Most possible</CardDescription>
                <CardTitle className="font-heading text-primary">Hello Music Studio</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground">
                <p>Grand piano at <span className="font-semibold">$35/hr</span>, 50m from your Toorak studio. The cheapest, fastest path to a trial. Carpet isn&apos;t ideal, but people lie on mats anyway.</p>
              </CardContent>
            </Card>
            <Card className="organic-card rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-widest">Most likely to fill</CardDescription>
                <CardTitle className="font-heading text-primary">Body Voice Centre</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground">
                <p>Baby grand + sprung timber + blackout + kitchenette for <span className="font-semibold">~$63/3hrs</span>. Holds 30. Footscray inner-west has a strong wellbeing audience and less sound-bath competition than St Kilda.</p>
              </CardContent>
            </Card>
            <Card className="organic-card rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-widest">Best for business</CardDescription>
                <CardTitle className="font-heading text-primary">Russian House Crystal Hall</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground">
                <p>Grand + polished timber, <span className="font-semibold">130 cap</span> from $90/hr. Highest margin potential if you can fill it — but that needs real marketing reach.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary">The shortlist</CardTitle>
              <CardDescription>Ranked by a rough fit score (piano + floor + capacity + cost).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bestBets.map((v, i) => (
                  <div key={v.name} className="flex items-center gap-3 text-sm">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-semibold">{v.name}</span>
                    <span className="text-muted-foreground">· {v.piano.toLowerCase()} · {v.capacity} cap · {v.rate}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Venues */}
        <TabsContent value="venues" className="mt-4">
          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary flex items-center gap-2"><Piano className="h-5 w-5" />Venue comparison</CardTitle>
              <CardDescription>Everything with a piano and a floor worth playing on, plus the BYO options.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead>Piano</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead className="text-right">Cap</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVenues.map((v) => (
                    <TableRow key={v.name} className="align-top">
                      <TableCell className="font-medium">
                        <div>{v.name}</div>
                        <div className="text-xs text-muted-foreground">{v.suburb}</div>
                        <div className="text-xs text-muted-foreground italic">{v.notes}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={cn('inline-flex items-center gap-1', v.hasPiano ? 'text-primary' : 'text-muted-foreground')}>
                          <Piano className="h-3.5 w-3.5" /> {v.piano}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.floor}</TableCell>
                      <TableCell className="text-right text-sm">{v.capacity ?? '—'}</TableCell>
                      <TableCell className="text-sm">{v.rate}</TableCell>
                      <TableCell className="text-sm">
                        {v.email ? (
                          <a href={`mailto:${v.email}`} className="text-primary hover:underline">{v.email}</a>
                        ) : (
                          <span className="text-muted-foreground">{v.contact}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Money */}
        <TabsContent value="money" className="mt-4 space-y-4">
          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary flex items-center gap-2"><Calculator className="h-5 w-5" />Budget &amp; break-even</CardTitle>
              <CardDescription>Pick a venue to prefill its rate and capacity, then dial in the rest.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Venue</Label>
                  <select
                    value={venueName}
                    onChange={(e) => pickVenue(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {VENUES.map((v) => (
                      <option key={v.name} value={v.name}>{v.name} — {v.rate}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <NumField label="Capacity (mats)" value={capacity} onChange={setCapacity} />
                  <NumField label="Ticket price" value={ticketPrice} onChange={setTicketPrice} prefix="$" />
                  <NumField label="Expected fill" value={fillRate} onChange={setFillRate} prefix="%" />
                  <NumField label="Venue hire (total)" value={venueCost} onChange={setVenueCost} prefix="$" hint={selectedVenue?.rate ?? undefined} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <NumField label="Marketing" value={marketing} onChange={setMarketing} prefix="$" />
                  <NumField label="Tea & refreshments" value={refreshments} onChange={setRefreshments} prefix="$" />
                  <NumField label="Helper (door)" value={helper} onChange={setHelper} prefix="$" />
                  <NumField label="Performer fee" value={performerFee} onChange={setPerformerFee} prefix="$" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Total fixed cost', money(totalFixed)],
              ['Break-even attendees', String(breakEvenAttendees)],
              ['Break-even fill', pct(breakEvenFill)],
              ['Projected profit', money(projectedProfit)],
            ].map(([label, val]) => (
              <Card key={label} className="organic-card rounded-[1.5rem]">
                <CardContent className="pt-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className={cn('text-2xl font-bold font-heading', label === 'Projected profit' ? (projectedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-primary')}>{val}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">Profit at each fill level</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fill</TableHead>
                      <TableHead className="text-right">Attendees</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fillLevels.map((f) => {
                      const att = Math.round(capacity * f);
                      const rev = att * ticketPrice;
                      const prof = rev - totalFixed;
                      return (
                        <TableRow key={f}>
                          <TableCell className="text-sm">{Math.round(f * 100)}%</TableCell>
                          <TableCell className="text-right text-sm">{att}</TableCell>
                          <TableCell className="text-right text-sm">{money(rev)}</TableCell>
                          <TableCell className={cn('text-right text-sm font-semibold', prof >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{money(prof)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">Ticket price alternatives</CardTitle>
                <CardDescription>Break-even needed to cover {money(totalFixed)} in a room of {capacity}.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Break-even</TableHead>
                      <TableHead className="text-right">Fill needed</TableHead>
                      <TableHead>Fit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceAlternatives.map((p) => (
                      <TableRow key={p.price}>
                        <TableCell className="text-sm font-medium">{money(p.price)}</TableCell>
                        <TableCell className="text-right text-sm">{p.be} people</TableCell>
                        <TableCell className="text-right text-sm">{pct(p.fill)}</TableCell>
                        <TableCell className="text-sm">
                          {p.price < 30 ? <span className="text-amber-600 dark:text-amber-400">Thin</span> : p.ok ? <span className="text-green-600 dark:text-green-400">Strong</span> : <span className="text-muted-foreground">Full room</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">Melbourne benchmark: a one-hour sound bath is ~$35. Aim for <span className="font-semibold text-foreground">$30–35</span>; $20 is the Bali reference, not a Melbourne price.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dates */}
        <TabsContent value="dates" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">Schedule generator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">First date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Frequency</Label>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'fortnightly')} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="fortnightly">Fortnightly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sessions</Label>
                    <Input type="number" min={1} max={26} value={sessions} onChange={(e) => setSessions(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Time slot</Label>
                    <Input value={slot} onChange={(e) => setSlot(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="organic-card rounded-[2rem]">
              <CardHeader>
                <CardTitle className="font-heading text-primary">When to run it</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-foreground">
                <p><span className="font-semibold">Sunday 7–7:30pm</span> is the proven Melbourne slot for sound/wellness evenings — of 13 sound-healing listings, 6 are Sundays and 8 start 7:00–7:30pm.</p>
                <p><span className="font-semibold">Where the demand is:</span> St Kilda East (5 of 13), so the south side has a proven audience — and the most competition.</p>
                <p><span className="font-semibold">Weekday alternative:</span> Mon–Thu 7pm sessions exist (South Yarra, Brunswick). A Wednesday evening is a quieter mid-week test slot.</p>
                <p><span className="font-semibold">Saturday:</span> late-afternoon works, but Saturday nights compete with going out.</p>
                <p><span className="font-semibold">Launch plan:</span> Sunday 15 Nov 2026 at 7pm, then fortnightly — avoiding late Dec / early Jan when Melbourne is away.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary flex items-center gap-2"><CalendarDays className="h-5 w-5" />Your run of dates</CardTitle>
              <CardDescription>{frequency} from {format(new Date(startDate + 'T00:00:00'), 'd MMM yyyy')} · {slot}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {dates.map(({ d, avoid }) => (
                  <div key={d.toISOString()} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm', avoid ? 'bg-red-500/10' : 'bg-secondary/40')}>
                    <span className="font-semibold min-w-[9rem]">{format(d, 'EEE, d MMM yyyy')}</span>
                    <span className="text-muted-foreground">{slot}</span>
                    {avoid && <span className="ml-auto text-xs font-semibold text-red-600 dark:text-red-400">Avoid — Melbourne away</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email" className="mt-4">
          <Card className="organic-card rounded-[2rem]">
            <CardHeader>
              <CardTitle className="font-heading text-primary flex items-center gap-2"><Mail className="h-5 w-5" />Outreach email</CardTitle>
              <CardDescription>Swap [Venue] and [first name], then paste. Proof-read before sending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={copyEmail} variant="outline" className="rounded-xl">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy email'}
              </Button>
              <pre className="whitespace-pre-wrap rounded-2xl bg-secondary/50 p-4 text-sm text-foreground font-sans leading-relaxed">{EMAIL_TEMPLATE}</pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ByHeartDashboard;
