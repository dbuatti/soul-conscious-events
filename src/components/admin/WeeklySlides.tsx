import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Images,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { functionErrorMessage } from '@/lib/function-errors';
import { australianStates } from '@/lib/constants';
import type { SlideBatch, SlidePostStatus } from '@/types/database';

const SLIDE_W = 1080;
const SLIDE_H = 1350;

const GENERATORS = {
  weekly: { label: 'National weekly', invoke: 'weekly-ig-slides', body: {} as Record<string, unknown> },
  weekend: { label: 'Weekend picks', invoke: 'weekly-ig-slides', body: { window: 'weekend' } as Record<string, unknown> },
  state: { label: 'State weekly', invoke: 'weekly-ig-slides', body: {} as Record<string, unknown> },
  'brand-intro': { label: 'Introduction', invoke: 'brand-slides', body: { theme: 'intro' } },
  'brand-organisers': { label: 'For organisers', invoke: 'brand-slides', body: { theme: 'organisers' } },
  'brand-locations': { label: 'Near you', invoke: 'brand-slides', body: { theme: 'locations' } },
  'brand-meet-organiser': { label: 'Meet the organiser', invoke: 'brand-slides', body: { theme: 'meet-organiser' } },
  'brand-values': { label: 'Our values', invoke: 'brand-slides', body: { theme: 'values' } },
  'brand-quote': { label: 'Quotes', invoke: 'brand-slides', body: { theme: 'quote' } },
  'brand-tips': { label: 'Getting started tips', invoke: 'brand-slides', body: { theme: 'tips' } },
} as const;

const BRAND_KEYS = [
  'brand-intro',
  'brand-organisers',
  'brand-locations',
  'brand-meet-organiser',
  'brand-values',
  'brand-quote',
  'brand-tips',
] as const;

// Maps a stored batch `kind` back to the Edge function + body that regenerates
// it, so a card can rebuild itself in place.
function rebuildTarget(kind: string): { invoke: string; body: Record<string, unknown> } | null {
  const isStory = kind.endsWith('-story');
  const base = isStory ? kind.slice(0, -'-story'.length) : kind;
  if (base === 'weekly') return { invoke: 'weekly-ig-slides', body: isStory ? { format: 'story' } : {} };
  if (base === 'weekend') return { invoke: 'weekly-ig-slides', body: isStory ? { window: 'weekend', format: 'story' } : { window: 'weekend' } };
  if (base.startsWith('state-')) {
    const state = base.slice('state-'.length);
    return { invoke: 'weekly-ig-slides', body: isStory ? { state, format: 'story' } : { state } };
  }
  if (base.startsWith('brand-')) {
    const theme = base.slice('brand-'.length);
    return { invoke: 'brand-slides', body: { theme, format: isStory ? 'story' : 'feed' } };
  }
  return null;
}

const CONTENT_PLAN: { when: string; title: string; kind: string }[] = [
  { when: 'Monday', title: 'This week across Australia', kind: 'weekly' },
  { when: 'Wednesday', title: 'Victoria this week', kind: 'state' },
  { when: 'Friday', title: 'Weekend picks', kind: 'weekend' },
  { when: 'Sunday', title: 'Find your next practice', kind: 'brand-locations' },
  { when: 'Monthly', title: 'Meet the organiser', kind: 'brand-meet-organiser' },
  { when: 'Fortnightly', title: 'For organisers — list your event', kind: 'brand-organisers' },
  { when: 'Monthly', title: 'Getting started tips', kind: 'brand-tips' },
  { when: 'Monthly', title: 'Quotes to come back to', kind: 'brand-quote' },
  { when: 'Quarterly', title: 'Our values', kind: 'brand-values' },
  { when: 'Monthly', title: 'Meet SoulFlow (intro)', kind: 'brand-intro' },
];

const STATUS_STYLES: Record<SlidePostStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-500/15 text-blue-600',
  posted: 'bg-green-500/15 text-green-600',
  failed: 'bg-destructive/15 text-destructive',
};

