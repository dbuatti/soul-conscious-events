// @ts-ignore: Deno standard library imports are not resolved by the local TS compiler
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore: ESM imports are not resolved by the local TS compiler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Declare Deno global for the local TypeScript compiler
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // 1. Authentication Check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  )

  // Verify the user is logged in
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  let input_text = '';
  let parsed_data: any = null;
  let error_message: string | null = null;

  try {
    const { text } = await req.json();
    input_text = text;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      error_message = 'GEMINI_API_KEY is not set in environment variables.';
      return new Response(JSON.stringify({ error: error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const currentYear = new Date().getFullYear();

    const prompt = `
      You are an expert event coordinator for "SoulFlow", a platform for conscious and soulful events in Australia.
      Your task is to parse the provided text (which could be a flyer, email, or social post) and extract event details into a clean JSON object.

      **Extraction Rules:**
      1. **Dates:** Use 'YYYY-MM-DD' format. Assume the current year is ${currentYear} unless specified.
      2. **Event Type:** MUST be one of: [Music, Workshop, Meditation, Open Mic, Sound Bath, Foraging, Community Gathering, Other].
      3. **State:** MUST be one of: [ACT, NSW, NT, QLD, SA, TAS, VIC, WA]. Look for state names or abbreviations in the text.
      4. **Full Address:** Format this for optimal geocoding by OpenStreetMap. It should ideally look like: "Street Number Street Name, Suburb, STATE Postcode, Australia". If only a suburb is mentioned, use "Suburb, STATE, Australia".
      5. **Description:** Keep the original paragraph structure.
      6. **Discount Code:** Look for words like "Code", "Promo", "Discount" followed by a string.
      7. **Google Maps:** Look for links starting with "maps.app.goo.gl" or "google.com/maps".

      **Expected JSON Format:**
      {
        "eventName": "string",
        "eventDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD (optional)",
        "eventTime": "string",
        "placeName": "string",
        "fullAddress": "string",
        "description": "string",
        "ticketLink": "string (URL)",
        "price": "string",
        "specialNotes": "string",
        "organizerContact": "string",
        "eventType": "string",
        "geographicalState": "string",
        "discountCode": "string",
        "googleMapsLink": "string (URL)"
      }

      Return ONLY the JSON object. No markdown, no explanations.

      Text to parse:
      "${text}"
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    let generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedText) {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed_data = JSON.parse(jsonMatch[0]);
      }
    }

    return new Response(JSON.stringify({ parsed_data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    error_message = error.message;
    return new Response(JSON.stringify({ error: error_message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  } finally {
    // Log the attempt with user context
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await adminClient
      .from('ai_parsing_logs')
      .insert({
        input_text: input_text,
        parsed_data: parsed_data,
        error_message: error_message,
        // @ts-ignore
        user_id: user?.id || null
      });
  }
});