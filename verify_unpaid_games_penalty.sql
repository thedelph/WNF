-- Update the detailed XP calculation breakdown query
WITH player_data AS (
    SELECT 
        p.id,
        p.friendly_name,
        p.current_streak,
        p.bench_warmer_streak,
        (
            SELECT COALESCE(SUM(xp_amount), 0)
            FROM reserve_xp_transactions
            WHERE player_id = p.id
        ) AS reserve_xp,
        (
            SELECT COUNT(*)
            FROM player_unpaid_games_view
            WHERE player_id = p.id
        ) AS unpaid_games_count
    FROM 
        players p
),
player_games AS (
    SELECT 
        pd.id,
        g.sequence_number,
        (SELECT MAX(sequence_number) FROM games WHERE completed = true AND is_historical = true) - g.sequence_number as games_ago,
        gr.status
    FROM player_data pd
    JOIN game_registrations gr ON gr.player_id = pd.id
    JOIN games g ON g.id = gr.game_id
    WHERE g.completed = true AND g.is_historical = true
    ORDER BY g.sequence_number DESC
),
base_xp_calculation AS (
    SELECT
        id,
        SUM(
            CASE 
                WHEN status = 'selected' THEN
                    CASE
                        WHEN games_ago = 0 THEN 20
                        WHEN games_ago BETWEEN 1 AND 2 THEN 18
                        WHEN games_ago BETWEEN 3 AND 4 THEN 16
                        WHEN games_ago BETWEEN 5 AND 9 THEN 14
                        WHEN games_ago BETWEEN 10 AND 19 THEN 12
                        WHEN games_ago BETWEEN 20 AND 29 THEN 10
                        WHEN games_ago BETWEEN 30 AND 39 THEN 5
                        ELSE 0
                    END
                WHEN status = 'reserve' THEN 5
                ELSE 0
            END
        ) AS base_xp
    FROM player_games
    GROUP BY id
),
xp_calculations AS (
    SELECT 
        pd.friendly_name,
        pd.current_streak,
        pd.bench_warmer_streak,
        pd.reserve_xp,
        pd.unpaid_games_count,
        calculate_player_xp(pd.id) AS calculated_xp,
        bxc.base_xp,
        -- Calculate streak multiplier
        (1 + (pd.current_streak * 0.1)) AS streak_multiplier,
        -- Calculate bench warmer modifier
        (1 + (pd.bench_warmer_streak * 0.05)) AS bench_warmer_modifier,
        -- Calculate unpaid games modifier
        GREATEST(0, (1 - (pd.unpaid_games_count * 0.5))) AS unpaid_games_modifier,
        -- Calculate final XP
        ROUND(
            (bxc.base_xp + pd.reserve_xp) * 
            (1 + (pd.current_streak * 0.1)) * 
            (1 + (pd.bench_warmer_streak * 0.05)) *
            GREATEST(0, (1 - (pd.unpaid_games_count * 0.5)))
        ) AS manual_calculated_xp,
        -- Add debug information
        ROUND((bxc.base_xp + pd.reserve_xp) * (1 + (pd.current_streak * 0.1))) AS xp_after_streak,
        ROUND((bxc.base_xp + pd.reserve_xp) * (1 + (pd.current_streak * 0.1)) * (1 + (pd.bench_warmer_streak * 0.05))) AS xp_after_bench_warmer
    FROM 
        player_data pd
    JOIN
        base_xp_calculation bxc ON pd.id = bxc.id
)
SELECT 
    *,
    CASE 
        WHEN calculated_xp != manual_calculated_xp THEN 'Mismatch'
        ELSE 'Match'
    END AS xp_calculation_status
FROM 
    xp_calculations
ORDER BY 
    friendly_name;
