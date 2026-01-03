# Team Balancing Algorithm Fix - Implementation Plan

**Date:** 2026-01-03
**File:** `src/components/admin/team-balancing/tierBasedSnakeDraft.ts`
**Issue:** Algorithm produces teams with severe attribute imbalances (3.32 shooting gap = 7 vs 2 shooting threats) but grades them as 88/100 "EXCELLENT"

---

## 🔴 CRITICAL BUGS (Fix First)

### Bug 1: Simulated Annealing Disabled (Temperature = 0)
**Location:** Line 6965
**Current Code:**
```typescript
let temperature = 0;  // Deterministic mode: only accept improvements
```

**Impact:** SA can only accept better solutions (greedy hill-climbing), never explores the search space probabilistically. This prevents escaping local minima and finding better overall balance.

**Fix:**
```typescript
let temperature = 1.0;  // Start with high exploration
```

**Rationale:** SA needs T > 0 to accept probabilistically worse swaps that could lead to better final solutions. With T=0, the algorithm is stuck doing deterministic optimization only.

**Acceptance Probability Formula (already in code at line ~7200+):**
```typescript
const acceptanceProbability = Math.exp(-(newBalance - currentBalance) / temperature);
```
This only works when temperature > 0.

---

### Bug 2: Weak Attribute Weighting in Balance Score
**Location:** Line 1784
**Current Code:**
```typescript
const combinedBalance = (skillBalance * 0.85) + (attributeBalance * 0.15);
```

**Impact:** Attributes are only 15% of balance score. A gap of 3.32 shooting only contributes ~0.50 to balance score, easily masked by good skill balance.

**Example Math:**
- Skill balance: 0.50 (good)
- Attribute balance: 3.32 (catastrophic)
- **Current:** (0.50 × 0.85) + (3.32 × 0.15) = 0.425 + 0.498 = **0.923**
- **With 50/50:** (0.50 × 0.50) + (3.32 × 0.50) = 0.25 + 1.66 = **1.91** (worse score = more pressure to fix)

**Fix:**
```typescript
const combinedBalance = (skillBalance * 0.60) + (attributeBalance * 0.40);
```

**Rationale:** Attributes represent real in-game capabilities (shooting, defending, pace). A team with 7 shooting threats vs 2 has a massive gameplay advantage. Attributes should carry at least 40% weight, not 15%.

---

## 🟡 HIGH PRIORITY FIXES

### Bug 3: Lenient Attribute Gap Thresholds
**Location:** Lines 4136-4139
**Current Code:**
```typescript
if (maxGap > 4.0) attributeGrade = 'FAIL';
else if (maxGap > 3.5) attributeGrade = 'POOR';
else if (maxGap > 3.0) attributeGrade = 'ACCEPTABLE';  // ← 3.32 lands here!
else if (maxGap > 2.5) attributeGrade = 'GOOD';
```

**Impact:** A gap of 3.32 (on 0-10 scale) = 33% imbalance in attribute coverage. This should be POOR, not ACCEPTABLE.

**Fix:**
```typescript
if (maxGap > 3.5) attributeGrade = 'FAIL';       // Catastrophic gap
else if (maxGap > 2.5) attributeGrade = 'POOR';  // Severe gap (3.32 now lands here)
else if (maxGap > 2.0) attributeGrade = 'ACCEPTABLE';  // Noticeable gap
else if (maxGap > 1.5) attributeGrade = 'GOOD';  // Minor gap
```

**Rationale:** Real-world impact: 7 vs 2 shooting threats = 5-player difference = game-breaking. Threshold should reflect severity.

---

### Bug 4: Overly Generous Overall Grading Formula
**Location:** Lines 4044-4066
**Current Code:**
```typescript
const gradePoints = {
  'EXCELLENT': 100, 'GOOD': 80, 'ACCEPTABLE': 60, 'POOR': 40, 'FAIL': 0
};

const score =
  gradePoints[coreGrade] * 0.40 +
  gradePoints[avgRatingGrade] * 0.30 +
  gradePoints[attributeGrade] * 0.30;

if (score >= 85) return { grade: 'EXCELLENT', score };  // ← 88 qualifies!
```

**Impact:** With EXCELLENT core + EXCELLENT avg + ACCEPTABLE attributes:
(100 × 0.40) + (100 × 0.30) + (60 × 0.30) = **88 → EXCELLENT**

But ACCEPTABLE attributes = severe gameplay imbalance!

