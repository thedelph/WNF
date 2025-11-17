# Team Balancing Algorithm Evolution

**Last Updated:** 2025-11-17

This document tracks the complete chronological history of team balancing algorithm improvements, from initial implementation through all major optimizations.

---

## 📊 Current Algorithm (v9.0 - 2025-11-17)

### Weighting Formula

**Total Rating = 60% Core Skills + 20% Playstyle Attributes + 20% Performance**

**Core Skills (60% total, 15% each):**
- Attack Rating
- Defense Rating
- Game IQ Rating
- GK Rating

**Playstyle Attributes (20% total):**
- Z-score scaled relative to league
- 6 attributes: Pace, Shooting, Passing, Dribbling, Defending, Physical

**Performance (20% total, 10% each):**
- Win Rate (with exponential penalties)
- Goal Differential

### Performance Adjustment Caps

```typescript
const MAX_PERFORMANCE_ADJUSTMENT = 0.15; // ±15% of base rating
```

**Example:**
- Player with 7.0 base rating
- Best case: 7.0 × 1.15 = 8.05 (+15%)
- Worst case: 7.0 × 0.85 = 5.95 (-15%)

### Key Constraints

**Position Balance (Hard Constraint):**
```typescript
const MAX_POSITION_GAP = 3;
```
No team can have 3+ more players in any category (GK/Defense/Midfield/Attack).

**Attribute Balance Threshold:**
```typescript
const ATTRIBUTE_BALANCE_THRESHOLD = 0.5;
```

---

## 🗓️ Evolution Timeline

### Phase 1: Foundation (2025-06-18 to 2025-06-30)

#### v1.0 - Academy Tier (2025-06-18)

**Change:** Player tier classification enhancement

**Details:**
- Players with 0 caps and 0 XP = "Academy" (deep teal gradient)
- Players with >0 caps and 0 XP = "Retired" (black)
- Helps differentiate new players from inactive ones

---

#### v1.1 - Game IQ Integration (2025-06-26)

**Change:** Added third core rating metric

**Details:**
- Introduced Game IQ rating (0-10 scale, displayed as 0-5 stars)
- Measures tactical awareness, positioning, decision-making
- Updated weighting: 20% Attack, 20% Defense, 20% Game IQ, 20% Win Rate, 20% Goal Differential

**Database:**
- `game_iq_rating` column in `player_ratings` table
- `game_iq` and `average_game_iq_rating` in `players` table

**Implementation Pattern:**
```typescript
const gameIq = player.game_iq ?? 0;  // Always null-safe
```

---

#### v2.0 - Unknown Player Distribution (2025-06-30)

**Problem:** Players with <10 games (unknown stats) could cluster on one team, disabling win rate/goal differential metrics.

**Solution:** Two-phase approach

**Phase 1 - Distribute Unknowns Evenly:**
```typescript
function distributeUnknowns(players: Player[]): TeamAssignment[] {
  const unknowns = players.filter(p => isUnknownPlayer(p));
  const experienced = players.filter(p => !isUnknownPlayer(p));

  // Distribute unknowns evenly between teams
  unknowns.forEach((player, index) => {
    const team = index % 2 === 0 ? 'blue' : 'orange';
    assignments.push({ player, team });
  });

  return assignments;
}
```

**Phase 2 - Optimize Experienced Players:**
- Standard optimization on remaining experienced players
- All performance metrics remain active

**UI Indicators:**
- "NEW" badges for <10 game players
- Team headers show new player count
- Confidence score (high/medium/low) based on unknown percentage

**Helper Function:**
```typescript
function isUnknownPlayer(player: Player): boolean {
  return player.total_games < 10;
}
```

---

#### v2.1 - Deterministic Unknown Distribution (2025-06-30)

**Problem:** Non-deterministic team generation due to random shuffling of unknowns.

**Solution:** Optimal combinatorial distribution

**Phase 1 - Find Optimal Unknown Split:**
```typescript
function findOptimalUnknownDistribution(unknowns: Player[]) {
  // Try all possible combinations
  const combinations = generateCombinationsOfSize(unknowns, unknowns.length / 2);

  let bestScore = Infinity;
  let bestCombination = null;

  combinations.forEach(combo => {
    // Calculate balance score for this split
    const score = calculatePartialBalanceScore(combo);

    if (score < bestScore) {
      bestScore = score;
      bestCombination = combo;
    }
  });

  return bestCombination;
}
```

