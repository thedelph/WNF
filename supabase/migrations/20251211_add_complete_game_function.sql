-- Migration: Add complete_game RPC function
-- Purpose: Fix game completion 400 error by using SECURITY DEFINER function
-- Date: 2025-12-11

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS complete_game(UUID, INTEGER, INTEGER, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION complete_game(
    p_game_id UUID,
    p_score_blue INTEGER,
    p_score_orange INTEGER,
    p_outcome TEXT,
    p_payment_link TEXT,
    p_player_updates JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_player RECORD;
    v_updated_count INTEGER := 0;
    v_game_exists BOOLEAN;
BEGIN
    -- Check if game exists
    SELECT EXISTS(SELECT 1 FROM games WHERE id = p_game_id) INTO v_game_exists;

    IF NOT v_game_exists THEN
        RAISE EXCEPTION 'Game not found: %', p_game_id;
    END IF;

    -- Validate outcome
    IF p_outcome NOT IN ('blue_win', 'orange_win', 'draw') THEN
        RAISE EXCEPTION 'Invalid outcome: %. Must be blue_win, orange_win, or draw', p_outcome;
    END IF;

    -- Validate scores are non-negative
    IF p_score_blue < 0 OR p_score_orange < 0 THEN
        RAISE EXCEPTION 'Scores must be non-negative';
    END IF;

    -- Validate outcome matches scores
    IF (p_outcome = 'blue_win' AND p_score_blue <= p_score_orange) OR
       (p_outcome = 'orange_win' AND p_score_orange <= p_score_blue) OR
       (p_outcome = 'draw' AND p_score_blue != p_score_orange) THEN
        RAISE EXCEPTION 'Outcome does not match scores: blue=%, orange=%, outcome=%',
            p_score_blue, p_score_orange, p_outcome;
    END IF;

    -- Update game record
    -- Note: needs_completion is explicitly set to false to satisfy the check constraint
    -- The update_game_needs_completion trigger would also handle this, but we set it explicitly
    -- to ensure the constraint is satisfied before the trigger fires
    UPDATE games
    SET
        score_blue = p_score_blue,
        score_orange = p_score_orange,
        outcome = p_outcome,
        payment_link = p_payment_link,
        status = 'completed',
        completed = true,
        is_historical = true,
        needs_completion = false
    WHERE id = p_game_id;

    -- Update player registrations if provided
    FOR v_player IN SELECT * FROM jsonb_to_recordset(p_player_updates) AS x(
        player_id UUID,
        team TEXT,
        status TEXT,
        payment_status TEXT
    )
    LOOP
        UPDATE game_registrations
        SET
            team = v_player.team,
            status = CASE
                WHEN v_player.status = 'reserve_declined' THEN 'reserve'
                ELSE v_player.status
            END,
            payment_status = v_player.payment_status
        WHERE game_id = p_game_id
        AND player_id = v_player.player_id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'game_id', p_game_id,
        'players_updated', v_updated_count,
        'score_blue', p_score_blue,
        'score_orange', p_score_orange,
        'outcome', p_outcome
    );
END;
$$;

-- Grant execute to authenticated users
-- Admin check should happen in the frontend before calling this function
GRANT EXECUTE ON FUNCTION complete_game TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION complete_game IS 'Completes a game with scores and outcome. Uses SECURITY DEFINER to bypass RLS. Admin authorization should be checked in the application layer before calling.';
