# Team Balancing Algorithm Improvements

## Overview
On September 10, 2025, significant improvements were made to the team balancing algorithm to enhance fairness, transparency, and team quality. These changes address issues where players were receiving excessive rating penalties and teams were being created with mismatched playstyles.

## Key Improvements

### 1. Performance Adjustment Caps (±15% Maximum)

#### Problem
Players with poor performance were receiving extreme rating penalties:
- Nathan: Base rating 5.96 → 4.64 (-22% penalty)
- James H: Base rating 4.08 → 3.19 (-22% penalty)

These excessive adjustments were unfairly punishing struggling players.

#### Solution
Implemented a maximum adjustment cap of ±15% of base rating:
```typescript
const MAX_RATING_ADJUSTMENT = 0.15; // 15% max change from base rating
```

#### Impact
- Nathan: Now 5.96 → 5.06 (-15% capped)
- James H: Now 4.08 → 3.47 (-15% capped)
- More reasonable adjustments that still reflect performance without being overly punitive

### 2. Attribute Balance Constraints

#### Problem
Teams could end up with drastically different playstyles (e.g., one team all pace-focused, other team all physical).

#### Solution
Added attribute balance constraints to swap evaluation:
```typescript
const ATTRIBUTE_BALANCE_THRESHOLD = 0.5; // Max acceptable attribute difference

// Reject swaps that create excessive attribute imbalance
if (attributeBalance > ATTRIBUTE_BALANCE_THRESHOLD && improvement < 0.2) {
  isSwapOk = false;
}
```

Also increased attribute weighting in balance calculations:
- Previous: 80% skills, 20% attributes
- New: 70% skills, 30% attributes

#### Impact
- Teams now have more balanced playstyles
- Prevents extreme mismatches in team characteristics
- Ensures both teams can play various tactical styles

### 3. Enhanced Debug Logging

#### Problem
Debug logs showed generic messages like `[Skills+Attrs]` without specifics about what was improving.

#### Solution
Created `generateImprovementDetails()` function that shows exact metric changes:

**Before:**
```
Trying Maddocks ↔ Alex E: balance 0.990 → 0.528 (improves by 0.462) [Skills+Attrs]
```

**After:**
```
Trying Maddocks ↔ Alex E: balance 0.990 → 0.528 (improves by 0.462) 
[Atk:0.25→0.03, Def:0.20→0.27, IQ:0.45→0.18, DefAttr:0.22→0.08, Phys:0.13→0.02]
```

#### Impact
- Clear visibility into what specific metrics are driving decisions
- Easier to understand why swaps are accepted or rejected
- Better transparency for debugging and validation

## Technical Implementation

### Files Modified
- `/src/components/admin/team-balancing/tierBasedSnakeDraft.ts`

### Key Functions Added/Modified

#### 1. `calculateThreeLayerRating()`
Enhanced with performance caps:
```typescript
// Cap individual performance adjustments
overallAdjustment = Math.max(-MAX_RATING_ADJUSTMENT / WEIGHT_OVERALL, 
                             Math.min(MAX_RATING_ADJUSTMENT / WEIGHT_OVERALL, overallAdjustment));

// Cap total combined adjustment
const cappedTotalAdjustment = Math.max(-MAX_RATING_ADJUSTMENT, 
                                       Math.min(MAX_RATING_ADJUSTMENT, totalAdjustment));
```

#### 2. `generateImprovementDetails()`
New function for detailed swap analysis:
```typescript
function generateImprovementDetails(
  beforeDetails: BalanceScoreDetails,
  afterDetails: BalanceScoreDetails
): string {
  // Shows specific skill and attribute changes
  // e.g., "Atk:0.30→0.03, Def:0.27→0.19, Pace:1.12→0.74"
}
```

#### 3. Swap Evaluation Logic
Enhanced to consider attribute balance:
```typescript
// Calculate attribute balance for this swap
const attributeBalance = calculateAttributeBalanceScore(tempBlue, tempOrange);

// Additional check for attribute imbalance
if (isSwapOk && attributeBalance > ATTRIBUTE_BALANCE_THRESHOLD) {
  if (improvement < 0.2) {
    isSwapOk = false;
  }
}
```

## Configuration Constants

```typescript
// Performance adjustment limits
const MAX_RATING_ADJUSTMENT = 0.15;        // 15% max change from base rating

// Attribute balance
const ATTRIBUTE_BALANCE_THRESHOLD = 0.5;   // Max acceptable attribute difference

// Balance calculation weights
const skillWeight = 0.7;                   // 70% for Attack/Defense/Game IQ
const attributeWeight = 0.3;               // 30% for playstyle attributes
```

## Debug Log Improvements

### Swap Evaluation Messages
Now shows specific metrics that improve:
- `Atk:0.25→0.03` - Attack difference improvement
- `Def:0.20→0.27` - Defense difference change
- `IQ:0.45→0.18` - Game IQ improvement
- `Pace:1.12→0.74` - Pace attribute balance
- `Shoot:0.74→0.45` - Shooting attribute balance

### Rejection Reasons
Clear explanations for why swaps are rejected:
- `REJECTED (attribute imbalance 2.24 > 0.5, improvement 0.023 < 0.20)`
- `REJECTED (Blue would get ALL 3 players from Tier 5)`

### KEY DECISIONS Section
Enhanced to show actual player statistics:
```
Swap 1: Maddocks ↔ Alex E
  Why: Atk:0.30→0.03, IQ:0.50→0.20, Pace:1.12→0.74
  Impact: Balance improved by 0.462
```

## Trade-offs

### Pros
- Fairer treatment of struggling players
- More balanced team playstyles
- Greater transparency in decision-making
- Prevents extreme rating penalties

### Cons
- Slightly fewer optimizations (more conservative)
- May result in less "perfectly" balanced teams numerically
- Attribute threshold (0.5) might be too strict in some cases

## Future Considerations

1. **Dynamic Thresholds**: Consider adjusting attribute threshold based on improvement magnitude
2. **Weighted Attributes**: Some attributes (e.g., Pace) might be more important than others
3. **Context-Aware Caps**: Different caps for different game formats or skill levels
4. **Historical Performance**: Weight recent form more heavily for momentum players

## Testing Recommendations

1. Monitor player satisfaction with rating adjustments
2. Track team balance outcomes over multiple games
3. Gather feedback on whether 0.5 attribute threshold is appropriate
4. Validate that 15% cap doesn't mask legitimate performance issues

## Conclusion

These improvements make the team balancing algorithm more fair and transparent while maintaining competitive balance. Players are protected from excessive penalties, teams have balanced playstyles, and the decision-making process is clearly documented in debug logs.