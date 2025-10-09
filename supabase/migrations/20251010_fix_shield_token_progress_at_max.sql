-- =====================================================
-- Fix Shield Token Progress When At Max Capacity
-- =====================================================
-- This migration fixes the issue where games_played_since_shield_launch
-- continues to increment even when a player has 4/4 tokens, causing
-- the progress tracker to show "X/10 games" when it should show
-- "Use a token to start earning your next one"
--
-- Solution: Only increment games_played_since_shield_launch when
-- player has fewer than 4 tokens

CREATE OR REPLACE FUNCTION trigger_issue_shield_tokens()
RETURNS TRIGGER AS $$
DECLARE
    v_player RECORD;
    v_games_milestone INTEGER;
BEGIN
    -- Only process when game is marked as completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        -- Find all selected players and check for milestone
        FOR v_player IN
            SELECT
                gr.player_id,
                p.shield_tokens_available,
                p.games_played_since_shield_launch + 1 as new_games_count
            FROM game_registrations gr
            JOIN players p ON gr.player_id = p.id
            WHERE gr.game_id = NEW.id
            AND gr.status = 'selected'
        LOOP
            -- Only increment games counter if player has less than max tokens
            -- This prevents progress from accumulating when at max capacity
            IF v_player.shield_tokens_available < 4 THEN
                -- Increment games played counter
                UPDATE players
                SET games_played_since_shield_launch = games_played_since_shield_launch + 1
                WHERE id = v_player.player_id;

                -- Calculate milestone (every 10 games)
                v_games_milestone := v_player.new_games_count / 10;

                -- If reached milestone, issue a token
                IF v_player.new_games_count % 10 = 0 THEN
                    PERFORM issue_shield_token(
                        v_player.player_id,
                        format('Earned through %s games played', v_player.new_games_count)
                    );
                END IF;
            END IF;
            -- Note: When player has 4 tokens, games_played_since_shield_launch
            -- does not increment, so progress calculation stays frozen
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_issue_shield_tokens IS 'Automatically issues shield tokens when players reach 10-game milestones. Only counts games when player has < 4 tokens.';

-- =====================================================
-- Migration Complete
-- =====================================================
