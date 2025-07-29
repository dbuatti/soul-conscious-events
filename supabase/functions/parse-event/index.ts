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

    // --- Simulated AI Parsing Logic ---
    // In a real application, you would call an external AI API here.
    // For demonstration, we'll use simple regex/string matching.

    const eventNameMatch = text.match(/(?:Event Name|Title):\s*(.+)/i);
    const eventDateMatch = text.match(/(?:Date):\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i);
    const eventTimeMatch = text.match(/(?:Time):\s*(.+)/i);
    const placeNameMatch = text.match(/(?:Place Name|Venue):\s*(.+)/i);
    const fullAddressMatch = text.match(/(?:Address|Location):\s*(.+)/i);
    const descriptionMatch = text.match(/(?:Description):\s*([\s\S]+?)(?:\n\n|\nEvent Name|\nDate|\nTime|\nPlace Name|\nAddress|\nTicket Link|\nPrice|\nSpecial Notes|\nOrganizer Contact|\nEvent Type|$)/i);
    const ticketLinkMatch = text.match(/(?:Ticket Link|Tickets):\s*(https?:\/\/\S+)/i);
    const priceMatch = text.match(/(?:Price):\s*(.+)/i);
    const specialNotesMatch = text.match(/(?:Special Notes):\s*(.+)/i);
    const organizerContactMatch = text.match(/(?:Organizer Contact|Contact):\s*(.+)/i);
    const eventTypeMatch = text.match(/(?:Event Type|Type):\s*(.+)/i);
    const stateMatch = text.match(/(?:State):\s*([A-Z]{2,3})/i);

    parsed_data = {
      eventName: eventNameMatch ? eventNameMatch[1].trim() : undefined,
      eventDate: eventDateMatch ? new Date(eventDateMatch[1].trim()).toISOString().split('T')[0] : undefined,
      eventTime: eventTimeMatch ? eventTimeMatch[1].trim() : undefined,
      placeName: placeNameMatch ? placeNameMatch[1].trim() : undefined,
      fullAddress: fullAddressMatch ? fullAddressMatch[1].trim() : undefined,
      description: descriptionMatch ? descriptionMatch[1].trim() : undefined,
      ticketLink: ticketLinkMatch ? ticketLinkMatch[1].trim() : undefined,
      price: priceMatch ? priceMatch[1].trim() : undefined,
      specialNotes: specialNotesMatch ? specialNotesMatch[1].trim() : undefined,
      organizerContact: organizerContactMatch ? organizerContactMatch[1].trim() : undefined,
      eventType: eventTypeMatch ? eventTypeMatch[1].trim() : undefined,
      state: stateMatch ? stateMatch[1].trim() : undefined,
    };

    // Clean up empty strings/undefined values
    for (const key in parsed_data) {
      if (parsed_data[key] === '' || parsed_data[key] === undefined) {
        delete parsed_data[key];
      }
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