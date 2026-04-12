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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { 'x-my-custom-header': 'SoulFlow-Edge-Function' },
      },
    }
  )

  let input_text = '';
  let parsed_data: any = null;
  let error_message: string | null = null;

  try {
    const { text } = await req.json();
    input_text = text;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      error_message = 'GEMINI_API_KEY is not set in environment variables.';
      console.error(error_message);
      return new Response(JSON.stringify({ error: error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const currentYear = new Date().getFullYear();

    const prompt = `
      You are an AI assistant specialized in extracting event details from unstructured text.
      Your task is to parse the provided event text and return a JSON object containing the extracted information.
      Crucially, your response MUST contain ONLY the JSON object, with no additional text or markdown formatting.

      **Formatting Rules:**
      - For the 'description' and 'specialNotes' fields, preserve the original paragraph structure and line breaks.
      - If a field is not found, omit it from the JSON.
      - Ensure dates are in 'YYYY-MM-DD' format. Assume the current year is ${currentYear}.
      - If a date range is provided, extract the start date as 'eventDate' and the end date as 'endDate'.

      Here is the event text:
      "${text}"

      Expected JSON format:
      {
        "eventName": "Example Event",
        "eventDate": "2024-12-25",
        "endDate": "2024-12-26",
        "eventTime": "7:00 PM",
        "placeName": "The Venue",
        "fullAddress": "123 Main St, City, State, Postcode",
        "description": "Description text...",
        "ticketLink": "https://example.com/tickets",
        "price": "$50",
        "specialNotes": "Notes...",
        "organizerContact": "John Doe",
        "eventType": "Music",
        "state": "VIC"
      }
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.json();
      error_message = `Gemini API error: ${geminiResponse.status}`;
      console.error(error_message, errorBody);
      return new Response(JSON.stringify({ error: error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: geminiResponse.status,
      });
    }

    const geminiData = await geminiResponse.json();
    let generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedText) {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedText = jsonMatch[0];
      }

      try {
        parsed_data = JSON.parse(generatedText);
      } catch (jsonError: any) {
        error_message = `Failed to parse AI output as JSON.`;
        console.error(error_message, generatedText);
        return new Response(JSON.stringify({ error: error_message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else {
      parsed_data = {};
    }

    return new Response(JSON.stringify({ parsed_data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    error_message = `Unexpected error: ${error.message}`;
    return new Response(JSON.stringify({ error: error_message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  } finally {
    // Log the attempt to the database
    await supabaseClient
      .from('ai_parsing_logs')
      .insert({
        input_text: input_text,
        parsed_data: parsed_data,
        error_message: error_message,
      });
  }
});