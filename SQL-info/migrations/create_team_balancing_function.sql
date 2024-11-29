-- Create a function to balance teams for a game
CREATE OR REPLACE FUNCTION balance_teams(game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_players INTEGER;
    team_size INTEGER;
    player_record RECORD;
    best_difference DECIMAL := 999999;
    current_attempt INTEGER := 0;
    max_attempts INTEGER := 1000;
    best_team_assignments JSONB;
    current_blue_team UUID[];
    current_orange_team UUID[];
    difference DECIMAL;
BEGIN
    -- Get the total number of selected players for this game
    SELECT COUNT(*) INTO total_players
    FROM game_selections
    WHERE game_id = $1 AND status = 'selected';

    -- Calculate team size (rounded down for even teams)
    team_size := total_players / 2;

    -- Create temporary table for player ratings
    CREATE TEMP TABLE temp_player_ratings AS
    SELECT 
        gs.player_id,
        COALESCE(AVG(pr.attack_rating), 5) as avg_attack,
        COALESCE(AVG(pr.defense_rating), 5) as avg_defense,
        COALESCE(
            (SELECT CAST(COUNT(CASE WHEN g.outcome = 'Blue Win' AND gs2.team = 'Blue' 
                                  OR g.outcome = 'Orange Win' AND gs2.team = 'Orange' 
                             THEN 1 END) AS DECIMAL) / 
                    NULLIF(COUNT(*), 0)
             FROM game_selections gs2
             JOIN games g ON g.id = gs2.game_id
             WHERE gs2.player_id = gs.player_id
               AND g.outcome IS NOT NULL
            ), 0.5
        ) as win_rate
    FROM game_selections gs
    LEFT JOIN player_ratings pr ON pr.rated_player_id = gs.player_id
    WHERE gs.game_id = $1 AND gs.status = 'selected'
    GROUP BY gs.player_id;

    -- Try different combinations
    WHILE current_attempt < max_attempts LOOP
        -- Get random team assignments
        WITH shuffled_players AS (
            SELECT 
                player_id,
                avg_attack,
                avg_defense,
                win_rate,
                ROW_NUMBER() OVER (ORDER BY random()) as rn
            FROM temp_player_ratings
        )
        SELECT 
            array_agg(CASE WHEN rn <= team_size THEN player_id END) FILTER (WHERE rn <= team_size),
            array_agg(CASE WHEN rn > team_size THEN player_id END) FILTER (WHERE rn > team_size)
        INTO current_blue_team, current_orange_team
        FROM shuffled_players;

        -- Calculate team stats
        WITH team_stats AS (
            SELECT 
                'Blue' as team,
                AVG(avg_attack) as team_attack,
                AVG(avg_defense) as team_defense,
                AVG(win_rate) as team_win_rate
            FROM temp_player_ratings
            WHERE player_id = ANY(current_blue_team)
            UNION ALL
            SELECT 
                'Orange' as team,
                AVG(avg_attack) as team_attack,
                AVG(avg_defense) as team_defense,
                AVG(win_rate) as team_win_rate
            FROM temp_player_ratings
            WHERE player_id = ANY(current_orange_team)
        )
        SELECT 
            ABS(MAX(CASE WHEN team = 'Blue' THEN team_attack END) - 
                MAX(CASE WHEN team = 'Orange' THEN team_attack END)) +
            ABS(MAX(CASE WHEN team = 'Blue' THEN team_defense END) - 
                MAX(CASE WHEN team = 'Orange' THEN team_defense END)) +
            ABS(MAX(CASE WHEN team = 'Blue' THEN team_win_rate END) - 
                MAX(CASE WHEN team = 'Orange' THEN team_win_rate END))
        INTO difference
        FROM team_stats;

        -- Update best teams if current difference is lower
        IF difference < best_difference THEN
            best_difference := difference;
            best_team_assignments := jsonb_build_object(
                'blue', current_blue_team,
                'orange', current_orange_team,
                'difference', difference
            );
        END IF;

        current_attempt := current_attempt + 1;
    END LOOP;

    -- Update game_selections with the best team assignments
    UPDATE game_selections
    SET team = 'Blue'
    WHERE game_id = $1 
    AND player_id = ANY((best_team_assignments->>'blue')::uuid[]);

    UPDATE game_selections
    SET team = 'Orange'
    WHERE game_id = $1 
    AND player_id = ANY((best_team_assignments->>'orange')::uuid[]);

    -- Clean up
    DROP TABLE temp_player_ratings;
END;
$$;

-- Create a function to automatically balance teams for games at their announcement time
CREATE OR REPLACE FUNCTION process_team_announcements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    game_record RECORD;
BEGIN
    FOR game_record IN
        SELECT id
        FROM games
        WHERE team_announcement_time <= NOW()
        AND team_announcement_time > NOW() - INTERVAL '5 minutes'
        AND teams_announced = FALSE
    LOOP
        -- Balance teams for this game
        PERFORM balance_teams(game_record.id);
        
        -- Mark the game as having teams announced
        UPDATE games
        SET teams_announced = TRUE
        WHERE id = game_record.id;
    END LOOP;
END;
$$;

-- Add teams_announced column to games table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='games' AND column_name='teams_announced') 
    THEN
        ALTER TABLE games ADD COLUMN teams_announced BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
