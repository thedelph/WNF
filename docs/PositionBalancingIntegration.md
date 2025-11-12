# Position Balancing Integration Guide

This document provides step-by-step instructions for integrating position balancing constraints into the tier-based snake draft algorithm.

## Overview

Position balancing prevents tactical imbalances by ensuring teams have similar distributions of players across position categories (Goalkeeper, Defense, Midfield, Attack). This prevents situations like one team having 4 strikers while the other has 1.

## Files Created

1. **`src/types/positions.ts`** - TypeScript types for positions
2. **`src/constants/positions.ts`** - Position configurations and constants
3. **`src/utils/positionClassifier.ts`** - Position classification utilities
4. **`src/utils/positionBalancing.ts`** - Position balancing constraint checking
5. **`src/components/ratings/PositionSelector.tsx`** - UI component for selecting positions
6. **`supabase/migrations/20251112_add_position_ratings.sql`** - Database schema

## Integration Points in `tierBasedSnakeDraft.ts`

### 1. Import Position Utilities

**Location:** Top of file, after existing imports

```typescript
// Add these imports after the existing utility imports
import { attachPrimaryPositions, evaluateSwapPositionImpact, logPositionBalanceStatus } from '../../../utils/positionBalancing';
import { PositionConsensus } from '../../../types/positions';
```

### 2. Update PlayerWithRating Interface

**Location:** Line ~79-91, extend the `PlayerWithRating` interface

```typescript
export interface PlayerWithRating extends TeamAssignment {
  threeLayerRating: number;
  baseSkillRating: number;
  attributesScore?: number;
  attributesAdjustment?: number;
  hasPlaystyleRating?: boolean;
  overallPerformanceScore?: number;
  recentFormScore?: number;
  momentumScore?: number;
  momentumCategory?: 'hot' | 'cold' | 'steady';
  momentumAdjustment?: number;
  tier?: number;
  // ADD THESE NEW FIELDS:
  positions?: PositionConsensus[];
  primaryPosition?: Position | null;
}
```

### 3. Attach Position Data After Three-Layer Rating Calculation

**Location:** In `tierBasedTeamGenerator()` function, after the three-layer ratings are calculated and before tiering

**Find this section:**
```typescript
// Apply momentum adjustments
playersWithThreeLayerRating = calculateMomentumAdjustments(playersWithThreeLayerRating, debugLog);
```

**Add after it:**
```typescript
// Attach primary positions for position balancing
playersWithThreeLayerRating = attachPrimaryPositions(playersWithThreeLayerRating);

if (debugLog) {
  const withPositions = playersWithThreeLayerRating.filter(p => p.primaryPosition);
  debugLog.value += `\nPosition Data: ${withPositions.length}/${playersWithThreeLayerRating.length} players have position ratings\n`;

  // Show position distribution
  const positionCounts: Record<string, number> = {};
  withPositions.forEach(p => {
    const pos = p.primaryPosition!;
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });

  debugLog.value += `Position Distribution: ${Object.entries(positionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pos, count]) => `${count}×${pos}`)
    .join(', ')}\n`;
}
```

### 4. Add Position Balance Check to isSwapAcceptable()

**Location:** In `isSwapAcceptable()` function, after elite shooter constraint check (around line 3170)

**Find this section:**
```typescript
// VETO if elite gap exceeds 2 AND worsens the gap
if (afterEliteGap > 2 && afterEliteGap >= beforeEliteGap) {
  return { acceptable: false, rejectReason: `Elite shooter gap too large: ${afterEliteGap} (max 2)` };
}
```

**Add after it:**
```typescript
// HARD CONSTRAINT: Position Balance
// Prevent tactical imbalances (e.g., 4 strikers on one team, 1 on the other)
const positionImpact = evaluateSwapPositionImpact(
  beforeBlueTeam,
  beforeOrangeTeam,
  afterBlueTeam,
  afterOrangeTeam
);

if (!positionImpact.acceptable) {
  return {
    acceptable: false,
    rejectReason: `POSITION BALANCE: ${positionImpact.rejectReason}`
  };
}
```

### 5. Log Position Balance Status After Optimization

**Location:** At the end of the optimization phase, before returning results

**Find this section:**
```typescript
if (debugLog) {
  debugLog.value += `\nIntegrated optimization complete after ${totalOptimizationAttempts} iterations across ${roundsCompleted} round(s)\n`;
  debugLog.value += `Final balance: ${currentBalance.toFixed(3)}\n`;
  debugLog.value += `Final Tier Distribution: ${tierDistributionStatus}\n\n`;
}
```

