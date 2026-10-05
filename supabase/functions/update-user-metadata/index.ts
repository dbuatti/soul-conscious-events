import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, jsonResponse, requireUser } from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;

    const { userId, firstName, lastName, email, username, country } = await req.json();

    if (!userId) {
      return jsonResponse({ error: 'User ID is required.' }, 400);
    }

    // Users may only edit themselves; admins may edit anyone.
    const isSelf = userId === auth.user.id;
    if (!isSelf && !auth.isAdmin) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Changing email through the admin API skips the confirmation step, so only
    // admins may do it here. Users change their email via supabase.auth.updateUser.
    const emailChanged = typeof email === 'string' && email !== '' && email !== (isSelf ? auth.user.email : undefined);
    if (emailChanged && !auth.isAdmin) {
      return jsonResponse({ error: 'Email changes must be confirmed via the account settings page.' }, 403);
    }

    const { data: authUpdateData, error: authUpdateError } = await auth.admin.auth.admin.updateUserById(
      userId,
      {
        ...(emailChanged ? { email } : {}),
        user_metadata: { first_name: firstName, last_name: lastName },
      }
    );

    if (authUpdateError) {
      console.error('Error updating user in auth.users:', authUpdateError);
      return jsonResponse({ error: authUpdateError.message }, 400);
    }

    const profileUpdate: Record<string, unknown> = { first_name: firstName, last_name: lastName };
    if (emailChanged) profileUpdate.email = email;
    if (username !== undefined) profileUpdate.username = username;
    if (country !== undefined) profileUpdate.country = country;

    const { error: profileUpdateError } = await auth.admin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating user in public.profiles:', profileUpdateError);
      return jsonResponse({ error: profileUpdateError.message }, 400);
    }

    return jsonResponse({ message: 'User updated successfully', authData: authUpdateData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error in update-user-metadata function:', error);
    return jsonResponse({ error: message }, 500);
  }
});
