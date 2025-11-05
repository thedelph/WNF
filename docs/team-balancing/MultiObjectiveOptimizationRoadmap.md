# Multi-Objective Team Balancing - Implementation Roadmap

**Phases Remaining:** 3-8 (Phases 1-2 Complete ✅)
**Estimated Total Time:** 6-8 hours
**Priority Order:** 3 → 5 → 4 → 6 → 8 → 7 (testing throughout)

---

## Phase 3: Shooting-Aware Snake Draft (PREVENTIVE APPROACH)

**Goal:** Prevent shooting imbalances DURING the initial draft instead of fixing them afterward.

**Estimated Time:** 1 hour

**Priority:** HIGH - This prevents the problem at the source

### Implementation Details

**File:** `tierBasedSnakeDraft.ts`
**Function:** `applySnakeDraft()` (approximately lines 3100-3300)

#### Current Draft Logic:
```typescript
// Randomly select which team picks first
const firstPicker = Math.random() < 0.5 ? 'blue' : 'orange';

// For each tier, alternate who picks first
for (let tier = 1; tier <= numTiers; tier++) {
  const tierPlayers = /* players in this tier */;
  const pickOrder = determinePickOrder(tier, firstPicker);

  // Assign players in snake pattern
  for (let i = 0; i < tierPlayers.length; i++) {
    const team = pickOrder[i % 2];
    assignPlayer(tierPlayers[i], team);
  }
}
```

#### NEW: Add Shooting Distribution Tracking

**Step 1: Track shooting stats during draft**

Add after line ~3120 (after `firstPicker` is selected):

```typescript
// Track shooting distribution during draft
interface ShootingTracker {
  blueEliteCount: number;    // P90+ shooters
  orangeEliteCount: number;  // P90+ shooters
  bluePrimaryCount: number;  // P75+ shooters
  orangePrimaryCount: number; // P75+ shooters
}

const shootingTracker: ShootingTracker = {
  blueEliteCount: 0,
  orangeEliteCount: 0,
  bluePrimaryCount: 0,
  orangePrimaryCount: 0,
};

// Calculate shooting percentiles for all players
const allPlayers = Object.values(tierMap).flat();
const shootingDistribution = analyzeShootingDistribution(allPlayers);
```

**Step 2: Update tracking after each player assignment**

Add helper function before `applySnakeDraft()`:

```typescript
/**
 * Check if a player is an elite or primary shooter based on distribution
 */
function classifyShooter(
  player: PlayerWithRating,
  distribution: ShootingDistribution
): 'elite' | 'primary' | 'secondary' | 'none' {
  const shooting = player.derived_attributes?.shooting ?? 0;

  if (shooting >= distribution.p90) return 'elite';
  if (shooting >= distribution.p75) return 'primary';
  if (shooting >= distribution.p50) return 'secondary';
  return 'none';
}
```

**Step 3: Adjust pick order when imbalance detected**

After each tier assignment (insert around line 3180):

```typescript
// After completing tier assignments, check for shooting imbalance
const eliteGap = Math.abs(shootingTracker.blueEliteCount - shootingTracker.orangeEliteCount);
const primaryGap = Math.abs(shootingTracker.bluePrimaryCount - shootingTracker.orangePrimaryCount);

// If elite gap >= 2 AND next tier has shooters, adjust next tier's pick order
if (tier < numTiers && eliteGap >= 2) {
  const nextTierPlayers = tierMap[tier + 1] || [];
  const nextTierHasShooters = nextTierPlayers.some(p =>
    classifyShooter(p, shootingDistribution) !== 'none'
  );

  if (nextTierHasShooters) {
    // Swap which team picks first in next tier
    const teamBehind = shootingTracker.blueEliteCount < shootingTracker.orangeEliteCount ? 'blue' : 'orange';

    if (debugLog) {
      debugLog.value += `\n⚖️ SHOOTING FAIRNESS ADJUSTMENT:\n`;
      debugLog.value += `  Current elite shooter gap: ${eliteGap} (${teamBehind} team behind)\n`;
      debugLog.value += `  Adjusting Tier ${tier + 1} pick order to favor ${teamBehind} team\n`;
    }

    // Override normal alternation for next tier
    tierPickOrder[tier + 1] = teamBehind;
  }
}
```

**Step 4: Update shooting tracker after each player assignment**

In the player assignment loop (around line 3200):

```typescript
// After: assignPlayer(player, team)
// Add:
const shooterClass = classifyShooter(player, shootingDistribution);
if (team === 'blue') {
  if (shooterClass === 'elite') shootingTracker.blueEliteCount++;
  if (shooterClass === 'primary' || shooterClass === 'elite') shootingTracker.bluePrimaryCount++;
} else {
  if (shooterClass === 'elite') shootingTracker.orangeEliteCount++;
  if (shooterClass === 'primary' || shooterClass === 'elite') shootingTracker.orangePrimaryCount++;
}
```

### Expected Outcomes:

