-- Migration: Add Batch Player Chemistry for Team Balancing
-- Description: Creates RPC function to efficiently fetch chemistry data for a list
-- of players (used by team balancing algorithm).
--
-- This is optimized for team balancing: fetches all pairwise chemistry in a single
-- query instead of N*(N-1)/2 individual calls.

-- ============================================================================
-- Function: get_batch_player_chemistry
-- Returns chemistry stats for all pairs within a given player list
-- Designed for team balancing: fetch once, cache during optimization
-- ============================================================================
CREATE OR REPLACE FUNCTION get_batch_player_chemistry(
    player_ids UUID[]
)
RETURNS TABLE(
    player1_id UUID,
    player2_id UUID,
    games_together BIGINT,
    wins_together BIGINT,
    draws_together BIGINT,
    losses_together BIGINT,
    performance_rate NUMERIC,
    chemistry_score NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    K_VALUE CONSTANT NUMERIC := 10; -- Confidence factor constant (same as main chemistry function)
    MIN_GAMES CONSTANT INTEGER := 10; -- Minimum games threshold
BEGIN
    -- Return empty if less than 2 players (no pairs possible)
    IF array_length(player_ids, 1) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH player_pair_games AS (
        -- Get all games where two players from our list were on the same team
        SELECT
            LEAST(gr1.player_id, gr2.player_id) as p1_id,
            GREATEST(gr1.player_id, gr2.player_id) as p2_id,
            gr1.game_id,
            gr1.team,
            g.outcome,
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (gr1.team = 'blue' AND g.outcome = 'blue_win')
                  OR (gr1.team = 'orange' AND g.outcome = 'orange_win')
                THEN 'win'
                ELSE 'loss'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team = gr2.team
            AND gr1.player_id < gr2.player_id
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND g.outcome IS NOT NULL
        -- Both players must be in our input list
        AND gr1.player_id = ANY(player_ids)
        AND gr2.player_id = ANY(player_ids)
    ),
    pair_stats AS (
        -- Aggregate wins/draws/losses for each pair
        SELECT
            ppg.p1_id,
            ppg.p2_id,
            COUNT(DISTINCT ppg.game_id) as total_games,
            COUNT(DISTINCT ppg.game_id) FILTER (WHERE ppg.result = 'win') as total_wins,
            COUNT(DISTINCT ppg.game_id) FILTER (WHERE ppg.result = 'draw') as total_draws,
            COUNT(DISTINCT ppg.game_id) FILTER (WHERE ppg.result = 'loss') as total_losses
        FROM player_pair_games ppg
        GROUP BY ppg.p1_id, ppg.p2_id
        -- Only return pairs with minimum games threshold
        HAVING COUNT(DISTINCT ppg.game_id) >= MIN_GAMES
    )
    SELECT
        ps.p1_id as player1_id,
        ps.p2_id as player2_id,
        ps.total_games as games_together,
        ps.total_wins as wins_together,
        ps.total_draws as draws_together,
        ps.total_losses as losses_together,
        -- Performance rate: (W*3 + D*1) / (G*3) * 100
        ROUND(
            (ps.total_wins * 3 + ps.total_draws * 1)::NUMERIC
            / (ps.total_games * 3)::NUMERIC * 100,
            1
        ) as performance_rate,
        -- Chemistry score: perf_rate * confidence_factor
        -- confidence_factor = games / (games + K)
        ROUND(
            ((ps.total_wins * 3 + ps.total_draws * 1)::NUMERIC
             / (ps.total_games * 3)::NUMERIC * 100)
            * (ps.total_games::NUMERIC / (ps.total_games + K_VALUE)),
            1
        ) as chemistry_score
    FROM pair_stats ps
    ORDER BY ps.p1_id, ps.p2_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_batch_player_chemistry(UUID[]) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_batch_player_chemistry IS 'Returns chemistry stats for all player pairs within a given list (10+ games). Optimized for team balancing algorithm batch queries.';