**Add after it:**
```typescript
// Log final position balance status
if (debugLog) {
  logPositionBalanceStatus(blueTeam, orangeTeam, debugLog);
}
```

### 6. Add Position Balance to Debug Log Summary

**Location:** In the FINAL TEAMS section of debug log output

**Find the section that outputs final team composition, add position info:**

```typescript
debugLog.value += `\n=== FINAL TEAMS ===\n\n`;
debugLog.value += `Blue Team (${blueTeam.length} players):\n`;
blueTeam.forEach(player => {
  const posInfo = player.primaryPosition ? ` [${player.primaryPosition}]` : '';
  debugLog.value += `  ${player.friendly_name} (Rating: ${player.threeLayerRating.toFixed(2)}, Tier ${player.tier})${posInfo}\n`;
});
// ... similar for Orange Team
```

## Integration into `useTeamBalancing.ts` Hook

The team balancing hook needs to fetch position consensus data when loading players.

**Location:** In `useTeamBalancing.ts`, in the section where player data is fetched

**Find the section that selects player data, add position consensus:**

```typescript
// Fetch position consensus for all players
const { data: positionConsensusData, error: positionError } = await supabase
  .from('player_position_consensus')
  .select('*')
  .gte('total_raters', 5) // Only use if sufficient data
  .gte('percentage', 25)  // Only primary and secondary positions
  .order('percentage', { ascending: false });

if (positionError) {
  console.error('Error fetching position consensus:', positionError);
}

// Create position consensus map
const positionMap = new Map<string, PositionConsensus[]>();
positionConsensusData?.forEach(consensus => {
  const existing = positionMap.get(consensus.player_id) || [];
  positionMap.set(consensus.player_id, [...existing, consensus]);
});

// Attach position data to players
const playersWithPositions = selectedPlayers.map(player => ({
  ...player,
  positions: positionMap.get(player.id) || []
}));
```

## Testing Checklist

After integration, test the following scenarios:

- [ ] **Database Migration**: Run the SQL migration and verify tables are created
- [ ] **Position Rating**: Rate a player with positions and verify data is saved
- [ ] **Position Display**: Check player cards show position badges
- [ ] **Team Balancing Without Positions**: Verify algorithm still works when players have no position data
- [ ] **Team Balancing With Positions**: Create a game with position data and verify:
  - [ ] Position balance appears in debug log
  - [ ] Swaps that would create imbalance are rejected
  - [ ] Final teams have balanced position distribution
- [ ] **Tom K & Stephen Scenario**: Test with players who have same position (both ST) - verify they're split
- [ ] **Insufficient Data**: Test with <50% of players having position data - should not enforce constraints

## Expected Behavior

### Before Integration
- Tom K (LB 40%, ST 30%) and Stephen (ST 75%, CAM 40%) could end up on same team
- No position-based swap rejections in debug log

### After Integration
- Tom K and Stephen should be split between teams
- Debug log shows:
  ```
  ❌ REJECTED: POSITION BALANCE: Attackers (max gap: 3)
  ```
- Final position balance summary shows balanced distribution
- Teams have similar numbers of defenders/midfielders/attackers

## Rollback Plan

If issues arise:

1. **Disable Position Constraint**: Comment out the position balance check in `isSwapAcceptable()`
2. **Remove Position Data Fetching**: Comment out position consensus queries in hooks
3. **Hide UI Components**: Add feature flag check around `<PositionSelector />` component

Position data will remain in database but won't affect team balancing.

## Performance Considerations

- Position consensus is pre-calculated via trigger (no runtime overhead)
- Only fetches positions for players with 5+ raters and >=25% consensus
- Position balance check adds ~0.01ms per swap evaluation
- No noticeable impact on team balancing performance

## Future Enhancements

1. **Admin Toggle**: Allow admins to enable/disable position balancing per game
2. **Soft Constraint Mode**: Warning instead of hard veto for minor imbalances
3. **Formation-Based Balancing**: Consider target formation when evaluating position fit
4. **Position Versatility Score**: Players with multiple primary positions get flexibility bonus

---

**Implementation Status**: ✅ Database Schema, Types, Utils, UI Components Complete
**Remaining**: Integration into tierBasedSnakeDraft.ts (follow steps above)