**Before (Pure Snake Draft):**
```
Tier 1: Blue picks first → Jarman (elite shooter)
Tier 2: Orange picks first → Jack G (primary shooter)
Tier 3: Blue picks first → Paul (elite shooter)
Tier 4: Orange picks first → Tom K (primary shooter)
Tier 5: Blue picks first → Stephen (elite shooter)

Result: Blue 3 elite, Orange 0 elite
```

**After (Shooting-Aware Draft):**
```
Tier 1: Blue picks first → Jarman (elite shooter)
        Blue: 1 elite, Orange: 0 elite
Tier 2: Orange picks first → Jack G (primary shooter)
        Blue: 1 elite, Orange: 0 elite
Tier 3: Blue picks first → would get Paul (elite)
        BUT gap would be 2, so ADJUST!
        ⚖️ Orange picks first → Paul (elite shooter)
        Blue: 1 elite, Orange: 1 elite ✓
Tier 4: Blue picks first (normal alternation)
Tier 5: Orange picks first → Stephen (elite shooter)
        Blue: 1 elite, Orange: 2 elite ✓

Result: Blue 1-2 elite, Orange 1-2 elite (balanced!)
```

### Debug Output Enhancement:

Add to debug log after draft completion:

```typescript
debugLog.value += `\nSHOOTING DISTRIBUTION SUMMARY:\n`;
debugLog.value += `  Elite Shooters (P90+):\n`;
debugLog.value += `    Blue: ${shootingTracker.blueEliteCount}, Orange: ${shootingTracker.orangeEliteCount}\n`;
debugLog.value += `    Gap: ${eliteGap} ${eliteGap <= 1 ? '✓' : '⚠️'}\n`;
debugLog.value += `  Primary Shooters (P75+):\n`;
debugLog.value += `    Blue: ${shootingTracker.bluePrimaryCount}, Orange: ${shootingTracker.orangePrimaryCount}\n`;
debugLog.value += `    Gap: ${primaryGap}\n`;
```

### Testing Checklist:

- [ ] Draft creates shooting balance within 1 elite shooter
- [ ] Adjustment only triggers when gap >= 2
- [ ] Debug log shows adjustment reasoning
- [ ] Overall balance score still acceptable (not worse than before)
- [ ] Test with different player pools (10, 14, 18, 22 players)

---

## Phase 4: Multi-Swap Combinations (ESCAPE LOCAL OPTIMA)

**Goal:** Try pairs of swaps simultaneously when single swaps aren't improving balance.

**Estimated Time:** 1-2 hours

**Priority:** MEDIUM-HIGH - Powerful for stuck states

### Implementation Details

**File:** `tierBasedSnakeDraft.ts`
**Location:** After `tryCrossTierSwaps()` returns (around line 2670)

#### When to Trigger Multi-Swap:

```typescript
// After attempting all single swaps
if (!improved && currentBalance > balanceThreshold) {
  // Try two-swap combinations as last resort
  if (debugLog) {
    debugLog.value += `\n  No single swaps improved balance. Trying two-swap combinations...\n`;
  }

  const twoSwapResult = tryTwoSwapCombinations(
    blueTeam,
    orangeTeam,
    currentBalance,
    permanentGKIds,
    debugLog
  );

  if (twoSwapResult.improved) {
    // Execute both swaps
    executeTwoSwaps(blueTeam, orangeTeam, twoSwapResult.swap1, twoSwapResult.swap2);
    currentBalance = twoSwapResult.newBalance;
    improved = true;
  }
}
```

#### New Function: `tryTwoSwapCombinations()`

Add before the optimization loop (around line 2400):

