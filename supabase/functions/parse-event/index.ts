/// <reference lib="deno.ns" />

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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { 'x-my-custom-header': 'SoulFlow-Edge-Function' },
      },
    }
  );

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
        status: 500, // Internal Server Error for missing key
      });
    }

    const currentYear = new Date().getFullYear(); // Get the current year dynamically

    const prompt = `
      You are an AI assistant specialized in extracting event details from unstructured text.
      Your task is to parse the provided event text and return a JSON object containing the extracted information.
      Crucially, your response MUST contain ONLY the JSON object, with no additional text, markdown formatting (like \`\`\`json), or conversational elements.
      If a field is not found, omit it from the JSON.
      Ensure dates are in 'YYYY-MM-DD' format. If a year is not explicitly mentioned for a date, assume the current year, which is ${currentYear}.
      Ensure the 'ticketLink' includes 'https://' if present.

      Here is the event text:
      "${text}"

      Expected JSON format (example, omit fields if not found):
      {
        "eventName": "Example Event",
        "eventDate": "2024-12-25",
        "eventTime": "7:00 PM",
        "placeName": "The Venue",
        "fullAddress": "123 Main St, City, State, Postcode",
        "description": "A detailed description of the event.",
        "ticketLink": "https://example.com/tickets",
        "price": "$50",
        "specialNotes": "Bring your own mat.",
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
      error_message = `Gemini API error: ${geminiResponse.status} - ${JSON.stringify(errorBody)}`;
      console.error(error_message);
      return new Response(JSON.stringify({ error: error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: geminiResponse.status, // Propagate Gemini's status code
      });
    }

    const geminiData = await geminiResponse.json();
    let generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedText) {
      // Attempt to extract JSON from markdown block if present
      const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        generatedText = jsonMatch[1];
      }

      try {
        parsed_data = JSON.parse(generatedText);
      } catch (jsonError: any) {
        error_message = `Failed to parse Gemini output as JSON: ${jsonError.message}. Raw output: ${generatedText}`;
        console.error(error_message);
        return new Response(JSON.stringify({ error: error_message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400, // Bad Request for invalid JSON from AI
        });
      }
    } else {
      error_message = 'Gemini did not return any generated text.';
      console.warn(error_message);
      parsed_data = {}; // No data extracted, but not an error for the function itself
    }

    return new Response(JSON.stringify({ parsed_data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    error_message = `Unexpected error during event parsing: ${error.message}`;
    console.error(error_message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Internal Server Error for unexpected issues
    });
  } finally {
    // Log the parsing attempt to Supabase
    const { error: logError } = await supabaseClient
      .from('ai_parsing_logs')
      .insert({
        input_text: input_text,
        parsed_data: parsed_data,
        error_message: error_message,
      });

    if (logError) {
      console.error('Error logging AI parsing attempt:', logError.message);
    }
  }
});