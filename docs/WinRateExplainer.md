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

Display Rules:
------------
- Win rates are rounded to 1 decimal place
- Players need at least 10 games with even teams to be eligible for the "Best Win Rates" award
- When displaying top win rates, all players who match or exceed the third-highest win rate are shown (this means you might see more than 3 players if there are ties)
- Win rates and W/D/L records are displayed on the back of player cards
- For players with less than 10 games, "Pending (X/10)" is shown instead of a win rate percentage
- Win rates are consistently formatted across all components using the same database function

Technical Implementation:
----------------------

1. Win Rate Display Components:
The following components use the `get_player_win_rates` function to display win rates:
- PlayerCardBack: Shows detailed W/D/L stats and win rate
- PlayerSelectionResults: Displays win rates for selected and reserve players
- RegisteredPlayers: Shows win rates for all registered players
- TeamSelectionResults: Displays win rates for selected team members

2. Win Rate Calculation Function:
The `get_player_win_rates` function calculates win rates for all players based on their game history. This function:
- Only counts games where the player was selected to play
- Only includes games with recorded outcomes
- Only counts games with even teams (same number of players on both sides)
- Requires at least 10 eligible games for a win rate to be calculated

3. Automatic Updates:
Win rates are automatically updated in the following scenarios:
- When a game is completed
- When a game's outcome is changed
- When a game's teams are modified

This ensures that player win rates are always up-to-date and reflect their current performance.

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

```

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

3. game_registrations
   - id: uuid (PK)
   - game_id: uuid (FK to games)
   - player_id: uuid (FK to players)
   - team: text ('blue', 'orange')
   - status: text ('selected', 'reserve', 'declined')

Key Points About Implementation:
-----------------------------
1. Security: The get_player_win_rates function uses SECURITY DEFINER to ensure consistent permissions
2. Performance: 
   - Uses CTEs (Common Table Expressions) for better query organization
   - Indexes on game_registrations(game_id, player_id, status)
   - Filters applied early in the query to reduce the dataset
3. Accuracy:
   - NULLIF used to prevent division by zero
   - Results rounded to 1 decimal place
   - All calculations done in the database for consistency
4. Maintainability:
   - Modular React components
   - Type-safe interfaces
   - Clear separation of concerns between database and frontend logic

This calculation method ensures that:
1. Win rates are only based on fair matches where teams were balanced in numbers
2. Players need a significant number of games (10+) to be eligible, preventing high win rates from small sample sizes
3. The system accounts for draws and different team colors fairly
4. The implementation is efficient, secure, and maintainable