```typescript
/**
 * Try combinations of two swaps simultaneously to escape local optima
 * Only evaluates swaps involving tiers with the worst imbalances
 */
function tryTwoSwapCombinations(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  currentBalance: number,
  permanentGKIds?: string[],
  debugLog?: { value: string }
): {
  improved: boolean;
  swap1?: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  swap2?: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating };
  newBalance: number;
} {
  // Calculate current multi-objective score
  const multiScoreBefore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKIds);

  // Identify problem areas (worst 2 objectives)
  const objectives: Array<{ name: keyof MultiObjectiveScore; value: number }> = [
    { name: 'skillsBalance', value: multiScoreBefore.skillsBalance },
    { name: 'shootingBalance', value: multiScoreBefore.shootingBalance },
    { name: 'attributeBalance', value: multiScoreBefore.attributeBalance },
    { name: 'tierFairness', value: multiScoreBefore.tierFairness },
    { name: 'performanceGap', value: multiScoreBefore.performanceGap },
  ];

  // Sort by worst (highest) scores
  objectives.sort((a, b) => b.value - a.value);
  const worstObjectives = objectives.slice(0, 2);

  if (debugLog) {
    debugLog.value += `    Focus areas: ${worstObjectives.map(o => o.name).join(', ')}\n`;
  }

  // Get tiers with worst imbalances (focus search here)
  const problematicTiers = identifyProblematicTiers(blueTeam, orangeTeam);

  let bestCombinedScore = currentBalance;
  let bestSwap1: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating } | undefined;
  let bestSwap2: { bluePlayer: PlayerWithRating; orangePlayer: PlayerWithRating } | undefined;
  let foundImprovement = false;

  // Only try combinations within problematic tiers (limit search space)
  for (const tier1 of problematicTiers) {
    const tier1Blue = blueTeam.filter(p => p.tier === tier1);
    const tier1Orange = orangeTeam.filter(p => p.tier === tier1);

    for (const tier2 of problematicTiers) {
      if (tier2 <= tier1) continue; // Avoid duplicate combinations

      const tier2Blue = blueTeam.filter(p => p.tier === tier2);
      const tier2Orange = orangeTeam.filter(p => p.tier === tier2);

      // Try all combinations of (tier1 swap + tier2 swap)
      for (const b1 of tier1Blue) {
        for (const o1 of tier1Orange) {
          for (const b2 of tier2Blue) {
            for (const o2 of tier2Orange) {
              // Skip if swaps are redundant (same players)
              if (b1.player_id === b2.player_id || o1.player_id === o2.player_id) continue;

              // Create temporary teams with both swaps applied
              const tempBlue = [...blueTeam];
              const tempOrange = [...orangeTeam];

              // Apply swap 1
              const b1Idx = tempBlue.findIndex(p => p.player_id === b1.player_id);
              const o1Idx = tempOrange.findIndex(p => p.player_id === o1.player_id);
              if (b1Idx >= 0 && o1Idx >= 0) {
                tempBlue[b1Idx] = o1;
                tempOrange[o1Idx] = b1;
              }

              // Apply swap 2
              const b2Idx = tempBlue.findIndex(p => p.player_id === b2.player_id);
              const o2Idx = tempOrange.findIndex(p => p.player_id === o2.player_id);
              if (b2Idx >= 0 && o2Idx >= 0) {
                tempBlue[b2Idx] = o2;
                tempOrange[o2Idx] = b2;
              }

              // Evaluate combined result
              const multiScoreAfter = calculateMultiObjectiveScore(tempBlue, tempOrange, permanentGKIds);
              const evaluation = evaluateSwap(multiScoreBefore, multiScoreAfter);

              if (evaluation.isImprovement && multiScoreAfter.overall < bestCombinedScore) {
                bestCombinedScore = multiScoreAfter.overall;
                bestSwap1 = { bluePlayer: b1, orangePlayer: o1 };
                bestSwap2 = { bluePlayer: b2, orangePlayer: o2 };
                foundImprovement = true;

                if (debugLog) {
                  debugLog.value += `    Found two-swap: ${b1.friendly_name}↔${o1.friendly_name} + ${b2.friendly_name}↔${o2.friendly_name}\n`;
                  debugLog.value += `      Improved: [${evaluation.improvedObjectives.join(', ')}]\n`;
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    improved: foundImprovement,
    swap1: bestSwap1,
    swap2: bestSwap2,
    newBalance: bestCombinedScore,
  };
}

/**
 * Helper: Identify tiers with worst balance issues
 */
function identifyProblematicTiers(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[]
): number[] {
  const tierImbalances = new Map<number, number>();

  // Get all unique tiers
  const allTiers = new Set([...blueTeam, ...orangeTeam].map(p => p.tier ?? 1));

  allTiers.forEach(tier => {
    const blueInTier = blueTeam.filter(p => p.tier === tier);
    const orangeInTier = orangeTeam.filter(p => p.tier === tier);

    // Calculate imbalance: count difference + rating difference
    const countDiff = Math.abs(blueInTier.length - orangeInTier.length);
    const blueAvg = blueInTier.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueInTier.length;
    const orangeAvg = orangeInTier.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeInTier.length;
    const ratingDiff = Math.abs(blueAvg - orangeAvg);

    tierImbalances.set(tier, countDiff + ratingDiff);
  });

  // Return worst 2-3 tiers
  return Array.from(tierImbalances.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tier]) => tier);
}
```

### Expected Outcomes:

**Scenario:** Single swaps can't fix shooting + tier fairness simultaneously

**Before Multi-Swap:**
- Skills: 0.259, Shooting: 28.38, Tier: 2.8
- Single swap options:
  - Option A: Fixes shooting → 15.0 but worsens skills → 0.45 (rejected: >20% worsening)
  - Option B: Fixes tier → 1.5 but worsens shooting → 32.0 (rejected)
- Result: STUCK (no swaps accepted)

**After Multi-Swap:**
- Try combination: Swap A + Swap B simultaneously
  - Shooting: 28.38 → 16.5 (✓ improved)
  - Tier: 2.8 → 1.8 (✓ improved)
  - Skills: 0.259 → 0.35 (+35% but acceptable for dual improvement)
- Result: ACCEPTED (improves 2 objectives)

### Performance Considerations:

