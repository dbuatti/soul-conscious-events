import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Direct PostgREST insert with `return=minimal`: the anonymous insert policy
 * validates the row, while callers never receive subscriber data back.
 */
export const subscribeToWeeklyPicks = async (
  email: string,
  city: string,
  source: string,
): Promise<void> => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      email: normalizeEmail(email),
      city,
      source: source.trim().slice(0, 80) || 'website',
    }),
  });

  if (response.ok) return;

  const body = await response.json().catch(() => null) as { code?: string; message?: string } | null;
  // A repeat signup is a success from the subscriber's point of view.
  if (response.status === 409 && body?.code === '23505') return;

  throw new Error(body?.message || `Newsletter signup failed (${response.status})`);
};