**Benefits:**
- Same optimal configuration every time (deterministic)
- Unknowns distributed based on actual stats (Attack/Defense/Game IQ)
- Truly optimal balance before experienced players added

---

### Phase 2: Snake Draft Improvements (2025-07-17 to 2025-07-23)

#### v3.0 - True Snake Draft (2025-07-17)

**Problem:** Blue always picked first in Tier 1, alternation only with odd counts.

**Solution:** Randomized initial pick with alternation

```typescript
function applySnakeDraft(tiers: Tier[]): TeamAssignment[] {
  // Randomly select which team picks first
  let currentTeam = Math.random() < 0.5 ? 'blue' : 'orange';

  tiers.forEach((tier, tierIndex) => {
    // Alternate which team picks first in each tier
    if (tierIndex > 0) {
      currentTeam = currentTeam === 'blue' ? 'orange' : 'blue';
    }

    tier.players.forEach(player => {
      assignments.push({ player, team: currentTeam });
      currentTeam = currentTeam === 'blue' ? 'orange' : 'blue';
    });
  });

  return assignments;
}
```

**Benefits:**
- Fairness - highest rated player doesn't always go to same team
- Different team compositions each time
- Still maintains tier-based structure

---

#### v3.1 - Snake Draft Team Balance Fix (2025-07-17)

**Problem:** True snake draft could create imbalanced team sizes (10v8 instead of 9v9).

**Solution:** Pre-calculation and adjustment

```typescript
function balancedSnakeDraft(tiers: Tier[]): TeamAssignment[] {
  const totalPlayers = tiers.reduce((sum, tier) => sum + tier.players.length, 0);
  const targetSize = totalPlayers / 2;

  let bluePicks = 0;
  let orangePicks = 0;

  tiers.forEach((tier, tierIndex) => {
    tier.players.forEach(player => {
      // Check if team is at capacity
      if (bluePicks >= targetSize) {
        // Force to orange
        assignments.push({ player, team: 'orange' });
        orangePicks++;
      } else if (orangePicks >= targetSize) {
        // Force to blue
        assignments.push({ player, team: 'blue' });
        bluePicks++;
      } else {
        // Normal snake draft logic
        const team = determineTeamBySnakeDraft();
        assignments.push({ player, team });
        team === 'blue' ? bluePicks++ : orangePicks++;
      }
    });
  });

  return assignments;
}
```

**Benefits:**
- Guarantees balanced team sizes
- Maintains snake draft fairness
- Shows adjustments in debug log

---

#### v4.0 - Tier Distribution Awareness (2025-07-23)

**Problem:** One team could get all worst players in a tier (e.g., both James H and Mike M in Tier 5).

**Solution:** Quality concentration detection

```typescript
const TIER_QUALITY_SPREAD_THRESHOLD = 1.2;
const MIN_TIER_SIZE_FOR_CHECK = 3;

function validateTierDistribution(assignments: TeamAssignment[]): boolean {
  const issues = getTierDistributionIssues(assignments);
  return issues.length === 0;
}

function getTierDistributionIssues(assignments: TeamAssignment[]) {
  const issues: string[] = [];

  // Group by tier
  const tierAssignments = groupByTier(assignments);

  tierAssignments.forEach(tier => {
    if (tier.players.length < MIN_TIER_SIZE_FOR_CHECK) return;

    const bluePlayers = tier.players.filter(p => p.team === 'blue');
    const orangePlayers = tier.players.filter(p => p.team === 'orange');

    // Check rating spread
    const blueAvg = average(bluePlayers.map(p => p.effectiveRating));
    const orangeAvg = average(orangePlayers.map(p => p.effectiveRating));
    const spread = Math.abs(blueAvg - orangeAvg);

    if (spread > TIER_QUALITY_SPREAD_THRESHOLD) {
      issues.push(`Tier ${tier.name}: quality concentration detected (spread: ${spread})`);
    }
  });

  return issues;
}
```

