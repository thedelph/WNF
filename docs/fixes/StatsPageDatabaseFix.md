# Stats Page Database Fix

## Overview
This document describes a fix implemented on May 15, 2025, to resolve an issue with the Stats page where player recent win rates were not loading correctly. The error was causing a 404 response from the Supabase RPC endpoint.

## Issue Description
The Stats page was showing the following errors in the console:
```
POST https://jvdhauvwaowmzbwtpaym.supabase.co/rest/v1/rpc/get_player_recent_win_rates 404 (Not Found)
Error fetching stats: {code: '42P01', details: null, hint: null, message: 'relation "player_games" does not exist'}
```

The error occurred because the `get_player_recent_win_rates` SQL function was referencing a non-existent table called `player_games`, which was causing the function to fail when called from the frontend.

## Root Cause Analysis
1. The SQL function `get_player_recent_win_rates` was written assuming a table called `player_games` existed in the database
2. In our actual database schema, player game data is stored in the `game_registrations` table instead
3. The function was also using column names that didn't match our schema (e.g., `team_color` instead of `team`)
4. This caused a 404 error when the frontend tried to call this function via the Supabase RPC endpoint

## Solution
The solution involved updating the SQL function to:

1. Use the correct `game_registrations` table instead of the non-existent `player_games` table
2. Adjust column references to match our actual schema (e.g., `team` instead of `team_color`)
3. Enhance the function to return more detailed statistics (wins, draws, losses)
4. Grant proper permissions to make the function accessible via the REST API

### Updated SQL Function
```sql
CREATE OR REPLACE FUNCTION public.get_player_recent_win_rates(games_threshold integer DEFAULT 10)
 RETURNS TABLE(id uuid, recent_win_rate numeric, games_played bigint, recent_wins bigint, recent_draws bigint, recent_losses bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH game_team_sizes AS (
    -- Calculate team sizes for each game
    SELECT 
      game_id,
      SUM(CASE WHEN team = 'blue' AND status = 'played' THEN 1 ELSE 0 END) AS blue_team_size,
      SUM(CASE WHEN team = 'orange' AND status = 'played' THEN 1 ELSE 0 END) AS orange_team_size
    FROM game_registrations
    GROUP BY game_id
  ),
  player_games AS (
    -- Get all player games with team assignments and outcomes
    SELECT 
      gr.player_id, 
      g.id as game_id,
      CASE 
        WHEN gr.team = 'blue' AND g.score_blue > g.score_orange THEN 1
        WHEN gr.team = 'orange' AND g.score_orange > g.score_blue THEN 1
        ELSE 0
      END AS game_win,
      CASE 
        WHEN g.score_blue = g.score_orange THEN 1
        ELSE 0
      END AS game_draw,
      CASE 
        WHEN gr.team = 'blue' AND g.score_blue < g.score_orange THEN 1
        WHEN gr.team = 'orange' AND g.score_orange < g.score_blue THEN 1
        ELSE 0
      END AS game_loss,
      gts.blue_team_size,
      gts.orange_team_size
    FROM game_registrations gr
    JOIN games g ON gr.game_id = g.id
    JOIN game_team_sizes gts ON g.id = gts.game_id
    WHERE 
      g.status = 'completed' AND
      gr.status = 'played' AND
      g.score_blue IS NOT NULL AND 
      g.score_orange IS NOT NULL AND
      gr.team IS NOT NULL
    ORDER BY g.date DESC
  ),
  even_team_games AS (
    -- Only include games with equal team sizes (or just close enough - within 1 player)
    SELECT 
      player_id,
      game_id,
      game_win,
      game_draw,
      game_loss
    FROM player_games
    WHERE ABS(blue_team_size - orange_team_size) <= 1
  ),
  recent_games AS (
    -- Get the most recent games for each player (limited by games_threshold)
    SELECT 
      player_id,
      game_win,
      game_draw,
      game_loss,
      ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY game_id DESC) as game_num
    FROM even_team_games
  ),
  player_win_rates AS (
    -- Calculate win rates from recent games
    SELECT
      player_id,
      (SUM(game_win) * 100.0 / COUNT(*)) as win_rate,
      COUNT(*) as games_played,
      SUM(game_win) as wins,
      SUM(game_draw) as draws,
      SUM(game_loss) as losses
    FROM recent_games
    WHERE game_num <= games_threshold
    GROUP BY player_id
  )
  
  -- Return the final result
  SELECT 
    p.id,
    COALESCE(pwr.win_rate, 0) as recent_win_rate,
    COALESCE(pwr.games_played, 0) as games_played,
    COALESCE(pwr.wins, 0) as recent_wins,
    COALESCE(pwr.draws, 0) as recent_draws,
    COALESCE(pwr.losses, 0) as recent_losses
  FROM players p
  LEFT JOIN player_win_rates pwr ON p.id = pwr.player_id;
END;
$function$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_player_recent_win_rates(integer) TO anon, authenticated, service_role;
```

## Frontend Integration
The updated function returns additional fields that can be used in the frontend to display more detailed statistics:

- `recent_win_rate`: The win percentage over the last N games (default 10)
- `games_played`: The number of recent games included in the calculation
- `recent_wins`: The number of wins in recent games
- `recent_draws`: The number of draws in recent games
- `recent_losses`: The number of losses in recent games

This allows the Stats page to show not just the win rate percentage but also the W/D/L breakdown, providing users with more context about player performance.

## Implementation Notes

### Function Logic
The function:
1. Only counts games where teams were balanced (team sizes within 1 player of each other)
2. Only includes completed games with valid scores
3. Calculates win rates based on the most recent N games (default 10)
4. Returns data for all players, with zeros for players who haven't played enough games

### Database Schema Alignment
This fix highlights the importance of ensuring that SQL functions align with the actual database schema. When creating new functions or modifying existing ones, always verify:

1. Table names match the actual schema
2. Column names are correct
3. Data types are compatible
4. Permissions are properly granted for API access

## Related Components
- `useStats.ts`: The React hook that fetches statistics from the Supabase backend
- `StatsGrid.tsx`: Displays player statistics in a grid layout
- `Stats.tsx`: The main Stats page component that shows various player statistics

## Future Considerations
Consider adding additional metrics to the function in the future, such as:
- Goal scoring statistics
- Performance against specific opponents
- Time-based trends (e.g., performance by month/season)

These could enhance the Stats page with more insightful data visualizations.