**Fix Option 1 - Stricter Thresholds:**
```typescript
if (score >= 90) return { grade: 'EXCELLENT', score };  // Raised from 85
if (score >= 75) return { grade: 'GOOD', score };       // Raised from 70
if (score >= 55) return { grade: 'ACCEPTABLE', score }; // Raised from 50
```

**Fix Option 2 - Require All Components GOOD or Better:**
```typescript
// If any component is ACCEPTABLE or worse, cap grade at GOOD
if (attributeGrade === 'ACCEPTABLE' || coreGrade === 'ACCEPTABLE' || avgRatingGrade === 'ACCEPTABLE') {
  if (score >= 70) return { grade: 'GOOD', score: Math.min(score, 79) };
}

// Otherwise, use normal thresholds
if (score >= 85) return { grade: 'EXCELLENT', score };
```

**Recommendation:** Use Option 2 (component-based cap) for better semantic correctness.

---

## 🟢 MEDIUM PRIORITY IMPROVEMENTS

### Enhancement 1: Integrate Shooting Imbalance Score
**Location:** Line 1194 (`calculateShootingImbalance` function exists but unused)
**Current State:** Function calculates elite shooter clustering with 8.0x penalty, but result isn't incorporated into final scoring.

**Fix:** Add shooting imbalance to attribute balance calculation:
```typescript
// In calculateAttributeBalanceScore() around line 1097
const shootingImbalance = calculateShootingImbalance(blueTeam, orangeTeam);

// Weight shooting imbalance more heavily (it's game-critical)
return (avgDiff * penaltyMultiplier * dominancePenalty) + (shootingImbalance * 0.3);
```

**Rationale:** Shooting threats are more critical than general shooting averages. Elite shooters (0.80+ shooting) have outsized impact. This adds a specialized penalty for elite shooter clustering.

---

### Enhancement 2: Relaxed Position Constraints for Critical Swaps
**Location:** Throughout swap evaluation (lines ~7500-7700)
**Current State:** Position imbalances (e.g., 3 vs 0 RBs) cause hard rejections even for swaps that fix catastrophic attribute gaps.

**Fix:** Implement graduated position penalties instead of hard rejects:
```typescript
// Current: Hard reject if position gap >= 3
// New: Soft penalty based on gap size

function calculatePositionPenalty(bluePositions: Map, orangePositions: Map): number {
  let maxGap = 0;
  const allPositions = new Set([...bluePositions.keys(), ...orangePositions.keys()]);

  for (const pos of allPositions) {
    const gap = Math.abs((bluePositions.get(pos) || 0) - (orangePositions.get(pos) || 0));
    maxGap = Math.max(maxGap, gap);
  }

  // Graduated penalties
  if (maxGap >= 4) return 0.50;  // Severe penalty
  if (maxGap >= 3) return 0.20;  // Moderate penalty (old hard reject)
  if (maxGap >= 2) return 0.05;  // Minor penalty
  return 0;
}
```

**Rationale:** Position gaps of 3 vs 0 are problematic but NOT catastrophic. A 3.32 shooting gap (7 vs 2 threats) is worse than having 3 RBs vs 0 RBs. The algorithm should allow trading position imbalance for attribute balance when the swap is worth it.

---

### Enhancement 3: Multi-Objective Swap Scoring
**Location:** Swap evaluation logic (lines ~7300-7800)
**Current State:** Swaps are evaluated primarily on balance score delta with sequential validation checks.

**Fix:** Use weighted multi-objective scoring:
```typescript
function evaluateSwapQuality(
  balanceDelta: number,
  attributeDelta: number,
  positionPenalty: number,
  skillDominancePenalty: number
): number {
  return (
    balanceDelta * 0.40 +           // Overall balance improvement
    attributeDelta * 0.30 +         // Attribute-specific improvement
    -positionPenalty * 0.15 +       // Position balance penalty (negative = cost)
    -skillDominancePenalty * 0.15   // Skill dominance penalty
  );
}
```

**Rationale:** Sequential validation (skills → attributes → positions) creates rigid hierarchy. Multi-objective scoring allows trading off small skill imbalance for large attribute improvement.

---

## 🔵 LOW PRIORITY / NICE-TO-HAVE

### Enhancement 4: Adaptive Cooling Schedule
**Location:** Lines 7004-7020 (SA loop)
**Current State:** Fixed 0.80 cooling rate (20% reduction per round).