**Swap Acceptance Logic:**
```typescript
function isSwapAcceptable(swap: Swap): boolean {
  // Don't allow swaps that worsen tier distribution
  const currentIssues = getTierDistributionIssues(currentAssignments);
  const newIssues = getTierDistributionIssues(assignmentsAfterSwap);

  return newIssues.length <= currentIssues.length;
}
```

**Changes:**
- Balance threshold: 0.5 → 0.3 (stricter)
- Prevents teams from getting all bottom players in any tier
- Allows beneficial optimization swaps
- Detailed rejection reasons in debug log

---

### Phase 3: Playstyle Integration (2025-09-05 to 2025-09-22)

#### v5.0 - Playstyle Attributes (2025-09-05 to 2025-09-17)

**Change:** Integration of 24 playstyles with 6 derived attributes

**Playstyle System:**
- 8 attacking styles (Finisher, Speedster, Dribbler, etc.)
- 9 midfield styles (Engine, Playmaker, Destroyer, etc.)
- 7 defensive styles (Rock, Sweeper, Fullback, etc.)

**Derived Attributes:**
- Pace, Shooting, Passing, Dribbling, Defending, Physical
- Each playstyle has weights totaling 2.0

**Initial Weighting:**
- 60% Core Ratings (Attack/Defense/Game IQ)
- 30% Derived Attributes
- 10% Performance

---

#### v5.1 - Attribute Calibration Fix (2025-09-08)

**Problem:** All players received positive attribute adjustments instead of relative mix.

**Root Cause:** Attributes provided pure positive adjustments (0-1 scale) rather than league-relative.

**Solution:** Z-score scaling

```typescript
function calculateLeagueAttributeStats(players: Player[]) {
  const stats = {
    pace: { mean: 0, stdDev: 0 },
    shooting: { mean: 0, stdDev: 0 },
    // ... other attributes
  };

  // Calculate mean and standard deviation for each attribute
  Object.keys(stats).forEach(attr => {
    const values = players.map(p => p.attributes[attr]);
    stats[attr].mean = mean(values);
    stats[attr].stdDev = standardDeviation(values);
  });

  return stats;
}

function calculateAttributeAdjustment(player: Player, leagueStats: Stats): number {
  let totalAdjustment = 0;

  Object.keys(player.attributes).forEach(attr => {
    // Z-score: (value - mean) / stdDev
    const zScore = (player.attributes[attr] - leagueStats[attr].mean) / leagueStats[attr].stdDev;

    // Scale to ±0.05 to ±0.3 range
    const adjustment = zScore * 0.15;  // 50-75x more impactful than before
    totalAdjustment += adjustment;
  });

  return totalAdjustment / Object.keys(player.attributes).length;
}
```

**Weight Rebalancing:**
- Reduced attributes: 30% → 20%
- Increased performance: 10% → 20%
- Ensures catastrophic performers (<30% win rate) get meaningful penalties

**Additional Enhancements:**
- Exponential performance penalties
- Dynamic balance thresholds
- Relaxed tier concentration: 1.2 → 1.5

---

#### v6.0 - Fairness & Transparency (2025-09-10)

**Key Improvements:**

**1. Performance Adjustment Caps:**
```typescript
const MAX_PERFORMANCE_ADJUSTMENT = 0.15; // ±15%

// Example: Nathan and James H previously lost 22% of rating
// Now capped at 15% maximum penalty
```

**2. Attribute Balance Constraints:**
```typescript
const ATTRIBUTE_BALANCE_THRESHOLD = 0.5;

function isSwapAcceptable(swap: Swap): boolean {
  const attributeImbalance = calculateAttributeImbalance(assignmentsAfterSwap);

  // Reject if attribute imbalance > 0.5
  if (attributeImbalance > ATTRIBUTE_BALANCE_THRESHOLD) {
    // Unless improvement is significant (> 0.2)
    if (swap.improvement < 0.2) {
      return false;
    }
  }

  return true;
}
```

Prevents teams with drastically different playstyles.

**3. Detailed Debug Logging:**
```typescript
// Before: "Swap improved balance"
// After: "Swap improved balance: Atk:0.30→0.03, Def:0.27→0.19, GIQ:0.15→0.12"

function generateImprovementDetails(before: Metrics, after: Metrics): string {
  return `Atk:${before.attack.toFixed(2)}→${after.attack.toFixed(2)}, ` +
         `Def:${before.defense.toFixed(2)}→${after.defense.toFixed(2)}, ` +
         `GIQ:${before.gameIq.toFixed(2)}→${after.gameIq.toFixed(2)}`;
}
```

