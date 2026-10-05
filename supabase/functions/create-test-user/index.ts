import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { email, password, first_name, last_name } = await req.json();

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required.' }, 400);
    }

    const { data: user, error: createUserError } = await auth.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email for test users
      user_metadata: { first_name, last_name },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return jsonResponse({ error: createUserError.message }, 400);
    }

    return jsonResponse({ userId: user.user?.id, email, password });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error in create-test-user function:', error);
    return jsonResponse({ error: message }, 500);
  }
});
