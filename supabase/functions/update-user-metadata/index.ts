import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, firstName, lastName, email } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Update auth.users table (for email and user_metadata)
    const { data: authUpdateData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: email,
        user_metadata: { first_name: firstName, last_name: lastName },
      }
    );

    if (authUpdateError) {
      console.error('Error updating user in auth.users:', authUpdateError);
      return new Response(JSON.stringify({ error: authUpdateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Update public.profiles table (for first_name, last_name, email)
    const { data: profileUpdateData, error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email,
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating user in public.profiles:', profileUpdateError);
      return new Response(JSON.stringify({ error: profileUpdateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: 'User updated successfully', authData: authUpdateData, profileData: profileUpdateData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unexpected error in update-user-metadata function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});