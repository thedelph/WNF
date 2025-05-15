# Unbeaten Streaks Feature

## Overview
The Unbeaten Streaks feature adds a new statistic to the WNF app that tracks consecutive games without a loss for each player. This feature complements the existing Win Streaks feature by allowing players to maintain their streaks even when they draw a game.

## Implementation Details

### Database Function
A new SQL function `get_player_unbeaten_streaks` was created to calculate unbeaten streaks for all players:

```sql
CREATE OR REPLACE FUNCTION public.get_player_unbeaten_streaks(target_year integer DEFAULT NULL::integer)
RETURNS TABLE(
    id uuid, 
    friendly_name text, 
    current_unbeaten_streak integer, 
    max_unbeaten_streak integer,
    max_streak_date timestamp with time zone
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
      -- Determine if the player is unbeaten in this game (win or draw)
      CASE 
        WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR 
             (gr.team = 'orange' AND g.outcome = 'orange_win') OR
             g.outcome = 'draw' THEN true
        ELSE false -- Only losses break unbeaten streaks
      END as is_unbeaten,
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
    ORDER BY p.id, g.sequence_number
  ),
  -- Add a flag for when unbeaten status changes
  unbeaten_status_change AS (
    SELECT 
      player_id,
      player_friendly_name,
      date,
      sequence_number,
      is_unbeaten,
      in_target_year,
      CASE 
        WHEN LAG(is_unbeaten, 1, NULL) OVER (PARTITION BY player_id ORDER BY sequence_number) IS NULL 
          OR is_unbeaten <> LAG(is_unbeaten, 1) OVER (PARTITION BY player_id ORDER BY sequence_number) 
        THEN 1
        ELSE 0
      END as status_changed
    FROM player_game_results
    WHERE in_target_year
  ),
  -- Create group IDs for streaks
  unbeaten_groups AS (
    SELECT 
      player_id,
      player_friendly_name,
      date,
      sequence_number,
      is_unbeaten,
      SUM(status_changed) OVER (PARTITION BY player_id ORDER BY sequence_number) as group_id
    FROM unbeaten_status_change
  ),
  -- Calculate streak lengths
  unbeaten_streak_lengths AS (
    SELECT 
      player_id,
      player_friendly_name,
      group_id,
      is_unbeaten,
      CAST(COUNT(*) AS integer) as streak_length,
      MAX(date) as last_game_date,
      MAX(sequence_number) as last_streak_game
    FROM unbeaten_groups
    GROUP BY player_id, player_friendly_name, group_id, is_unbeaten
    HAVING is_unbeaten = true -- Only keep unbeaten streaks
  ),
  -- Get the maximum unbeaten streak for each player
  max_unbeaten_streaks AS (
    SELECT 
      player_id,
      player_friendly_name,
      CAST(MAX(streak_length) AS integer) as max_unbeaten_streak,
      (SELECT last_game_date 
       FROM unbeaten_streak_lengths usl2 
       WHERE usl2.player_id = usl.player_id 
         AND usl2.streak_length = MAX(usl.streak_length) 
       ORDER BY last_game_date DESC 
       LIMIT 1) as max_streak_date
    FROM unbeaten_streak_lengths usl
    WHERE is_unbeaten = true
    GROUP BY player_id, player_friendly_name
  ),
  -- Get the current unbeaten streak
  current_unbeaten_streaks AS (
    SELECT DISTINCT ON (player_id)
      player_id,
      player_friendly_name,
      CAST(CASE 
        WHEN last_streak_game = latest_game_number THEN streak_length 
        ELSE 0 
      END AS integer) as current_unbeaten_streak
    FROM unbeaten_streak_lengths
    ORDER BY player_id, last_streak_game DESC
  )
  -- Combine max and current unbeaten streaks
  SELECT 
    ms.player_id as id,
    ms.player_friendly_name as friendly_name,
    COALESCE(cs.current_unbeaten_streak, 0) as current_unbeaten_streak,
    COALESCE(ms.max_unbeaten_streak, 0) as max_unbeaten_streak,
    ms.max_streak_date
  FROM max_unbeaten_streaks ms
  LEFT JOIN current_unbeaten_streaks cs ON cs.player_id = ms.player_id
  WHERE COALESCE(ms.max_unbeaten_streak, 0) > 0 OR COALESCE(cs.current_unbeaten_streak, 0) > 0
  ORDER BY COALESCE(cs.current_unbeaten_streak, 0) DESC, COALESCE(ms.max_unbeaten_streak, 0) DESC;
END;
$function$;
```

