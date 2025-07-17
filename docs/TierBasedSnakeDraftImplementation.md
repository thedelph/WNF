# Tier-Based Snake Draft Implementation

## Overview
Implemented a tier-based snake draft algorithm alongside the existing optimal team balancing algorithm. This allows comparison between two different approaches to team balancing.

## Changes Made

### 1. Core Algorithm Implementation
**File**: `src/components/admin/team-balancing/tierBasedSnakeDraft.ts`

#### Four-Layer Rating System (Conservative Weights)
- **Base Skill (70%)**: Average of Attack, Defense, and Game IQ ratings
- **Overall Performance (20%)**: Career win rate and goal differential
- **Recent Form (10%)**: Last 10 games performance
- **Momentum Factor (10%)**: Compares recent form to overall performance

#### Key Functions:
- `calculateThreeLayerRating()`: Computes adjusted player rating with momentum
- `calculateTierSizes()`: Determines tier distribution (e.g., 4-4-3-4-3 for 18 players)
- `applySnakeDraft()`: Implements snake draft with team balance checks
- `optimizeTeams()`: Tier-constrained optimization starting from lowest tier

#### Fixes Applied:
- Fixed rating calculation formula to allow both positive and negative adjustments
- Fixed snake draft to ensure balanced teams (9v9 instead of 10v8)
- Added team balance check with automatic player redistribution
- Fixed win rate handling to support both percentage (0-100) and decimal (0-1) formats
- Fixed `get_player_recent_goal_differentials` RPC function (was checking for 'played' status instead of 'selected')
- Fixed optimization to start from Tier 5 and respect threshold stopping
- Fixed Final Rankings Summary to use sorted player array
- Reduced transformation weights to be more conservative (70/20/10 from 60/25/15)

### 2. Data Structure Updates
**File**: `src/components/admin/team-balancing/types.ts`

Added fields to `TeamAssignment` interface:
```typescript
overall_win_rate?: number | null;        // Career win rate
overall_goal_differential?: number | null; // Career goal differential
```

### 3. Data Fetching Updates
**File**: `src/components/admin/team-balancing/useTeamBalancing.ts`

Modified to fetch both overall and recent stats:
- Uses `get_player_win_rates()` for career stats
- Uses `get_player_recent_win_rates()` for last 10 games
- Uses `get_player_recent_goal_differentials()` for recent goal differentials
- Properly handles null values for players with insufficient games

### 4. UI Components

#### TierBasedTeamGenerator
**File**: `src/components/admin/team-balancing/TierBasedTeamGenerator.tsx`
- Shows tier distribution with player ratings
- Displays confidence level based on unknown players
- Added "View Debug Log" button for detailed algorithm output

#### TeamAlgorithmComparison
**File**: `src/components/admin/team-balancing/TeamAlgorithmComparison.tsx`
- Side-by-side comparison of both algorithms
- Shows balance scores and player movements
- Indicates which algorithm produces better balance

### 5. Enhanced Debug Logging
The debug log now provides comprehensive insights with improved formatting and analysis:

#### Key Sections:
1. **Executive Summary** - Quick overview with algorithm type, player count, tier distribution, final balance, and team advantage
2. **Performance Categories Legend** - Explains rating categories and momentum indicators upfront
3. **Condensed Rating Summary** - Shows player transformations in a compact, easy-to-scan format
4. **Visual Snake Draft** - Improved visualization with flow arrows showing the snake pattern between tiers
5. **Team Balance Breakdown** - Detailed comparison of skills and performance metrics
6. **Team Strength Comparison** - Shows which team has advantages in each metric
7. **Optimization Impact Summary** - Details swaps made and quantifies improvement
8. **Key Decisions** - Explains WHY specific swaps improved balance with skill comparisons
9. **Draft Value Analysis** - Identifies best picks and potential reaches
10. **Team Composition by Tier** - Visual distribution using emojis (🔵🟠)

## Database Migrations

### Fixed Recent Goal Differentials Function
**Migration**: `fix_recent_goal_differentials_status_check`

The `get_player_recent_goal_differentials` function was returning empty results because it was checking for `status = 'played'` when the actual status in the database is `'selected'`. This has been fixed.

## Usage

