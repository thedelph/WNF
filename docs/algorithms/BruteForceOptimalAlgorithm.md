# Brute-Force Optimal Team Balancing Algorithm

> **Version:** 13.0
> **Status:** Current (Primary Algorithm)
> **Last Updated:** January 7, 2026
> **Location:** `src/components/admin/team-balancing/bruteForceOptimal/`
>
> **v13.0 Changes:** Enhanced chemistry scoring with Rivalry (cross-team matchups) and Trio synergies

---

## Table of Contents

1. [Overview](#overview)
2. [Why Brute Force?](#why-brute-force)
3. [Algorithm Architecture](#algorithm-architecture)
4. [Scoring System](#scoring-system)
5. [Spread Constraint](#spread-constraint)
6. [Data Sources](#data-sources)
7. [Usage Guide](#usage-guide)
8. [Performance Benchmarks](#performance-benchmarks)
9. [Comparison with Legacy Algorithm](#comparison-with-legacy-algorithm)
10. [Technical Implementation](#technical-implementation)

---

## Overview

The **Brute-Force Optimal Algorithm** is the primary team balancing algorithm for WNF (Wednesday Night Football). Unlike heuristic approaches such as Simulated Annealing, this algorithm **evaluates ALL valid team combinations** and selects the objectively best balanced teams.

### Key Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Optimal Solution** | Returns the mathematically best team balance within constraints |
| **Deterministic** | Same input always produces same output |
| **Transparent** | Exact scoring breakdown shown for each component |
| **Fast** | ~340ms for 18 players (8,000 combinations) |

### Design Philosophy

The algorithm was designed with these principles:

1. **Guarantee optimality** - No heuristic guessing, evaluate everything
2. **Prevent skill stacking** - Enforce spread constraint (3-3-3 thirds distribution)
3. **Multi-dimensional balance** - Consider ratings, chemistry, performance, positions, and attributes
4. **Modular architecture** - 16 small files instead of 1 massive file

---

## Why Brute Force?

### Computational Feasibility

For typical WNF player counts, brute force is computationally trivial:

| Players | Team Size | Combinations | Compute Time |
|---------|-----------|--------------|--------------|
| 12 (6v6) | 6 | 924 | ~10ms |
| 14 (7v7) | 7 | 3,432 | ~30ms |
| 16 (8v8) | 8 | 12,870 | ~50ms |
| **18 (9v9)** | **9** | **8,000*** | **~340ms** |
| 20 (10v10) | 10 | 27,000* | ~750ms |
| 22 (11v11) | 11 | 64,000* | ~2 sec |

*With spread constraint applied - without constraint these would be much higher

### Why Not Heuristics?

The previous Simulated Annealing (SA) algorithm:
- Required extensive parameter tuning
- Could get stuck in local optima
- No guarantee of finding the best solution
- Complex to understand and debug

Brute force eliminates these issues entirely by simply evaluating every possibility.

---

## Algorithm Architecture

### Modular File Structure

```
src/components/admin/team-balancing/bruteForceOptimal/
├── index.ts                      # Main orchestrator (entry point)
├── types.ts                      # TypeScript interfaces
├── combinationGenerator.ts       # Generates valid team combinations
├── scoring/
│   ├── index.ts                 # Combined scoring function
│   ├── coreRatingsScore.ts      # Attack/Defense/GameIQ/GK balance
│   ├── chemistryScore.ts        # Pairwise team chemistry (same team)
│   ├── rivalryScore.ts          # Cross-team matchup balance (v13.0)
│   ├── trioScore.ts             # Trio synergy balance (v13.0)
│   ├── performanceScore.ts      # Recent win rate & goal differential
│   ├── positionScore.ts         # Position coverage & ST distribution
│   └── attributeScore.ts        # Pace/shooting/etc balance
└── dataLoaders/
    ├── index.ts                 # Coordinate parallel data loading
    ├── loadPlayerStats.ts       # Core ratings from players table
    ├── loadChemistry.ts         # Pairwise chemistry via RPC
    ├── loadRivalry.ts           # Rivalry data via RPC (v13.0)
    ├── loadTrioChemistry.ts     # Trio chemistry via RPC (v13.0)
    ├── loadPerformance.ts       # Win rates & goal diff via RPC
    ├── loadPositions.ts         # Position consensus data
    └── loadAttributes.ts        # Derived attributes from playstyles
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        generateOptimalTeams()                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Load All Data (Parallel)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Stats   │ │Chemistry │ │ Perform  │ │Positions │ │ Attrs  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Merge into Unified Player Objects                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│            Generate Valid Combinations (Spread Constraint)       │
│                                                                  │
│   For each valid [BlueTeam, OrangeTeam] combination:            │
│   ├── Calculate total score (5 weighted components)              │
│   ├── Track best score found                                     │
│   └── Continue until all combinations evaluated                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Return Best Team Assignment                     │
│   • Blue Team & Orange Team players                              │
│   • Balance score (lower = better)                               │
│   • Score breakdown per component                                │
│   • Tier distribution verification                               │
│   • Data loading statistics                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scoring System

The algorithm uses a **5-component weighted scoring system** where lower scores indicate better balance.

### Component Weights

| Component | Weight | Purpose |
|-----------|--------|---------|
| **Core Ratings** | 40% | Balance Attack, Defense, Game IQ, GK |
| **Chemistry** | 20% | Equal team chemistry distribution |
| **Performance** | 20% | Balance recent form (win rate, goal diff) |
| **Position** | 10% | Cover all positions, spread strikers |
| **Attributes** | 10% | Balance pace, shooting, passing, etc. |

### 1. Core Ratings Score (40%)

Measures the difference in average Attack, Defense, Game IQ, and GK ratings between teams.

**Formula:**
```
coreScore = (|blueAttack - orangeAttack| +
             |blueDefense - orangeDefense| +
             |blueGameIQ - orangeGameIQ| +
             |blueGK - orangeGK|) / 4 / 10

// Normalized to 0-1 scale (ratings are 1-10)
```

**Example:**
- Blue Team average: ATK 6.5, DEF 6.0, IQ 6.2, GK 5.5
- Orange Team average: ATK 6.3, DEF 6.1, IQ 6.0, GK 5.7
- Differences: 0.2 + 0.1 + 0.2 + 0.2 = 0.7
- Score: 0.7 / 4 / 10 = 0.0175

### 2. Chemistry Score (20%)

**Enhanced in v13.0** with three sub-components:

| Sub-Component | Internal Weight | Total Weight | Purpose |
|---------------|-----------------|--------------|---------|
| **Pairwise** | 50% | 10% | Balance same-team synergies |
| **Rivalry** | 30% | 6% | Balance cross-team matchup advantages |
| **Trio** | 20% | 4% | Balance emergent 3-player effects |

#### 2a. Pairwise Chemistry (50% of chemistry)

Traditional same-team chemistry - how well players perform together.

**Formula:**
```
blueChemistry = average(chemistry_scores for all pairs in blue team with ≥3 games)
orangeChemistry = average(chemistry_scores for all pairs in orange team)
pairwiseScore = |blueChemistry - orangeChemistry| / 100
```

#### 2b. Rivalry Score (30% of chemistry)

Cross-team matchups - how players perform AGAINST each other.

**Formula:**
```
For each blue player vs each orange player:
  advantage = rivalry_score - 50  // Positive = blue advantage
netAdvantage = average of all matchup advantages
rivalryScore = |netAdvantage| / 50  // Normalized to 0-1
```

**Example:** If Stephen (blue) has 86.7% win rate vs Dom (orange), that's +36.7 advantage for blue.

#### 2c. Trio Score (20% of chemistry)

Emergent effects when 3 specific players play together.

**Formula:**
```
blueTrioAvg = average(trio_scores for all trios in blue team with ≥3 games)
orangeTrioAvg = average(trio_scores for all trios in orange team)
trioScore = |blueTrioAvg - orangeTrioAvg| / 100
```

#### Combined Chemistry Score

```
chemistryScore = (pairwiseScore × 0.50) +
                 (rivalryScore × 0.30) +
                 (trioScore × 0.20)
```

### 3. Performance Score (20%)

Balances recent form based on the last 10 games played.

**Formula:**
```
winRateDiff = |blueRecentWinRate - orangeRecentWinRate| / 100
goalDiffDiff = |blueGoalDiff - orangeGoalDiff| / 20
performanceScore = (winRateDiff + goalDiffDiff) / 2
```

### 4. Position Score (10%)

Ensures position coverage and spreads strikers between teams.

**Components:**
- **Striker balance** (60% of position score): Strikers should be evenly distributed
- **Category balance** (25%): DEF/MID/ATT coverage should be similar
- **Missing coverage penalty** (15%): Penalize if a team lacks any category entirely

**Position Categories:**
| Category | Positions |
|----------|-----------|
| DEF | LB, CB, RB |
| MID | LWB, RWB, CDM, CM, CAM, LW, RW |
| ATT | ST |

### 5. Attributes Score (10%)

Balances derived attributes from playstyle ratings.

**Attributes balanced:**
- Pace
- Shooting
- Passing
- Dribbling
- Defending
- Physical

**Formula:**
```
attributeScore = sum(|blueAttr - orangeAttr| for each attribute) / 6
```

### Total Score Calculation

```
totalScore = (coreRatingsScore × 0.40) +
             (chemistryScore × 0.20) +
             (performanceScore × 0.20) +
             (positionScore × 0.10) +
             (attributeScore × 0.10)
```

**Score Interpretation:**
| Score Range | Quality |
|-------------|---------|
| 0.00 - 0.02 | Excellent balance |
| 0.02 - 0.05 | Good balance |
| 0.05 - 0.10 | Acceptable balance |
| 0.10+ | Review recommended |

---

## Spread Constraint

The **spread constraint** is the key mechanism that prevents skill stacking (all top players on one team).

### How It Works

1. **Sort players by overall rating** (average of Attack, Defense, Game IQ, GK)
2. **Divide into thirds**: Top, Middle, Bottom
3. **Enforce equal distribution**: Each team must have equal players from each third

### Example: 18 Players (9v9)

```
Players sorted by overall rating:
┌─────────────────────────────────────────────────┐
│ TOP THIRD (6 players)                           │
│ Jarman, Simon, Dom, Daniel, Jimmy, Paul         │
├─────────────────────────────────────────────────┤
│ MIDDLE THIRD (6 players)                        │
│ Chris H, Jack G, Joe, Tom K, Phil R, Darren W   │
├─────────────────────────────────────────────────┤
│ BOTTOM THIRD (6 players)                        │
│ Stephen, Zhao, Nathan, Alex E, Calvin, Mike M   │
└─────────────────────────────────────────────────┘

Each team MUST have: 3 from Top + 3 from Middle + 3 from Bottom

Valid combinations = C(6,3) × C(6,3) × C(6,3) = 20 × 20 × 20 = 8,000
```

### Why This Matters

Without the spread constraint:
- The algorithm might put all 6 top players on one team
- C(18,9) = 48,620 combinations to evaluate
- Results could be theoretically "balanced" but unfair in practice

With the spread constraint:
- Each team is guaranteed a mix of skill levels
- Only 8,000 valid combinations to evaluate
- Fairer teams that "feel" right

---

## Data Sources

The algorithm loads data from 7 sources in parallel:

| Data | Source | Query/RPC | Fields |
|------|--------|-----------|--------|
| **Core Ratings** | `players` table | Direct query | attack_rating, defense_rating, game_iq, gk, win_rate, friendly_name |
| **Pairwise Chemistry** | RPC | `get_batch_player_chemistry(player_ids)` | player1_id, player2_id, chemistry_score, games_together |
| **Rivalry** | RPC | `get_batch_player_rivalry(player_ids)` | player1_id, player2_id, games_against, player1_wins, player2_wins, rivalry_score |
| **Trio Chemistry** | RPC | `get_batch_trio_chemistry(player_ids)` | player1_id, player2_id, player3_id, games_together, wins, trio_score |
| **Recent Win Rate** | RPC | `get_player_recent_win_rates(10)` | id, recent_win_rate, games_played |
| **Goal Differential** | RPC | `get_player_recent_goal_differentials(10)` | id, recent_goal_differential, games_played |
| **Positions** | View | `player_position_consensus` | player_id, position, percentage |
| **Attributes** | Table | `player_ratings` (aggregated) | has_pace, has_shooting, has_passing, etc. |

### Data Loading Statistics

The algorithm outputs data loading statistics for debugging:

```
=== Data Loading Stats ===
Chemistry pairs loaded: 134
Rivalry pairs loaded: 134
Trios loaded: 545
Players with win rate: 18/18
Players with goal diff: 18/18
Players with position: 18/18
Players with attributes: 15/18
```

---

## Usage Guide

### Accessing the Algorithm

1. Navigate to **Admin Portal** → **Team Balancing**
2. Select players for the game
3. Choose **"Brute-Force Optimal"** algorithm (default)
4. Click **"Generate Teams"**

### Understanding the Output

The algorithm displays:

```
=== Brute-Force Optimal Algorithm ===
Combinations evaluated: 8,000
Compute time: 338ms
Balance score: 0.0127

=== Data Loading Stats ===
Chemistry pairs loaded: 134
Rivalry pairs loaded: 134
Trios loaded: 545

=== Score Breakdown ===
Core Ratings (40%): 0.0084
Chemistry (20%): 0.0160
  └─ Pairwise (50%): 0.0045
  └─ Rivalry (30%): 0.0425
  └─ Trio (20%): 0.0048
Performance (20%): 0.0006
Position (10%): 0.0370
Attributes (10%): 0.0461

=== Tier Distribution ===
Blue Team: 3-3-3 (top-mid-bottom)
Orange Team: 3-3-3 (top-mid-bottom)
```

### Applying Teams

After reviewing the generated teams:
1. Verify the tier distribution is correct (should be equal)
2. Check the balance score (lower is better)
3. Click **"Apply Teams"** to assign players

---

## Performance Benchmarks

### Real Test Results (January 2026)

| Metric | Value |
|--------|-------|
| Players | 18 |
| Combinations Evaluated | 8,000 |
| Compute Time | 338ms |
| Balance Score | 0.0127 |

### Component Breakdown

| Component | Score | Interpretation |
|-----------|-------|----------------|
| Core Ratings | 0.0084 | Excellent - ratings well balanced |
| Chemistry | 0.0160 | Excellent - chemistry evenly distributed |
| ↳ Pairwise | 0.0045 | Same-team synergies balanced |
| ↳ Rivalry | 0.0425 | Cross-team matchups slightly favor one side |
| ↳ Trio | 0.0048 | Trio effects balanced |
| Performance | 0.0006 | Excellent - form balanced |
| Position | 0.0370 | Good - minor position imbalance |
| Attributes | 0.0461 | Good - some attribute variance |

### Scaling Performance

| Players | Combinations | Time |
|---------|--------------|------|
| 12 | ~924 | <50ms |
| 18 | ~8,000 | ~340ms |
| 24 | ~64,000 | ~2-3 sec |

---

## Comparison with Legacy Algorithm

### Feature Comparison

| Feature | Brute-Force Optimal | Legacy (Tier-Based SA) |
|---------|---------------------|------------------------|
| **Optimal Guarantee** | Yes | No (heuristic) |
| **Deterministic** | Yes | No (random element) |
| **Transparency** | Full breakdown | Limited visibility |
| **Compute Time** | ~340ms | ~500ms |
| **Tuning Required** | Just weights | Many SA parameters |
| **Code Complexity** | 16 small files | 1 large file (412KB) |
| **Spread Constraint** | Strict thirds | 2-2 per tier |

### When to Use Each

| Use Brute-Force When | Use Legacy When |
|---------------------|-----------------|
| Standard games (12-22 players) | Very large games (24+ players) |
| Need guaranteed optimal solution | Need faster iteration |
| Want transparent scoring | Familiar with SA approach |

### Migration Notes

The legacy algorithm remains available as a fallback:
- Select **"Tier-Based (Legacy)"** in the algorithm selector
- Existing games will continue to work
- No data migration required

---

## Technical Implementation

### Entry Point

```typescript
// src/components/admin/team-balancing/bruteForceOptimal/index.ts

export async function generateOptimalTeams(
  playerIds: string[],
  options: BruteForceOptions = {}
): Promise<BruteForceTeamResult> {
  // 1. Load all data in parallel
  // 2. Merge into unified player objects
  // 3. Generate all valid combinations (spread constraint)
  // 4. Score each combination
  // 5. Return best result with breakdown
}
```

### Key Types

```typescript
interface BruteForcePlayer {
  player_id: string;
  friendly_name: string;
  attack: number;
  defense: number;
  gameIq: number;
  gk: number;
  overallRating: number;
  recentWinRate: number | null;
  recentGoalDiff: number | null;
  primaryPosition: string | null;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

interface BruteForceTeamResult {
  blueTeam: BruteForcePlayer[];
  orangeTeam: BruteForcePlayer[];
  balanceScore: number;
  scoreBreakdown: ScoreBreakdown;
  combinationsEvaluated: number;
  computeTimeMs: number;
  tierDistribution: TierDistribution;
  dataLoadingStats: DataLoadingStats;
}
```

### Extending the Algorithm

To add a new scoring component:

1. Create new file in `scoring/` folder
2. Export scoring function following pattern:
   ```typescript
   export function calculateNewScore(
     blueTeam: BruteForcePlayer[],
     orangeTeam: BruteForcePlayer[]
   ): number {
     // Return normalized score 0-1 (lower = better)
   }
   ```
3. Add to `scoring/index.ts`
4. Update weights in `types.ts`

---

## See Also

### Feature Documentation
- [Team Balancing Overview](../features/TeamBalancing.md) - High-level feature overview
- [Player Chemistry](../features/PlayerChemistry.md) - Chemistry system overview
- [Rivalry System](../features/RivalrySystem.md) - Head-to-head cross-team performance
- [Trio Chemistry](../features/TrioChemistry.md) - 3-player synergy tracking

### Algorithm History
- [Team Balancing Evolution](TeamBalancingEvolution.md) - Complete algorithm history
- [Tier-Based Snake Draft (Legacy)](../TierBasedSnakeDraftImplementation.md) - Previous algorithm documentation
