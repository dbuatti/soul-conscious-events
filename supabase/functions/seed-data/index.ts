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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const token = authHeader.split(' ')[1];
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for admin operations
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Verify the user is an admin (e.g., by email)
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || user?.email !== 'daniele.buatti@gmail.com') {
    console.error('Unauthorized attempt to seed data:', userError?.message || 'User not admin');
    return new Response(JSON.stringify({ error: 'Forbidden: Only admin can seed data' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    });
  }

  try {
    // Clear existing data (optional, but good for repeatable seeding)
    await supabaseAdmin.from('user_bookmarks').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('ai_parsing_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('page_visit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('discount_code_usage_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Get the test user's ID (assuming 'test@example.com' exists)
    const { data: testUserData, error: testUserError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', 'test@example.com') // Assuming email is stored in profiles or can be fetched from auth.users
      .single();

    let testUserId = user.id; // Default to current admin user if test@example.com not found
    if (testUserData) {
      testUserId = testUserData.id;
    } else {
      console.warn('Test user (test@example.com) not found in profiles. Seeding events with admin user ID.');
    }

    const dummyEvents = [
      {
        event_name: 'Mindful Morning Meditation',
        event_date: '2024-10-26',
        event_time: '8:00 AM',
        place_name: 'Botanical Gardens',
        full_address: 'Birdwood Ave, South Yarra VIC 3141, Australia',
        description: 'Start your day with a peaceful guided meditation session amidst nature. All levels welcome.',
        ticket_link: 'https://example.com/meditation-tickets',
        price: 'Free',
        organizer_contact: 'Mindful Living Collective',
        event_type: 'Meditation',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1508780709619-79561f163960?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        event_name: 'Community Drum Circle',
        event_date: '2024-11-05',
        event_time: '6:30 PM',
        place_name: 'Local Community Hall',
        full_address: '123 Community Rd, Fitzroy VIC 3065, Australia',
        description: 'Join us for an evening of rhythmic connection and joyful expression. Bring your own drum or use one of ours!',
        ticket_link: 'https://example.com/drum-circle',
        price: '$15 donation',
        special_notes: 'No experience necessary. Family-friendly.',
        organizer_contact: 'Rhythm Keepers',
        event_type: 'Community Gathering',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1514525253164-ffc017150e0e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        event_name: 'Introduction to Foraging Workshop',
        event_date: '2024-11-15',
        event_time: '10:00 AM',
        place_name: 'Dandenong Ranges National Park',
        full_address: 'Mount Dandenong Tourist Rd, Olinda VIC 3788, Australia',
        description: 'Learn about edible plants and fungi in your local environment. Guided walk and identification tips.',
        price: '$75',
        organizer_contact: 'Wild Edibles Australia',
        event_type: 'Foraging',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        event_name: 'Acoustic Open Mic Night',
        event_date: '2024-12-01',
        event_time: '7:00 PM',
        place_name: 'The Cozy Cafe',
        full_address: '456 Cafe Lane, Northcote VIC 3070, Australia',
        description: 'Share your musical talents or enjoy local artists in a relaxed atmosphere. Sign-ups on the night.',
        price: 'Free (drinks available for purchase)',
        organizer_contact: 'Northcote Arts Hub',
        event_type: 'Open Mic',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1514525253164-ffc017150e0e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        event_name: 'Sunset Sound Bath Journey',
        event_date: '2024-12-10',
        event_time: '5:30 PM',
        place_name: 'Beachside Yoga Studio',
        full_address: '789 Ocean View Dr, St Kilda VIC 3182, Australia',
        description: 'Immerse yourself in healing vibrations as the sun sets. Crystal bowls, gongs, and chimes.',
        price: '$40',
        special_notes: 'Bring a yoga mat, blanket, and water bottle.',
        organizer_contact: 'Harmonic Healing',
        event_type: 'Sound Bath',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1514525253164-ffc017150e0e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        event_name: 'Past Event Example',
        event_date: '2024-01-15',
        event_time: '2:00 PM',
        place_name: 'Old Town Hall',
        full_address: '1 Old St, Melbourne VIC 3000, Australia',
        description: 'This is an example of a past event.',
        price: '$20',
        organizer_contact: 'History Buffs',
        event_type: 'Other',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1514525253164-ffc017150e0e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        event_name: 'Multi-Day Retreat',
        event_date: '2024-11-20',
        end_date: '2024-11-22',
        event_time: 'All Day',
        place_name: 'Mountain Retreat Centre',
        full_address: '100 Secluded Rd, Blackwood VIC 3458, Australia',
        description: 'A transformative multi-day retreat focusing on holistic well-being.',
        price: '$500',
        organizer_contact: 'Inner Peace Retreats',
        event_type: 'Workshop',
        state: 'approved',
        user_id: testUserId,
        image_url: 'https://images.unsplash.com/photo-1514525253164-ffc017150e0e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ];

    const { data: insertedEvents, error: insertError } = await supabaseAdmin
      .from('events')
      .insert(dummyEvents)
      .select('id'); // Select IDs to use for bookmarks

    if (insertError) {
      console.error('Error inserting dummy events:', insertError);
      throw new Error(`Failed to insert dummy events: ${insertError.message}`);
    }

    // Create some dummy bookmarks for the test user
    if (insertedEvents && insertedEvents.length > 0) {
      const dummyBookmarks = [
        { user_id: testUserId, event_id: insertedEvents[0].id },
        { user_id: testUserId, event_id: insertedEvents[1].id },
      ];
      const { error: bookmarkError } = await supabaseAdmin
        .from('user_bookmarks')
        .insert(dummyBookmarks);

      if (bookmarkError) {
        console.error('Error inserting dummy bookmarks:', bookmarkError);
        throw new Error(`Failed to insert dummy bookmarks: ${bookmarkError.message}`);
      }
    }

    return new Response(JSON.stringify({ message: 'Database seeded successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error seeding data:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});