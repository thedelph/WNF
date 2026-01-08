# Rivalry System

**Last Updated:** January 7, 2026
**Version:** 1.0

## Overview

The Rivalry System tracks head-to-head performance between player pairs when they play on **opposite teams**. Unlike the Chemistry System (same-team performance), Rivalry measures how players perform against each other as opponents.

## Key Differences: Chemistry vs Rivalry

| Aspect | Chemistry | Rivalry |
|--------|-----------|---------|
| Relationship | Same team | Opposite teams |
| What it measures | Winning together | Winning against |
| Min games required | 10 games | 5 games |
| "Good" score | High = great partners | High = dominates opponent |
| Display | Best Buddies, Cursed Duos | Top Rivals, Fiercest Rivalries |

## How It Works

### Minimum Games Requirement

Players must have played **5 games on opposite teams** before rivalry stats are calculated. This threshold ensures statistical reliability.

```typescript
export const RIVALRY_MIN_GAMES = 5;
```

### Rivalry Scoring Formula

Rivalry uses a **points-based performance rate** with confidence weighting:

```
Performance Rate = (Wins × 3 + Draws × 1) / (Games × 3) × 100

Where:
- Win = 3 points
- Draw = 1 point
- Loss = 0 points

Dominance Score = |Performance Rate - 50|
(Higher = more lopsided matchup)

Confidence Factor = Games / (Games + K)
where K = 5 (RIVALRY_K_VALUE)

Rivalry Score = Dominance Score × Confidence Factor
```

### Example Calculation

Player A vs Player B over 10 games:
- A wins: 7, Draws: 1, B wins: 2

```
Points earned (A) = (7 × 3) + (1 × 1) = 22
Points available = 10 × 3 = 30
Performance Rate = 22/30 × 100 = 73.3%

Dominance Score = |73.3 - 50| = 23.3
Confidence Factor = 10 / (10 + 5) = 0.667

Rivalry Score = 23.3 × 0.667 = 15.5
```

## Data Types

### RivalryStats

Base stats for any rivalry:

```typescript
interface RivalryStats {
  gamesAgainst: number;      // Games played against each other
  playerWins: number;        // Wins for the first player
  opponentWins: number;      // Wins for the opponent
  draws: number;             // Number of draws
  winPercentage: number;     // Win rate (0-100)
  dominanceScore: number;    // How far from 50% (0-50 scale)
}
```

### PlayerRival

Used for displaying a player's rivals on their profile:

```typescript
interface PlayerRival {
  opponentId: string;
  opponentName: string;
  gamesAgainst: number;
  playerWins: number;
  opponentWins: number;
  draws: number;
  winPercentage: number;
  dominanceType: 'dominates' | 'dominated';
}
```

### RivalryPairLeaderboard

Used for global rivalry leaderboards:

```typescript
interface RivalryPairLeaderboard extends RivalryStats {
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  performanceRate: number;   // Points-based rate
  rivalryScore: number;      // Confidence-weighted score
}
```

## React Hooks

### usePlayerRivalry

Fetches rivalry data for a specific player:

```typescript
import { usePlayerRivalry } from '../hooks/useRivalry';

const {
  playerRivals,     // All rivals
  dominates,        // Players this player beats
  dominatedBy,      // Players who beat this player
  pairRivalry,      // Stats with current viewer (if different)
  loading,
  error,
  gamesUntilRivalry // Games needed until threshold met
} = usePlayerRivalry({
  playerId: 'uuid',
  currentPlayerId: 'viewer-uuid',  // Optional
  limit: 3,                        // Rivals per category
  year: 2026                       // Optional year filter
});
```

### useRivalryLeaderboard

Fetches the global most lopsided rivalries:

```typescript
import { useRivalryLeaderboard } from '../hooks/useRivalry';

const { rivalries, loading, error } = useRivalryLeaderboard(
  2026,  // Optional year filter
  10     // Limit
);
```

## Database Functions

### get_player_rivals

Fetches a player's top rivals (both dominant and dominated):

```sql
get_player_rivals(
  target_player_id: UUID,
  limit_count: INTEGER,
  target_year: INTEGER  -- NULL for all-time
)
```

### get_player_pair_rivalry

Fetches rivalry stats between two specific players:

```sql
get_player_pair_rivalry(
  player_one_id: UUID,
  player_two_id: UUID
)
```

### get_rivalry_leaderboard

Fetches the most lopsided rivalries globally:

```sql
get_rivalry_leaderboard(
  limit_count: INTEGER,
  target_year: INTEGER  -- NULL for all-time
)
```

### get_batch_player_rivalry

Fetches rivalry data for team balancing algorithm:

```sql
get_batch_player_rivalry(
  player_ids: UUID[]
)
```

## UI Components

### RivalryCard

Displays rivalry stats between two players:

**Location:** `src/components/profile/RivalryCard.tsx`

### TopRivals

Shows a player's top rivals on their profile page:

**Location:** `src/components/profile/TopRivals.tsx`

Displays:
- Players the user dominates
- Players who dominate the user
- Head-to-head stats with profile viewer

## Team Balancing Integration

The rivalry system integrates with the team balancing algorithm (v13.0) to create interesting matchups. High-rivalry pairs may be placed on opposite teams to maintain competitive balance.

See: [Team Balancing Algorithm](/docs/algorithms/BruteForceOptimalAlgorithm.md)

## Hall of Fame Awards

The rivalry system contributes to the **"Fiercest Rivalry"** award category, recognizing the most lopsided head-to-head matchups.

See: [Awards System](/docs/features/AwardsSystem.md)

## Related Documentation

- [Player Chemistry](/docs/features/PlayerChemistry.md) - Same-team performance tracking
- [Trio Chemistry](/docs/features/TrioChemistry.md) - 3-player synergy tracking
- [Team Balancing](/docs/features/TeamBalancing.md) - Algorithm integration
