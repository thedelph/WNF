-- Create slot_offer_status enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE slot_offer_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create slot_offers table if it doesn't exist
CREATE TABLE IF NOT EXISTS slot_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id),
    status slot_offer_status NOT NULL DEFAULT 'pending',
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(game_id, player_id, status)
);

-- Enable RLS
ALTER TABLE slot_offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Players can view their own slot offers" ON slot_offers;
DROP POLICY IF EXISTS "Players can update their own slot offers" ON slot_offers;
DROP POLICY IF EXISTS "Admins can manage slot offers" ON slot_offers;

-- Players can view their own slot offers
CREATE POLICY "Players can view their own slot offers"
ON slot_offers FOR SELECT
TO authenticated
USING (
    player_id IN (
        SELECT id 
        FROM players 
        WHERE user_id = auth.uid()
    )
);

-- Players can update their own slot offers
CREATE POLICY "Players can update their own slot offers"
ON slot_offers FOR UPDATE
TO authenticated
USING (
    player_id IN (
        SELECT id 
        FROM players 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    player_id IN (
        SELECT id 
        FROM players 
        WHERE user_id = auth.uid()
    )
);

-- Admins can view and manage all slot offers
CREATE POLICY "Admins can manage slot offers"
ON slot_offers FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_permissions ap
        JOIN admin_roles ar ON ap.admin_role_id = ar.id
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
        AND ap.permission = 'manage_games'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_permissions ap
        JOIN admin_roles ar ON ap.admin_role_id = ar.id
        JOIN players p ON p.id = ar.player_id
        WHERE p.user_id = auth.uid()
        AND ap.permission = 'manage_games'
    )
);

-- Function to handle slot offer responses
CREATE OR REPLACE FUNCTION handle_slot_offer_response(
    p_offer_id UUID,
    p_status slot_offer_status
) RETURNS void AS $$
DECLARE
    v_game_id UUID;
    v_player_id UUID;
BEGIN
    -- Get the offer details
    SELECT game_id, player_id INTO v_game_id, v_player_id
    FROM slot_offers
    WHERE id = p_offer_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or already processed offer';
    END IF;

    -- Update the offer status
    UPDATE slot_offers
    SET status = p_status,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_offer_id;

    -- If accepted, update game registration
    IF p_status = 'accepted' THEN
        -- Update the player's status to selected
        UPDATE game_registrations
        SET status = 'selected'
        WHERE game_id = v_game_id AND player_id = v_player_id;

        -- Expire any other pending offers for this game
        UPDATE slot_offers
        SET status = 'expired',
            updated_at = NOW()
        WHERE game_id = v_game_id 
        AND status = 'pending'
        AND id != p_offer_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create slot offers for reserve players
CREATE OR REPLACE FUNCTION create_slot_offers_for_game(
    p_game_id UUID,
    p_expiration_hours INTEGER DEFAULT 24
) RETURNS void AS $$
DECLARE
    v_slots_available INTEGER;
    v_reserve_player RECORD;
BEGIN
    -- Get number of available slots
    SELECT 
        g.max_players - COUNT(gr.player_id)::integer INTO v_slots_available
    FROM games g
    LEFT JOIN game_registrations gr ON g.id = gr.game_id
    WHERE g.id = p_game_id
    AND gr.status = 'selected'
    GROUP BY g.max_players;

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
                    'game_id', p_game_id
                )
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
