import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Check, X, Pencil, Plus, Play, Trash2, Loader2, ExternalLink, Inbox, Rss, History, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/event-utils';
import { Event } from '@/types/event';
import { EventImportRun, EventSource } from '@/types/database';

interface ImportResponse {
  events_added?: number;
  events_found?: number;
  sources_checked?: number;
  message?: string;
  error?: string;
}

const statusStyles: Record<string, string> = {
  ok: 'bg-sage/15 text-sage',
  partial: 'bg-accent/20 text-foreground/80',
  error: 'bg-destructive/10 text-destructive',
};

const sectionTitle = (Icon: React.ElementType, title: string, sub?: string) => (
  <div className="flex items-baseline gap-3 mb-4">
    <Icon className="h-5 w-5 text-primary self-center" />
    <h3 className="text-2xl font-heading font-semibold text-foreground">{title}</h3>
    {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
  </div>
);

const EventImports: React.FC = () => {
  const [pending, setPending] = useState<Event[]>([]);
  const [sources, setSources] = useState<EventSource[]>([]);
  const [runs, setRuns] = useState<EventImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<string | 'all' | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const sourceLabel = useMemo(() => {
    const map = new Map(sources.map((s) => [s.id, s.label || new URL(s.url).hostname]));
    return (id?: string | null) => (id ? map.get(id) ?? 'a removed source' : 'a user submission');
  }, [sources]);

  const load = useCallback(async () => {
    const [pendingRes, sourcesRes, runsRes] = await Promise.all([
      supabase.from('events').select('*').eq('approval_status', 'pending').eq('is_deleted', false).order('event_date', { ascending: true }),
      supabase.from('event_sources').select('*').order('created_at', { ascending: false }),
      supabase.from('event_import_runs').select('*').order('started_at', { ascending: false }).limit(6),
    ]);
    // Missing tables means migration 0006 hasn't been applied yet.
    setSetupMissing(!!sourcesRes.error && /does not exist|schema cache/i.test(sourcesRes.error.message));
    if (pendingRes.error) toast.error(`Couldn't load the inbox: ${pendingRes.error.message}`);
    setPending((pendingRes.data as Event[]) ?? []);
    setSources((sourcesRes.data as EventSource[]) ?? []);
    setRuns((runsRes.data as EventImportRun[]) ?? []);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setBusy = (ids: string[], busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (busy ? next.add(id) : next.delete(id)));
      return next;
    });

  const review = async (ids: string[], status: 'approved' | 'rejected') => {
    if (!ids.length) return;
    setBusy(ids, true);
    const { error } = await supabase.from('events').update({ approval_status: status }).in('id', ids);
    setBusy(ids, false);
    if (error) {
      toast.error(`Couldn't update: ${error.message}`);
      return;
    }
    toast.success(`${ids.length} event${ids.length === 1 ? '' : 's'} ${status === 'approved' ? 'published' : 'declined'}`);
    setPending((prev) => prev.filter((e) => !ids.includes(e.id)));
    setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
  };

  const runImport = async (sourceId?: string) => {
    setRunning(sourceId ?? 'all');
    const { data, error } = await supabase.functions.invoke<ImportResponse>('import-events', { body: sourceId ? { sourceId } : {} });
    setRunning(null);
    if (error || data?.error) {
      toast.error(`Import failed: ${data?.error ?? error?.message}`);
    } else if (data?.message) {
      toast.info(data.message);
    } else {
      toast.success(`Checked ${data?.sources_checked ?? 0} source(s): ${data?.events_added ?? 0} new event(s) waiting for review.`);
    }
    load();
  };

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    let url: URL;
    try {
      url = new URL(newUrl.trim().replace(/^webcal:\/\//i, 'https://'));
      if (!/^https?:$/.test(url.protocol)) throw new Error();
    } catch {
      toast.error('Enter a full link, starting with https://');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('event_sources').insert({
      url: url.toString(),
      label: newLabel.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'That source is already on the list.' : `Couldn't add source: ${error.message}`);
      return;
    }
    setNewUrl('');
    setNewLabel('');
    toast.success('Source added. Run it now or wait for the daily check.');
    load();
  };

  const toggleSource = async (source: EventSource, isActive: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, is_active: isActive } : s)));
    const { error } = await supabase.from('event_sources').update({ is_active: isActive }).eq('id', source.id);
    if (error) {
      toast.error(`Couldn't update source: ${error.message}`);
      load();
    }
  };

  const deleteSource = async (source: EventSource) => {
    const { error } = await supabase.from('event_sources').delete().eq('id', source.id);
    if (error) toast.error(`Couldn't remove source: ${error.message}`);
    else toast.success('Source removed. Events already imported from it are kept.');
    load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (setupMissing) {
    return (
      <div className="organic-card rounded-[1.75rem] p-8 sm:p-10 max-w-2xl">
        <h3 className="text-2xl font-heading font-semibold mb-3">One-time setup needed</h3>
        <p className="text-muted-foreground leading-relaxed">
          The importer's database tables don't exist yet. Open the Supabase SQL editor, paste in
          <code className="mx-1 px-1.5 py-0.5 rounded bg-secondary text-sm">supabase/migrations/0006_event_importer.sql</code>
          and run it, then refresh this page.
        </p>
      </div>
    );
  }

  const allSelected = pending.length > 0 && selected.size === pending.length;

  return (
    <div className="space-y-12">
      {/* Inbox */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {sectionTitle(Inbox, 'Review inbox', `${pending.length} waiting`)}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" className="rounded-full bg-card" onClick={load}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
            {selected.size > 0 && (
              <>
                <Button size="sm" className="rounded-full" onClick={() => review([...selected], 'approved')}>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Publish {selected.size}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => review([...selected], 'rejected')}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Decline {selected.size}
                </Button>
              </>
            )}
          </div>
        </div>

        {pending.length === 0 ? (
          <p className="organic-card rounded-[var(--radius)] p-8 text-center text-muted-foreground">
            Nothing to review. New imports and pending submissions will appear here.
          </p>
        ) : (
          <div className="organic-card rounded-[var(--radius)] divide-y divide-border/70 overflow-hidden">
            <label className="flex items-center gap-3 px-4 py-2.5 bg-secondary/40 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => setSelected(v ? new Set(pending.map((e) => e.id)) : new Set())}
                aria-label="Select all"
              />
              Select all
            </label>
            {pending.map((event) => {
              const busy = busyIds.has(event.id);
              return (
                <div key={event.id} className={cn('flex gap-4 p-4 items-start', busy && 'opacity-50 pointer-events-none')}>
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(event.id)}
                    onCheckedChange={(v) => setSelected((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(event.id); else next.delete(event.id);
                      return next;
                    })}
                    aria-label={`Select ${event.event_name}`}
                  />
                  <div className="h-20 w-28 shrink-0 rounded-xl overflow-hidden bg-secondary hidden sm:block">
                    {event.image_url && <img src={event.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {format(parseISO(event.event_date), 'EEE d MMM yyyy')}
                      {event.event_time && ` · ${event.event_time}`}
                      {event.recurring_pattern && ` · repeats ${event.recurring_pattern.toLowerCase()}`}
                    </p>
                    <p className="font-heading text-xl font-semibold leading-tight text-foreground mt-0.5">{event.event_name}</p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {[event.place_name, event.geographical_state, event.price && formatPrice(event.price), event.event_type].filter(Boolean).join(' · ') || 'No location or price found'}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>From {sourceLabel(event.source_id)}</span>
                      {event.ticket_link && (
                        <a href={event.ticket_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          Original page <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                    <Button size="sm" className="rounded-full" onClick={() => review([event.id], 'approved')} aria-label={`Publish ${event.event_name}`}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span className="ml-1.5 hidden md:inline">Publish</span>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-full bg-card" aria-label={`Edit ${event.event_name}`}>
                      <Link to={`/edit-event/${event.id}`}><Pencil className="h-3.5 w-3.5" /><span className="ml-1.5 hidden md:inline">Edit</span></Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => review([event.id], 'rejected')} aria-label={`Decline ${event.event_name}`}>
                      <X className="h-3.5 w-3.5" /><span className="ml-1.5 hidden md:inline">Decline</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Declined events stay hidden and won't be imported again. Editing keeps an event in the inbox until you publish it.
        </p>
      </section>

      {/* Sources */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {sectionTitle(Rss, 'Sources', 'checked every morning')}
          <Button size="sm" variant="outline" className="rounded-full bg-card mb-4" onClick={() => runImport()} disabled={running !== null || sources.length === 0}>
            {running === 'all' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
            Check all now
          </Button>
        </div>

        <form onSubmit={addSource} className="organic-card rounded-[var(--radius)] p-4 flex flex-col md:flex-row gap-2.5 mb-4">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Organiser page, venue 'what's on' page or calendar (.ics) link"
            className="rounded-full flex-[2]"
            aria-label="Source link"
          />
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Name (optional), e.g. Abbotsford Convent"
            className="rounded-full flex-1"
            aria-label="Source name"
          />
          <Button type="submit" className="rounded-full" disabled={!newUrl.trim()}>
            <Plus className="mr-1.5 h-4 w-4" /> Add source
          </Button>
        </form>

        {sources.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border p-6 text-sm text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-2">Good sources to add</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A host's Humanitix or Eventbrite organiser page (lists all their upcoming events)</li>
              <li>A venue's "What's on" or events page</li>
              <li>A public calendar link (.ics), e.g. a Google Calendar's "public address in iCal format"</li>
            </ul>
          </div>
        ) : (
          <div className="organic-card rounded-[var(--radius)] divide-y divide-border/70 overflow-hidden">
            {sources.map((source) => (
              <div key={source.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{source.label || new URL(source.url).hostname}</p>
                    {source.last_status && (
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', statusStyles[source.last_status])}>
                        {source.last_status === 'ok' ? 'OK' : source.last_status === 'partial' ? 'Partly done' : 'Problem'}
                      </span>
                    )}
                    {!source.is_active && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-secondary text-muted-foreground">Paused</span>}
                  </div>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary break-all">{source.url}</a>
                  <p className="text-xs text-muted-foreground mt-1">
                    {source.last_run_at
                      ? <>Checked {formatDistanceToNow(parseISO(source.last_run_at), { addSuffix: true })} · {source.last_message}</>
                      : 'Not checked yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground mr-1">
                    <Switch checked={source.is_active} onCheckedChange={(v) => toggleSource(source, v)} aria-label="Source active" />
                    Active
                  </label>
                  <Button size="sm" variant="outline" className="rounded-full bg-card" onClick={() => runImport(source.id)} disabled={running !== null}>
                    {running === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">Check</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 text-muted-foreground hover:text-destructive" aria-label="Remove source">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[1.75rem]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading text-2xl">Remove this source?</AlertDialogTitle>
                        <AlertDialogDescription>It won't be checked any more. Events already imported from it stay as they are.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSource(source)} className="bg-destructive rounded-full">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Run log */}
      {runs.length > 0 && (
        <section>
          {sectionTitle(History, 'Recent checks')}
          <ul className="text-sm text-muted-foreground space-y-1.5">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap gap-x-2">
                <span className="text-foreground font-medium">{format(parseISO(run.started_at), 'EEE d MMM, h:mma')}</span>
                <span>· {run.triggered_by === 'schedule' ? 'daily check' : 'manual'}</span>
                <span>· {run.sources_checked} sources, {run.events_added} new{!run.finished_at && ' (didn’t finish)'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default EventImports;
