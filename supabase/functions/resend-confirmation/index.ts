import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { email } = await req.json();

    if (!email) {
      return jsonResponse({ error: 'Email is required.' }, 400);
    }

    // Resending to an already-confirmed address fails with an unhelpful auth
    // error, so check first and say so plainly.
    const { data: profile } = await auth.admin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (profile?.id) {
      const { data: existing } = await auth.admin.auth.admin.getUserById(profile.id);
      if (existing?.user?.email_confirmed_at) {
        return jsonResponse({ error: 'This user has already confirmed their email address, so there is nothing to resend.' }, 400);
      }
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