**Worst case complexity:** O(n^4) where n = players per tier
**Mitigation strategies:**
1. Only evaluate tiers with worst imbalances (2-3 tiers max)
2. Typical tier size: 3-4 players → 3^4 = 81 combinations per tier pair
3. Skip redundant combinations (same players)
4. Exit early when good solution found

**Estimated execution time:** 50-200ms (acceptable for admin tool)

### Testing Checklist:

- [ ] Only triggers when single swaps fail
- [ ] Finds improvements in stuck states
- [ ] Doesn't take more than 500ms to execute
- [ ] Debug log shows which swaps were combined
- [ ] Both swaps are executed correctly

---

## Phase 5: Soft Constraint System (REPLACE HARD BLOCKS)

**Goal:** Convert hard constraint violations (elite clustering, tier distribution) into penalty scores.

**Estimated Time:** 1 hour

**Priority:** HIGH - Eliminates the 21 blocked swaps issue

### Current Problem:

```typescript
// CURRENT (Hard Block):
if (afterEliteGap > 1 && afterEliteGap >= beforeEliteGap) {
  if (balanceImprovement < 0.30) {
    return { acceptable: false, rejectReason: 'Elite shooter clustering' };
  }
}
// This blocks 21 swaps that might improve other objectives!
```

### NEW Approach: Penalty Scoring

**Step 1: Define penalty function**

Add after `DEFAULT_WEIGHTS` (around line 135):

```typescript
/**
 * Penalty scoring for constraint violations
 * Returns penalty value (0 = no violation, higher = worse violation)
 */
interface ConstraintPenalties {
  eliteShooterGap: number;      // gap * 8.0
  shootingMeanGap: number;      // gap * 3.0
  tierConcentration: number;    // 5.0 per violation
  attributeImbalance: number;   // imbalance * 2.0
  winRateWorsening: number;     // gapIncrease * 4.0
}

function calculateSwapPenalties(
  blueTeam: PlayerWithRating[],
  orangeTeam: PlayerWithRating[],
  tempBlue: PlayerWithRating[],
  tempOrange: PlayerWithRating[],
  shootingDistribution: ShootingDistribution
): ConstraintPenalties {
  const penalties: ConstraintPenalties = {
    eliteShooterGap: 0,
    shootingMeanGap: 0,
    tierConcentration: 0,
    attributeImbalance: 0,
    winRateWorsening: 0,
  };

  // 1. Elite shooter gap penalty
  const beforeShootingStats = calculateShootingStats([...blueTeam, ...orangeTeam]);
  const afterShootingStats = calculateShootingStats([...tempBlue, ...tempOrange]);

  const blueEliteBefore = blueTeam.filter(p => (p.derived_attributes?.shooting ?? 0) >= beforeShootingStats.p90).length;
  const orangeEliteBefore = orangeTeam.filter(p => (p.derived_attributes?.shooting ?? 0) >= beforeShootingStats.p90).length;
  const beforeEliteGap = Math.abs(blueEliteBefore - orangeEliteBefore);

  const blueEliteAfter = tempBlue.filter(p => (p.derived_attributes?.shooting ?? 0) >= afterShootingStats.p90).length;
  const orangeEliteAfter = tempOrange.filter(p => (p.derived_attributes?.shooting ?? 0) >= afterShootingStats.p90).length;
  const afterEliteGap = Math.abs(blueEliteAfter - orangeEliteAfter);

  // Penalty only if gap increases or stays bad (>1)
  if (afterEliteGap > 1) {
    penalties.eliteShooterGap = afterEliteGap * 8.0;
  }

  // 2. Shooting mean gap penalty
  const blueMeanBefore = blueTeam.reduce((sum, p) => sum + (p.derived_attributes?.shooting ?? 0), 0) / blueTeam.length;
  const orangeMeanBefore = orangeTeam.reduce((sum, p) => sum + (p.derived_attributes?.shooting ?? 0), 0) / orangeTeam.length;
  const beforeMeanGap = Math.abs(blueMeanBefore - orangeMeanBefore);

  const blueMeanAfter = tempBlue.reduce((sum, p) => sum + (p.derived_attributes?.shooting ?? 0), 0) / tempBlue.length;
  const orangeMeanAfter = tempOrange.reduce((sum, p) => sum + (p.derived_attributes?.shooting ?? 0), 0) / tempOrange.length;
  const afterMeanGap = Math.abs(blueMeanAfter - orangeMeanAfter);

  if (afterMeanGap > beforeMeanGap * 1.2) {
    penalties.shootingMeanGap = afterMeanGap * 3.0;
  }

  // 3. Tier concentration penalty
  const beforeIssues = getTierDistributionIssues(blueTeam, orangeTeam);
  const afterIssues = getTierDistributionIssues(tempBlue, tempOrange);

  if (afterIssues && !beforeIssues) {
    penalties.tierConcentration = 5.0; // Creating new violation
  } else if (afterIssues && beforeIssues && afterIssues !== beforeIssues) {
    penalties.tierConcentration = 3.0; // Worsening existing violation
  }

  // 4. Attribute imbalance penalty
  const beforeAttrBalance = calculateAttributeBalanceScore(blueTeam, orangeTeam);
  const afterAttrBalance = calculateAttributeBalanceScore(tempBlue, tempOrange);

  if (afterAttrBalance > beforeAttrBalance * 1.3) {
    penalties.attributeImbalance = (afterAttrBalance - beforeAttrBalance) * 2.0;
  }

  // 5. Win rate worsening penalty
  const blueWRBefore = blueTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / blueTeam.length;
  const orangeWRBefore = orangeTeam.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / orangeTeam.length;
  const beforeWRGap = Math.abs(blueWRBefore - orangeWRBefore);

  const blueWRAfter = tempBlue.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempBlue.length;
  const orangeWRAfter = tempOrange.reduce((sum, p) => sum + (p.win_rate ?? 50), 0) / tempOrange.length;
  const afterWRGap = Math.abs(blueWRAfter - orangeWRAfter);

  if (afterWRGap > beforeWRGap * 1.5 && afterWRGap > 10) {
    penalties.winRateWorsening = (afterWRGap - beforeWRGap) * 4.0;
  }

  return penalties;
}

/**
 * Calculate total penalty score
 */
function getTotalPenalty(penalties: ConstraintPenalties): number {
  return penalties.eliteShooterGap +
         penalties.shootingMeanGap +
         penalties.tierConcentration +
         penalties.attributeImbalance +
         penalties.winRateWorsening;
}
```

