-- Migration: Add Rivalry and Trio Chemistry for Team Balancing
-- Description: Creates RPC functions to fetch:
--   1. Rivalry data - how players perform AGAINST each other (opposite teams)
--   2. Trio chemistry - how groups of 3 players perform together
--
-- Used by the brute force team balancing algorithm to create more balanced teams.

-- ============================================================================
-- Function: get_batch_player_rivalry
-- Returns rivalry stats for all pairs within a given player list
-- Rivalry = how players perform when on OPPOSITE teams
-- ============================================================================
CREATE OR REPLACE FUNCTION get_batch_player_rivalry(
    player_ids UUID[]
)
RETURNS TABLE(
    player1_id UUID,
    player2_id UUID,
    games_against BIGINT,
    player1_wins BIGINT,
    player2_wins BIGINT,
    draws BIGINT,
    player1_win_rate NUMERIC,
    rivalry_score NUMERIC  -- 0-100: 50 = neutral, >50 = player1 dominates, <50 = player2 dominates
)
LANGUAGE plpgsql
AS $$
DECLARE
    MIN_GAMES CONSTANT INTEGER := 5; -- Minimum games threshold for rivalry
BEGIN
    -- Return empty if less than 2 players (no pairs possible)
    IF array_length(player_ids, 1) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH opposite_team_games AS (
        -- Get all games where two players from our list were on OPPOSITE teams
        SELECT
            LEAST(gr1.player_id, gr2.player_id) as p1_id,
            GREATEST(gr1.player_id, gr2.player_id) as p2_id,
            gr1.game_id,
            g.outcome,
            -- Determine who won from the perspective of the "lesser" player ID
            CASE
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (
                    (gr1.player_id < gr2.player_id AND gr1.team = 'blue' AND g.outcome = 'blue_win')
                    OR (gr1.player_id < gr2.player_id AND gr1.team = 'orange' AND g.outcome = 'orange_win')
                    OR (gr1.player_id > gr2.player_id AND gr2.team = 'blue' AND g.outcome = 'blue_win')
                    OR (gr1.player_id > gr2.player_id AND gr2.team = 'orange' AND g.outcome = 'orange_win')
                ) THEN 'player1_win'
                ELSE 'player2_win'
            END as result
        FROM game_registrations gr1
        JOIN game_registrations gr2
            ON gr1.game_id = gr2.game_id
            AND gr1.team != gr2.team  -- OPPOSITE teams
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
        -- Aggregate wins/draws for each pair
        SELECT
            otg.p1_id,
            otg.p2_id,
            COUNT(DISTINCT otg.game_id) as total_games,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player1_win') as p1_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'player2_win') as p2_wins,
            COUNT(DISTINCT otg.game_id) FILTER (WHERE otg.result = 'draw') as total_draws
        FROM opposite_team_games otg
        GROUP BY otg.p1_id, otg.p2_id
        -- Only return pairs with minimum games threshold
        HAVING COUNT(DISTINCT otg.game_id) >= MIN_GAMES
    )
    SELECT
        ps.p1_id as player1_id,
        ps.p2_id as player2_id,
        ps.total_games as games_against,
        ps.p1_wins as player1_wins,
        ps.p2_wins as player2_wins,
        ps.total_draws as draws,
        -- Player 1 win rate (excluding draws)
        CASE
            WHEN (ps.p1_wins + ps.p2_wins) > 0 THEN
                ROUND(ps.p1_wins::NUMERIC / (ps.p1_wins + ps.p2_wins)::NUMERIC * 100, 1)
            ELSE 50.0  -- If all draws, neutral
        END as player1_win_rate,
        -- Rivalry score: 50 = neutral, >50 = player1 dominates, <50 = player2 dominates
        -- Based on win rate when facing each other (draws are excluded)
        CASE
            WHEN (ps.p1_wins + ps.p2_wins) > 0 THEN
                ROUND(ps.p1_wins::NUMERIC / (ps.p1_wins + ps.p2_wins)::NUMERIC * 100, 1)
            ELSE 50.0
        END as rivalry_score
    FROM pair_stats ps
    ORDER BY ps.p1_id, ps.p2_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_batch_player_rivalry(UUID[]) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_batch_player_rivalry IS 'Returns rivalry stats for player pairs when on opposite teams (5+ games). Used by team balancing to balance cross-team matchups.';


