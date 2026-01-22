# Rivalry System

**Last Updated:** January 15, 2026
**Version:** 1.1

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

## Post-Match Insight Types

When a game completes, rivalry insights are generated for cross-team matchups:

| Type | Trigger | Priority | Description |
|------|---------|----------|-------------|
| `rivalry_nemesis` | 10+ win advantage | 2 | Dominant rivalry matchup |
| `rivalry_dominant` | 5-9 win advantage | 3 | Clear H2H lead |
| `rivalry_close` | ≤3 diff, 15+ games | 3 | Tight competitive series |
| `rivalry_first_win` | First ever win | 3 | Historic first victory |
| `rivalry_perfect` | Undefeated, 4+ games | 2 | Perfect H2H record |
| `rivalry_revenge` | Win after 3+ losses | 2 | Breaking losing streak vs opponent |

### rivalry_close Wording (Fixed Jan 2026)

The wording adapts based on the winner's actual H2H state:
- Winner ahead overall: "extends lead vs"
- Winner behind overall: "closes gap vs"
- Tied overall: "levels the series vs"

**Example:** If Chris beats Phil but Phil leads H2H 10-8:
- "Chris closes gap vs Phil (9W-0D-10L)"

### rivalry_perfect WhatsApp Category (Jan 2026)

In the WhatsApp summary selection, `rivalry_perfect` has its **own granular category** separate from other rivalry types (`rivalry_other`). This ensures:
- Undefeated records don't compete with revenge/close/dominant insights
- A player with both a perfect record AND a close rivalry can potentially have both shown
- Perfect records are treated as a distinct achievement worthy of separate recognition

**Category mapping:**
| Category | Insight Types |
|----------|---------------|
| `rivalry_first_win` | `rivalry_first_win`, `first_ever_win_nemesis` |
| `rivalry_perfect` | `rivalry_perfect` |
| `rivalry_other` | `rivalry_dominant`, `rivalry_close`, `rivalry_revenge` |

See: [WhatsApp Summary Rules](WhatsAppSummaryRules.md) for full selection algorithm

See: [Post-Match Insights](PostMatchInsights.md) for complete insight generation documentation

## Related Documentation

- [Post-Match Insights](/docs/features/PostMatchInsights.md) - Insight generation system
- [Player Chemistry](/docs/features/PlayerChemistry.md) - Same-team performance tracking
- [Trio Chemistry](/docs/features/TrioChemistry.md) - 3-player synergy tracking
- [Team Balancing](/docs/features/TeamBalancing.md) - Algorithm integration