**Fix:** Adaptive cooling based on progress:
```typescript
// If making good progress, cool slower (more exploration)
if (madeImprovementThisRound) {
  temperature *= 0.85;  // Cool 15% (slower)
} else {
  temperature *= 0.75;  // Cool 25% (faster)
}
```

**Rationale:** When finding improvements, explore more. When stuck, converge faster.

---

### Enhancement 5: Better Debug Logging for Rejection Reasons
**Location:** Throughout swap evaluation
**Current State:** Rejections show penalty amounts but not clear prioritization.

**Fix:** Add decision tree logging:
```typescript
if (debugLog && swapRejected) {
  debugLog.value += `
  → REJECTED: ${primaryReason}
    Decision tree:
    1. Catastrophic attribute gap (${attrGap.toFixed(2)}): ${attrGap > 2.5 ? 'YES ❌' : 'NO ✓'}
    2. Skill dominance (${skillSplit}): ${isDominated ? 'YES ⚠️' : 'NO ✓'}
    3. Position balance: penalty=${posPenalty.toFixed(2)}
    4. Overall weighted score: ${weightedScore.toFixed(3)}
  `;
}
```

**Rationale:** Makes debugging easier, helps understand why specific swaps were rejected.

---

## 📊 IMPLEMENTATION SEQUENCE

### Phase 1: Critical Fixes (Est. 1-2 hours)
1. ✅ **Fix SA temperature** (line 6965): Change `0` → `1.0`
2. ✅ **Fix attribute weighting** (line 1784): Change `0.85/0.15` → `0.60/0.40`
3. ✅ **Fix attribute thresholds** (lines 4136-4139): Tighten POOR/ACCEPTABLE boundaries
4. ✅ **Fix overall grading** (lines 4044-4066): Add component-based cap

**Verification:** Re-run debug log scenario. Expected outcome:
- Balance score should worsen from 0.508 → ~0.8-1.0 (due to higher attribute weight)
- SA should make different swaps (due to probabilistic exploration)
- Final grade should be GOOD (70-75) instead of EXCELLENT (88)

---

### Phase 2: High Priority (Est. 2-3 hours)
5. ✅ **Integrate shooting imbalance** into attribute scoring
6. ✅ **Implement graduated position penalties**
7. ✅ **Refactor to multi-objective swap scoring**

**Verification:** Should fix shooting gap from 3.32 → <2.5 consistently.

---

### Phase 3: Polish (Est. 1-2 hours)
8. ✅ **Adaptive cooling schedule**
9. ✅ **Enhanced debug logging**
10. ✅ **Documentation updates**

---

## 🧪 TEST SCENARIOS

### Test 1: Current Failing Case
**Input:** 18 players from debug log (Simon, Jarman, Daniel, Dom, Jimmy, Chris H, ...)
**Current Result:**
- Shooting gap: 3.32 (7 vs 2 threats)
- Grade: 88/100 EXCELLENT
- Balance score: 0.508

**Expected After Fix:**
- Shooting gap: <2.5 (5 vs 4 threats or better)
- Grade: 70-79 GOOD (or ACCEPTABLE if still problematic)
- Balance score: 0.6-0.8 (worse = more accurate reflection)

---