**Step 2: Update swap evaluation to use penalties**

Modify `evaluateSwap()` function (around line 1570):

```typescript
function evaluateSwap(
  scoreBefore: MultiObjectiveScore,
  scoreAfter: MultiObjectiveScore,
  penaltiesBefore: ConstraintPenalties,
  penaltiesAfter: ConstraintPenalties,
  weights: OptimizationWeights = DEFAULT_WEIGHTS
): SwapEvaluation {
  // ... existing objective tracking ...

  // Calculate penalty-adjusted scores
  const totalPenaltyBefore = getTotalPenalty(penaltiesBefore);
  const totalPenaltyAfter = getTotalPenalty(penaltiesAfter);

  // Net improvement = (weighted score improvement) - (penalty increase)
  const scoreImprovement = scoreBefore.overall - scoreAfter.overall;
  const penaltyIncrease = totalPenaltyAfter - totalPenaltyBefore;
  const netImprovement = scoreImprovement - (penaltyIncrease * 0.1); // Penalty weight: 10%

  // Accept swap if net improvement is positive
  const isImprovement = netImprovement > 0;

  return {
    isImprovement,
    improvedObjectives,
    worsenedObjectives,
    scoreBefore,
    scoreAfter,
    netImprovement,
  };
}
```

**Step 3: Remove hard blocks from `isSwapAcceptable()`**

In `isSwapAcceptable()` function (around line 1750), replace hard blocks with soft checks:

```typescript
// REMOVE:
if (afterEliteGap > 1 && afterEliteGap >= beforeEliteGap) {
  if (balanceImprovement === undefined || balanceImprovement < 0.30) {
    return { acceptable: false, rejectReason: `Elite shooter clustering (gap: ${afterEliteGap})` };
  }
}

// REPLACE WITH:
// Elite clustering is now handled via penalty system
// Only block truly catastrophic cases (gap > 4)
if (afterEliteGap > 4) {
  return { acceptable: false, rejectReason: `Catastrophic shooter clustering (gap: ${afterEliteGap} > 4)` };
}
```

### Expected Outcomes:

**Before (Hard Constraints):**
```
21 swaps rejected due to "Elite shooter clustering (gap: 3)"
Even swaps that would improve shooting balance overall
```

**After (Soft Constraints):**
```
Swap: Jack G ↔ Paul
  Elite gap: 3 → 2 (improvement!)
  Penalty before: 3 * 8.0 = 24.0
  Penalty after: 2 * 8.0 = 16.0
  Penalty reduction: -8.0
  Score improvement: -0.05 (skills slightly worse)
  Net improvement: -0.05 - (-8.0 * 0.1) = -0.05 + 0.8 = +0.75 ✓
  Decision: ACCEPT (net positive improvement)
```

### Dynamic Penalty Weights:

For severe imbalances, increase penalty weights:

```typescript
// If current shooting imbalance > 25.0, increase elite gap penalty
const penaltyMultiplier = currentShootingImbalance > 25 ? 1.5 : 1.0;
penalties.eliteShooterGap *= penaltyMultiplier;
```

### Testing Checklist:

- [ ] Previously blocked swaps are now evaluated with penalties
- [ ] Swaps that reduce penalties are accepted
- [ ] Catastrophic cases (gap > 4) still blocked
- [ ] Net improvement calculation is correct
- [ ] Debug log shows penalty scores

