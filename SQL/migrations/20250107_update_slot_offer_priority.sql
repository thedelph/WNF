-- Drop all existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.calculate_slot_offer_times(uuid, integer);
DROP FUNCTION IF EXISTS public.calculate_slot_offer_times(uuid, bigint);
DROP FUNCTION IF EXISTS public.create_slot_offers_for_game(uuid);
DROP FUNCTION IF EXISTS public.create_slot_offers_for_game(uuid, uuid, uuid);

-- Add priority, admin_id, and dropped_out_player_id columns to slot_offers table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'slot_offers' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE slot_offers ADD COLUMN priority integer DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'slot_offers' 
        AND column_name = 'admin_id'
    ) THEN
        ALTER TABLE slot_offers ADD COLUMN admin_id uuid REFERENCES players(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'slot_offers' 
        AND column_name = 'dropped_out_player_id'
    ) THEN
        ALTER TABLE slot_offers ADD COLUMN dropped_out_player_id uuid REFERENCES players(id);
    END IF;
END $$;

-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_next_slot_offer_players(uuid, numeric);

-- Create the updated function with WhatsApp priority
CREATE OR REPLACE FUNCTION public.get_next_slot_offer_players(p_game_id uuid, p_hours_until_game numeric)
RETURNS TABLE(player_id uuid)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_selected_player uuid;
    v_selected_name text;
    v_selected_xp integer;
    v_selected_whatsapp text;
BEGIN
    -- First get the next eligible player and store their details
    WITH eligible_players AS (
        SELECT 
            p.id as eligible_player_id,
            p.friendly_name,
            p.whatsapp_group_member,
            gr.created_at,
            ps.xp,
            p.current_streak,
            p.caps
        FROM game_registrations gr
        INNER JOIN players p ON p.id = gr.player_id
        INNER JOIN player_stats ps ON ps.id = p.id
        WHERE gr.game_id = p_game_id
        AND gr.status = 'reserve'
        AND NOT EXISTS (
            SELECT 1 
            FROM slot_offers so 
            WHERE so.game_id = p_game_id 
            AND so.player_id = p.id 
            AND so.status IN ('pending', 'declined')
        )
    )
    SELECT 
        eligible_player_id,
        friendly_name,
        xp,
        whatsapp_group_member
    INTO 
        v_selected_player,
        v_selected_name,
        v_selected_xp,
        v_selected_whatsapp
    FROM eligible_players
    ORDER BY 
        CASE WHEN whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
        xp DESC,
        current_streak DESC,
        caps DESC,
        created_at ASC
    LIMIT 1;

    -- Log the selection process
    IF v_selected_player IS NOT NULL THEN
        INSERT INTO debug_logs (event_type, message, details)
        VALUES (
            'player_selection',
            'Selected next player based on WhatsApp status and XP',
            jsonb_build_object(
                'game_id', p_game_id,
                'selected_player', v_selected_player,
                'player_name', v_selected_name,
                'xp', v_selected_xp,
                'whatsapp_status', v_selected_whatsapp,
                'selection_criteria', 'WhatsApp members first, then by XP'
            )
        );
    ELSE
        INSERT INTO debug_logs (event_type, message, details)
        VALUES (
            'player_selection',
            'No eligible players found',
            jsonb_build_object(
                'game_id', p_game_id
            )
        );
    END IF;

    -- Return the selected player
    RETURN QUERY
    SELECT v_selected_player AS player_id
    WHERE v_selected_player IS NOT NULL;
END;
$function$;

-- Create function to calculate slot offer times with WhatsApp priority
CREATE OR REPLACE FUNCTION public.calculate_slot_offer_times(p_game_id uuid, p_num_players bigint)
RETURNS TABLE (
    player_rank bigint,
    available_time timestamp with time zone,
    next_player_access_time timestamp with time zone,
    debug_info jsonb
) 
LANGUAGE plpgsql
AS $function$
DECLARE
    v_game record;
    v_total_time interval;
    v_time_interval interval;
    v_game_date timestamp with time zone;
BEGIN
    -- Get game details
    SELECT * INTO v_game FROM games WHERE id = p_game_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game not found';
    END IF;

    -- Calculate time intervals
    v_game_date := date_trunc('day', v_game.date) + interval '1 minute';
    v_total_time := v_game_date - CURRENT_TIMESTAMP;
    
    -- Handle case where there are no players
    IF p_num_players = 0 THEN
        RETURN;
    END IF;
    
    v_time_interval := v_total_time / GREATEST(p_num_players, 1);

    -- Return the results with debug info
    RETURN QUERY
    WITH RankedPlayers AS (
        SELECT 
            p.id,
            p.friendly_name,
            p.whatsapp_group_member,
            ps.xp,
            p.current_streak,
            p.caps,
            gr.created_at as registration_time,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN p.whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
                    ps.xp DESC,
                    p.current_streak DESC,
                    p.caps DESC,
                    gr.created_at ASC
            ) as rank
        FROM game_registrations gr
        JOIN players p ON p.id = gr.player_id
        JOIN player_stats ps ON ps.id = p.id
        WHERE gr.game_id = p_game_id
        AND gr.status = 'reserve'
    )
    SELECT 
        rank as player_rank,
        CURRENT_TIMESTAMP + ((rank - 1) * v_time_interval) as available_time,
        CURRENT_TIMESTAMP + (rank * v_time_interval) as next_player_access_time,
        jsonb_build_object(
            'player_name', friendly_name,
            'whatsapp_status', whatsapp_group_member,
            'xp', xp,
            'streak', current_streak,
            'caps', caps,
            'registration_time', registration_time,
            'rank', rank,
            'whatsapp_priority', CASE WHEN whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END
        ) as debug_info
    FROM RankedPlayers
    ORDER BY rank;

    -- Log debug info
    RAISE NOTICE 'Game ID: %, Total Players: %, Time Interval: %', p_game_id, p_num_players, v_time_interval;
