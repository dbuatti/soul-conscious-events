// @ts-expect-error: Deno standard library imports are not resolved by the local TS compiler
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-expect-error: ESM imports are not resolved by the local TS compiler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log("[cron-ping] Received ping request at:", new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Perform a simple query to keep the database active
    const { error } = await supabase.from('dev_tasks').select('id').limit(1);
    
    if (error) {
      console.warn("[cron-ping] Database query warning:", error.message);
    } else {
      console.log("[cron-ping] Database query successful, project is active.");
    }

    return new Response(
      JSON.stringify({ 
        message: 'Ping received and database queried successfully', 
        timestamp: new Date().toISOString(),
        db_active: !error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: unknown) {
    console.error("[cron-ping] Error processing ping:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})