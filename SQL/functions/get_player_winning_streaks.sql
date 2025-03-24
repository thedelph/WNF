CREATE OR REPLACE FUNCTION public.get_player_winning_streaks(target_year integer DEFAULT NULL::integer)
RETURNS TABLE(
    id uuid, 
    friendly_name text, 
    current_win_streak integer, 
    max_win_streak integer,
    max_streak_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  latest_game_number integer;
BEGIN
  -- Get the latest game sequence number
  SELECT MAX(sequence_number) INTO latest_game_number
  FROM games
  WHERE completed = true;

  RETURN QUERY
  WITH player_game_results AS (
    -- Get all games with outcomes for each player
    SELECT 
      p.id as player_id,
      p.friendly_name as player_friendly_name,
      g.date,
      g.sequence_number,
      gr.team,
      g.outcome,
      -- Determine if the player won this game
      CASE 
        WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR 
             (gr.team = 'orange' AND g.outcome = 'orange_win') THEN true
        ELSE false
      END as is_win,
      CASE 
        WHEN target_year IS NOT NULL THEN 
          EXTRACT(YEAR FROM g.date) = target_year
        ELSE TRUE
      END as in_target_year
    FROM players p
    JOIN game_registrations gr ON gr.player_id = p.id
    JOIN games g ON g.id = gr.game_id
    WHERE gr.status = 'selected'
      AND g.completed = true
      AND g.outcome IS NOT NULL
      AND g.outcome <> 'draw' -- Exclude draws as they're not wins
    ORDER BY p.id, g.sequence_number
  ),
  -- Add a flag for when win status changes
  win_status_change AS (
    SELECT 
      player_id,
      player_friendly_name,
      date,
      sequence_number,
      is_win,
      in_target_year,
      CASE 
        WHEN LAG(is_win, 1, NULL) OVER (PARTITION BY player_id ORDER BY sequence_number) IS NULL 
          OR is_win <> LAG(is_win, 1) OVER (PARTITION BY player_id ORDER BY sequence_number) 
        THEN 1
        ELSE 0
      END as status_changed
    FROM player_game_results
    WHERE in_target_year
  ),
  -- Create group IDs for streaks
  win_groups AS (
    SELECT 
      player_id,
      player_friendly_name,
      date,
      sequence_number,
      is_win,
      SUM(status_changed) OVER (PARTITION BY player_id ORDER BY sequence_number) as group_id
    FROM win_status_change
  ),
  -- Calculate streak lengths
  win_streak_lengths AS (
    SELECT 
      player_id,
      player_friendly_name,
      group_id,
      is_win,
      CAST(COUNT(*) AS integer) as streak_length,
      MAX(date) as last_game_date,
      MAX(sequence_number) as last_streak_game
    FROM win_groups
    GROUP BY player_id, player_friendly_name, group_id, is_win
    HAVING is_win = true -- Only keep win streaks
  ),
  -- Get the maximum win streak for each player
  max_win_streaks AS (
    SELECT 
      player_id,
      player_friendly_name,
      CAST(MAX(streak_length) AS integer) as max_win_streak,
      (SELECT last_game_date 
       FROM win_streak_lengths wsl2 
       WHERE wsl2.player_id = wsl.player_id 
         AND wsl2.streak_length = MAX(wsl.streak_length) 
       ORDER BY last_game_date DESC 
       LIMIT 1) as max_streak_date
    FROM win_streak_lengths wsl
    WHERE is_win = true
    GROUP BY player_id, player_friendly_name
  ),
  -- Get the current win streak
  current_win_streaks AS (
    SELECT DISTINCT ON (player_id)
      player_id,
      player_friendly_name,
      CAST(CASE 
        WHEN last_streak_game = latest_game_number THEN streak_length 
        ELSE 0 
      END AS integer) as current_win_streak
    FROM win_streak_lengths
    ORDER BY player_id, last_streak_game DESC
  )
  -- Combine max and current win streaks
  SELECT 
    ms.player_id as id,
    ms.player_friendly_name as friendly_name,
    COALESCE(cs.current_win_streak, 0) as current_win_streak,
    COALESCE(ms.max_win_streak, 0) as max_win_streak,
    ms.max_streak_date
  FROM max_win_streaks ms
  LEFT JOIN current_win_streaks cs ON cs.player_id = ms.player_id
  WHERE COALESCE(ms.max_win_streak, 0) > 0 OR COALESCE(cs.current_win_streak, 0) > 0
  ORDER BY COALESCE(cs.current_win_streak, 0) DESC, COALESCE(ms.max_win_streak, 0) DESC;
END;
$function$;
