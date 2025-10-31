-- Fix bench_warmer_streak calculation
-- Date: 2025-10-31
-- Issue: calculate_bench_warmer_streak function only returned 1 or 0 instead of counting consecutive reserve appearances
-- Impact: Players with multiple consecutive reserve games showed streak of 1, causing incorrect selection odds

-- Root Cause:
-- The function checked if player was reserve in the most recent game and returned 1 (yes) or 0 (no).
-- It did NOT count how many consecutive games they were reserve.
-- Example: Jimmy was reserve in games #70 (Oct 29) and #69 (Oct 22), but function returned 1 instead of 2.

-- Drop and recreate calculate_bench_warmer_streak with correct logic
CREATE OR REPLACE FUNCTION calculate_bench_warmer_streak(player_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        WITH completed_games AS (
            -- Get all completed games
            SELECT id, sequence_number
            FROM games
            WHERE completed = true
        ),
        player_reserve_games AS (
            -- Get all games where this player was reserve
            SELECT g.sequence_number
            FROM game_registrations gr
            JOIN completed_games g ON gr.game_id = g.id
            WHERE gr.player_id = player_uuid
            AND gr.status = 'reserve'
        ),
        consecutive_reserve_streak AS (
            -- Count consecutive reserve games from most recent backward
            -- Only count games where there's NO LATER completed game where they were NOT reserve
            SELECT COUNT(*) as streak
            FROM player_reserve_games prg
            WHERE NOT EXISTS (
                -- Check if there's a later completed game where they were NOT reserve
                SELECT 1
                FROM completed_games cg
                LEFT JOIN game_registrations gr ON gr.game_id = cg.id AND gr.player_id = player_uuid
                WHERE cg.sequence_number > prg.sequence_number
                AND (gr.id IS NULL OR gr.status != 'reserve')
            )
        )
        SELECT COALESCE(streak, 0)
        FROM consecutive_reserve_streak
    );
END;
$$;

-- Add comment documenting the fix
COMMENT ON FUNCTION calculate_bench_warmer_streak(UUID) IS
'Fixed 2025-10-31: Now correctly counts consecutive reserve appearances instead of returning 1/0.
Previously returned 1 if player was reserve in most recent game, 0 otherwise.
Now returns actual count of consecutive reserve games from most recent backward.';

-- Recalculate bench_warmer_streak for all players using the corrected function
UPDATE players
SET bench_warmer_streak = calculate_bench_warmer_streak(id)
WHERE id IS NOT NULL;

-- Log the recalculation
DO $$
DECLARE
    players_updated INTEGER;
    players_with_streaks INTEGER;
BEGIN
    SELECT COUNT(*) INTO players_updated FROM players;
    SELECT COUNT(*) INTO players_with_streaks FROM players WHERE bench_warmer_streak > 0;

    RAISE NOTICE 'Recalculated bench_warmer_streak for % players', players_updated;
    RAISE NOTICE '% players now have active bench warmer streaks', players_with_streaks;
END $$;
