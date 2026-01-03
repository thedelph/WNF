Performance Calculation in WNF

Performance scores in WNF are calculated using a **points-based formula** to ensure a fair and accurate measure of player performance. Here's a detailed explanation of how they work:

## Points-Based Formula

WNF uses a points-based system rather than simple win percentage:

**Formula:** `(Wins×3 + Draws×1) / (TotalGames×3) × 100`

| Result | Points |
|--------|--------|
| Win    | 3 points |
| Draw   | 1 point |
| Loss   | 0 points |

**Example:**
- Player has 25 wins, 9 draws, 26 losses (60 games total)
- Total points: (25×3) + (9×1) + (26×0) = 75 + 9 + 0 = 84
- Maximum possible: 60×3 = 180
- Performance: 84/180 × 100 = **46.7%**

This gives draws proper weight (1/3 of a win) rather than treating them as losses.

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
Performance = `(Wins×3 + Draws×1) / (TotalGames×3) × 100`

For example:
If a player has played 20 games total, but only 15 had even teams:
- 9 wins in even team games
- 4 losses in even team games
- 2 draws in even team games
Their performance would be: ((9×3) + (2×1)) / (15×3) × 100 = 29/45 × 100 = **64.4%**

Note: The other 5 games where teams were uneven are completely excluded from the calculation.

Recent Performance:
-----------------
In addition to overall performance, WNF also calculates "Recent Performance" based on a player's last 10 games. This provides insight into a player's current form.

- Recent Performance = `(Wins×3 + Draws×1) / (TotalGames×3) × 100` for the last 10 games
- Uses the same points formula as overall performance
- Only includes games with even teams and valid outcomes (same criteria as overall performance)
- Form Indicator: Shows the difference between recent and overall performance
  - ▲ indicates better recent form (e.g., ▲ 2.0% means recent is 2% higher than overall)
  - ▼ indicates worse recent form (e.g., ▼ 3.5% means recent is 3.5% lower than overall)
  - ⟷ indicates unchanged form (recent equals overall)

The recent performance helps identify players who are improving or declining, regardless of their overall performance.

Display Rules:
------------
- Performance scores are rounded to 1 decimal place
- Players need at least 10 games with even teams to be eligible for the "Best Performance" award
- When displaying top performers, all players who match or exceed the third-highest score are shown (this means you might see more than 3 players if there are ties)
- Performance and W/D/L records are displayed on the back of player cards
- For players with less than 10 games, "Pending (X/10)" is shown instead of a performance percentage
- Performance is consistently formatted across all components using the same database function
- The StatsGrid component displays both overall performance and recent performance in the same cell, with a form indicator showing the difference

Performance Visualisation:
------------------------
The WinRateGraph component (Performance History) shows a player's performance history with special visual indicators:
- Games excluded from calculation (those with uneven teams or unknown outcomes) are shown with a dashed border
- Only games with even teams and clear outcomes (win/loss/draw) affect the blue performance line
- Enhanced tooltips explain why certain games are excluded from the calculations
- A summary below the graph shows statistics about included vs excluded games
- **Bug Fix (Jan 2026)**: Fixed outcome determination to correctly check player's team when game outcome is 'Blue Won' or 'Orange Won'

Technical Implementation:
----------------------

1. Performance Display Components:
The following components use the `get_player_win_rates` and `get_player_recent_win_rates` functions to display performance:
- PlayerCardBack: Shows detailed W/D/L stats and performance
- PlayerSelectionResults: Displays performance for selected and reserve players
- RegisteredPlayers: Shows performance for all registered players
- TeamSelectionResults: Displays performance for selected team members
- StatsGrid: Shows both overall and recent performance with form indicator

2. Performance Calculation Functions:

   a. The `get_player_win_rates` function calculates overall performance for all players using the points formula. This function:
   - Only counts games where the player was selected to play
   - Only includes games with recorded outcomes
   - Only counts games with even teams (same number of players on both sides)
   - Uses formula: `(Wins×3 + Draws×1) / (TotalGames×3) × 100`
   - Requires at least 10 eligible games for a score to be calculated

   b. The `get_player_recent_win_rates` function calculates performance for the last 10 games for each player. This function:
   - Uses ROW_NUMBER() to select only the 10 most recent games for each player
   - Follows the same points-based formula as the overall performance function
   - Returns results even for players with fewer than 10 recent games

3. Automatic Updates:
Performance scores are automatically updated in the following scenarios:
- When a game is completed
- When a game's outcome is changed
- When a game's teams are modified

This ensures that player performance is always up-to-date and reflects their current standing.

5. Visual Indicators in WinRateGraph:
The player profile page's performance graph includes visual indicators to explain the calculation:
- Dashed-border squares indicate games excluded from calculations (uneven teams, unknown outcomes)
- Solid-border squares indicate games included in the calculation
- Tooltips on each game provide details about why a game might be excluded
- Summary statistics below the graph show the breakdown of excluded vs included games

This helps players understand why certain games might not appear to affect their overall performance.

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
1. Performance is only based on fair matches where teams were balanced in numbers
2. Players need a significant number of games (10+) to be eligible for overall performance calculations
3. Recent performance provides insight into current form regardless of overall standing
4. The system accounts for draws fairly (1/3 value of a win) and different team colors correctly
5. The implementation is efficient, secure, and maintainable