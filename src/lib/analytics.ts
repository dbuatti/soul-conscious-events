import { supabase } from '@/integrations/supabase/client';
import { getVisitActionType } from '@/lib/growth';

const SESSION_KEY = 'sf_session_id';

/** A stable anonymous id per browser, used to stitch visits into sessions. */
export const getSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `sf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
};

/** Keys match the `page_visit_logs` columns added in migration 0016. Any key
 *  without a matching column makes PostgREST reject the whole insert. */
export interface UtmAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export const getUtmAttribution = (search = typeof window !== 'undefined' ? window.location.search : ''): UtmAttribution => {
  const params = new URLSearchParams(search);
  const read = (key: string) => params.get(key)?.trim().slice(0, 120) || undefined;
  return {
    utm_source: read('utm_source'),
    utm_medium: read('utm_medium'),
    utm_campaign: read('utm_campaign'),
  };
};

export const getReferrer = (): string | null => {
  if (typeof document === 'undefined') return null;
  const ref = document.referrer;
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname;
    if (typeof window !== 'undefined' && host === window.location.hostname) return null;
    return host;
  } catch {
    return ref.slice(0, 120);
  }
};

/** Build the enriched column set when migration 0016 has been applied. */
const pageVisitEnrichment = (search: string) => ({
  device_type: getDeviceType(),
  session_id: getSessionId(),
  referrer: getReferrer(),
  ...getUtmAttribution(search),
});

/** Log a page view. Tries enriched columns first, falls back to basic if the
 *  migration has not been applied yet, so analytics never breaks. */
export const logPageVisit = async (path: string, search: string, userId: string | null) => {
  const basic = {
    user_id: userId,
    page_path: path,
    action_type: getVisitActionType(search),
  };
  try {
    const { error } = await supabase.from('page_visit_logs').insert([{
      ...basic,
      ...pageVisitEnrichment(search),
    }]);
    if (error) {
      // Likely missing columns (migration not applied yet): retry basic.
      const { error: basicError } = await supabase.from('page_visit_logs').insert([basic]);
      if (basicError) console.error('Error logging page view:', basicError);
    }
  } catch (err) {
    console.error('logPageVisit failed:', err);
  }
};

/** Log an event-level action (view, ticket_click, share, …). */
export const logEventAction = async (eventId: string, userId: string | null, logType: string) => {
  const basic = { event_id: eventId, user_id: userId, log_type: logType };
  try {
    const { error } = await supabase.from('event_analytics_logs').insert([{
      ...basic,
      session_id: getSessionId(),
      device_type: getDeviceType(),
      referrer: getReferrer(),
    }]);
    if (error) {
      const { error: basicError } = await supabase.from('event_analytics_logs').insert([basic]);
      if (basicError) console.error('Error logging event action:', basicError);
    }
  } catch (err) {
    console.error('logEventAction failed:', err);
  }
};

/** Log a search query (debounced by caller). */
export const logSearch = async (term: string, userId: string | null) => {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return;
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const basic = {
    user_id: userId,
    page_path: path,
    action_type: `search:${trimmed.slice(0, 60)}`,
  };
  try {
    const { error } = await supabase.from('page_visit_logs').insert([{
      ...basic,
      device_type: getDeviceType(),
      session_id: getSessionId(),
      referrer: getReferrer(),
      ...getUtmAttribution(),
    }]);
    if (error) {
      const { error: basicError } = await supabase.from('page_visit_logs').insert([basic]);
      if (basicError) console.error('Error logging search:', basicError);
    }
  } catch (err) {
    console.error('logSearch failed:', err);
  }
};

/** Log a generic UI action (filter change, view mode, bookmark, calendar add, …). */
export const logUiAction = async (action: string, userId: string | null, path?: string) => {
  const resolvedPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const basic = {
    user_id: userId,
    page_path: resolvedPath,
    action_type: action,
  };
  try {
    const { error } = await supabase.from('page_visit_logs').insert([{
      ...basic,
      device_type: getDeviceType(),
      session_id: getSessionId(),
      referrer: getReferrer(),
      ...getUtmAttribution(),
    }]);
    if (error) {
      const { error: basicError } = await supabase.from('page_visit_logs').insert([basic]);
      if (basicError) console.error('Error logging ui action:', basicError);
    }
  } catch (err) {
    console.error('logUiAction failed:', err);
  }
};
