import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return jsonResponse({ error: 'User ID and new password are required.' }, 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters long.' }, 400);
    }

    const { error } = await auth.admin.auth.admin.updateUserById(userId, { password: newPassword });

    if (error) {
      console.error('Error resetting user password:', error);
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ message: 'User password reset successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error in reset-password-admin function:', error);
    return jsonResponse({ error: message }, 500);
  }
});
