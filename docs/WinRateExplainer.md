@ -0,0 +1,274 @@
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

Technical Implementation:
----------------------

1. Database Function (get_player_win_rates):
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
    HAVING COUNT(*) FILTER (WHERE pg.blue_count = pg.orange_count) >= 10
    ORDER BY win_rate DESC NULLS LAST;
END;
$function$
```

2. React Hook Implementation (useStats):
```typescript
// Stats interface defining the shape of win rate data
interface PlayerStats {
  id: string;
  friendlyName: string;
  caps: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
  recentGames: number;
  wins: number;
  draws: number;
  losses: number;
}

// Inside useStats hook
const fetchStats = async () => {
  try {
    // Fetch player stats for win rates
    const { data: playerStats, error: statsError } = await supabase
      .rpc('get_player_win_rates', { 
        target_year: year || null 
      });

    if (statsError) throw statsError;

    // Transform player stats to match our interface
    const transformedPlayerStats = playerStats?.map(p => ({
      id: p.id,
      friendlyName: p.friendly_name,
      caps: capsMap.get(p.id) || Number(p.total_games),
      winRate: Number(p.win_rate),
      currentStreak: streakMap.get(p.id)?.current_streak || 0,
      maxStreak: streakMap.get(p.id)?.max_streak || 0,
      recentGames: 0,
      wins: Number(p.wins),
      draws: Number(p.draws),
      losses: Number(p.losses)
    })) || [];

    // Calculate best win rates
    const bestWinRates = (() => {
      const eligible = transformedPlayerStats
        .filter(p => p.caps >= 10)
        .sort((a, b) => b.winRate - a.winRate);
      const threshold = eligible[2]?.winRate || 0;
      return eligible.filter(p => p.winRate >= threshold);
    })();

    // Set stats in state
    setStats(prev => ({
      ...prev,
      bestWinRates,
      loading: false,
      error: null
    }));
  } catch (error) {
    console.error('Error fetching stats:', error);
    setStats(prev => ({
      ...prev,
      loading: false,
      error: 'Failed to fetch stats'
    }));
  }
};
```

3. Display Component (StatsCard):
```typescript
// Used to display win rates on the dashboard
export const StatsCard = ({ 
  title, 
  stats, 
  icon, 
  description, 
  color = 'teal' 
}: StatsCardProps) => {
  // Determine medal positions considering ties
  const getMedalIndex = (currentIndex: number, currentValue: number, players: any[]) => {
    // Count how many players have a higher win rate
    const playersWithHigherRate = players.filter(p => p.winRate > currentValue).length;
    return playersWithHigherRate;
  };

  return (
    <motion.div
      className={`card bg-base-100 shadow-xl ${className}`}
      variants={cardVariants}
    >
      {/* Card content */}
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className="card-title">{title}</h2>
        </div>
        
        {stats && (
          <div className="space-y-4">
            {stats.map((stat, index) => (
              <div key={stat.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getMedalPosition(index, stat.winRate, stats)}
                  <span>{stat.friendlyName}</span>
                </div>
                <span className="font-semibold">
                  {stat.winRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
        
        {description && (
          <p className="text-sm text-base-content/70 mt-4">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};
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