-- ============================================================================
-- Function: get_batch_trio_chemistry
-- Returns chemistry stats for all trios within a given player list
-- Trio = how 3 players perform when all on the SAME team
-- ============================================================================
CREATE OR REPLACE FUNCTION get_batch_trio_chemistry(
    player_ids UUID[]
)
RETURNS TABLE(
    player1_id UUID,
    player2_id UUID,
    player3_id UUID,
    games_together BIGINT,
    wins BIGINT,
    losses BIGINT,
    draws BIGINT,
    win_rate NUMERIC,
    trio_score NUMERIC  -- 0-100, confidence-weighted like pairwise chemistry
)
LANGUAGE plpgsql
AS $$
DECLARE
    K_VALUE CONSTANT NUMERIC := 10; -- Confidence factor constant (same as pairwise chemistry)
    MIN_GAMES CONSTANT INTEGER := 3; -- Minimum games threshold for trios
BEGIN
    -- Return empty if less than 3 players (no trios possible)
    IF array_length(player_ids, 1) < 3 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH trio_games AS (
        -- Get all games where three players from our list were on the same team
        SELECT
            -- Sort player IDs to ensure consistent ordering
            LEAST(gr1.player_id, gr2.player_id, gr3.player_id) as p1_id,
            -- Middle player ID
            CASE
                WHEN gr1.player_id != LEAST(gr1.player_id, gr2.player_id, gr3.player_id)
                     AND gr1.player_id != GREATEST(gr1.player_id, gr2.player_id, gr3.player_id)
                THEN gr1.player_id
                WHEN gr2.player_id != LEAST(gr1.player_id, gr2.player_id, gr3.player_id)
                     AND gr2.player_id != GREATEST(gr1.player_id, gr2.player_id, gr3.player_id)
                THEN gr2.player_id
                ELSE gr3.player_id
            END as p2_id,
            GREATEST(gr1.player_id, gr2.player_id, gr3.player_id) as p3_id,
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
        JOIN game_registrations gr3
            ON gr1.game_id = gr3.game_id
            AND gr1.team = gr3.team
            AND gr2.player_id < gr3.player_id
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND gr3.status = 'selected'
        AND g.outcome IS NOT NULL
        -- All three players must be in our input list
        AND gr1.player_id = ANY(player_ids)
        AND gr2.player_id = ANY(player_ids)
        AND gr3.player_id = ANY(player_ids)
    ),
    trio_stats AS (
        -- Aggregate wins/draws/losses for each trio
        SELECT
            tg.p1_id,
            tg.p2_id,
            tg.p3_id,
            COUNT(DISTINCT tg.game_id) as total_games,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'win') as total_wins,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'draw') as total_draws,
            COUNT(DISTINCT tg.game_id) FILTER (WHERE tg.result = 'loss') as total_losses
        FROM trio_games tg
        GROUP BY tg.p1_id, tg.p2_id, tg.p3_id
        -- Only return trios with minimum games threshold
        HAVING COUNT(DISTINCT tg.game_id) >= MIN_GAMES
    )
    SELECT
        ts.p1_id as player1_id,
        ts.p2_id as player2_id,
        ts.p3_id as player3_id,
        ts.total_games as games_together,
        ts.total_wins as wins,
        ts.total_losses as losses,
        ts.total_draws as draws,
        -- Win rate: (W*3 + D*1) / (G*3) * 100 (same as pairwise)
        ROUND(
            (ts.total_wins * 3 + ts.total_draws * 1)::NUMERIC
            / (ts.total_games * 3)::NUMERIC * 100,
            1
        ) as win_rate,
        -- Trio score: win_rate * confidence_factor
        -- confidence_factor = games / (games + K)
        ROUND(
            ((ts.total_wins * 3 + ts.total_draws * 1)::NUMERIC
             / (ts.total_games * 3)::NUMERIC * 100)
            * (ts.total_games::NUMERIC / (ts.total_games + K_VALUE)),
            1
        ) as trio_score
    FROM trio_stats ts
    ORDER BY ts.p1_id, ts.p2_id, ts.p3_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_batch_trio_chemistry(UUID[]) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_batch_trio_chemistry IS 'Returns chemistry stats for player trios when on same team (3+ games). Used by team balancing to consider emergent trio synergies.';
