-- Drop and recreate the create_slot_offers_for_game function with better admin notifications
CREATE OR REPLACE FUNCTION create_slot_offers_for_game(
    p_game_id UUID,
    p_expiration_hours INTEGER DEFAULT 24,
    p_admin_id UUID DEFAULT NULL -- Add admin ID parameter
) RETURNS void AS $$
DECLARE
    v_slots_available INTEGER;
    v_reserve_player RECORD;
    v_offers_created INTEGER := 0;
    v_game_date DATE;
    v_game_number INTEGER;
BEGIN
    -- Get game details
    SELECT 
        g.date::DATE,
        COUNT(g2.*) + 1 INTO v_game_date, v_game_number
    FROM games g
    LEFT JOIN games g2 ON g2.date < g.date OR (g2.date = g.date AND g2.id < g.id)
    WHERE g.id = p_game_id
    GROUP BY g.date;

    -- Get number of available slots
    SELECT 
        g.max_players - COUNT(gr.player_id)::integer INTO v_slots_available
    FROM games g
    LEFT JOIN game_registrations gr ON g.id = gr.game_id AND gr.status = 'selected'
    WHERE g.id = p_game_id
    GROUP BY g.max_players;

    RAISE NOTICE 'Found % available slots', v_slots_available;

    -- If there are slots available
    IF v_slots_available > 0 THEN
        -- Get reserve players who don't have pending offers
        FOR v_reserve_player IN (
            SELECT gr.player_id
            FROM game_registrations gr
            LEFT JOIN slot_offers so ON 
                so.game_id = gr.game_id 
                AND so.player_id = gr.player_id 
                AND so.status = 'pending'
            WHERE gr.game_id = p_game_id
            AND gr.status = 'reserve'
            AND so.id IS NULL
            ORDER BY gr.created_at ASC
            LIMIT v_slots_available
        )
        LOOP
            RAISE NOTICE 'Creating offer for player %', v_reserve_player.player_id;
            
            -- Create slot offer
            INSERT INTO slot_offers (
                game_id,
                player_id,
                expires_at
            ) VALUES (
                p_game_id,
                v_reserve_player.player_id,
                NOW() + (p_expiration_hours || ' hours')::interval
            );

            -- Create notification for the player
            INSERT INTO notifications (
                player_id,
                type,
                message,
                metadata
            ) VALUES (
                v_reserve_player.player_id,
                'slot_offer',
                'A spot has opened up in WNF #' || v_game_number || ' on ' || 
                TO_CHAR(v_game_date, 'DD/MM/YYYY') || '. Would you like to join?',
                jsonb_build_object(
                    'game_id', p_game_id,
                    'action', 'slot_offer'
                )
            );

            v_offers_created := v_offers_created + 1;
        END LOOP;

        -- Send notification to the admin who initiated the dropout
        IF p_admin_id IS NOT NULL THEN
            INSERT INTO notifications (
                player_id,
                type,
                message,
                metadata
            ) VALUES (
                p_admin_id,
                'system_message',
                'Created ' || v_offers_created || ' slot offers for WNF #' || v_game_number || ' on ' || 
                TO_CHAR(v_game_date, 'DD/MM/YYYY'),
                jsonb_build_object(
                    'game_id', p_game_id,
                    'action', 'slot_offers_created',
                    'offers_created', v_offers_created,
                    'game_number', v_game_number,
                    'game_date', v_game_date
                )
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