---

## Phase 6: Tier Quality Scoring (ENHANCED FAIRNESS)

**Goal:** Detect and penalize structural advantages in tier distribution.

**Estimated Time:** 45 minutes

**Priority:** MEDIUM - Already partially implemented in Phase 2

### Enhancement 1: Quality-Weighted Tier Balance

The current `calculateTierFairness()` only checks if one team gets all bottom players. Enhance to consider cumulative quality:

```typescript
// ADD to calculateTierFairness() (around line 1470):

// Calculate quality-weighted tier balance
tierPlayers.forEach((players, tier) => {
  const blueInTier = players.filter(p => blueTeam.includes(p));
  const orangeInTier = players.filter(p => orangeTeam.includes(p));

  if (blueInTier.length > 0 && orangeInTier.length > 0) {
    // Calculate average rating for each team in this tier
    const blueAvgRating = blueInTier.reduce((sum, p) => sum + p.threeLayerRating, 0) / blueInTier.length;
    const orangeAvgRating = orangeInTier.reduce((sum, p) => sum + p.threeLayerRating, 0) / orangeInTier.length;

    // Calculate quality gap (normalized by tier size)
    const qualityGap = Math.abs(blueAvgRating - orangeAvgRating);
    const normalizedGap = qualityGap / tierSize;

    // Penalize if one team's average in this tier is significantly better
    if (normalizedGap > 0.3) {
      totalImbalance += normalizedGap * 2.0; // Quality penalty
    }
  }
});
```

### Enhancement 2: Tier Distribution Variance

Already implemented in Phase 2 (`calculateTierFairness()` lines 1465-1470). No changes needed.

### Testing Checklist:

- [ ] Detects when Blue gets better Tier 3 players than Orange
- [ ] Penalizes cumulative quality gaps, not just count differences
- [ ] Works with different tier sizes (3-5 players per tier)

---

## Phase 7: Configuration System (USER CUSTOMIZATION)

**Goal:** Allow admins to configure optimization weights and presets.

**Estimated Time:** 1-2 hours

**Priority:** LOW - Nice to have but not critical for algorithm function

### Implementation Details

**File:** `src/components/admin/team-balancing/types.ts`

Add configuration interface:

```typescript
export interface TeamBalancingConfig {
  weights: OptimizationWeights;
  presetName: 'balanced' | 'competitive' | 'statistical' | 'custom';
  enableShootingAwareDraft: boolean;
  enableMultiSwap: boolean;
  maxOptimizationRounds: number;
}

export const DEFAULT_CONFIG: TeamBalancingConfig = {
  weights: DEFAULT_WEIGHTS,
  presetName: 'balanced',
  enableShootingAwareDraft: true,
  enableMultiSwap: true,
  maxOptimizationRounds: 3,
};

export const PRESET_CONFIGS: Record<string, OptimizationWeights> = {
  balanced: {
    skillsBalance: 0.30,
    shootingBalance: 0.25,
    attributeBalance: 0.15,
    tierFairness: 0.15,
    performanceGap: 0.15,
  },
  competitive: {
    skillsBalance: 0.25,
    shootingBalance: 0.35,  // Prioritize goal-scoring
    attributeBalance: 0.10,
    tierFairness: 0.15,
    performanceGap: 0.15,
  },
  statistical: {
    skillsBalance: 0.40,    // Maximize statistical balance
    shootingBalance: 0.15,
    attributeBalance: 0.25,
    tierFairness: 0.10,
    performanceGap: 0.10,
  },
};
```

**UI Component:** `src/components/admin/team-balancing/ConfigurationPanel.tsx`

```tsx
export function ConfigurationPanel({
  config,
  onConfigChange
}: {
  config: TeamBalancingConfig;
  onConfigChange: (config: TeamBalancingConfig) => void;
}) {
  return (
    <div className="card bg-base-200 p-4">
      <h3 className="font-bold mb-4">Algorithm Configuration</h3>

      {/* Preset Selection */}
      <div className="form-control mb-4">
        <label className="label">Optimization Preset</label>
        <select
          className="select select-bordered"
          value={config.presetName}
          onChange={(e) => onConfigChange({
            ...config,
            presetName: e.target.value as any,
            weights: PRESET_CONFIGS[e.target.value]
          })}
        >
          <option value="balanced">Balanced (Default)</option>
          <option value="competitive">Competitive (Shooting Priority)</option>
          <option value="statistical">Statistical (Skills Priority)</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Weight Sliders */}
      {config.presetName === 'custom' && (
        <div className="space-y-3">
          <WeightSlider
            label="Skills Balance"
            value={config.weights.skillsBalance}
            onChange={(val) => onConfigChange({
              ...config,
              weights: { ...config.weights, skillsBalance: val }
            })}
          />
          {/* Similar sliders for other weights */}
        </div>
      )}

      {/* Feature Toggles */}
      <div className="form-control">
        <label className="label cursor-pointer">
          <span>Enable Shooting-Aware Draft</span>
          <input
            type="checkbox"
            className="toggle"
            checked={config.enableShootingAwareDraft}
            onChange={(e) => onConfigChange({
              ...config,
              enableShootingAwareDraft: e.target.checked
            })}
          />
        </label>
      </div>
    </div>
  );
}
```

