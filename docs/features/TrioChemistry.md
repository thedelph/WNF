# Trio Chemistry System

**Last Updated:** January 16, 2026
**Version:** 1.1

## Overview

The Trio Chemistry System tracks performance of three-player combinations when they play on the **same team**. It identifies "Dream Teams" (highly successful trios) and "Cursed Trios" (consistently losing combinations).

## How It Works

### Minimum Games Requirement

A trio must have played **3 games together on the same team** before stats are calculated:

```typescript
export const TRIO_MIN_GAMES = 3;
```

### Trio Scoring Formula

Trio chemistry uses a **points-based performance rate** with confidence weighting:

```
Performance Rate = (Wins × 3 + Draws × 1) / (Games × 3) × 100

Confidence Factor = Games / (Games + K)
where K = 3 (TRIO_K_VALUE)

Trio Score = Performance Rate × Confidence Factor
Curse Score = (100 - Performance Rate) × Confidence Factor
```

### Example Calculation

Players A, B, and C have played 6 games together:
- Wins: 4, Draws: 1, Losses: 1

```
Points earned = (4 × 3) + (1 × 1) = 13
Points available = 6 × 3 = 18
Performance Rate = 13/18 × 100 = 72.2%

Confidence Factor = 6 / (6 + 3) = 0.667

Trio Score = 72.2 × 0.667 = 48.2
Curse Score = (100 - 72.2) × 0.667 = 18.5
```

## Data Types

### TrioStats

Base stats for any trio:

```typescript
interface TrioStats {
  gamesTogether: number;    // Games played as a trio
  wins: number;             // Number of wins
  draws: number;            // Number of draws
  losses: number;           // Number of losses
  winRate: number;          // Simple wins/games rate
  performanceRate: number;  // Points-based rate
  trioScore: number;        // Confidence-weighted score
  curseScore: number;       // Inverse confidence-weighted score
}
```

### TrioLeaderboard

Used for global trio leaderboards (dream teams / cursed trios):

```typescript
interface TrioLeaderboard extends TrioStats {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  player3Id: string;
  player3Name: string;
}
```

### PlayerTrio

Used for displaying a player's best trios on their profile:

```typescript
interface PlayerTrio extends TrioStats {
  partner1Id: string;
  partner1Name: string;
  partner2Id: string;
  partner2Name: string;
}
```

## React Hooks

### usePlayerTrios

Fetches a player's best trio combinations:

```typescript
import { usePlayerTrios } from '../hooks/useTrioChemistry';

const { playerTrios, loading, error } = usePlayerTrios({
  playerId: 'uuid',
  limit: 3,        // Number of trios to fetch
  year: 2026       // Optional year filter
});
```

### useTrioLeaderboard

Fetches global dream teams and cursed trios:

```typescript
import { useTrioLeaderboard } from '../hooks/useTrioChemistry';

const {
  dreamTeams,    // Best performing trios
  cursedTrios,   // Worst performing trios
  loading,
  error
} = useTrioLeaderboard(
  2026,  // Optional year filter
  5      // Limit per category
);
```

## Database Functions

### get_player_best_trios

Fetches a player's best trio combinations:

```sql
get_player_best_trios(
  target_player_id: UUID,
  limit_count: INTEGER,
  target_year: INTEGER  -- NULL for all-time
)
```

### get_trio_leaderboard

Fetches global trio leaderboard:

```sql
get_trio_leaderboard(
  limit_count: INTEGER,
  target_year: INTEGER,  -- NULL for all-time
  sort_order: TEXT       -- 'best' or 'worst'
)
```

## UI Components

### TopTrios

Shows a player's best trio combinations on their profile page:

**Location:** `src/components/profile/TopTrios.tsx`

Displays:
- Top 3 best performing trios
- Win/draw/loss breakdown
- Trio chemistry score

## Team Balancing Integration

The trio chemistry system integrates with the team balancing algorithm (v13.0) to optimize team composition. The algorithm considers:

- **Dream Team Bonus**: Placing high-chemistry trios together
- **Cursed Trio Avoidance**: Separating players with poor trio synergy

See: [Team Balancing Algorithm](/docs/algorithms/BruteForceOptimalAlgorithm.md)

## Hall of Fame Awards

The trio system contributes to two award categories:

### Dream Team Trio

Recognizes the best-performing 3-player combination.

### Cursed Trio

Recognizes the worst-performing 3-player combination (most consistent losers).

See: [Awards System](/docs/features/AwardsSystem.md)

## Post-Match Insight Types

When a game is completed, the post-match analysis generates trio-related insights:

| Type | Trigger | Priority | Description |
|------|---------|----------|-------------|
| `trio_dream_team` | 65%+ win rate (5+ games) | 3 | Highlights high-performing trios that won together |
| `trio_cursed` | ≤35% win rate (5+ games) | 4 | Highlights underperforming trios that lost together |

**Example Headlines:**
- "Dream team: Phil/Simon/Chris win again (70%)"
- "Cursed trio: Dom/James/Calvin lose again (30%)"

See: [Post-Match Insights](PostMatchInsights.md) for full insight type catalog

## TopTrios Component Messaging

**Location:** `src/components/profile/TopTrios.tsx`

Displays contextual messages based on trio win rate tiers:

| Tier | Win Rate | Example Messages |
|------|----------|------------------|
| Dream Team | 80%+ | "The holy trinity of WNF!", "Unstoppable trio. Just accept it." |
| Elite | 70-80% | "This trio is box office every time.", "A dangerous three to leave together." |
| Good | 60-70% | "A reliable trio that gets results.", "Solid partnership - keep the band together!" |
| Average | 50-60% | "A trio that holds its own.", "Work in progress, but potential is there." |
| Poor | 40-50% | "Some teething problems as a trio.", "The chemistry is still cooking..." |
| Cursed | <40% | "The anti-chemistry special.", "Cursed trio energy. Avoid at all costs." |

**Color Coding:**
- 70%+ win rate: `text-success` (green)
- 50-70%: `text-info` (blue)
- 40-50%: `text-warning` (yellow)
- <40%: `text-error` (red)

## Comparison with Chemistry System

| Aspect | Chemistry (Pair) | Trio Chemistry |
|--------|------------------|----------------|
| Players | 2 | 3 |
| Min games | 10 | 3 |
| K value | 10 | 3 |
| Awards | Dynamic Duo, Cursed Duos | Dream Team Trio, Cursed Trio |

The lower thresholds for trios reflect the combinatorial difficulty of getting three specific players on the same team repeatedly.

## Related Documentation

- [Player Chemistry](/docs/features/PlayerChemistry.md) - 2-player same-team performance
- [Rivalry System](/docs/features/RivalrySystem.md) - Head-to-head opponent tracking
- [Awards System](/docs/features/AwardsSystem.md) - Hall of Fame integration
- [Team Balancing](/docs/features/TeamBalancing.md) - Algorithm integration