1. Navigate to Admin Portal → Team Balancing
2. Click "Generate Optimal Teams" for the existing algorithm
3. Click "Generate Tier-Based Teams" for the new algorithm
4. Compare results in the comparison section
5. Click "View Debug Log" to see detailed algorithm execution

## Algorithm Behavior

### How Attack/Defense/Game IQ Are Used

The algorithm uses individual skill ratings in two distinct ways:

1. **For Player Ranking (Transformation Phase)**:
   - Attack, Defense, and Game IQ are averaged equally: `(Attack + Defense + Game IQ) / 3`
   - This creates a single "base skill rating"
   - The base skill is then transformed using performance metrics

2. **For Team Balance (Optimization Phase)**:
   - Attack, Defense, and Game IQ are kept separate
   - Team averages are calculated for each skill independently
   - Balance score = maximum difference across all three skills
   - This ensures teams are balanced in all dimensions, not just overall rating

### Four-Layer Rating Example
```
Player: Simon
  Base Skill: Attack=8.0, Defense=7.9, Game IQ=8.8
  Base Skill Rating: 8.24 (average of three skills)
  Overall Stats: Win Rate=59.30%, Goal Diff=35
  Recent Stats: Win Rate=60.00%, Goal Diff=15
  Overall Performance Score: 0.670
  Recent Form Score: 0.682
  Momentum: 0.012 (steady)
  Momentum Adjustment: 0.000
  Three-Layer Rating: 9.10 (adjusted from 8.24)
```

### Snake Draft Process
The draft follows a snake pattern with visual flow indicators:
```
Tier 1: → Simon(B) → Jarman(O) → Daniel(B) → Michael D(O) ↘
Tier 2: Tom K(O) ← Dom(B) ← Paul(O) ← Dave(B) ←
        ↓
Tier 3: → Joe(B) → Lewis(O) → Phil R(B) ↘
Tier 4: Darren W(B) ← Chris H(O) ← Jack G(B) ← Lee M(O) ←
        ↓
Tier 5: → Stephen(O) → Zhao(B) → James H(O)
```
The arrows (→, ←, ↘, ↓) show the draft flow between and within tiers.

### Tier-Constrained Optimization
```
TIER-CONSTRAINED OPTIMIZATION PHASE
Current Balance: 1.143
Threshold: 0.5
Only same-tier swaps allowed, starting from lowest tier

Optimizing Tier 5:
  Blue: Zhao
  Orange: Darren W, James H
  [attempts swaps within tier only]

Optimizing Tier 4:
  Blue: Jack G, Chris H
  Orange: Lee M, Stephen
  [stops when balance ≤ 0.5 threshold]
```

## Key Differences from Original Algorithm

1. **Player Evaluation**: Uses three-layer system with momentum (70/20/10 weights) vs five equal metrics
2. **Team Formation**: Snake draft vs exhaustive search
3. **Performance**: O(n log n) vs O(2^n) complexity
4. **Philosophy**: Ensures tier distribution vs pure statistical balance
5. **Optimization**: Tier-constrained same-tier swaps only, preserves clustering prevention
6. **Skill Usage**: Averages skills for ranking, but keeps them separate for balance checking

## Momentum Factor

### How It Works
- Compares recent form (last 10 games) to overall career performance
- Identifies players on hot streaks or cold streaks
- Hot streaks: 5% bonus (recent > overall) - reduced from 10%
- Cold streaks: 3% penalty (recent < overall) - reduced from 5%

### Categories
- **Hot (🔥)**: Recent performance significantly better than overall
- **Cold (❄️)**: Recent performance significantly worse than overall  
- **Steady (●)**: Recent performance similar to overall

### Example Impact (with Conservative Weights)
```
Player: Daniel
  Overall: 46% win rate
  Recent: 60% win rate
  Momentum: +0.17 (hot streak)
  Rating boost: +0.38 points (down from +0.58 with old weights)
```

### Weight Comparison
**Old Weights (60/25/15)**:
- More volatile transformations
- Daniel could jump above Jarman based on recent form
- Larger swings in player rankings

**Conservative Weights (70/20/10)**:
- Base skills more dominant
- Performance still matters but less dramatically
- Preserves fundamental skill hierarchy better

## Known Issues Resolved

