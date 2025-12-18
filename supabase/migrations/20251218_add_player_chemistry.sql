-- Migration: Add Player Chemistry System
-- Description: Creates RPC functions to calculate chemistry between players
-- based on their win/draw/loss record when playing on the same team.
--
-- Formula:
--   performance_rate = (wins*3 + draws*1) / (games*3) * 100
--   confidence_factor = games / (games + K) where K=10
--   chemistry_score = performance_rate * confidence_factor
--
-- Minimum threshold: 10 games together

-- ============================================================================
-- Function: get_player_chemistry
-- Returns chemistry stats for all player pairs (or filtered by player/year)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_chemistry(
    target_player_id UUID DEFAULT NULL,
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    player1_id UUID,
    player1_name TEXT,
    player2_id UUID,
    player2_name TEXT,
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
    K_VALUE CONSTANT NUMERIC := 10; -- Confidence factor constant
    MIN_GAMES CONSTANT INTEGER := 10; -- Minimum games threshold
BEGIN
    RETURN QUERY
    WITH player_pair_games AS (
        -- Get all games where two players were on the same team
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
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
        -- Filter by target player if specified
        AND (target_player_id IS NULL
             OR gr1.player_id = target_player_id
             OR gr2.player_id = target_player_id)
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
        HAVING COUNT(DISTINCT ppg.game_id) >= MIN_GAMES
    ),
    scored_pairs AS (
        -- Calculate performance rate and chemistry score
        SELECT
            ps.p1_id,
            ps.p2_id,
            ps.total_games,
            ps.total_wins,
            ps.total_draws,
            ps.total_losses,
            -- Performance rate: (W*3 + D*1) / (G*3) * 100
            ROUND(
                (ps.total_wins * 3 + ps.total_draws * 1)::NUMERIC
                / (ps.total_games * 3)::NUMERIC * 100,
                1
            ) as perf_rate,
            -- Chemistry score: perf_rate * confidence_factor
            -- confidence_factor = games / (games + K)
            ROUND(
                ((ps.total_wins * 3 + ps.total_draws * 1)::NUMERIC
                 / (ps.total_games * 3)::NUMERIC * 100)
                * (ps.total_games::NUMERIC / (ps.total_games + K_VALUE)),
                1
            ) as chem_score
        FROM pair_stats ps
    )
    SELECT
        sp.p1_id as player1_id,
        p1.friendly_name as player1_name,
        sp.p2_id as player2_id,
        p2.friendly_name as player2_name,
        sp.total_games as games_together,
        sp.total_wins as wins_together,
        sp.total_draws as draws_together,
        sp.total_losses as losses_together,
        sp.perf_rate as performance_rate,
        sp.chem_score as chemistry_score
    FROM scored_pairs sp
    JOIN players p1 ON p1.id = sp.p1_id
    JOIN players p2 ON p2.id = sp.p2_id
    ORDER BY sp.chem_score DESC, sp.total_games DESC;
END;
$$;

-- ============================================================================
-- Function: get_player_pair_chemistry
-- Returns chemistry stats between two specific players
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_pair_chemistry(
    player_one_id UUID,
    player_two_id UUID
)
RETURNS TABLE(
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
    K_VALUE CONSTANT NUMERIC := 10; -- Confidence factor constant
BEGIN
    RETURN QUERY
    WITH player_pair_games AS (
        -- Get all games where both players were on the same team
        SELECT
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
        JOIN games g ON gr1.game_id = g.id
        WHERE gr1.status = 'selected'
        AND gr2.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (
            (gr1.player_id = player_one_id AND gr2.player_id = player_two_id)
            OR (gr1.player_id = player_two_id AND gr2.player_id = player_one_id)
        )
    ),
    pair_stats AS (
        SELECT
            COUNT(DISTINCT ppg.game_id) as total_games,
            COUNT(DISTINCT ppg.game_id) FILTER (WHERE ppg.result = 'win') as total_wins,
            COUNT(DISTINCT ppg.game_id) FILTER (WHERE ppg.result = 'draw') as total_draws,
            COUNT(DISTINCT ppg.game_id) FILTER (WHERE ppg.result = 'loss') as total_losses
        FROM player_pair_games ppg
    )
    SELECT
        ps.total_games as games_together,
        ps.total_wins as wins_together,
        ps.total_draws as draws_together,
        ps.total_losses as losses_together,
        -- Performance rate: (W*3 + D*1) / (G*3) * 100
        CASE
            WHEN ps.total_games > 0 THEN
                ROUND(
                    (ps.total_wins * 3 + ps.total_draws * 1)::NUMERIC
                    / (ps.total_games * 3)::NUMERIC * 100,
                    1
                )
            ELSE 0
        END as performance_rate,
        -- Chemistry score: perf_rate * confidence_factor
        CASE
            WHEN ps.total_games > 0 THEN
                ROUND(
                    ((ps.total_wins * 3 + ps.total_draws * 1)::NUMERIC
                     / (ps.total_games * 3)::NUMERIC * 100)
                    * (ps.total_games::NUMERIC / (ps.total_games + K_VALUE)),
                    1
                )
            ELSE 0
        END as chemistry_score
    FROM pair_stats ps;
END;
$$;

-- ============================================================================
-- Function: get_player_top_chemistry_partners
-- Returns top N chemistry partners for a specific player
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_top_chemistry_partners(
    target_player_id UUID,
    limit_count INTEGER DEFAULT 3,
    target_year INTEGER DEFAULT NULL
)
RETURNS TABLE(
    partner_id UUID,
    partner_name TEXT,
    games_together BIGINT,
    wins_together BIGINT,
    draws_together BIGINT,
    losses_together BIGINT,
    performance_rate NUMERIC,
    chemistry_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN c.player1_id = target_player_id THEN c.player2_id
            ELSE c.player1_id
        END as partner_id,
        CASE
            WHEN c.player1_id = target_player_id THEN c.player2_name
            ELSE c.player1_name
        END as partner_name,
        c.games_together,
        c.wins_together,
        c.draws_together,
        c.losses_together,
        c.performance_rate,
        c.chemistry_score
    FROM get_player_chemistry(target_player_id, target_year) c
    ORDER BY c.chemistry_score DESC, c.games_together DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_player_chemistry(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_player_pair_chemistry(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_player_top_chemistry_partners(UUID, INTEGER, INTEGER) TO authenticated, anon;

-- Add comments for documentation
COMMENT ON FUNCTION get_player_chemistry IS 'Returns chemistry stats for player pairs with 10+ games together. Chemistry score factors in both performance (W/D/L) and sample size.';
COMMENT ON FUNCTION get_player_pair_chemistry IS 'Returns chemistry stats between two specific players regardless of minimum games threshold.';
COMMENT ON FUNCTION get_player_top_chemistry_partners IS 'Returns top N chemistry partners for a specific player.';
