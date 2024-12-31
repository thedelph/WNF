-- Create a function to calculate player attendance streaks
CREATE OR REPLACE FUNCTION public.get_player_attendance_streaks(target_year integer DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  friendly_name text,
  current_streak integer,
  max_streak integer
) 
LANGUAGE plpgsql
AS $function$
DECLARE
  latest_game_number integer;
BEGIN
  -- Get the latest game sequence number
  SELECT MAX(sequence_number) INTO latest_game_number
  FROM games
  WHERE completed = true;

  RETURN QUERY
  WITH player_games AS (
    -- Get all games for each player with their status and sequence number
    SELECT 
      p.id as player_id,
      p.friendly_name as player_friendly_name,
      g.date,
      g.sequence_number,
      gr.status,
      CASE 
        WHEN target_year IS NOT NULL THEN 
          EXTRACT(YEAR FROM g.date) = target_year
        ELSE TRUE
      END as in_target_year,
      -- Calculate the gap between consecutive games for each player
      sequence_number - ROW_NUMBER() OVER (
        PARTITION BY p.id, 
        CASE WHEN gr.status = 'selected' AND 
          (target_year IS NULL OR EXTRACT(YEAR FROM g.date) = target_year)
        THEN 1 ELSE 0 END 
        ORDER BY g.sequence_number
      ) as streak_group
    FROM players p
    LEFT JOIN game_registrations gr ON gr.player_id = p.id
    LEFT JOIN games g ON g.id = gr.game_id
    WHERE g.completed = true
    ORDER BY g.sequence_number
  ),
  streak_lengths AS (
    -- Calculate streak lengths by counting consecutive games in each streak group
    SELECT 
      player_id,
      player_friendly_name,
      streak_group,
      CAST(COUNT(*) AS integer) as streak_length,
      MAX(date) as last_game_date,
      MAX(sequence_number) as last_streak_game
    FROM player_games
    WHERE status = 'selected' AND in_target_year
    GROUP BY player_id, player_friendly_name, streak_group
    HAVING COUNT(*) > 0
  ),
  max_streaks AS (
    -- Get the maximum streak for each player
    SELECT 
      player_id,
      player_friendly_name,
      CAST(MAX(streak_length) AS integer) as max_streak
    FROM streak_lengths
    GROUP BY player_id, player_friendly_name
  ),
  current_streaks AS (
    -- Get the current streak by finding the most recent streak
    SELECT DISTINCT ON (player_id)
      player_id,
      player_friendly_name,
      CAST(CASE 
        WHEN last_streak_game = latest_game_number THEN streak_length 
        ELSE 0 
      END AS integer) as current_streak
    FROM streak_lengths
    ORDER BY player_id, last_streak_game DESC
  )
  -- Combine max and current streaks
  SELECT 
    ms.player_id as id,
    ms.player_friendly_name as friendly_name,
    COALESCE(cs.current_streak, 0) as current_streak,
    COALESCE(ms.max_streak, 0) as max_streak
  FROM max_streaks ms
  LEFT JOIN current_streaks cs ON cs.player_id = ms.player_id
  WHERE COALESCE(ms.max_streak, 0) > 0 OR COALESCE(cs.current_streak, 0) > 0
  ORDER BY COALESCE(cs.current_streak, 0) DESC, COALESCE(ms.max_streak, 0) DESC;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_player_attendance_streaks(integer) TO authenticated;