### Testing Checklist:

- [ ] Preset selection updates weights correctly
- [ ] Custom sliders sum to 1.0 (show warning if not)
- [ ] Configuration persists across page reloads (localStorage)
- [ ] Different presets produce noticeably different results

---

## Phase 8: Enhanced Debug Output (VISUALIZATION)

**Goal:** Show multi-objective scores in debug log for transparency.

**Estimated Time:** 45 minutes

**Priority:** MEDIUM - Very helpful for understanding algorithm decisions

### Add to Debug Log

At the end of team generation (around line 4100):

```typescript
debugLog += `\n\n`;
debugLog += `═══════════════════════════════════════════════════════════════\n`;
debugLog += `MULTI-OBJECTIVE BALANCE ANALYSIS\n`;
debugLog += `═══════════════════════════════════════════════════════════════\n\n`;

const finalMultiScore = calculateMultiObjectiveScore(blueTeam, orangeTeam, permanentGKIds);

debugLog += `Individual Objective Scores (lower is better):\n`;
debugLog += `\n`;
debugLog += `  Skills Balance:     ${finalMultiScore.skillsBalance.toFixed(3)}`;
debugLog += finalMultiScore.skillsBalance < 0.30 ? ' ✓ Excellent' :
            finalMultiScore.skillsBalance < 0.50 ? ' ✓ Good' :
            finalMultiScore.skillsBalance < 1.00 ? ' ⚠ Fair' : ' ❌ Poor';
debugLog += `\n`;

debugLog += `  Shooting Balance:   ${finalMultiScore.shootingBalance.toFixed(2)}`;
debugLog += finalMultiScore.shootingBalance < 10.0 ? ' ✓ Excellent' :
            finalMultiScore.shootingBalance < 20.0 ? ' ✓ Good' :
            finalMultiScore.shootingBalance < 30.0 ? ' ⚠ Fair' : ' ❌ Poor';
debugLog += `\n`;

debugLog += `  Attribute Balance:  ${finalMultiScore.attributeBalance.toFixed(3)}`;
debugLog += finalMultiScore.attributeBalance < 0.50 ? ' ✓ Excellent' :
            finalMultiScore.attributeBalance < 1.00 ? ' ✓ Good' :
            finalMultiScore.attributeBalance < 2.00 ? ' ⚠ Fair' : ' ❌ Poor';
debugLog += `\n`;

debugLog += `  Tier Fairness:      ${finalMultiScore.tierFairness.toFixed(2)}`;
debugLog += finalMultiScore.tierFairness < 1.5 ? ' ✓ Excellent' :
            finalMultiScore.tierFairness < 2.5 ? ' ✓ Good' :
            finalMultiScore.tierFairness < 4.0 ? ' ⚠ Fair' : ' ❌ Poor';
debugLog += `\n`;

debugLog += `  Performance Gap:    ${finalMultiScore.performanceGap.toFixed(2)}`;
debugLog += finalMultiScore.performanceGap < 5.0 ? ' ✓ Excellent' :
            finalMultiScore.performanceGap < 10.0 ? ' ✓ Good' :
            finalMultiScore.performanceGap < 20.0 ? ' ⚠ Fair' : ' ❌ Poor';
debugLog += `\n\n`;

debugLog += `  Overall (Weighted): ${finalMultiScore.overall.toFixed(2)}\n`;
debugLog += `\n`;

// Show which objectives are optimal
const optimalCount = [
  finalMultiScore.skillsBalance < 0.50,
  finalMultiScore.shootingBalance < 20.0,
  finalMultiScore.attributeBalance < 1.00,
  finalMultiScore.tierFairness < 2.5,
  finalMultiScore.performanceGap < 10.0
].filter(x => x).length;

debugLog += `Objectives at target: ${optimalCount}/5\n`;
if (optimalCount >= 4) {
  debugLog += `Assessment: ✓✓ Excellent balance across all dimensions\n`;
} else if (optimalCount >= 3) {
  debugLog += `Assessment: ✓ Good balance with room for improvement\n`;
} else {
  debugLog += `Assessment: ⚠ Moderate balance, some objectives need attention\n`;
}
```

### Visual Representation (Optional Enhancement):

Create a radar chart showing all 5 objectives:

```typescript
// In a React component
import { Radar } from 'react-chartjs-2';

const data = {
  labels: ['Skills', 'Shooting', 'Attributes', 'Tier Fairness', 'Performance'],
  datasets: [{
    label: 'Balance Scores',
    data: [
      multiScore.skillsBalance,
      multiScore.shootingBalance / 10, // Normalize to same scale
      multiScore.attributeBalance,
      multiScore.tierFairness,
      multiScore.performanceGap / 10,
    ],
    backgroundColor: 'rgba(54, 162, 235, 0.2)',
    borderColor: 'rgb(54, 162, 235)',
  }]
};
```

