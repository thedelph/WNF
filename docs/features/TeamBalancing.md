# Team Balancing System

## Overview
The team balancing system ensures fair and competitive matches by automatically distributing players across two teams (Blue and Orange) based on multiple performance metrics.

## Balancing Metrics (Updated December 2025)

The system now considers **5 core metrics** plus **derived attributes** and **player chemistry**:

1. **Attack Rating** (0-10 scale)
   - Measures offensive capabilities
   - Based on player ratings from teammates

2. **Defense Rating** (0-10 scale)
   - Measures defensive capabilities
   - Based on player ratings from teammates

3. **Game IQ Rating** (0-10 scale) *(NEW)*
   - Measures tactical awareness, positioning, and decision-making
   - Based on player ratings from teammates

4. **Win Rate** (0-100%)
   - Calculated from recent games
   - Only included for players with 10+ games

5. **Goal Differential**
   - Average goal difference from recent games
   - Only included for players with 10+ games

6. **Derived Attributes** (from Playstyles)
   - **Pace**: Speed and acceleration
   - **Shooting**: Finishing and shot power
   - **Passing**: Vision and passing accuracy
   - **Dribbling**: Ball control and agility
   - **Defending**: Tackling and positioning
   - **Physical**: Strength and stamina
   - Automatically calculated from player playstyle ratings
   - Unrated players default to 0

7. **Player Chemistry** *(Added December 2025)*
   - Measures historical win rate when players are on the same team
   - Requires 10+ games together for reliable data
   - Algorithm balances total team chemistry between both teams
   - See [Player Chemistry](PlayerChemistry.md) for details

## Algorithm (Updated September 8, 2025)

### Three-Layer Rating System (Tier-Based Snake Draft)
When using the tier-based algorithm, player ratings are calculated with:
- **Layer 1 (60%)**: Core skills (Attack/Defense/Game IQ)
- **Layer 2 (20%)**: Derived attributes from playstyles
- **Layer 3 (20%)**: Performance metrics (12% track record + 8% recent form)

> **Note**: The weight distribution was rebalanced on September 8, 2025, reducing derived attributes from 30% to 20% and increasing performance metrics from 10% to 20%. This change was accompanied by a statistical scaling calibration fix that replaced simple attribute adjustments with z-score based scaling, creating more meaningful and balanced attribute impacts.

### Two-Phase Optimization Approach

#### Phase 1: Unknown Player Distribution
Players with <10 games ("unknowns") lack win rate and goal differential data. The algorithm:
1. Separates players into unknown (<10 games) and experienced (≥10 games) groups
2. Finds the optimal distribution of unknowns based on Attack/Defense/Game IQ
3. Evaluates all possible distributions and selects the best one

#### Phase 2: Experienced Player Optimization
1. With unknowns optimally pre-distributed, optimizes experienced player placement
2. Uses all 5 metrics for evaluation
3. Selects the combination with the lowest overall balance score

### Balance Score Calculation

#### Optimal Algorithm
For experienced players (all 5 core metrics):
```javascript
balanceScore = (attackDiff * 0.20) + 
               (defenseDiff * 0.20) + 
               (gameIqDiff * 0.20) +
               (winRateDiff * 0.20) + 
               (goalDiffDiff * 0.20)
```

For unknown players (3 metrics only):
```javascript
balanceScore = (attackDiff + defenseDiff + gameIqDiff) / 3
```

### Deterministic Results
- Same input always produces the same output
- No randomization involved
- Consistent team configurations

### Visual Indicators
- **"NEW" badge**: Players with <10 games
- **Team headers**: Show count of new players
- **Confidence score**: 
  - 🟢 High (<25% unknowns)
  - 🟡 Medium (25-50% unknowns)
  - 🔴 Low (>50% unknowns)

### Swap Recommendations
The system can suggest player swaps to improve balance:
- Calculates improvement for each possible swap
- Prioritizes swaps with the highest improvement
- Shows which metric benefits most from each swap

## UI Components

### Team Stats Display
Shows for each team:
- Average Attack, Defense, and Game IQ ratings
- Win Rate percentage
- Goal Differential
- Balance score breakdown by metric

### WhatsApp Export Format
```
📋 Proposed Teams For Next Game

🟠 Orange Team
⚔ Attack: 7.2
🛡 Defense: 6.8
🧠 Game IQ: 7.0
🏆 Win Rate: 52%
⚽ Goal Diff: +3

🔵 Blue Team
⚔ Attack: 7.1
🛡 Defense: 6.9
🧠 Game IQ: 6.9
🏆 Win Rate: 51%
⚽ Goal Diff: +2

📊 Differences
⚔ Attack Diff: 0.1
🛡 Defense Diff: 0.1
🧠 Game IQ Diff: 0.1
🏆 Win Rate Diff: 1%
⚽ Goal Diff: 1
⚖ Balance Score: 0.3
```

## Admin Features

### Manual Adjustments
Admins can:
- Manually move players between teams
- Lock specific players to teams
- Override automatic assignments

### Balance Visualization
- Color-coded balance indicators
- Star rating system (5 stars = perfect balance)
- Visual bars showing metric contributions

