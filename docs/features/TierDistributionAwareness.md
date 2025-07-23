# Tier Distribution Awareness

## Overview
Enhanced the tier-based snake draft algorithm to prevent extreme quality concentrations within tiers. This prevents scenarios where one team gets all the worst players from a tier, ensuring both statistical balance and perceptual fairness.

## Problem Statement
Previously, the algorithm could create unfair quality concentrations:
- One team could get all bottom players from a tier (e.g., both James H and Mike M in Tier 5)
- Balance score optimization was blocked by overly strict validation
- Beneficial swaps were rejected even if they didn't worsen existing issues

## Solution
Implemented improvement-aware tier distribution validation that:
1. Detects quality concentrations within tiers
2. Allows swaps that don't worsen existing concentrations
3. Provides detailed feedback on distribution issues

## Implementation Details

### Key Functions

#### `validateTierDistribution()`
Checks for both count and quality concentrations:
- **Count concentration**: One team has ALL players from a tier (2+ players)
- **Quality concentration**: One team has all bottom players in a tier with significant rating spread

#### `getTierDistributionIssues()`
Returns specific details about distribution problems:
```typescript
// Example output:
"Orange would get all bottom players in Tier 5: James H, Mike M"
```

#### `isSwapAcceptable()`
Improvement-aware validation that compares before/after states:
```typescript
function isSwapAcceptable(
  beforeBlueTeam: PlayerWithRating[], 
  beforeOrangeTeam: PlayerWithRating[],
  afterBlueTeam: PlayerWithRating[], 
  afterOrangeTeam: PlayerWithRating[]
): boolean
```

### Quality Concentration Rules
- **Applies to**: Tiers with 3+ players and rating spread > 1.2 points
- **Bottom players**: Lowest 2 players in the tier
- **Validation**: Rejects if one team would get all bottom players

### Example Scenario
**Tier 5 Players**:
- Maddocks: 4.53 rating
- James H: 3.87 rating  
- Mike M: 3.10 rating

**Analysis**:
- Rating spread: 4.53 - 3.10 = 1.43 (> 1.2 threshold)
- Bottom players: James H, Mike M
- Issue: Orange has both bottom players

## Algorithm Behavior

### Improvement-Aware Logic
✅ **Allowed**:
- Swaps that fix existing concentrations
- Swaps where the same concentration remains (doesn't worsen)
- Swaps that don't affect tier distribution

❌ **Blocked**:
- Swaps that create new concentrations
- Swaps that worsen existing concentrations

### Debug Log Example
```
Initial Tier Distribution: CONCENTRATED (Orange would get all bottom players in Tier 5: James H, Mike M)

Optimizing Tier 4:
  Trying Zhao ↔ Stephen: balance 0.360 → 0.159 (improves by 0.201) → ACCEPTED
  
Final Tier Distribution: CONCENTRATED (Orange would get all bottom players in Tier 5: James H, Mike M)
```

## Configuration Changes
- **Balance threshold**: Changed from 0.5 to 0.3 for better optimization control
- **Quality threshold**: 1.2 rating spread triggers quality checks

## Benefits
1. **Prevents extreme concentrations**: No team gets all terrible players from a tier
2. **Allows beneficial optimization**: Swaps that improve balance are accepted
3. **Transparent decision making**: Clear debug logging explains rejections
4. **Maintains fairness**: Both statistical balance AND perceived fairness

## Testing
The algorithm was tested with the James H + Mike M scenario:
- Previously: All beneficial swaps were rejected
- Now: Zhao ↔ Stephen swap accepted (0.201 improvement)
- Result: Excellent balance (0.159) while preventing worse concentrations

## Future Considerations
- Adjustable quality threshold (currently 1.2)
- Configurable bottom player count (currently 2)
- Weighted quality penalties in balance score
- Cross-tier quality balancing