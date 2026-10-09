import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { BarChart3, ExternalLink, Heart, Loader2, MessageCircle, Bookmark, Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { functionErrorMessage } from '@/lib/function-errors';
import type { IgAccountInsights, IgMediaInsights, SlideBatch } from '@/types/database';

const MAX_POSTS = 15;

const StatCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="organic-card p-5">
    <p className="text-3xl font-heading font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
    {sub && <p className="mt-1 text-xs text-muted-foreground/80">{sub}</p>}
  </div>
);

const Metric: React.FC<{ icon: React.ElementType; value: number | null | undefined }> = ({ icon: Icon, value }) => (
  <span className="inline-flex items-center gap-1 tabular-nums text-foreground">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    {value ?? '—'}
  </span>
);

const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-AU'));

const InstagramInsights: React.FC = () => {
  const [batches, setBatches] = useState<SlideBatch[]>([]);
  const [account, setAccount] = useState<IgAccountInsights | null>(null);
  const [media, setMedia] = useState<Record<string, IgMediaInsights>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from('ig_slide_batches')
        .select('*')
        .eq('status', 'posted')
        .not('instagram_media_id', 'is', null)
        .order('posted_at', { ascending: false })
        .limit(MAX_POSTS);

      if (error) throw new Error(error.message);
      const posted = (data ?? []) as SlideBatch[];
      setBatches(posted);

      const mediaIds = posted
        .map((b) => b.instagram_media_id)
        .filter((id): id is string => Boolean(id));

      if (mediaIds.length === 0) {
        setAccount(null);
        setMedia({});
        return;
      }

      const res = await supabase.functions.invoke('ig-insights', { body: { mediaIds } });
      if (res.error) throw new Error(await functionErrorMessage(res.error));
      if (res.data?.error) throw new Error(res.data.error);

      setAccount((res.data?.account as IgAccountInsights) ?? null);
      const map: Record<string, IgMediaInsights> = {};
      for (const m of (res.data?.media ?? []) as IgMediaInsights[]) map[m.id] = m;
      setMedia(map);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not_configured|isn't connected|META_IG_USER_ID/i.test(message)) {
        setNotice('Instagram analytics need META_IG_USER_ID and META_ACCESS_TOKEN set on the project.');
      } else {
        toast.error(`Could not load insights: ${message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3 mb-1">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-2xl font-heading font-semibold text-foreground">Instagram insights</h3>
        <span className="text-sm text-muted-foreground">
          {account?.username ? `@${account.username}` : ''}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl ml-auto"
          onClick={() => load(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {notice && (
        <div className="organic-card p-5 text-sm text-foreground">{notice}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          {account && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Followers" value={num(account.followers_count)} />
              <StatCard label="Posts" value={num(account.media_count)} />
              <StatCard label="Reach (recent)" value={num(account.reach)} sub="Accounts reached, per Meta's window" />
            </div>
          )}

          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posted carousels yet. Post a carousel from the Slides tab and its stats will appear here.
            </p>
          ) : (
            <div className="organic-card p-0 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Post</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-4 py-3 font-medium">Reach</th>
                    <th className="px-4 py-3 font-medium">Likes</th>
                    <th className="px-4 py-3 font-medium">Comments</th>
                    <th className="px-4 py-3 font-medium">Saved</th>
                    <th className="px-4 py-3 font-medium">Shares</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => {
                    const m = batch.instagram_media_id ? media[batch.instagram_media_id] : undefined;
                    const isStory = batch.kind.endsWith('-story');
                    return (
                      <tr key={batch.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {batch.slides[0] ? (
                              <img
                                src={batch.slides[0].publicUrl}
                                alt=""
                                className={`${isStory ? 'h-14 w-8' : 'h-12 w-10'} rounded-md border border-border object-cover`}
                              />
                            ) : (
                              <div className="h-12 w-10 rounded-md bg-muted" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{batch.title || batch.kind}</p>
                              <p className="text-xs text-muted-foreground">
                                {isStory ? 'Story · ' : ''}
                                {batch.kind}
                              </p>
                              {m?.insightsError && (
                                <p className="text-xs text-amber-600">Insights unavailable for this post</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {batch.posted_at ? format(parseISO(batch.posted_at), 'd MMM, h:mma') : '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{num(m?.insights?.reach)}</td>
                        <td className="px-4 py-3"><Metric icon={Heart} value={m?.like_count} /></td>
                        <td className="px-4 py-3"><Metric icon={MessageCircle} value={m?.comments_count} /></td>
                        <td className="px-4 py-3"><Metric icon={Bookmark} value={m?.insights?.saved} /></td>
                        <td className="px-4 py-3"><Metric icon={Send} value={m?.insights?.shares} /></td>
                        <td className="px-4 py-3">
                          {m?.permalink && (
                            <a
                              href={m.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              View <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Meta reports reach and saves with a delay (often 24–48h), and Story insights disappear once a Story
            expires. Figures are pulled live each time you open or refresh this tab.
          </p>
        </>
      )}
    </div>
  );
};

export default InstagramInsights;