**Weight Adjustment:**
- Increased attribute weight: 20% → 30% in balance calculations

---

#### v7.0 - Optimization Breakthrough (2025-09-22)

**Achievement:** 80% better balance (0.216 vs 1.061)

**Major Changes:**

**1. Attribute Balance Calculation:**
```typescript
// Old: MAX approach (single large diff blocks all swaps)
const attributeImbalance = Math.max(...attributeDifferences);

// New: Weighted average with penalty multipliers
function calculateAttributeBalance(blue: Team, orange: Team): number {
  const diffs = [
    Math.abs(blue.pace - orange.pace),
    Math.abs(blue.shooting - orange.shooting),
    // ... other attributes
  ];

  let weightedSum = 0;
  let totalWeight = 0;

  diffs.forEach(diff => {
    let weight = 1.0;

    // Apply penalty multipliers
    if (diff > 3.0) weight = 1.5;    // 50% penalty
    if (diff > 4.0) weight = 1.25;   // 25% penalty

    weightedSum += diff * weight;
    totalWeight += weight;
  });

  return weightedSum / totalWeight;
}
```

Prevents single large differences from blocking ALL swaps.

**2. Dynamic Threshold System:**
```typescript
function getDynamicThreshold(improvement: number, currentBalance: number, failedAttempts: number): number {
  let threshold = BASE_THRESHOLD; // 0.5

  // Factor 1: Improvement magnitude
  if (improvement > 0.05) threshold *= 1.0;
  if (improvement > 0.1) threshold *= 1.5;
  if (improvement > 0.2) threshold *= 2.0;
  if (improvement > 0.3) threshold *= 2.5;

  // Factor 2: Current balance (worse = more lenient)
  if (currentBalance > 1.0) threshold *= 1.3;
  if (currentBalance > 2.0) threshold *= 1.6;

  // Factor 3: Failed attempts (progressive relaxation)
  if (failedAttempts > 5) threshold *= 1.25;
  if (failedAttempts > 10) threshold *= 1.5;
  if (failedAttempts > 20) threshold *= 2.0;

  return threshold;
}
```

Multi-factor adjustments ensure swaps can happen even with attribute constraints.

**3. Multi-Pass Strategy:**
```typescript
function optimizeTeams(initialAssignments: TeamAssignment[]): TeamAssignment[] {
  let assignments = initialAssignments;

  // Pass 1: Skills Focus (2x attribute threshold)
  assignments = optimizationPass(assignments, { attributeMultiplier: 2.0 });

  // Pass 2: Balanced (1x threshold)
  assignments = optimizationPass(assignments, { attributeMultiplier: 1.0 });

  // Pass 3: Fine-tuning (0.8x threshold)
  assignments = optimizationPass(assignments, { attributeMultiplier: 0.8 });

  return assignments;
}
```

Different passes prioritize different objectives.

**4. Swap Priority System:**
```typescript
function calculateSwapPriority(swap: Swap): number {
  const weights = {
    skillImprovement: 0.4,   // 40%
    individualSkills: 0.3,   // 30%
    winRate: 0.2,            // 20%
    attributePenalty: -0.1   // -10% (penalty)
  };

  return (
    swap.skillImprovement * weights.skillImprovement +
    swap.individualSkills * weights.individualSkills +
    swap.winRateImprovement * weights.winRate -
    swap.attributeImbalance * weights.attributePenalty
  );
}
```

Prioritizes swaps with highest overall benefit.

**5. Fallback Strategies:**
```typescript
function optimizationPassWithFallback(assignments: TeamAssignment[], passes: number): TeamAssignment[] {
  let result = optimizationPass(assignments);

  // If no swaps made and balance is poor
  if (result.swapsMade === 0 && result.balanceScore > BASE_THRESHOLD * 1.5) {
    // Activate extreme relaxation
    result = optimizationPass(assignments, {
      failedAttempts: 30  // Simulates 30 failed attempts for progressive relaxation
    });
  }

  return result;
}
```

