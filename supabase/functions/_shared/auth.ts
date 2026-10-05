import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// The site owner is always treated as an admin, mirroring the client-side check.
const SUPER_ADMIN_EMAIL = 'daniele.buatti@gmail.com';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // Required by the fetch spec whenever a preflight sends
  // Access-Control-Request-Method with a non-safelisted method (POST). Without
  // it, stricter browsers reject the preflight and the request never reaches
  // the function.
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Cache the preflight for a minute so repeat calls skip it entirely.
  'Access-Control-Max-Age': '60',
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

export const createAdminClient = (): SupabaseClient =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

/**
 * Resolves the user behind the request's bearer token. Returns null for
 * missing/invalid tokens, including the bare anon key (which has no user).
 */
export const getCaller = async (req: Request, admin: SupabaseClient): Promise<User | null> => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
};

export const isAdminUser = async (admin: SupabaseClient, user: User): Promise<boolean> => {
  if (user.email === SUPER_ADMIN_EMAIL) return true;
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin';
};

type AuthResult =
  | { ok: true; user: User; admin: SupabaseClient; isAdmin: boolean }
  | { ok: false; response: Response };

/** Requires a signed-in user. Also reports whether they are an admin. */
export const requireUser = async (req: Request): Promise<AuthResult> => {
  const admin = createAdminClient();
  const user = await getCaller(req, admin);
  if (!user) return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) };
  return { ok: true, user, admin, isAdmin: await isAdminUser(admin, user) };
};

/** Requires a signed-in admin. */
export const requireAdmin = async (req: Request): Promise<AuthResult> => {
  const result = await requireUser(req);
  if (result.ok && !result.isAdmin) {
    return { ok: false, response: jsonResponse({ error: 'Forbidden: admin access required' }, 403) };
  }
  return result;
};