END;
$function$;

-- Function to create slot offers when a player drops out
CREATE OR REPLACE FUNCTION public.create_slot_offers_for_game(
    p_game_id uuid,
    p_admin_id uuid DEFAULT NULL,
    p_dropped_out_player_id uuid DEFAULT NULL
)
RETURNS TABLE (
    slot_offer_id uuid,
    debug_info jsonb
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_game record;
    v_highest_priority_player record;
    v_time_slot record;
    v_reserve_count bigint;
    v_slot_offer_id uuid;
    v_debug_info jsonb;
BEGIN
    -- Get game details
    SELECT * INTO v_game FROM games WHERE id = p_game_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game not found';
    END IF;

    -- Get the count of reserve players
    SELECT COUNT(*) INTO v_reserve_count 
    FROM game_registrations 
    WHERE game_id = p_game_id 
    AND status = 'reserve';

    -- Get the highest priority reserve player
    WITH RankedPlayers AS (
        SELECT 
            gr.player_id,
            p.friendly_name,
            p.whatsapp_group_member,
            ps.xp,
            p.current_streak,
            p.caps,
            gr.created_at as registration_time,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN p.whatsapp_group_member IN ('Yes', 'Proxy') THEN 0 ELSE 1 END ASC,
                    ps.xp DESC,
                    p.current_streak DESC,
                    p.caps DESC,
                    gr.created_at ASC
            ) as rank
        FROM game_registrations gr
        JOIN players p ON p.id = gr.player_id
        JOIN player_stats ps ON ps.id = p.id
        WHERE gr.game_id = p_game_id
        AND gr.status = 'reserve'
        AND NOT EXISTS (
            -- Exclude players who already have any slot offer (pending or declined) for this game
            SELECT 1 FROM slot_offers so
            WHERE so.player_id = gr.player_id
            AND so.game_id = p_game_id
            AND (so.status = 'pending' OR so.status = 'declined')
        )
    )
    SELECT * INTO v_highest_priority_player
    FROM RankedPlayers
    WHERE rank = 1;

    -- If no eligible player found, return null
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Get the time slot for the highest priority player with debug info
    SELECT * INTO v_time_slot
    FROM public.calculate_slot_offer_times(p_game_id, v_reserve_count)
    WHERE player_rank = 1;

    -- Store debug info
    v_debug_info := jsonb_build_object(
        'highest_priority_player', jsonb_build_object(
            'name', v_highest_priority_player.friendly_name,
            'whatsapp_status', v_highest_priority_player.whatsapp_group_member,
            'xp', v_highest_priority_player.xp,
            'rank', v_highest_priority_player.rank
        ),
        'time_slot', jsonb_build_object(
            'available_at', v_time_slot.available_time,
            'expires_at', v_time_slot.next_player_access_time
        ),
        'reserve_count', v_reserve_count,
        'calculated_times_debug', v_time_slot.debug_info
    );

    -- Create slot offer
    INSERT INTO slot_offers (
        game_id,
        player_id,
        status,
        available_at,
        expires_at,
        admin_id,
        dropped_out_player_id,
        priority
    ) VALUES (
        p_game_id,
        v_highest_priority_player.player_id,
        'pending',
        v_time_slot.available_time,
        v_time_slot.next_player_access_time,
        p_admin_id,
        p_dropped_out_player_id,
        1
    ) RETURNING id INTO v_slot_offer_id;

    -- Create notification for the eligible player
    INSERT INTO notifications (
        player_id,
        type,
        message,
        metadata,
        title,
        priority
    ) VALUES (
        v_highest_priority_player.player_id,
        'slot_offer',
        format('A spot has opened up in a game on %s. You have exclusive access until %s!',
               to_char(v_game.date, 'DD/MM/YYYY'),
               to_char(v_time_slot.next_player_access_time, 'HH24:MI')),
        jsonb_build_object(
            'game_id', p_game_id,
            'slot_offer_id', v_slot_offer_id,
            'exclusive_until', v_time_slot.next_player_access_time,
            'debug_info', v_debug_info
        ),
        'Exclusive Game Slot Available!',
        2
    );

    -- Return both the slot offer ID and debug info
    RETURN QUERY
    SELECT v_slot_offer_id, v_debug_info;
END;
$function$;
