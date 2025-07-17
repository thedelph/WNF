# Goal Differential Total Display Fix

**Date**: 2025-07-16
**Type**: Bug Fix
**Component**: Team Balancing

## Issue

The team balancing page was displaying the average goal differential per game instead of the total goal differential over the last 10 games. For example, a player with a total goal differential of -10 over their last 10 games was showing as -1 (the average per game).

## Root Cause

The RPC function `get_player_recent_goal_differentials` was calculating the average goal differential using `AVG(goal_diff)` instead of the total using `SUM(goal_diff)`.

## Solution

Updated the RPC function to return the total goal differential:

```sql
-- Changed from:
ROUND(AVG(goal_diff)::numeric, 2) as avg_goal_diff

-- To:
SUM(goal_diff)::numeric as total_goal_diff
```

## Impact

- Team balancing now displays total goal differential for last 10 games
- Provides clearer representation of a player's recent performance
- Example: Chris H now correctly shows -10 instead of -1

## UI Components Affected

1. **TeamList.tsx** - Already displayed raw `goal_differential` value, no changes needed
2. **TeamStats.tsx** - Already used `formatGoalDiff()` to round to integer, no changes needed
3. **useTeamBalancing.ts** - Consumes data from RPC function, no changes needed

## Testing

Verified with Chris H's data:
- Last 10 games: 07/09 (0), 07/02 (-4), 06/25 (-9), 06/18 (+5), 06/11 (+2), 05/28 (-1), 05/20 (0), 05/14 (-1), 04/16 (-1), 04/09 (-1)
- Total: -10 ✓
- Now displays correctly on team balancing page