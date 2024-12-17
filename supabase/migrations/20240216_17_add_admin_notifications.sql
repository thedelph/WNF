-- Drop the existing type check constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new type check constraint with system_message
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('GAME_SPOT_AVAILABLE', 'slot_offer', 'system_message'));

-- Create a function to send admin notifications
CREATE OR REPLACE FUNCTION send_admin_notification(
    p_admin_id UUID,
    p_message TEXT,
    p_metadata JSONB
) RETURNS void AS $$
BEGIN
    INSERT INTO notifications (
        player_id,
        type,
        message,
        metadata
    ) VALUES (
        p_admin_id,
        'system_message',
        p_message,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_slot_offers_for_game function to include admin notifications
CREATE OR REPLACE FUNCTION create_slot_offers_for_game(
    p_game_id UUID,
    p_expiration_hours INTEGER DEFAULT 24
) RETURNS void AS $$
DECLARE
    v_slots_available INTEGER;
    v_reserve_player RECORD;
    v_offers_created INTEGER := 0;
BEGIN
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
                'A spot has opened up in a game you registered for. Check your slot offers!',
                jsonb_build_object(
                    'game_id', p_game_id,
                    'action', 'slot_offer'
                )
            );

            v_offers_created := v_offers_created + 1;
        END LOOP;

        -- Send notification to admins
        INSERT INTO notifications (
            player_id,
            type,
            message,
            metadata
        )
        SELECT 
            ap.player_id,
            'system_message',
            format('A slot offer was created for %s reserve players', v_offers_created),
            jsonb_build_object(
                'game_id', p_game_id,
                'action', 'slot_offers_created',
                'offers_created', v_offers_created
            )
        FROM admin_permissions ap
        INNER JOIN admin_roles ar ON ar.id = ap.admin_role_id
        WHERE ap.permission = 'manage_games';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