**Results:**
- Algorithm now makes 3-5 beneficial swaps (vs 0 before)
- Final balance score: ~0.2 (vs ~1.0 before)
- Trade-off: Accepts some tier concentration for better overall balance

---

### Phase 4: GK Integration (2025-10-08 to 2025-10-15)

#### v8.0 - GK Rating Integration (2025-10-08 to 2025-10-15)

**Change:** Fourth core rating metric

**GK Rating:**
- Measures shot-stopping, positioning, distribution, command of area, 1v1 ability
- 0-10 scale (displayed as 0-5 stars)
- Database: `gk_rating` in `player_ratings`, `gk` and `average_gk_rating` in `players`

**Weight Restructuring:**
```typescript
// Old: 3 core skills (20% each = 60%)
const coreSkills = (attack + defense + gameIq) / 3;

// New: 4 core skills (15% each = 60%)
const coreSkills = (attack + defense + gameIq + gk) / 4;
```

**Final Weighting:**
- 60% Core Skills (15% each: Attack, Defense, Game IQ, GK)
- 20% Playstyle Attributes (z-score scaled)
- 20% Performance (10% each: Win Rate, Goal Differential)

**Permanent Goalkeeper Feature:**

**Phase 0 Assignment** (pre-balancing):
```typescript
function assignPermanentGoalkeepers(players: Player[], permanentGKIds: string[]): TeamAssignment[] {
  const permanentGKs = players.filter(p => permanentGKIds.includes(p.id));

  // Sort by permanent GK rating
  permanentGKs.sort((a, b) => calculatePermanentGKRating(b) - calculatePermanentGKRating(a));

  const assignments: TeamAssignment[] = [];
  let currentTeam: Team = 'blue';

  // Distribute evenly (alternating)
  permanentGKs.forEach(gk => {
    assignments.push({ player: gk, team: currentTeam, isPermanentGK: true });
    currentTeam = currentTeam === 'blue' ? 'orange' : 'blue';
  });

  return assignments;
}

function calculatePermanentGKRating(player: Player): number {
  return (
    player.gk * 0.7 +              // 70% GK ability
    player.game_iq * 0.2 +         // 20% positioning/awareness
    player.performanceScore * 0.1  // 10% win rate/goal diff
  );
}
```

**Optimization Constraints:**
```typescript
function isSwapAcceptable(swap: Swap): boolean {
  // Exclude permanent GKs from swaps
  if (swap.player1.isPermanentGK || swap.player2.isPermanentGK) {
    return false;
  }

  // ... other checks
  return true;
}
```

Permanent GKs excluded from:
- Same-tier swaps
- Cross-tier swaps
- All optimization passes

**Team Stats Calculation Fix (2025-10-15):**
```typescript
function calculateTeamStats(team: Team, permanentGKIds: string[]) {
  const permanentGK = team.players.find(p => permanentGKIds.includes(p.id));

  return {
    // If team has permanent GK, use their rating (not average)
    gk: permanentGK ? permanentGK.gk : average(team.players.map(p => p.gk)),

    // Exclude permanent GK from Attack/Defense
    attack: average(team.players.filter(p => !permanentGKIds.includes(p.id)).map(p => p.attack)),
    defense: average(team.players.filter(p => !permanentGKIds.includes(p.id)).map(p => p.defense)),

    // Include permanent GK in Game IQ
    gameIq: average(team.players.map(p => p.game_iq))
  };
}
```

**Database:**
- `permanent_goalkeepers` table stores per-game selections
- RLS policies allow authenticated users (page admin-protected)

**UI Updates:**
- TeamBalancingOverview.tsx: Collapsible permanent GK selection
- TeamStats.tsx: GK metrics + 6-metric breakdown
- TeamList.tsx: GK rating + permanent GK badge 🥅
- FinalTeamComposition.tsx: GK rating in player cards
- WhatsApp export: 🧤 emoji next to permanent GK names

---

### Phase 5: Position Balance (2025-11-12 to 2025-11-13)

#### v9.0 - Position Balance Integration (2025-11-12)

**Change:** Hard constraint preventing position category gaps

