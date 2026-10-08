import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Copy, Download, ExternalLink, Images, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { functionErrorMessage } from '@/lib/function-errors';
import type { SlideBatch } from '@/types/database';

const SLIDE_W = 1080;
const SLIDE_H = 1350;

const sectionTitle = (Icon: React.ElementType, title: string, sub?: string) => (
  <div className="flex items-baseline gap-3 mb-4">
    <Icon className="h-5 w-5 text-primary self-center" />
    <h3 className="text-2xl font-heading font-semibold text-foreground">{title}</h3>
    {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
  </div>
);

// The Edge Function stores slides as SVG (resvg's WASM rasteriser blows the Edge
// resource budget). The browser rasterises an SVG to a 1080x1350 PNG for free,
// using its own renderer, so posting to Instagram still gets a PNG.
async function svgUrlToPngBlob(url: string): Promise<Blob> {
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
    canvas.width = SLIDE_W;
    canvas.height = SLIDE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser');
    ctx.fillStyle = '#F8F1EA';
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
    ctx.drawImage(image, 0, 0, SLIDE_W, SLIDE_H);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create the PNG');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

const SlideBatchCard: React.FC<{
  batch: SlideBatch;
  onCopy: (caption: string) => void;
}> = ({ batch, onCopy }) => {
  const [busy, setBusy] = useState<'all' | number | null>(null);
  const prefix = batch.kind === 'brand' ? 'soulflow-intro' : `soulflow-${batch.week_start}`;

  const downloadSlide = async (index: number) => {
    setBusy(index);
    try {
      const blob = await svgUrlToPngBlob(batch.slides[index].publicUrl);
      triggerDownload(blob, `${prefix}-slide-${String(index + 1).padStart(2, '0')}.png`);
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
        const blob = await svgUrlToPngBlob(batch.slides[i].publicUrl);
        triggerDownload(blob, `${prefix}-slide-${String(i + 1).padStart(2, '0')}.png`);
        // Small gap so the browser doesn't drop rapid consecutive downloads.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      toast.success(`${batch.slides.length} slides downloaded.`, { id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error), { id });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="organic-card p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading text-lg text-foreground">
            {batch.kind === 'brand'
              ? 'Introduction carousel'
              : `Week of ${format(parseISO(batch.week_start), 'd MMM yyyy')}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {batch.slides.length} slide{batch.slides.length === 1 ? '' : 's'}
            {batch.kind === 'brand' ? '' : ` · ${batch.event_count} event${batch.event_count === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onCopy(batch.caption)} className="rounded-xl">
            <Copy className="h-4 w-4 mr-2" /> Copy caption
          </Button>
          <Button size="sm" onClick={downloadAll} disabled={busy !== null} className="rounded-xl">
            {busy === 'all' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download all PNGs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {batch.slides.map((slide, i) => (
          <div key={slide.path} className="group relative">
            <a href={slide.publicUrl} target="_blank" rel="noreferrer" className="block">
              <img
                src={slide.publicUrl}
                alt={`Slide ${i + 1}`}
                className="aspect-[4/5] w-full rounded-2xl border border-border object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                {i + 1}
              </span>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSlide(i)}
              disabled={busy !== null}
              className="mt-2 w-full rounded-xl"
            >
              {busy === i ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              PNG
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Caption</p>
          <Button variant="ghost" size="sm" onClick={() => onCopy(batch.caption)} className="rounded-xl">
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
        </div>
        <pre className="whitespace-pre-wrap rounded-2xl bg-secondary/40 p-4 text-sm text-foreground font-sans">
          {batch.caption}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" asChild className="rounded-xl">
          <a href={batch.slides[0]?.publicUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Open first slide
          </a>
        </Button>
      </div>
    </div>
  );
};

const WeeklySlides: React.FC = () => {
  const [batches, setBatches] = useState<SlideBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<'weekly' | 'brand' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ig_slide_batches')
      .select('id,kind,week_start,caption,slides,event_count,created_at')
      .order('week_start', { ascending: false })
      .limit(30);

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

  const generate = async (kind: 'weekly' | 'brand') => {
    setGenerating(kind);
    const id = toast.loading(kind === 'brand' ? 'Building the intro carousel…' : 'Building this week’s carousel…');
    try {
      const { data, error } = await supabase.functions.invoke(
        kind === 'brand' ? 'brand-slides' : 'weekly-ig-slides',
        { body: {} },
      );
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      const count = data?.slides?.length ?? 0;
      toast.success(`Carousel built — ${count} slide${count === 1 ? '' : 's'}.`, { id });
      await load();
    } catch (error: unknown) {
      console.error('Error generating slides:', error);
      toast.error(
        `Could not build the carousel: ${error instanceof Error ? error.message : String(error)}`,
        { id },
      );
    } finally {
      setGenerating(null);
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

  const weekly = batches.filter((b) => batchKind(b) === 'weekly');
  const brand = batches.filter((b) => b.kind === 'brand');

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {sectionTitle(
            Images,
            'Weekly Instagram carousel',
            batches.length && weekly[0]
              ? `Latest built ${format(parseISO(weekly[0].created_at), 'd MMM yyyy, h:mma')}`
              : undefined,
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => generate('weekly')}
              disabled={generating !== null}
              className="rounded-xl"
            >
              {generating === 'weekly' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Images className="h-4 w-4 mr-2" />
              )}
              {weekly.length ? 'Rebuild this week' : 'Build this week’s'}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground -mt-2 max-w-2xl">
          Built from events approved for the next seven days. Download the PNGs, copy the caption, and post them to
          Instagram — nothing is published automatically.
        </p>

        {loading ? (
          <div className="organic-card p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="aspect-[4/5] rounded-2xl" />
            <Skeleton className="aspect-[4/5] rounded-2xl" />
          </div>
        ) : weekly.length === 0 ? (
          <div className="organic-card p-10 text-center">
            <Images className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-heading text-lg text-foreground">No carousel yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use “Build this week’s” to generate one from the approved events.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <SlideBatchCard batch={weekly[0]} onCopy={copyCaption} />
            {weekly.length > 1 && (
              <details className="organic-card p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Earlier weeks ({weekly.length - 1})
                </summary>
                <div className="mt-4 flex flex-col gap-2">
                  {weekly.slice(1).map((batch) => (
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
              </details>
            )}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {sectionTitle(Sparkles, 'Brand introduction carousel', 'Who we are · what we do · join us')}
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate('brand')}
            disabled={generating !== null}
            className="rounded-xl"
          >
            {generating === 'brand' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {brand.length ? 'Rebuild intro' : 'Build intro carousel'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground -mt-2 max-w-2xl">
          A ready-to-post welcome carousel for a fresh account: meet SoulFlow, what we stand for, what you can do here,
          and how to join in.
        </p>

        {loading ? (
          <Skeleton className="organic-card h-64 w-full rounded-2xl" />
        ) : brand.length === 0 ? (
          <div className="organic-card p-10 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-heading text-lg text-foreground">No intro carousel yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use “Build intro carousel” to create your first welcome post.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <SlideBatchCard batch={brand[0]} onCopy={copyCaption} />
            {brand.length > 1 && (
              <details className="organic-card p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Earlier versions ({brand.length - 1})
                </summary>
                <div className="mt-4 flex flex-col gap-2">
                  {brand.slice(1).map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3"
                    >
                      <p className="text-sm text-muted-foreground">
                        Built {format(parseISO(batch.created_at), 'd MMM yyyy, h:mma')}
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => copyCaption(batch.caption)} className="rounded-xl">
                        <Copy className="h-4 w-4 mr-2" /> Caption
                      </Button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

function batchKind(batch: SlideBatch): 'weekly' | 'brand' {
  return batch.kind === 'brand' ? 'brand' : 'weekly';
}

export default WeeklySlides;