### How It Works

The function calculates two key metrics:

1. **Longest Unbeaten Streak**: The longest consecutive sequence of games without a loss a player has ever achieved
2. **Current Unbeaten Streak**: The number of consecutive games without a loss a player has in their most recent games

The calculation process:
1. For each player, identify all games they played in and whether they won, drew, or lost
2. Group consecutive unbeaten games (wins and draws) into "streaks" by detecting when a player's status changes from unbeaten to beaten (loss)
3. Calculate the length of each streak
4. Determine the maximum streak length for each player
5. Check if the player's most recent games form an active unbeaten streak

A player is considered "unbeaten" in a game if:
- Player was on the blue team and the game outcome was "blue_win", OR
- Player was on the orange team and the game outcome was "orange_win", OR
- The game outcome was a "draw"

**Key difference from Win Streaks**: With win streaks, both losses AND draws break the streak. With unbeaten streaks, ONLY losses break the streak - draws are counted as part of the unbeaten streak.

### Frontend Implementation

The Stats page was updated to display two new cards:

1. **Longest Unbeaten Streaks**: Shows the top 10 players with the longest historical unbeaten streaks
2. **Current Unbeaten Streaks**: Shows the top 10 players with active unbeaten streaks (only displayed for the current year or "all time" view)

The existing Win Streak cards were also updated with descriptions to clarify the difference:
- Win Streak cards: "Streaks that are broken by both losses and draws"
- Unbeaten Streak cards: "Streaks that are only broken by losses (draws don't break streaks)"

The `useStats` hook was modified to:
- Call the new `get_player_unbeaten_streaks` function
- Process and integrate the unbeaten streak data with other player stats
- Provide the unbeaten streak data to the Stats page components

## Verification

To verify a player's unbeaten streak, you can run the following SQL query in Supabase:

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
    -- Determine if the player is unbeaten in this game
    CASE 
      WHEN (gr.team = 'blue' AND g.outcome = 'blue_win') OR 
           (gr.team = 'orange' AND g.outcome = 'orange_win') OR
           g.outcome = 'draw' THEN true
      ELSE false
    END as is_unbeaten
  FROM players p
  JOIN game_registrations gr ON gr.player_id = p.id
  JOIN games g ON g.id = gr.game_id
  WHERE gr.status = 'selected'
    AND g.completed = true
    AND g.outcome IS NOT NULL
    AND p.friendly_name = 'PLAYER_NAME'  -- Replace with player name
  ORDER BY g.sequence_number
),
-- Add a flag for when unbeaten status changes
unbeaten_status_change AS (
  SELECT 
    player_id,
    player_friendly_name,
    date,
    sequence_number,
    is_unbeaten,
    CASE 
      WHEN LAG(is_unbeaten, 1, NULL) OVER (ORDER BY sequence_number) IS NULL 
        OR is_unbeaten <> LAG(is_unbeaten, 1) OVER (ORDER BY sequence_number) 
      THEN 1
      ELSE 0
    END as status_changed
  FROM player_game_results
),
-- Create group IDs for streaks
unbeaten_groups AS (
  SELECT 
    player_id,
    player_friendly_name,
    date,
    sequence_number,
    is_unbeaten,
    SUM(status_changed) OVER (ORDER BY sequence_number) as group_id
  FROM unbeaten_status_change
),
-- Calculate streak lengths
unbeaten_streak_lengths AS (
  SELECT 
    player_id,
    player_friendly_name,
    group_id,
    is_unbeaten,
    MIN(sequence_number) as first_streak_game,
    MAX(sequence_number) as last_streak_game,
    MIN(date) as first_game_date,
    MAX(date) as last_game_date,
    COUNT(*) as streak_length
  FROM unbeaten_groups
  GROUP BY player_id, player_friendly_name, group_id, is_unbeaten
  HAVING is_unbeaten = true
  ORDER BY player_id, player_friendly_name, first_streak_game
)
-- Display streaks with dates for context
SELECT
  player_friendly_name,
  streak_length as unbeaten_streak,
  first_game_date,
  last_game_date,
  first_streak_game as first_game_number,
  last_streak_game as last_game_number
FROM unbeaten_streak_lengths
ORDER BY streak_length DESC;
```

This will show all of the player's unbeaten streaks sorted by length, along with the start and end dates of each streak.