1. **Win Rate Format**: Now handles both percentage (0-100) and decimal (0-1) formats
2. **Goal Differentials**: Fixed RPC function to use correct status filter
3. **Rating Formula**: Fixed to allow both positive and negative adjustments
4. **Optimization Order**: Fixed to start from Tier 5 (lowest) upwards
5. **Threshold Stopping**: Optimization stops when balance ≤ 0.5

## Enhanced Debug Log Features

### Executive Summary
Provides immediate overview at the top of the debug log:
- Algorithm type and configuration
- Player breakdown (rated vs new)
- Tier structure and sizes
- Final balance score with quality assessment
- Optimization summary
- Team advantage analysis

### Visual Improvements

#### Snake Draft Visualization
```
Tier 1: → Simon(B) → Jarman(O) → Daniel(B) → Michael D(O) ↘
Tier 2: Tom K(O) ← Dom(B) ← Paul(O) ← Dave(B) ←
        ↓
Tier 3: → Joe(B) → Lewis(O) → Phil R(B)
```
Flow arrows clearly show the snake pattern between tiers.

#### Team Composition
Visual representation using emojis:
```
Tier 1: 🔵🔵🟠🟠 (2B/2O)
Tier 2: 🔵🔵🟠🟠 (2B/2O)
Tier 3: 🔵🔵🟠 (2B/1O)
```

### Analytical Insights

#### Performance-Based Transformations
- **Major Rating Drops**: Shows players whose ratings dropped significantly due to poor performance
- **Major Rating Boosts**: Highlights players whose ratings increased due to strong performance
- **Momentum Analysis**: Identifies hot streaks (🔥) and cold streaks (❄️) with specific win rate changes

#### Key Decisions Section
When optimization occurs, explains WHY swaps were made:
```
KEY DECISIONS
=============
Swap 1: Zhao ↔ James H
  Why: Attack balance (James H: 2.1 vs Zhao: 5.6); Similar overall ratings maintain tier integrity
  Impact: Balance improved by 0.212
```

#### Draft Value Analysis
- **Best Value Picks**: Players who exceeded their tier's average rating
- **Potential Reaches**: Players without sufficient data in high tiers
- **Performance Adjustments**: Top players whose ratings changed most due to performance

### Team Analysis

#### Team Balance Breakdown
Detailed comparison showing:
- Individual skill averages (Attack, Defense, Game IQ)
- Performance metrics (Win Rate, Goal Differential)
- Overall balance score with quality assessment

#### Team Strength Comparison
Head-to-head comparison with visual indicators:
```
             Blue    Orange  Winner
Avg Rating:  6.36    6.21    Blue ↑
Attack:      6.16    6.35    Orange ↑
Defense:     6.61    6.24    Blue ↑
```

### Optimization Tracking
- Shows initial vs final balance scores
- Details each swap with quantified improvement
- Identifies which skills were better distributed
- Explains when optimization stops (threshold reached)

## Future Improvements

1. Add decay function for older stats
2. Consider player positions
3. Add chemistry factors
4. Allow custom weight configuration
5. Implement dynamic goal differential normalization based on actual data ranges
6. Add seasonal momentum (comparing this season to previous seasons)
7. Consider team context in individual performance metrics

## Interactive Visualization

### Overview
A comprehensive full-page visualization has been implemented to showcase the entire tier-based snake draft process. This transforms the detailed debug log into interactive, visual components.

### Accessing the Visualization
1. Generate teams using the tier-based algorithm
2. Click "View Full Visualization" button on the team balancing page
3. Or navigate directly to `/admin/team-balancing/visualization`

### Key Features
- **Algorithm Timeline**: Interactive navigation through all phases
- **Player Transformation Analysis**: Scatter plots, heatmaps, and category breakdowns
- **Tier Distribution**: Pyramid views and distribution charts
- **Snake Draft Simulator**: Step-by-step animation with playback controls
- **Balance Dashboard**: Radar charts, bar graphs, and balance gauges
- **Optimization Journey**: Visual tracking of team improvements
- **Final Team Composition**: Interactive player cards and team statistics

### Benefits
- Makes the complex algorithm understandable to non-technical users
- Provides visual proof of fair team balancing
- Allows exploration of how different factors affect team composition
- Export-ready visualizations for sharing with other admins

For detailed documentation, see: `/docs/features/TeamBalancingVisualization.md`