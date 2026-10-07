import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Copy, Download, ExternalLink, Images, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { functionErrorMessage } from '@/lib/function-errors';
import type { SlideBatch } from '@/types/database';

const sectionTitle = (Icon: React.ElementType, title: string, sub?: string) => (
  <div className="flex items-baseline gap-3 mb-4">
    <Icon className="h-5 w-5 text-primary self-center" />
    <h3 className="text-2xl font-heading font-semibold text-foreground">{title}</h3>
    {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
  </div>
);

const WeeklySlides: React.FC = () => {
  const [batches, setBatches] = useState<SlideBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ig_slide_batches')
      .select('id,week_start,caption,slides,event_count,created_at')
      .order('week_start', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Error fetching slide batches:', error);
      toast.error('Could not load the slide batches.');
    } else {
      setBatches((data ?? []) as SlideBatch[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    const id = toast.loading('Building this week’s carousel…');
    try {
      const { data, error } = await supabase.functions.invoke('weekly-ig-slides', {
        body: {},
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      const count = data?.eventCount ?? 0;
      toast.success(
        `Carousel built — ${count} event${count === 1 ? '' : 's'}.`,
        { id }
      );
      await load();
    } catch (error: unknown) {
      console.error('Error generating slides:', error);
      toast.error(
        `Could not build the carousel: ${error instanceof Error ? error.message : String(error)}`,
        { id }
      );
    } finally {
      setGenerating(false);
    }
  };

  const copyCaption = async (caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied.');
    } catch {
      toast.error('Could not copy — select the text and copy it manually.');
    }
  };

  const latest = batches[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {sectionTitle(
          Images,
          'Weekly Instagram carousel',
          batches.length
            ? `Latest built ${format(parseISO(latest.created_at), 'd MMM yyyy, h:mma')}`
            : undefined
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={generate} disabled={generating} className="rounded-xl">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Images className="h-4 w-4 mr-2" />}
            {latest ? 'Rebuild this week' : 'Build this week’s'}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground -mt-4 max-w-2xl">
        Slides are generated from the events approved for the next seven days, then saved here and to
        public storage. Download the images, copy the caption, and post them to Instagram. Nothing is
        published automatically.
      </p>

      {loading ? (
        <div className="organic-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="aspect-[4/5] rounded-2xl" />
          </div>
        </div>
      ) : !latest ? (
        <div className="organic-card p-10 text-center">
          <Images className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-heading text-lg text-foreground">No carousel yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use “Build this week’s” above to generate one from the approved events.
          </p>
        </div>
      ) : (
        <div className="organic-card p-6 space-y-6">
          <div>
            <p className="font-heading text-lg text-foreground">
              Week of {format(parseISO(latest.week_start), 'd MMMM yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              {latest.slides.length} slide{latest.slides.length === 1 ? '' : 's'} · {latest.event_count} event
              {latest.event_count === 1 ? '' : 's'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {latest.slides.map((slide, i) => (
              <a
                key={slide.path}
                href={slide.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative block rounded-2xl overflow-hidden border border-border bg-secondary/30"
                title="Open full size"
              >
                <img
                  src={slide.publicUrl}
                  alt={`Slide ${i + 1}`}
                  loading="lazy"
                  className="w-full aspect-[4/5] object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
                <span className="absolute top-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium">
                  {i + 1}
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-background/50">
                  <ExternalLink className="h-5 w-5 text-foreground" />
                </span>
              </a>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Caption</p>
              <Button variant="outline" size="sm" onClick={() => copyCaption(latest.caption)} className="rounded-xl">
                <Copy className="h-4 w-4 mr-2" /> Copy caption
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-2xl bg-secondary/40 p-4 text-sm text-foreground font-sans">
              {latest.caption}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            {latest.slides.map((slide, i) => (
              <Button key={slide.path} variant="outline" size="sm" asChild className="rounded-xl">
                <a href={slide.publicUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Slide {i + 1}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}

      {batches.length > 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Earlier weeks</p>
          <div className="flex flex-col gap-2">
            {batches.slice(1).map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Week of {format(parseISO(batch.week_start), 'd MMM yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.slides.length} slide{batch.slides.length === 1 ? '' : 's'} · {batch.event_count} event
                    {batch.event_count === 1 ? '' : 's'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyCaption(batch.caption)} className="rounded-xl">
                  <Copy className="h-4 w-4 mr-2" /> Caption
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySlides;
