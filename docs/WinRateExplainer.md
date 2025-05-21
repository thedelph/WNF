Win Rate Calculation in WNF

Win rates in WNF are carefully calculated to ensure they represent a fair and accurate measure of player performance. Here's a detailed explanation of how they work:

Eligibility Requirements:
----------------------
1. Only games with recorded outcomes are counted
2. The player must have been selected to play in the game (reserves and declined players don't count)
3. The player must have at least 10 eligible games to be included in win rate calculations
4. Only games with even teams are counted (equal number of players on blue and orange teams)

How Wins Are Determined:
----------------------
- Win: Player's team won the game (blue team player + blue win, or orange team player + orange win)
- Loss: Player's team lost the game (blue team player + orange win, or orange team player + blue win)
- Draw: Game ended in a draw

Calculation Method:
-----------------
Win Rate = (Number of Wins in Even Team Games / Total Number of Even Team Games) × 100

For example:
If a player has played 20 games total, but only 15 had even teams:
- 9 wins in even team games
- 4 losses in even team games
- 2 draws in even team games
Their win rate would be: (9/15) × 100 = 60%

Note: The other 5 games where teams were uneven are completely excluded from the calculation.

Recent Win Rate:
--------------
In addition to overall win rate, WNF also calculates a "Recent Win Rate" based on a player's last 10 games. This provides insight into a player's current form.

- Recent Win Rate = (Number of Wins in Last 10 Games / 10) × 100
- Form Indicator: Shows the difference between recent and overall win rates
  - indicates better recent form (e.g.,  2.0% means recent win rate is 2% higher than overall)
  - indicates worse recent form (e.g.,  3.5% means recent win rate is 3.5% lower than overall)
  - indicates unchanged form (recent win rate equals overall win rate)

The recent win rate helps identify players who are improving or declining in performance, regardless of their overall win rate.

Display Rules:
------------
- Win rates are rounded to 1 decimal place
- Players need at least 10 games with even teams to be eligible for the "Best Win Rates" award
- When displaying top win rates, all players who match or exceed the third-highest win rate are shown (this means you might see more than 3 players if there are ties)
- Win rates and W/D/L records are displayed on the back of player cards
- For players with less than 10 games, "Pending (X/10)" is shown instead of a win rate percentage
- Win rates are consistently formatted across all components using the same database function
- The StatsGrid component displays both overall win rate and recent win rate in the same cell, with a form indicator showing the difference

Win Rate Visualisation:
---------------------
The WinRateGraph component shows a player's win rate history with special visual indicators:
- Games excluded from win rate calculation (those with uneven teams or unknown outcomes) are shown with a dashed border
- Only games with even teams and clear outcomes (win/loss/draw) affect the blue win rate line
- Enhanced tooltips explain why certain games are excluded from the calculations
- A summary below the graph shows statistics about included vs excluded games

Technical Implementation:
----------------------

1. Win Rate Display Components:
The following components use the `get_player_win_rates` and `get_player_recent_win_rates` functions to display win rates:
- PlayerCardBack: Shows detailed W/D/L stats and win rate
- PlayerSelectionResults: Displays win rates for selected and reserve players
- RegisteredPlayers: Shows win rates for all registered players
- TeamSelectionResults: Displays win rates for selected team members
- StatsGrid: Shows both overall and recent win rates with form indicator

2. Win Rate Calculation Functions:
   
   a. The `get_player_win_rates` function calculates overall win rates for all players based on their game history. This function:
   - Only counts games where the player was selected to play
   - Only includes games with recorded outcomes
   - Only counts games with even teams (same number of players on both sides)
   - Requires at least 10 eligible games for a win rate to be calculated

   b. The `get_player_recent_win_rates` function calculates win rates for the last 10 games for each player. This function:
   - Uses ROW_NUMBER() to select only the 10 most recent games for each player
   - Follows the same win/loss/draw determination logic as the overall win rate function
   - Returns results even for players with fewer than 10 recent games

3. Automatic Updates:
Win rates are automatically updated in the following scenarios:
- When a game is completed
- When a game's outcome is changed
- When a game's teams are modified

This ensures that player win rates are always up-to-date and reflect their current performance.

5. Visual Indicators in WinRateGraph:
The player profile page's win rate graph includes visual indicators to explain the win rate calculation:
- Dashed-border squares indicate games excluded from win rate calculations (uneven teams, unknown outcomes)
- Solid-border squares indicate games included in the calculation
- Tooltips on each game provide details about why a game might be excluded
- Summary statistics below the graph show the breakdown of excluded vs included games

This helps players understand why certain games might not appear to affect their overall win rate.

4. Database Implementation:
```sql
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
        -- Only count games with even teams
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count)::integer as total_games,
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'win')::integer as wins,
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'draw')::integer as draws,
        COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'loss')::integer as losses,
        -- Calculate win rate percentage
        ROUND(
            COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count AND pg.player_result = 'win')::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count), 0) * 100,
            1
        ) as win_rate
    FROM players p
    LEFT JOIN player_games pg ON pg.id = p.id
    GROUP BY p.id, p.friendly_name
    ORDER BY win_rate DESC NULLS LAST;
END;
$function$;

```sql
CREATE OR REPLACE FUNCTION public.get_player_recent_win_rates()
RETURNS TABLE(
    id uuid, 
    friendly_name text, 
    recent_total_games bigint, 
    recent_wins bigint, 
    recent_draws bigint, 
    recent_losses bigint, 
    recent_win_rate numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH player_recent_games AS (
    SELECT
      p.id AS player_id,
      p.friendly_name AS player_friendly_name,
      gr.team AS player_team,
      g.outcome,
      g.score_blue,
      g.score_orange,
      ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY g.sequence_number DESC) AS row_num
    FROM
      players p
    JOIN
      game_registrations gr ON p.id = gr.player_id
    JOIN
      games g ON gr.game_id = g.id
    WHERE
      g.is_historical = TRUE
      AND g.needs_completion = FALSE
      AND g.completed = TRUE
      AND gr.status = 'selected'
      AND gr.team IN ('blue', 'orange')
  ),
  player_recent_stats AS (
    SELECT
      player_id,
      player_friendly_name,
      COUNT(*) AS total_games,
      SUM(CASE
          WHEN (player_team = 'blue' AND outcome = 'blue_win') OR (player_team = 'orange' AND outcome = 'orange_win') THEN 1
          ELSE 0
          END) AS wins,
      SUM(CASE
          WHEN outcome = 'draw' THEN 1
          ELSE 0
          END) AS draws,
      SUM(CASE
          WHEN (player_team = 'blue' AND outcome = 'orange_win') OR (player_team = 'orange' AND outcome = 'blue_win') THEN 1
          ELSE 0
          END) AS losses
    FROM
      player_recent_games
    WHERE
      row_num <= 10
    GROUP BY
      player_id, player_friendly_name
  )
  SELECT
    prs.player_id AS id,
    prs.player_friendly_name AS friendly_name,
    prs.total_games AS recent_total_games,
    prs.wins AS recent_wins,
    prs.draws AS recent_draws,
    prs.losses AS recent_losses,
    CASE
      WHEN prs.total_games > 0 THEN ROUND(prs.wins * 100.0 / prs.total_games, 1)
      ELSE 0
    END AS recent_win_rate
  FROM
    player_recent_stats prs
  ORDER BY
    recent_win_rate DESC, recent_total_games DESC;
END;
$function$;

Database Schema Dependencies:
--------------------------
The win rate calculation relies on these key tables:

1. players
   - id: uuid (PK)
   - friendly_name: text
   - caps: integer
   - win_rate: numeric

2. games
   - id: uuid (PK)
   - outcome: text ('blue_win', 'orange_win', 'draw')
   - date: timestamp with time zone
   - sequence_number: integer (used for ordering games chronologically)

3. game_registrations
   - id: uuid (PK)
   - game_id: uuid (FK to games)
   - player_id: uuid (FK to players)
   - team: text ('blue', 'orange')
   - status: text ('selected', 'reserve', 'declined')

Key Points About Implementation:
-----------------------------
1. Security: The win rate functions use SECURITY DEFINER to ensure consistent permissions
2. Performance: 
   - Uses CTEs (Common Table Expressions) for better query organization
   - Indexes on game_registrations(game_id, player_id, status)
   - Filters applied early in the query to reduce the dataset
   - ROW_NUMBER() for efficient selection of most recent games
3. Accuracy:
   - NULLIF used to prevent division by zero
   - Results rounded to 1 decimal place
   - All calculations done in the database for consistency
4. Maintainability:
   - Modular React components
   - Type-safe interfaces
   - Clear separation of concerns between database and frontend logic
   - Consistent outcome checking between overall and recent win rate functions

This calculation method ensures that:
1. Win rates are only based on fair matches where teams were balanced in numbers
2. Players need a significant number of games (10+) to be eligible for overall win rate calculations
3. Recent win rates provide insight into current form regardless of overall performance
4. The system accounts for draws and different team colors fairly
5. The implementation is efficient, secure, and maintainable