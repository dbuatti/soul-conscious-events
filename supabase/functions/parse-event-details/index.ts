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

    // Scrape a URL: extract hero image + clean page text + structured data for Gemini
    const scrapeUrl = async (url: string): Promise<{ image: string | null; pageText: string; structuredData: string }> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SoulFlow/1.0)' },
        });
        clearTimeout(timeout);

        if (!response.ok) return { image: null, pageText: '', structuredData: '' };
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
          }
        }

        // Extract ALL JSON-LD blocks (may contain Event schema with price, dates, location)
        let structuredData = '';
        const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        for (const match of ldMatches) {
          try {
            const ld = JSON.parse(match[1]);
            if (ld['@type'] === 'Event' || ld['@type'] === 'MusicEvent' || (Array.isArray(ld['@graph']) && ld['@graph'].some((n: Record<string, string>) => n['@type'] === 'Event'))) {
              structuredData = JSON.stringify(ld, null, 2);
              if (!image && ld.image) {
                image = Array.isArray(ld.image) ? ld.image[0] : (typeof ld.image === 'string' ? ld.image : ld.image?.url);
              }
              break;
            }
          } catch { /* ignore */ }
        }

        // Extract clean text from HTML for Gemini
        let pageText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/gi, ' ')
          .replace(/Skip to (Content|Tickets|Footer)/gi, '')
          .replace(/Powered by.*?(?=\s{2}|$)/gi, '')
          .replace(/Tickets for good[^.]*\./gi, '')
          .replace(/Get tickets.*?(?=\s{2}|$)/gi, '')
          .replace(/Follow|View profile|Contact host|Share\b/gi, '')
          .replace(/Add to calendar|Get directions|Refund policy|Footer information/gi, '')
          .replace(/Your privacy choices|Privacy policy|Terms of use|Terms and conditions/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Cap at ~6000 chars to stay within token limits
        if (pageText.length > 6000) pageText = pageText.substring(0, 6000);

        return { image, pageText, structuredData };
      } catch {
        return { image: null, pageText: '', structuredData: '' };
      }
    };

    // Step 1: Scrape all URLs first (fast, in parallel)
    const scrapedResults = await Promise.all(urls.map(scrapeUrl));
    const heroImage = scrapedResults.find((r) => r.image !== null)?.image || null;

    // Combine user text with any scraped page content and structured data
    const scrapedContent = scrapedResults
      .map((r) => r.pageText)
      .filter((t) => t.length > 0)
      .join('\n\n---\n\n');

    const structuredData = scrapedResults
      .map((r) => r.structuredData)
      .filter((t) => t.length > 0)
      .join('\n\n');

    let textForGemini = text;
    if (structuredData) {
      textForGemini += `\n\n---\nStructured data from event page (JSON-LD):\n${structuredData}`;
    }
    if (scrapedContent) {
      textForGemini += `\n\n---\nContent from event page:\n${scrapedContent}`;
    }

    // Step 2: Send enriched text to Gemini
    const currentYear = new Date().getFullYear();

    const prompt = `
      You are an expert event coordinator for "SoulFlow", a platform for conscious and soulful events in Australia.
      Your task is to parse the provided text (which could be a flyer, email, social post, or scraped web page content) and extract event details into a clean JSON object.

      The input may include:
      - The user's raw text (flyer, email, URL)
      - Structured data (JSON-LD) from the event page — this is the most accurate source for price, dates, and location
      - Scraped page content

      **CONSULT THE STRUCTURED DATA FIRST** for fields like price, date, location, and name before falling back to page text.

      **Extraction Rules:**
      1. **Dates:** Use 'YYYY-MM-DD' format. Assume the current year is ${currentYear} unless specified. Set "endDate" only for multi-day events (explicit date range like "Aug 8-9" or "Saturday to Sunday"). Check the structured data's startDate/endDate fields.

      2. **Event Type:** MUST be one of: [Music, Workshop, Meditation, Open Mic, Sound Bath, Foraging, Community Gathering, Other].
         Use thorough keyword matching to infer the best fit:
         - **Music** — keywords: live music, concert, gig, symphony, orchestra, band, DJ, vocals, singer, singing, performance, instrumental, acoustic, rhythm, blues, jazz, folk, choir, classical, jam, open deck, dance music
         - **Workshop** — keywords: workshop, class, training, course, masterclass, intensive, learn how, educational, seminar, lecture, tutorial, certification, program, session (when structured as learning)
         - **Meditation** — keywords: meditation, mindfulness, breathwork, breath, yoga nidra, pranayama, stillness, silent retreat, guided meditation, zen, vipassana, mantra, chakra, healing meditation, inner peace, conscious, presence
         - **Sound Bath** — keywords: sound bath, sound healing, gong, singing bowls, crystal bowls, sound journey, soundscape, vibrational, harmonic, alchemy, frequency
         - **Open Mic** — keywords: open mic, open stage, open deck, spoken word, poetry slam, rap battle, showcase
         - **Foraging** — keywords: foraging, wild food, bush tucker, mushroom walk, wild plants, native food, bushcraft
         - **Community Gathering** — keywords: retreat, festival, ceremony, circle, market, fair, gathering, community, meetup, network, celebration, fundraiser, charity, cultural, festival, group, social, kirtan, satsang, puja, ritual
         - **Other** — anything that doesn't fit above

      3. **State:** MUST be one of: [ACT, NSW, NT, QLD, SA, TAS, VIC, WA]. Look for state names or abbreviations in the text. Check the structured data's addressRegion.

      4. **Full Address:** Format this for optimal geocoding by OpenStreetMap. It should ideally look like: "Street Number Street Name, Suburb, STATE Postcode, Australia". If only a suburb is mentioned, use "Suburb, STATE, Australia". Use address data from JSON-LD if available.

      5. **Description:** Extract the main event description — the actual content about what the event is. Remove navigation text, headers, footers, cookie notices, sponsor logos, and boilerplate. Keep paragraph structure.

      6. **Price:** Look for dollar amounts in JSON-LD (offers.price) or in the page text. Use the lowest available ticket price. Format as "$75", "Free", "Donation", "$50-$100". Extract from structured data's offers section when present.

      7. **Organizer Contact:** Look for organizer/host name, email, or contact info. Combine with the platform name if known (e.g. "Nanda Das (via Humanitix)", "Book via eventbrite.com.au").

      8. **Discount Code:** Look for words like "Code", "Promo", "Discount" followed by a string.

      9. **Google Maps Link:** If a Google Maps link is present in the text, use it. If the full address is available but no maps link, generate one using: "https://maps.google.com/maps?q=<encoded_address>".

      **Expected JSON Format:**
      {
        "eventName": "string",
        "eventDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD (optional, only for multi-day events)",
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