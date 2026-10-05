import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const userId: string | undefined = typeof body?.userId === 'string' ? body.userId : undefined;
    let email: string | undefined = typeof body?.email === 'string' && body.email ? body.email : undefined;

    if (!userId && !email) {
      return jsonResponse({ error: 'A user ID or email is required.' }, 400);
    }

    // Profile rows don't always hold the email (older accounts), so prefer the
    // auth record, which is also where confirmation status lives.
    let authUserId = userId;
    if (!authUserId && email) {
      const { data: profile } = await auth.admin.from('profiles').select('id').eq('email', email).maybeSingle();
      authUserId = profile?.id;
    }
    if (authUserId) {
      const { data: existing, error: lookupError } = await auth.admin.auth.admin.getUserById(authUserId);
      if (lookupError || !existing?.user) {
        return jsonResponse({ error: 'That user no longer exists.' }, 404);
      }
      if (existing.user.email_confirmed_at) {
        return jsonResponse({ error: 'This user has already confirmed their email address, so there is nothing to resend.' }, 400);
      }
      email = existing.user.email ?? email;
    }
    if (!email) {
      return jsonResponse({ error: 'This user has no email address on file.' }, 400);
    }

    // supabase-js v2 has no admin.resendConfirmation; auth.resend is the supported API.
    const { error } = await auth.admin.auth.resend({ type: 'signup', email });

    if (error) {
      console.error('Error resending confirmation:', error);
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ message: 'Confirmation email sent successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error in resend-confirmation function:', error);
    return jsonResponse({ error: message }, 500);
  }
});