### Test 2: Balanced Scenario
**Input:** 18 players with even attribute distribution
**Expected:** Should still achieve EXCELLENT grade (verify we didn't over-tighten)

---

### Test 3: Extreme Case
**Input:** 18 players where 9 have elite shooting, 9 have none
**Expected:**
- Algorithm should distribute 5-4 or 4-5 (best possible)
- Grade: ACCEPTABLE or GOOD (acknowledge inherent imbalance)
- Should NOT claim EXCELLENT if gap remains >2.0

---

## 📝 SPECIFIC CODE CHANGES

### Change 1: SA Temperature
```diff
- let temperature = 0;                // Deterministic mode: only accept improvements
+ let temperature = 1.0;               // Start with high exploration for probabilistic annealing
```

### Change 2: Attribute Weight
```diff
- const combinedBalance = (skillBalance * 0.85) + (attributeBalance * 0.15);
+ const combinedBalance = (skillBalance * 0.60) + (attributeBalance * 0.40);
```

### Change 3: Attribute Thresholds
```diff
- if (maxGap > 4.0) attributeGrade = 'FAIL';
- else if (maxGap > 3.5) attributeGrade = 'POOR';
- else if (maxGap > 3.0) attributeGrade = 'ACCEPTABLE';
- else if (maxGap > 2.5) attributeGrade = 'GOOD';
+ if (maxGap > 3.5) attributeGrade = 'FAIL';
+ else if (maxGap > 2.5) attributeGrade = 'POOR';
+ else if (maxGap > 2.0) attributeGrade = 'ACCEPTABLE';
+ else if (maxGap > 1.5) attributeGrade = 'GOOD';
```

### Change 4: Overall Grade Cap
```diff
function calculateOverallGrade(...): { grade: ValidationGrade; score: number } {
  if (!positionValid) return { grade: 'FAIL', score: 0 };

  const gradePoints: Record<ValidationGrade, number> = {
    'EXCELLENT': 100, 'GOOD': 80, 'ACCEPTABLE': 60, 'POOR': 40, 'FAIL': 0
  };

  const score =
    gradePoints[coreGrade] * 0.40 +
    gradePoints[avgRatingGrade] * 0.30 +
    gradePoints[attributeGrade] * 0.30;

+ // Cap grade if any component is ACCEPTABLE or worse
+ const hasAcceptableComponent =
+   attributeGrade === 'ACCEPTABLE' ||
+   coreGrade === 'ACCEPTABLE' ||
+   avgRatingGrade === 'ACCEPTABLE';
+
+ if (hasAcceptableComponent && score >= 70) {
+   return { grade: 'GOOD', score: Math.min(score, 79) };
+ }

  if (score >= 85) return { grade: 'EXCELLENT', score };
  if (score >= 70) return { grade: 'GOOD', score };
  if (score >= 50) return { grade: 'ACCEPTABLE', score };
  if (score >= 30) return { grade: 'POOR', score };
  return { grade: 'FAIL', score };
}
```

---

## ✅ SUCCESS CRITERIA

After implementing all Phase 1 fixes, the algorithm should:

1. **Never grade EXCELLENT** if any attribute gap > 2.5
2. **Actively explore** sub-optimal swaps via SA (not just greedy)
3. **Prioritize attribute balance** at ~40% weight (not 15%)
4. **Produce realistic grades** that reflect actual gameplay balance

**Specific to debug log case:**
- Shooting gap should reduce: 3.32 → <2.5
- Grade should reduce: 88/100 → 70-79/100
- SA should show temperature cooling in logs (not stuck at 0.000)

---

## 🚧 RISKS & MITIGATION

### Risk 1: Over-Correction
**Concern:** Increasing attribute weight to 40% might over-prioritize attributes vs core skills.
**Mitigation:** Run test suite with balanced scenarios to verify EXCELLENT grades still achievable with good balance.

### Risk 2: SA Exploration Instability
**Concern:** Temperature = 1.0 might accept too many bad swaps early on.
**Mitigation:** Monitor SA logs for oscillation. If unstable, reduce initial temperature to 0.8-0.9.

### Risk 3: Threshold Changes Too Strict
**Concern:** Tightening thresholds might make EXCELLENT grades unachievable.
**Mitigation:** Verify with historical data that balanced teams still score 85+.

---

## 📚 DOCUMENTATION UPDATES NEEDED

After implementation:

1. **Update `/docs/algorithms/TeamBalancingEvolution.md`**
   Add section: "2026-01 Phase 3: Attribute Balance Priority Shift"

2. **Update `/docs/features/TeamBalancing.md`**
   Document new validation thresholds and grading formula

3. **Update `CLAUDE.md`**
   Add note about SA temperature fix and attribute weighting change

---

## 🎯 SUMMARY

**Root Cause:** Algorithm has correct structure but wrong priorities:
- SA disabled (T=0)
- Attributes under-weighted (15% vs should be 40%)
- Thresholds too lenient (3.32 = ACCEPTABLE should be POOR)
- Grading too generous (allows EXCELLENT with ACCEPTABLE components)

**Solution:** Rebalance priorities to reflect real gameplay impact:
- Enable SA exploration (T=1.0)
- Weight attributes fairly (40%)
- Tighten thresholds (realistic expectations)
- Grade honestly (no EXCELLENT with severe gaps)

**Expected Impact:**
- More balanced shooting distribution (5-4 instead of 7-2)
- Honest grades (GOOD/ACCEPTABLE for flawed balance)
- Better exploration (SA finds non-obvious improvements)
- User trust (grades match perceived fairness)