**Ranked Position System:**
- 12 positions: GK, LB, CB, RB, LWB, RWB, LW, CM, RW, CAM, CDM, ST
- Players rank top 3 positions: 🥇 Gold (3 pts), 🥈 Silver (2 pts), 🥉 Bronze (1 pt)
- Consensus calculated from weighted points

**Position Categories:**
```typescript
export const POSITION_CATEGORIES = {
  GOALKEEPER: ['GK'],
  DEFENSE: ['LB', 'CB', 'RB', 'LWB', 'RWB'],
  MIDFIELD: ['CM', 'CAM', 'CDM'],
  ATTACK: ['LW', 'RW', 'ST']
};
```

**Hard Constraint:**
```typescript
const MAX_POSITION_GAP = 3;

function evaluateSwapPositionImpact(swap: Swap): boolean {
  const newAssignments = applySwap(currentAssignments, swap);

  const bluePositions = countPositionsByCategory(newAssignments.blue);
  const orangePositions = countPositionsByCategory(newAssignments.orange);

  for (const category of Object.keys(POSITION_CATEGORIES)) {
    const gap = Math.abs(bluePositions[category] - orangePositions[category]);

    if (gap >= MAX_POSITION_GAP) {
      return false;  // Reject swap
    }
  }

  return true;  // Accept swap
}
```

**Integration in `isSwapAcceptable()`:**
```typescript
function isSwapAcceptable(swap: Swap): boolean {
  // Existing checks...

  // Position balance check (HARD CONSTRAINT)
  if (!evaluateSwapPositionImpact(swap)) {
    debugLog(`❌ REJECTED: Position imbalance would exceed threshold`);
    return false;
  }

  return true;
}
```

Prevents swaps that create 3+ player gaps in any position category.

---

## 📈 Performance Metrics

### Balance Score Improvements

| Version | Typical Balance Score | Swaps Made | Notes |
|---------|----------------------|------------|-------|
| v1.0-v5.0 | 0.8-1.2 | 0-1 | Rigid constraints blocked swaps |
| v6.0 | 0.6-0.9 | 1-2 | Performance caps helped |
| v7.0 | 0.2-0.4 | 3-5 | **Breakthrough** - Dynamic thresholds |
| v8.0 | 0.2-0.4 | 3-5 | GK integration maintained performance |
| v9.0 | 0.2-0.4 | 3-5 | Position balance as hard constraint |

**80% improvement** from v6.0 to v7.0!

---

## 🔍 Algorithm Vagueness in User-Facing Content

**Important:** Keep algorithm details vague in user-facing content to prevent gaming the system.

**✅ Acceptable (vague):**
> "The algorithm considers multiple factors beyond just ratings"

**❌ Too Specific (allows gaming):**
> "The algorithm uses 60% core skills (Attack/Defense/Game IQ/GK), 20% playstyle attributes, and 20% performance metrics"

---

## 🔗 Related Documentation

- [Tier-Based Snake Draft Implementation](../TierBasedSnakeDraftImplementation.md) - Detailed current implementation
- [Team Balancing](../features/TeamBalancing.md) - User-facing feature overview
- [Multi-Objective Optimization Roadmap](../team-balancing/MultiObjectiveOptimizationRoadmap.md) - Future plans
- [Core Development Patterns](../systems/CoreDevelopmentPatterns.md) - Coding patterns

---

## 🎯 Key Takeaways

1. **Gradual Evolution:** Algorithm improved through many small iterations
2. **Data-Driven:** Each change addressed specific observed problems
3. **Trade-offs:** Better overall balance sometimes requires accepting tier concentration
4. **Constraints Matter:** Hard constraints (position balance) vs soft (attribute balance)
5. **Dynamic Thresholds:** Multi-factor threshold adjustments enable optimization
6. **Transparency:** Detailed debug logging helps understand and improve algorithm
7. **User Privacy:** Keep specifics vague to prevent gaming

---

## 📊 Current Best Practices

When modifying the algorithm:

1. **Test with real data** - Use actual player pools
2. **Compare before/after** - Track balance scores
3. **Document changes** - Update this file and debug logs
4. **Consider trade-offs** - No perfect solution exists
5. **User perspective** - How will this feel to players?
6. **Debug logging** - Add detailed reasons for decisions
7. **Gradual rollout** - Test with small groups first
