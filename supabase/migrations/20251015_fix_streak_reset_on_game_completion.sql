-- Fix streak reset on game completion
-- Issue: Streaks were not being reset to 0 for players who missed the most recent game
-- Root cause: Triggers only updated players with active streaks, not players whose streaks should be reset

-- Drop and recreate the update_streaks_on_game_change function with fix
CREATE OR REPLACE FUNCTION public.update_streaks_on_game_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update attendance streaks
    -- Key fix: Update ALL players, including those whose streaks should be reset to 0
    WITH player_streaks AS (
        SELECT
            p.id as player_id,
            COUNT(*) as streak
        FROM players p
        JOIN game_registrations gr ON gr.player_id = p.id
        JOIN games g ON g.id = gr.game_id
        WHERE gr.status = 'selected'
        AND g.completed = true
        AND NOT EXISTS (
            SELECT 1
            FROM games g2
            LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p.id
            WHERE g2.sequence_number > g.sequence_number
            AND g2.completed = true
            AND (gr2.id IS NULL OR gr2.status != 'selected')
        )
        GROUP BY p.id
    )
    UPDATE players p
    SET current_streak = COALESCE(ps.streak, 0)
    FROM player_streaks ps
    WHERE p.id = ps.player_id;

    -- NEW: Reset streaks to 0 for players who previously had streaks but no longer qualify
    -- This is the critical fix that was missing
    UPDATE players p
    SET current_streak = 0
    WHERE p.current_streak > 0
    AND p.id NOT IN (
        SELECT player_id FROM (
            SELECT
                p2.id as player_id
            FROM players p2
            JOIN game_registrations gr ON gr.player_id = p2.id
            JOIN games g ON g.id = gr.game_id
            WHERE gr.status = 'selected'
            AND g.completed = true
            AND NOT EXISTS (
                SELECT 1
                FROM games g2
                LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p2.id
                WHERE g2.sequence_number > g.sequence_number
                AND g2.completed = true
                AND (gr2.id IS NULL OR gr2.status != 'selected')
            )
        ) active_streak_players
    );

    -- Update bench warmer streaks
    WITH bench_streaks AS (
        SELECT
            p.id as player_id,
            COUNT(*) as streak
        FROM players p
        JOIN game_registrations gr ON gr.player_id = p.id
        JOIN games g ON g.id = gr.game_id
        WHERE gr.status = 'reserve'
        AND g.completed = true
        AND NOT EXISTS (
            SELECT 1
            FROM games g2
            LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p.id
            WHERE g2.sequence_number > g.sequence_number
            AND g2.completed = true
            AND (gr2.id IS NULL OR gr2.status != 'reserve')
        )
        GROUP BY p.id
    )
    UPDATE players p
    SET bench_warmer_streak = COALESCE(bs.streak, 0)
    FROM bench_streaks bs
    WHERE p.id = bs.player_id;

    -- NEW: Reset bench warmer streaks to 0 for players who previously had them but no longer qualify
    UPDATE players p
    SET bench_warmer_streak = 0
    WHERE p.bench_warmer_streak > 0
    AND p.id NOT IN (
        SELECT player_id FROM (
            SELECT
                p2.id as player_id
            FROM players p2
            JOIN game_registrations gr ON gr.player_id = p2.id
            JOIN games g ON g.id = gr.game_id
            WHERE gr.status = 'reserve'
            AND g.completed = true
            AND NOT EXISTS (
                SELECT 1
                FROM games g2
                LEFT JOIN game_registrations gr2 ON gr2.game_id = g2.id AND gr2.player_id = p2.id
                WHERE g2.sequence_number > g.sequence_number
                AND g2.completed = true
                AND (gr2.id IS NULL OR gr2.status != 'reserve')
            )
        ) active_bench_streak_players
    );

    -- The XP will be automatically recalculated by our existing XP trigger
    RETURN NULL;
END;
$function$;

-- Recalculate all player streaks immediately using the accurate calculate_player_streak function
-- This will fix any existing discrepancies
UPDATE players
SET
    current_streak = calculate_player_streak(id),
    bench_warmer_streak = calculate_bench_warmer_streak(id)
WHERE id IS NOT NULL;

-- Add a comment to document the fix
COMMENT ON FUNCTION public.update_streaks_on_game_change() IS
'Fixed 2025-10-15: Now properly resets streaks to 0 for players who miss games. Previously only updated players with active streaks.';
