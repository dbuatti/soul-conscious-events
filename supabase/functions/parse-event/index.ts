/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
/// <reference types="https://esm.sh/@supabase/supabase-js@2.45.0" />

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
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }

    const prompt = `
      You are an AI assistant specialized in extracting event details from unstructured text.
      Your task is to parse the provided event text and return a JSON object containing the extracted information.
      Only return the JSON object. Do not include any other text or markdown.
      If a field is not found, omit it from the JSON.
      Ensure dates are in 'YYYY-MM-DD' format.
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

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
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
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${JSON.stringify(errorBody)}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedText) {
      try {
        // Attempt to parse the generated text as JSON
        parsed_data = JSON.parse(generatedText);
      } catch (jsonError) {
        console.error('Failed to parse Gemini output as JSON:', generatedText, jsonError);
        throw new Error('AI returned invalid JSON format.');
      }
    } else {
      console.warn('Gemini did not return any generated text.');
      parsed_data = {}; // No data extracted
    }

    return new Response(JSON.stringify({ parsed_data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error parsing event:', error.message);
    error_message = error.message;
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
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