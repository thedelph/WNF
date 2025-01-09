CREATE OR REPLACE FUNCTION public.get_player_win_rates(target_year integer DEFAULT NULL::integer)
RETURNS TABLE(
    id uuid, 
    friendly_name text, 
    total_games integer, 
    wins integer, 
    draws integer, 
    losses integer, 
    win_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH player_games AS (
        SELECT 
            p.id,
            p.friendly_name,
            g.outcome,
            gr.team,
            -- Count players on each team
            (SELECT COUNT(*) FILTER (WHERE team = 'blue' AND status = 'selected') 
             FROM game_registrations gr2 
             WHERE gr2.game_id = g.id) as blue_count,
            (SELECT COUNT(*) FILTER (WHERE team = 'orange' AND status = 'selected') 
             FROM game_registrations gr2 
             WHERE gr2.game_id = g.id) as orange_count,
            -- Determine result for each player
            CASE 
                WHEN g.outcome = 'draw' THEN 'draw'
                WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR 
                     (gr.team = 'orange' AND g.outcome = 'orange_win') THEN 'win'
                WHEN (gr.team = 'blue' AND g.outcome = 'orange_win') OR 
                     (gr.team = 'orange' AND g.outcome = 'blue_win') THEN 'loss'
            END as player_result
        FROM players p
        JOIN game_registrations gr ON gr.player_id = p.id
        JOIN games g ON g.id = gr.game_id
        WHERE gr.status = 'selected'
        AND g.outcome IS NOT NULL
        AND (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
    )
    SELECT 
        p.id,
        p.friendly_name,
        -- Count all games with even teams
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count)::integer as total_games,
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'win')::integer as wins,
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'draw')::integer as draws,
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'loss')::integer as losses,
        -- Calculate win rate percentage only if they have 10+ games
        CASE 
            WHEN COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count) >= 10 THEN
                ROUND(
                    COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'win')::numeric / 
                    NULLIF(COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count), 0) * 100,
                    1
                )
            ELSE NULL
        END as win_rate
    FROM players p
    LEFT JOIN player_games pg ON pg.id = p.id
    GROUP BY p.id, p.friendly_name
    ORDER BY win_rate DESC NULLS LAST;
END;
$function$;
