import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { userId } = await req.json();

    if (!userId) {
      return jsonResponse({ error: 'User ID is required.' }, 400);
    }

    if (userId === auth.user.id) {
      return jsonResponse({ error: 'You cannot delete your own account from the admin panel.' }, 400);
    }

    const { data, error } = await auth.admin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ message: 'User deleted successfully', data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error in delete-user function:', error);
    return jsonResponse({ error: message }, 500);
  }
});
