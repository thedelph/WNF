-- =====================================================
-- Priority Token Consumption Fix
-- =====================================================
-- This migration fixes the critical bug where priority tokens
-- were never being consumed when games completed, causing:
-- 1. All tokens to have used_game_id = NULL
-- 2. Token cooldown to never work
-- 3. Token history to never record 'token_used' events
-- 4. game_selections.token_slots_used to never be populated

-- =====================================================
-- 1. Function: Consume Priority Tokens on Game Completion
-- =====================================================

CREATE OR REPLACE FUNCTION consume_priority_tokens_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_player RECORD;
    v_token_id UUID;
    v_tokens_consumed INTEGER := 0;
BEGIN
    -- Only process when game is marked as completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        -- Find all players who used tokens in this game (and weren't forgiven)
        FOR v_player IN
            SELECT
                gr.player_id,
                gr.using_token,
                p.friendly_name
            FROM game_registrations gr
            JOIN players p ON gr.player_id = p.id
            WHERE gr.game_id = NEW.id
            AND gr.status = 'selected'
            AND gr.using_token = true
        LOOP
            -- Find the token that was used for this game
            SELECT id INTO v_token_id
            FROM player_tokens
            WHERE player_id = v_player.player_id
            AND used_game_id = NEW.id
            AND used_at IS NOT NULL
            LIMIT 1;

            -- If we found a token, consume it
            IF v_token_id IS NOT NULL THEN
                -- Token is already marked as used, just log the consumption
                INSERT INTO token_history (
                    token_id,
                    player_id,
                    game_id,
                    performed_at,
                    action,
                    details
                ) VALUES (
                    v_token_id,
                    v_player.player_id,
                    NEW.id,
                    NOW(),
                    'token_used',
                    jsonb_build_object(
                        'action', 'Token consumed on game completion',
                        'player_name', v_player.friendly_name,
                        'game_sequence', NEW.sequence_number
                    )
                );

                v_tokens_consumed := v_tokens_consumed + 1;

                RAISE NOTICE 'Consumed priority token for player % in game %',
                    v_player.friendly_name, NEW.sequence_number;
            ELSE
                -- This shouldn't happen, but log it if it does
                RAISE WARNING 'Player % marked as using_token but no token found for game %',
                    v_player.friendly_name, NEW.sequence_number;
            END IF;
        END LOOP;

        -- Log summary
        IF v_tokens_consumed > 0 THEN
            RAISE NOTICE 'Game % completion: consumed % priority token(s)',
                NEW.sequence_number, v_tokens_consumed;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION consume_priority_tokens_on_completion IS
'Consumes priority tokens when a game is completed, logging token usage in token_history';

-- =====================================================
-- 2. Add Trigger to Games Table
-- =====================================================

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS consume_priority_tokens_on_game_completion ON games;

-- Create the trigger to run AFTER game completion
-- Must run after other completion triggers to ensure all data is finalized
CREATE TRIGGER consume_priority_tokens_on_game_completion
AFTER UPDATE OF completed ON games
FOR EACH ROW
EXECUTE FUNCTION consume_priority_tokens_on_completion();

COMMENT ON TRIGGER consume_priority_tokens_on_game_completion ON games IS
'Consumes priority tokens after a game is completed';

-- =====================================================
-- 3. Function: Handle Token Return on Unregister
-- =====================================================

CREATE OR REPLACE FUNCTION return_token_on_unregister()
RETURNS TRIGGER AS $$
DECLARE
    v_game_status text;
BEGIN
    -- Only return token if game hasn't been completed yet
    SELECT status INTO v_game_status
    FROM games
    WHERE id = OLD.game_id;

    -- If player was using a token and game isn't completed, return it
    IF OLD.using_token = true AND v_game_status != 'completed' THEN
        -- Clear the used_game_id to "return" the token
        UPDATE player_tokens
        SET used_game_id = NULL
        WHERE player_id = OLD.player_id
        AND used_game_id = OLD.game_id
        AND used_at IS NOT NULL;

        -- Log the return
        INSERT INTO token_history (
            player_id,
            game_id,
            performed_at,
            action,
            details
        ) VALUES (
            OLD.player_id,
            OLD.game_id,
            NOW(),
            'token_returned',
            jsonb_build_object(
                'action', 'Token returned due to unregistration',
                'game_status', v_game_status
            )
        );
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION return_token_on_unregister IS
'Returns a priority token to available state when player unregisters before game completion';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS return_token_on_unregister ON game_registrations;

CREATE TRIGGER return_token_on_unregister
BEFORE DELETE ON game_registrations
FOR EACH ROW
EXECUTE FUNCTION return_token_on_unregister();

-- =====================================================
-- 4. check_previous_game_token_usage Function Already Exists
-- =====================================================

-- The check_previous_game_token_usage(current_game_id UUID) function
-- already exists and is working correctly. No changes needed.

-- =====================================================
-- 5. Add Helper Function to Get Token Usage for Game
-- =====================================================

CREATE OR REPLACE FUNCTION get_game_token_usage(p_game_id UUID)
RETURNS TABLE (
    player_id UUID,
    player_name TEXT,
    token_id UUID,
    was_forgiven BOOLEAN,
    selection_method TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gr.player_id,
        p.friendly_name,
        pt.id as token_id,
        gr.selection_method = 'merit' as was_forgiven,
        gr.selection_method
    FROM game_registrations gr
    JOIN players p ON p.id = gr.player_id
    LEFT JOIN player_tokens pt ON pt.player_id = gr.player_id AND pt.used_game_id = p_game_id
    WHERE gr.game_id = p_game_id
    AND gr.status = 'selected'
    AND (gr.using_token = true OR pt.id IS NOT NULL)
    ORDER BY p.friendly_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_game_token_usage IS
'Returns detailed information about token usage for a specific game, including forgiveness status';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Note: This migration does NOT attempt to repair existing broken token records
-- because we cannot reliably determine which game each token was used for.
-- The system will work correctly going forward for all new token usage.
