# Win Streaks Feature

## Overview
The Win Streaks feature adds a new statistic to the WNF app that tracks consecutive wins for each player. This feature complements the existing Attendance Streaks feature by focusing on player performance rather than just participation.

## Implementation Details

### Database Function
A new SQL function `get_player_winning_streaks` was created to calculate win streaks for all players:

```sql
CREATE OR REPLACE FUNCTION public.get_player_winning_streaks(target_year integer DEFAULT NULL::integer)
RETURNS TABLE(
    id uuid, 
    friendly_name text, 
    current_win_streak integer, 
    max_win_streak integer
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
      CAST(MAX(streak_length) AS integer) as max_win_streak
    FROM win_streak_lengths
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
    COALESCE(ms.max_win_streak, 0) as max_win_streak
  FROM max_win_streaks ms
  LEFT JOIN current_win_streaks cs ON cs.player_id = ms.player_id
  WHERE COALESCE(ms.max_win_streak, 0) > 0 OR COALESCE(cs.current_win_streak, 0) > 0
  ORDER BY COALESCE(cs.current_win_streak, 0) DESC, COALESCE(ms.max_win_streak, 0) DESC;
END;
$function$;
```

### How It Works

The function calculates two key metrics:

1. **Longest Win Streak**: The longest consecutive sequence of wins a player has ever achieved
2. **Current Win Streak**: The number of consecutive wins a player has in their most recent games

The calculation process:
1. For each player, identify all games they played in and whether they won or lost
2. Group consecutive wins into "streaks" by detecting when a player's win/loss status changes
3. Calculate the length of each streak
4. Determine the maximum streak length for each player
5. Check if the player's most recent games form an active winning streak

A win is defined as:
- Player was on the blue team and the game outcome was "blue_win", OR
- Player was on the orange team and the game outcome was "orange_win"

Draws are excluded from streak calculations and will break a win streak.

### Frontend Implementation

The Stats page was updated to display two new cards:

1. **Longest Win Streaks**: Shows the top 10 players with the longest historical win streaks
2. **Current Win Streaks**: Shows the top 10 players with active win streaks (only displayed for the current year or "all time" view)

The `useStats` hook was modified to:
- Call the new `get_player_winning_streaks` function
- Process and integrate the winning streak data with other player stats
- Provide the winning streak data to the Stats page components

## Verification

To verify a player's winning streak, you can run the following SQL query in Supabase:

```sql
WITH player_game_results AS (
  -- Get all games with outcomes for a specific player
  SELECT 
    p.id as player_id,
    p.friendly_name as player_friendly_name,
    g.sequence_number,
    g.date,
    g.outcome,
    gr.team,
    -- Determine if the player won this game
    CASE 
      WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR 
           (gr.team = 'orange' AND g.outcome = 'orange_win') THEN true
      ELSE false
    END as is_win
  FROM players p
  JOIN game_registrations gr ON gr.player_id = p.id
  JOIN games g ON g.id = gr.game_id
  WHERE gr.status = 'selected'
    AND g.completed = true
    AND g.outcome IS NOT NULL
    AND g.outcome <> 'draw'
    AND p.friendly_name = 'PLAYER_NAME'  -- Replace with player name
  ORDER BY g.sequence_number
),
-- Add a flag for when win status changes
win_status_change AS (
  SELECT 
    player_id,
    player_friendly_name,
    date,
    sequence_number,
    team,
    outcome,
    is_win,
    CASE 
      WHEN LAG(is_win, 1, NULL) OVER (PARTITION BY player_id ORDER BY sequence_number) IS NULL 
        OR is_win <> LAG(is_win, 1) OVER (PARTITION BY player_id ORDER BY sequence_number) 
      THEN 1
      ELSE 0
    END as status_changed
  FROM player_game_results
),
-- Create group IDs for streaks
win_groups AS (
  SELECT 
    player_id,
    player_friendly_name,
    date,
    sequence_number,
    team,
    outcome,
    is_win,
    SUM(status_changed) OVER (PARTITION BY player_id ORDER BY sequence_number) as group_id
  FROM win_status_change
),
-- Calculate streak info
win_streak_info AS (
  SELECT 
    player_id,
    player_friendly_name,
    group_id,
    is_win,
    MIN(date) as first_game_date,
    MAX(date) as last_game_date,
    MIN(sequence_number) as first_streak_game,
    MAX(sequence_number) as last_streak_game,
    COUNT(*) as streak_length
  FROM win_groups
  GROUP BY player_id, player_friendly_name, group_id, is_win
  HAVING is_win = true
  ORDER BY streak_length DESC
)
-- Get the details of each game in the longest streak
SELECT 
  wg.player_friendly_name,
  wg.sequence_number,
  wg.date,
  wg.team,
  wg.outcome,
  wg.is_win,
  wg.group_id,
  wsi.streak_length
FROM win_groups wg
JOIN win_streak_info wsi ON 
  wg.player_id = wsi.player_id AND 
  wg.group_id = wsi.group_id
WHERE wsi.streak_length = STREAK_LENGTH  -- Replace with streak length to verify
ORDER BY wg.sequence_number;
```

Replace `'PLAYER_NAME'` with the player's name and `STREAK_LENGTH` with the streak length you want to verify.

## Implementation Date
March 24, 2025