## Alternative Algorithm: Tier-Based Snake Draft

### Overview
An alternative team balancing approach that uses a tier-based snake draft system. This algorithm:
- Groups players into skill tiers based on a three-layer rating system
- Uses a snake draft pattern with randomized starting team
- Ensures balanced team sizes through smart adjustments

### Key Features
1. **Three-Layer Rating System**:
   - Core Skills (60%): Average of Attack, Defense, and Game IQ
   - Derived Attributes (20%): Six attributes from playstyles (Pace, Shooting, Passing, Dribbling, Defending, Physical)
   - Performance Metrics (20%): Career win rate and goal differential (12%) + recent form with momentum factor (8%)

2. **True Snake Draft**:
   - Randomly selects which team picks first
   - Alternates first pick between tiers (e.g., Blue→Orange→Blue→Orange)
   - Prevents the same team from always getting the highest-rated player

3. **Team Size Balancing**:
   - Pre-calculates potential imbalances
   - Adjusts pick order in final tiers if needed
   - Ensures teams differ by at most 1 player

4. **Tier-Constrained Optimization**:
   - Only allows same-tier player swaps
   - Preserves tier distribution while improving balance

### When to Use
- When you want to ensure fair distribution of skill levels
- When tier-based team composition is important
- For a more transparent, draft-style team selection

For detailed implementation, see: [Tier-Based Snake Draft Implementation](/docs/TierBasedSnakeDraftImplementation.md)

## Technical Implementation

### Key Files
- `/src/utils/teamBalancing.ts` - Core balancing algorithm
- `/src/components/admin/team-balancing/teamBalanceUtils.ts` - Unknown player distribution logic
- `/src/components/admin/team-balancing/OptimalTeamGenerator.tsx` - UI for team generation
- `/src/components/admin/team-balancing/tierBasedSnakeDraft.ts` - Tier-based snake draft algorithm
- `/src/hooks/useTeamBalancing.ts` - React hook for team management
- `/src/hooks/useTeamBalancingChemistry.ts` - Hook for fetching chemistry data

### Key Functions
```typescript
// Check if player has insufficient data
isUnknownPlayer(player: TeamAssignment): boolean

// Find optimal distribution of unknowns
findOptimalUnknownDistribution(unknownPlayers: TeamAssignment[], targetBlueCount: number)

// Calculate partial balance (3 metrics)
calculatePartialBalanceScore(team1: TeamAssignment[], team2: TeamAssignment[]): number

// Main algorithm entry point
findOptimalTeamBalance(players: TeamAssignment[]): TeamBalance
```

### Database Tables
- `balanced_team_assignments` - Stores team assignments
- `players` - Player ratings and statistics
- `player_ratings` - Individual rating records

## Best Practices

1. **Rating Requirements**
   - Ensure players have been rated by multiple teammates
   - Encourage honest, fair ratings

2. **Statistical Significance**
   - Win rate and goal differential require 10+ games
   - Players with fewer games use default values

3. **Manual Intervention**
   - Use sparingly to maintain algorithm integrity
   - Document reasons for manual changes

## Position Balancing (Added November 2025)

### Overview
The algorithm now enforces position balance constraints to prevent tactical imbalances:

### Position Categories
- **Defense**: LB, CB, RB, LWB, RWB
- **Midfield**: CM, CAM, CDM
- **Attack**: LW, RW, ST

### Hard Constraints
1. **Category Gap Limit**: No team can have 3+ more players in any position category
2. **Striker Balance**: When 2+ strikers are available, each team must have at least one

### Implementation
- Position balance checked during SA optimization
- Pipeline steps prevent swaps that create striker imbalances
- Debug logging shows position distribution and any constraint violations

### Example
```
Position Balance Status:
Blue Team: 2×CB, 1×CM, 1×ST
Orange Team: 1×CB, 1×CDM, 1×CM, 1×ST

Category Balance Check:
  Defenders: 2 gap ✅
  Midfielders: 0 gap ✅
  Attackers: 0 gap ✅

Individual Position Gaps:
  ST: Blue 1 vs Orange 1 (gap: 0) ✅
```

## Chemistry Balance (Added December 2025)

### Overview
The algorithm now considers player chemistry to ensure teams have similar levels of teammate familiarity and synergy.

### How It Works
1. **Data Fetching**: Chemistry data for all player pairs is fetched before balancing
2. **Team Chemistry Score**: Sum of all pairwise chemistry scores within each team
3. **Balance Objective**: Minimizes the difference between team chemistry totals (10% weight)
4. **Partnership Protection**: Swaps that break high-chemistry pairs (score > 50) incur a penalty

### Configuration
| Setting | Value |
|---------|-------|
| Default score (no history) | 35 |
| High chemistry threshold | 50+ |
| Minimum games | 10 |
| Objective weight | 10% |

### Graceful Degradation
- Pairs with <10 games: Use neutral default score
- Chemistry fetch fails: Algorithm proceeds without chemistry consideration

**See:** [Player Chemistry](PlayerChemistry.md) for full chemistry system documentation.

## Future Enhancements
- Historical performance trends
- Machine learning optimization