const sectionTitle = (Icon: React.ElementType, title: string, sub?: string) => (
  <div className="flex items-baseline gap-3 mb-4">
    <Icon className="h-5 w-5 text-primary self-center" />
    <h3 className="text-2xl font-heading font-semibold text-foreground">{title}</h3>
    {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
  </div>
);

// Edge stores SVG (resvg's WASM rasteriser blows the Edge budget). The browser
// renders it to PNG or JPEG for free, so posting/downloading still works.
async function svgUrlToBlob(url: string, type: 'image/png' | 'image/jpeg'): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch slide (${response.status})`);
  const svgText = await response.text();
  const objectUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not render the slide'));
      img.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    const width = image.naturalWidth || SLIDE_W;
    const height = image.naturalHeight || SLIDE_H;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser');
    ctx.fillStyle = '#F8F1EA';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, type === 'image/jpeg' ? 0.92 : undefined),
    );
    if (!blob) throw new Error('Could not create the image');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

const StatusBadge: React.FC<{ status: SlidePostStatus }> = ({ status }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
    {status}
  </span>
);

const BatchCard: React.FC<{
  batch: SlideBatch;
  onCopy: (caption: string) => void;
  onChanged: () => void;
}> = ({ batch, onCopy, onChanged }) => {
  const [busy, setBusy] = useState<'all' | 'publish' | 'rebuild' | number | null>(null);
  const [scheduleFor, setScheduleFor] = useState(batch.scheduled_for?.slice(0, 16) ?? '');
  const prefix = batch.kind;
  const isStory = batch.kind.endsWith('-story');
  const [collapsed, setCollapsed] = useState(true);
  const [collaborators, setCollaborators] = useState(batch.collaborators ?? '');

  const meta = `${batch.slides.length} slide${batch.slides.length === 1 ? '' : 's'}${
    batch.event_count > 0 ? ` · ${batch.event_count} event${batch.event_count === 1 ? '' : 's'}` : ''
  }${
    !isStory && batch.collaborators ? ` · with ${batch.collaborators}` : ''
  }${
    batch.status === 'posted' && batch.posted_at
      ? ` · posted ${format(parseISO(batch.posted_at), 'd MMM, h:mma')}`
      : ''
  }${
    batch.status === 'scheduled' && batch.scheduled_for
      ? ` · for ${format(parseISO(batch.scheduled_for), 'd MMM, h:mma')}`
      : ''
  }`;

  const update = async (patch: Partial<SlideBatch>) => {
    const { error } = await supabase.from('ig_slide_batches').update(patch).eq('id', batch.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged();
  };

  const downloadSlide = async (index: number) => {
    setBusy(index);
    try {
      const blob = await svgUrlToBlob(batch.slides[index].publicUrl, 'image/png');
      triggerDownload(blob, `${prefix}-${String(index + 1).padStart(2, '0')}.png`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy('all');
    const id = toast.loading('Preparing PNGs…');
    try {
      for (let i = 0; i < batch.slides.length; i++) {
        const blob = await svgUrlToBlob(batch.slides[i].publicUrl, 'image/png');
        triggerDownload(blob, `${prefix}-${String(i + 1).padStart(2, '0')}.png`);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      toast.success(`${batch.slides.length} slides downloaded.`, { id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error), { id });
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    setBusy('publish');
    const id = toast.loading('Publishing to Instagram…');
    try {
      const images: string[] = [];
      for (let i = 0; i < batch.slides.length; i++) {
        const blob = await svgUrlToBlob(batch.slides[i].publicUrl, 'image/jpeg');
        images.push(await blobToDataUrl(blob));
      }
      const { data, error } = await supabase.functions.invoke('publish-instagram', {
        body: { images, caption: batch.caption, batchId: batch.id, story: isStory, collaborators },
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      toast.success('Posted to Instagram.', { id });
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error), { id });
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const rebuild = async () => {
    const target = rebuildTarget(batch.kind);
    if (!target) {
      toast.error('This batch cannot be rebuilt.');
      return;
    }
    setBusy('rebuild');
    const id = toast.loading('Rebuilding…');
    try {
      const { data, error } = await supabase.functions.invoke(target.invoke, { body: target.body });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      toast.success('Rebuilt with the latest events & design.', { id });
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error), { id });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="organic-card p-5">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-4 text-left"
        aria-expanded={!collapsed}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-heading text-lg text-foreground truncate">{batch.title || batch.kind}</p>
            {isStory && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Story
              </span>
            )}
            <StatusBadge status={batch.status} />
          </div>
          <p className="text-xs text-muted-foreground">{isStory ? `Story · ${meta}` : meta}</p>
        </div>
        <div className="hidden shrink-0 -space-x-3 sm:flex">
          {batch.slides.slice(0, 5).map((slide) => (
            <img
              key={slide.path}
              src={slide.publicUrl}
              alt=""
              className={`${isStory ? 'h-14 w-8' : 'h-14 w-11'} rounded-md border-2 border-background object-cover shadow-sm`}
            />
          ))}
          {batch.slides.length > 5 && (
            <span className="flex h-14 items-center rounded-md border-2 border-background bg-muted px-2 text-xs text-muted-foreground">
              +{batch.slides.length - 5}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${collapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!collapsed && (
        <div className="mt-5 space-y-5">
          {batch.error && <p className="text-xs text-destructive">Last error: {batch.error}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {batch.slides.map((slide, i) => (
          <button
            key={slide.path}
            type="button"
            onClick={() => downloadSlide(i)}
            disabled={busy !== null}
            className="group relative rounded-2xl border border-border overflow-hidden"
            title="Download this slide as PNG"
          >
            <img src={slide.publicUrl} alt={`Slide ${i + 1}`} className={`${isStory ? 'aspect-[9/16]' : 'aspect-[4/5]'} w-full object-cover`} />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1}</span>
            <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
              {busy === i ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Download className="h-5 w-5 text-white" />}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onCopy(batch.caption)} className="rounded-xl">
          <Copy className="h-4 w-4 mr-2" /> Copy caption
        </Button>
        <Button variant="outline" size="sm" onClick={downloadAll} disabled={busy !== null} className="rounded-xl">
          {busy === 'all' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download all PNGs
        </Button>
        <Button size="sm" onClick={publish} disabled={busy !== null || batch.status === 'posted'} className="rounded-xl">
          {busy === 'publish' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          {batch.status === 'posted' ? 'Posted' : isStory ? 'Post Story' : 'Post to Instagram'}
        </Button>
        <Button variant="outline" size="sm" onClick={rebuild} disabled={busy !== null} className="rounded-xl">
          {busy === 'rebuild' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Rebuild
        </Button>
        {batch.status !== 'posted' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ status: 'posted', posted_at: new Date().toISOString() })}
            disabled={busy !== null}
            className="rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as posted
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <label className="text-xs text-muted-foreground flex flex-col gap-1">
          Collaborators
          <input
            type="text"
            value={isStory ? '' : collaborators}
            onChange={(e) => setCollaborators(e.target.value)}
            onBlur={() => {
              const next = collaborators.trim();
              if (next !== (batch.collaborators ?? '')) update({ collaborators: next || null });
            }}
            placeholder={isStory ? 'Not for Stories' : '@heartbeatslive (max 3)'}
            disabled={isStory || busy !== null}
            title="Co-author this post with up to 3 accounts (comma-separated handles)"
            className="w-56 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
          />
        </label>
        <label className="text-xs text-muted-foreground flex flex-col gap-1">
          Schedule
          <input
            type="datetime-local"
            value={scheduleFor}
            onChange={(e) => setScheduleFor(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={!scheduleFor || busy !== null}
          onClick={() =>
            update({
              status: 'scheduled',
              scheduled_for: scheduleFor ? new Date(scheduleFor).toISOString() : null,
            })
          }
        >
          <CalendarClock className="h-4 w-4 mr-2" /> Save schedule
        </Button>
        {batch.status !== 'draft' && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl"
            disabled={busy !== null}
            onClick={() => update({ status: 'draft', scheduled_for: null, posted_at: null })}
          >
            Reset
          </Button>
        )}
      </div>
        </div>
      )}
    </div>
  );
};

const WeeklySlides: React.FC = () => {
  const [batches, setBatches] = useState<SlideBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [state, setState] = useState('VIC');
  const [eventFormat, setEventFormat] = useState<'feed' | 'story'>('feed');
  const [slideFormat, setSlideFormat] = useState<'feed' | 'story'>('feed');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ig_slide_batches')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(60);

    if (error) {
      console.error('Error fetching slide batches:', error);
      toast.error('Could not load slide batches.');
    } else {
      setBatches((data ?? []) as SlideBatch[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scheduleSummary = useMemo(() => {
    const lines: string[] = [];
    lines.push('Automatic');
    lines.push('• Every day, 8:00am (Sydney):');
    lines.push('    Mon — national "this week" carousel + Story');
    lines.push('    Tue–Sat — one state carousel + Story (VIC, QLD, SA, TAS, NSW)');
    lines.push('    Fri — plus a national "weekend picks" carousel + Story');
    lines.push('    Sun — one evergreen brand carousel (rotates weekly)');
    lines.push('');
    const queued = batches
      .filter((b) => b.status === 'scheduled' && b.scheduled_for)
      .sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1));
    lines.push('Scheduled');
    if (queued.length === 0) {
      lines.push('• Nothing queued yet.');
    } else {
      for (const b of queued) {
        lines.push(`• ${format(parseISO(b.scheduled_for!), 'EEE d MMM, h:mma')} — ${b.title || b.kind}`);
      }
    }
    lines.push('');
    lines.push('Suggested rhythm');
    for (const item of CONTENT_PLAN) lines.push(`• ${item.when} — ${item.title}`);
    return lines.join('\n');
  }, [batches]);

  const generate = async (key: keyof typeof GENERATORS, body: Record<string, unknown> = {}) => {
    const gen = GENERATORS[key];
    setGenerating(key);
    const id = toast.loading('Building carousel…');
    try {
      const { data, error } = await supabase.functions.invoke(gen.invoke, { body: { ...gen.body, ...body } });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      const count = data?.slides?.length ?? 0;
      toast.success(`Built ${count} slide${count === 1 ? '' : 's'}.`, { id });
      await load();
    } catch (error) {
      toast.error(`Could not build: ${error instanceof Error ? error.message : String(error)}`, { id });
    } finally {
      setGenerating(null);
    }
  };

  const copyCaption = async (caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied.');
    } catch {
      toast.error('Could not copy.');
    }
  };

  const bioLink = typeof window !== 'undefined' ? `${window.location.origin}/link` : '/link';
  const copyBioLink = async () => {
    try {
      await navigator.clipboard.writeText(bioLink);
      toast.success('Bio link copied.');
    } catch {
      toast.error('Could not copy.');
    }
  };

  const eventBatches = useMemo(
    () => batches.filter((b) => b.kind === 'weekly' || b.kind === 'weekend' || b.kind.startsWith('state-')),
    [batches],
  );

  const scheduled = useMemo(() => batches.filter((b) => b.status === 'scheduled').length, [batches]);

  return (
    <div className="space-y-12">
      <div className="organic-card p-5 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-3xl font-heading font-semibold text-foreground">{batches.length}</p>
          <p className="text-xs text-muted-foreground">carousels built</p>
        </div>
        <div>
          <p className="text-3xl font-heading font-semibold text-green-600">{scheduled}</p>
          <p className="text-xs text-muted-foreground">scheduled</p>
        </div>
        <div>
          <p className="text-3xl font-heading font-semibold text-foreground">{batches.filter((b) => b.status === 'posted').length}</p>
          <p className="text-xs text-muted-foreground">posted</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl ml-auto">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="organic-card p-4 flex flex-wrap items-center gap-3">
        <Link2 className="h-5 w-5 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Instagram bio link</p>
          <p className="text-xs text-muted-foreground">
            Point your Instagram bio to this page — every caption says "link in bio".
          </p>
        </div>
        <a
          href="/link"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto truncate text-sm font-medium text-primary hover:underline"
        >
          {bioLink}
        </a>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={copyBioLink}>
          <Copy className="h-4 w-4 mr-2" /> Copy
        </Button>
      </div>

      {/* Schedule summary */}
      <section className="space-y-5">
        {sectionTitle(CalendarClock, 'Schedule', 'What goes out, and when')}
        <div className="organic-card p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{scheduleSummary}</pre>
          <Button variant="outline" size="sm" className="rounded-xl mt-4" onClick={() => copyCaption(scheduleSummary)}>
            <Copy className="h-4 w-4 mr-2" /> Copy schedule
          </Button>
        </div>
      </section>

      {/* Event carousels */}
      <section className="space-y-5">
        {sectionTitle(Images, 'Event carousels', 'Built from approved events for the next 7 days')}
        <div className="flex flex-wrap items-end gap-2">
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => generate('weekly', { format: eventFormat })}
            disabled={generating !== null}
          >
            {generating === 'weekly' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Images className="h-4 w-4 mr-2" />}
            Build national {eventFormat === 'story' ? 'Story' : 'weekly'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => generate('weekend', { format: eventFormat })}
            disabled={generating !== null}
          >
            {generating === 'weekend' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Images className="h-4 w-4 mr-2" />}
            Build Weekend picks
          </Button>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">
            State
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {australianStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">
            Format
            <select
              value={eventFormat}
              onChange={(e) => setEventFormat(e.target.value as 'feed' | 'story')}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            >
              <option value="feed">Feed (4:5)</option>
              <option value="story">Story (9:16)</option>
            </select>
          </label>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => generate('state', { state, format: eventFormat })}
            disabled={generating !== null}
          >
            {generating === 'state' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Images className="h-4 w-4 mr-2" />
            )}
            Build {state} {eventFormat === 'story' ? 'Story' : 'weekly'}
          </Button>
        </div>
        {eventBatches.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No event carousels yet.</p>
        ) : (
          <div className="space-y-4">
            {eventBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} onCopy={copyCaption} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      {/* Brand carousels */}
      <section className="space-y-5">
        {sectionTitle(Sparkles, 'Brand carousels', 'Evergreen content — meet us, list an event, find us near you')}
        <div className="flex flex-wrap items-end gap-2">
          {BRAND_KEYS.map((key) => (
            <Button
              key={key}
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => generate(key, { format: slideFormat })}
              disabled={generating !== null}
            >
              {generating === key ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Build {GENERATORS[key].label}
            </Button>
          ))}
          <label className="text-xs text-muted-foreground flex flex-col gap-1 ml-auto">
            Format
            <select
              value={slideFormat}
              onChange={(e) => setSlideFormat(e.target.value as 'feed' | 'story')}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            >
              <option value="feed">Feed (4:5)</option>
              <option value="story">Story (9:16)</option>
            </select>
          </label>
        </div>
        {batches.filter((b) => b.kind.startsWith('brand-')).length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No brand carousels yet.</p>
        ) : (
          <div className="space-y-4">
            {batches
              .filter((b) => b.kind.startsWith('brand-'))
              .map((batch) => (
                <BatchCard key={batch.id} batch={batch} onCopy={copyCaption} onChanged={load} />
              ))}
          </div>
        )}
      </section>

      {/* Content plan */}
      <section className="space-y-5">
        {sectionTitle(CalendarClock, 'Suggested content plan', 'A starting rhythm — adjust to taste')}
        <div className="organic-card p-4">
          <div className="flex flex-col divide-y divide-border">
            {CONTENT_PLAN.map((item) => (
              <div key={item.title} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold uppercase tracking-wide text-primary">{item.when}</span>
                  <span className="text-sm text-foreground">{item.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{GENERATORS[item.kind as keyof typeof GENERATORS]?.label ?? item.kind}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Automation: Instagram is connected. The daily content workflow auto-posts the national, state and weekend carousels
          (plus Stories), and any batches you mark as scheduled publish via the hourly automation workflow.
        </p>
      </section>

      {loading && (
        <div className="organic-card p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="aspect-[4/5] rounded-2xl" />
          <Skeleton className="aspect-[4/5] rounded-2xl" />
          <Skeleton className="aspect-[4/5] rounded-2xl" />
          <Skeleton className="aspect-[4/5] rounded-2xl" />
        </div>
      )}
    </div>
  );
};

export default WeeklySlides;