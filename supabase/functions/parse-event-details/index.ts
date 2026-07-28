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
  let parsed_data: Record<string, unknown> | null = null;
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

    // Extract URLs from the text to scrape page content and hero images
    const urlRegex = /https?:\/\/[^\s"'<>)\]]+/g;
    const urls = text.match(urlRegex) || [];

    // Scrape a URL: extract hero image + clean page text for Gemini
    const scrapeUrl = async (url: string): Promise<{ image: string | null; pageText: string }> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SoulFlow/1.0)' },
        });
        clearTimeout(timeout);

        if (!response.ok) return { image: null, pageText: '' };
        const html = await response.text();

        // Extract hero image
        let image: string | null = null;
        const ogMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (ogMatch?.[1]) {
          image = ogMatch[1];
        } else {
          const twMatch = html.match(/<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
          if (twMatch?.[1]) {
            image = twMatch[1];
          } else {
            const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
            if (ldMatch?.[1]) {
              try {
                const ld = JSON.parse(ldMatch[1]);
                if (ld.image) {
                  image = Array.isArray(ld.image) ? ld.image[0] : (typeof ld.image === 'string' ? ld.image : ld.image?.url);
                }
              } catch { /* ignore */ }
            }
          }
        }

        // Extract clean text from HTML for Gemini
        let pageText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Cap at ~4000 chars to stay within token limits
        if (pageText.length > 4000) pageText = pageText.substring(0, 4000);

        return { image, pageText };
      } catch {
        return { image: null, pageText: '' };
      }
    };

    // Step 1: Scrape all URLs first (fast, in parallel)
    const scrapedResults = await Promise.all(urls.map(scrapeUrl));
    const heroImage = scrapedResults.find((r) => r.image !== null)?.image || null;

    // Combine user text with any scraped page content
    const scrapedContent = scrapedResults
      .map((r) => r.pageText)
      .filter((t) => t.length > 0)
      .join('\n\n---\n\n');

    const textForGemini = scrapedContent
      ? `${text}\n\n---\nContent from event page:\n${scrapedContent}`
      : text;

    // Step 2: Send enriched text to Gemini
    const currentYear = new Date().getFullYear();

    const prompt = `
      You are an expert event coordinator for "SoulFlow", a platform for conscious and soulful events in Australia.
      Your task is to parse the provided text (which could be a flyer, email, social post, or scraped web page content) and extract event details into a clean JSON object.

      **Extraction Rules:**
      1. **Dates:** Use 'YYYY-MM-DD' format. Assume the current year is ${currentYear} unless specified.
      2. **Event Type:** MUST be one of: [Music, Workshop, Meditation, Open Mic, Sound Bath, Foraging, Community Gathering, Other].
      3. **State:** MUST be one of: [ACT, NSW, NT, QLD, SA, TAS, VIC, WA]. Look for state names or abbreviations in the text.
      4. **Full Address:** Format this for optimal geocoding by OpenStreetMap. It should ideally look like: "Street Number Street Name, Suburb, STATE Postcode, Australia". If only a suburb is mentioned, use "Suburb, STATE, Australia".
      5. **Description:** Keep the original paragraph structure. Extract the main event description — ignore navigation, headers, footers, and boilerplate.
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
      "${textForGemini}"
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    const generatedText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedText) {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed_data = JSON.parse(jsonMatch[0]);
      }
    }

    // Attach scraped image URL to parsed data
    if (parsed_data && heroImage) {
      parsed_data.imageUrl = heroImage;
    }

    return new Response(JSON.stringify({ parsed_data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    error_message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: error_message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  } finally {
    // Log the attempt with user context
    if (user) {
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
          user_id: user.id,
        });
    }
  }
});