---

## Testing Strategy

### Unit Tests (Create: `tierBasedSnakeDraft.test.ts`)

```typescript
describe('Multi-Objective Optimization', () => {
  describe('calculateTierFairness', () => {
    it('returns 0 for perfectly split tiers', () => {
      // Test with 2-2-2-2-2 distribution
    });

    it('detects quality concentration', () => {
      // Test with one team getting all bottom players
    });

    it('penalizes structural advantages', () => {
      // Test with 2-1 vs 1-2 tier imbalance
    });
  });

  describe('calculatePerformanceGap', () => {
    it('calculates win rate gap correctly', () => {
      // Test with different win rates
    });

    it('normalizes goal differential appropriately', () => {
      // Test with extreme goal differentials
    });
  });

  describe('evaluateSwap', () => {
    it('accepts swaps improving 2+ objectives', () => {
      // Test multi-objective improvement
    });

    it('rejects swaps worsening objectives by >20%', () => {
      // Test worsening threshold
    });

    it('accepts swaps with >5% overall improvement', () => {
      // Test overall score threshold
    });
  });
});
```

### Integration Tests

```typescript
describe('Team Balancing Integration', () => {
  it('fixes shooting imbalances from user example', async () => {
    const players = loadExamplePlayers(); // User's 18 players
    const result = await generateTierBasedTeams(players);

    expect(result.shootingImbalance).toBeLessThan(20.0);
    expect(result.eliteShooterGap).toBeLessThanOrEqual(2);
  });

  it('maintains skills balance while fixing shooting', () => {
    // Ensure skills don't get too imbalanced
    expect(result.skillsBalance).toBeLessThan(0.50);
  });

  it('produces better overall scores than before', () => {
    const oldScore = 8.47;
    expect(result.overallScore).toBeLessThan(oldScore);
  });
});
```

### Manual Testing Checklist

- [ ] Test with user's original 18 player example
- [ ] Test with different player counts (10, 14, 22)
- [ ] Test with all elite shooters on one side initially
- [ ] Test with severe skill imbalances
- [ ] Test with new players (<10 games)
- [ ] Compare old vs new debug logs side-by-side
- [ ] Verify execution time < 5 seconds
- [ ] Check memory usage doesn't spike

---

## Rollout Plan

### Stage 1: Internal Testing (Week 1)
- Deploy to development environment
- Test with historical player data
- Compare before/after results
- Document any edge cases

### Stage 2: Beta Testing (Week 2)
- Deploy behind feature flag
- Enable for 1-2 beta testers
- Collect feedback on balance quality
- Monitor for bugs or performance issues

### Stage 3: Production (Week 3)
- Deploy to all users
- Monitor first 5-10 games closely
- Gather user feedback
- Adjust weights if needed

---

## Success Metrics

### Quantitative:
- [ ] Shooting imbalance < 20.0 in 90% of games
- [ ] Elite shooter gap ≤ 2 in 95% of games
- [ ] Skills balance < 0.50 in 90% of games
- [ ] Overall multi-objective score < 7.0 average
- [ ] Algorithm execution time < 5 seconds

### Qualitative:
- [ ] Players report teams feel fair
- [ ] Fewer complaints about "all the shooters on one side"
- [ ] Games are more competitive (closer scores)
- [ ] Debug logs are understandable to non-technical admins

---

## Emergency Rollback Plan

If major issues are discovered:

1. **Quick Fix:** Revert to single-objective optimization by commenting out multi-objective evaluation
2. **Feature Flag:** Disable via configuration without code changes
3. **Backup:** Git commit before Phase 3+ allows clean revert to Phase 2 state

---

## Future Enhancements (Post-Phase 8)

1. **Machine Learning Integration:** Train model on historical game outcomes to predict balance quality
2. **Player Feedback Loop:** Allow players to rate team fairness, use data to adjust weights
3. **Position-Aware Balancing:** Consider player positions in formation suggestions
4. **Chemistry Factors:** Account for players who play well together
5. **Seasonal Adjustments:** Adjust ratings based on seasonal performance trends

---

## Maintenance & Monitoring

### Weekly:
- Review debug logs from recent games
- Check for any "Unknown reason" rejections (should be 0)
- Monitor average balance scores

### Monthly:
- Analyze player feedback
- Review edge cases
- Adjust weights if patterns emerge

### Quarterly:
- Run full regression test suite
- Compare balance quality across seasons
- Document lessons learned

---

## Contact & Support

For questions or issues during implementation:
- Reference: `MultiObjectiveOptimizationProgress.md` for what's been completed
- Debug: Check TypeScript errors first, then logic errors
- Testing: Start with Phase 3, it's the highest impact and easiest to test

**Good luck with the implementation! 🚀**
