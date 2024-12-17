import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all games with open slots
    const { data: gamesWithSlots, error: gamesError } = await supabaseClient
      .from('games')
      .select(`
        id,
        date,
        max_players,
        game_registrations!inner (
          player_id,
          status
        )
      `)
      .eq('status', 'players_announced')
      .gt('date', 'now()')
      .order('date', { ascending: true })

    if (gamesError) throw gamesError

    // Process each game
    for (const game of gamesWithSlots) {
      const selectedPlayers = game.game_registrations.filter(reg => reg.status === 'selected')
      const slotsAvailable = game.max_players - selectedPlayers.length

      if (slotsAvailable > 0) {
        // Call the create_slot_offers_for_game function
        const { error: offerError } = await supabaseClient.rpc(
          'create_slot_offers_for_game',
          {
            p_game_id: game.id
          }
        )

        if (offerError) {
          console.error(`Error creating slot offers for game ${game.id}:`, offerError)
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Slot offers checked and created successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
