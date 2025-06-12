# Team Balancing Inconsistency Fix

## Problem Description

The WNF application has two different team balancing mechanisms that produce different results:

1. **Automatic Team Announcement** (triggered at `team_announcement_time`)
2. **Admin Manual Team Generation** (via "Generate Optimal Teams" button)

These two systems should produce identical team assignments when given the same set of players, but currently they can generate different teams due to several implementation differences.

## Detailed Analysis

### 1. Different Data Sources

#### Automatic Team Announcement (`useTeamAnnouncement` hook)
- **Location**: `/src/hooks/useTeamAnnouncement.ts`
- **Data fetching**: Lines 107-134
```typescript
const { data: registrations, error: registrationsError } = await supabaseAdmin
  .from('game_registrations')
  .select(`
    id,
    players!game_registrations_player_id_fkey (
      id,
      friendly_name,
      attack_rating,
      defense_rating,
      win_rate  // Gets current win_rate from players table
    )
  `)
```
- **Additional data**: Uses `convertSelectedPlayersToRatings()` which calls:
  - `get_player_recent_win_rates` RPC (last 10 games only)
  - `get_player_recent_goal_differentials` RPC (last 10 games only)
- **10-game threshold**: Properly handled by RPC functions

#### Admin Manual Team Generation (`useTeamBalancing` hook)
- **Location**: `/src/components/admin/team-balancing/useTeamBalancing.ts`
- **Data fetching**: Lines 49-74 and 86-140
```typescript
// Fetches basic player data
const { data: registrations, error: registrationError } = await supabase
  .from('game_registrations')
  .select(`
    *,
    status,
    players!game_registrations_player_id_fkey (
      id,
      friendly_name,
      attack_rating,
      defense_rating,
      caps  // Note: uses caps, not win_rate
    )
  `)
```
- **Stats fetching**: Uses `get_player_game_stats` RPC function
- **10-game threshold**: Checks `caps >= 10` (line 250, 272) which may not align with recent 10-game data

### 2. Different Team Balancing Algorithms

#### Automatic Team Announcement
- **Function**: `balanceTeams()` from `/src/utils/teamBalancing.ts`
- **Location**: Line 137 of `useTeamAnnouncement.ts`
- **Algorithm**: 
  - Exhaustive search of all possible team combinations
  - Balance score calculation with 25% weight each for: attack, defense, win rate, goal differential
  - Returns: `{ blueTeam: string[], orangeTeam: string[], stats, difference }`

#### Admin Manual Team Generation
- **Function**: `findOptimalTeamBalance()` from `/src/components/admin/team-balancing/teamBalanceUtils.ts`
- **Location**: Line 68 of `OptimalTeamGenerator.tsx`
- **Algorithm**: 
  - Similar exhaustive search but different implementation
  - Uses same `calculateBalanceScore()` but through different data flow
  - Returns: `{ blueTeam: TeamAssignment[], orangeTeam: TeamAssignment[], score }`

### 3. Data Freshness Issues

#### Automatic Team Announcement
- Always fetches fresh data at announcement time
- No caching involved
- Direct database queries for current state

#### Admin Manual Team Generation
- May use existing assignments from `balanced_team_assignments` table (lines 155-160)
- Updates existing assignments with "fresh" data but structure may differ
- Potential for stale data if assignments were saved previously

### 4. Player Rating Data Structure Differences

#### Automatic Team Announcement uses `PlayerRating`:
```typescript
interface PlayerRating {
  player_id: string;
  attack_rating: number;
  defense_rating: number;
  win_rate?: number | null;
  goal_differential?: number | null;
  total_games?: number | null;
}
```

#### Admin Manual Team Generation uses `TeamAssignment`:
```typescript
interface TeamAssignment {
  player_id: string;
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
  win_rate?: number | null;
  goal_differential?: number | null;
  total_games?: number | null;
  team: 'blue' | 'orange' | null;
}
```

## Root Causes

1. **Duplicate implementations** of team balancing logic
2. **Different RPC functions** for fetching player statistics
3. **Inconsistent handling** of the 10-game threshold
4. **Different data structures** passed to balancing algorithms
5. **Caching behavior** in admin interface vs fresh data in automatic announcement

## Proposed Solution

### Phase 1: Unify Data Fetching

1. **Create a shared data fetching function** that both systems can use:
```typescript
// New file: /src/utils/teamDataFetcher.ts
export const fetchPlayersForTeamBalancing = async (gameId: string) => {
  // Fetch registrations
  const { data: registrations } = await supabase
    .from('game_registrations')
    .select(`...`)
    .eq('game_id', gameId)
    .eq('status', 'selected');

  // Use the same RPC functions as automatic announcement
  const [winRateResponse, goalDiffResponse] = await Promise.all([
    supabase.rpc('get_player_recent_win_rates', { games_threshold: 10 }),
    supabase.rpc('get_player_recent_goal_differentials', { games_threshold: 10 })
  ]);

  // Return unified PlayerRating format
  return convertToPlayerRatings(registrations, winRateResponse, goalDiffResponse);
};
```

### Phase 2: Unify Team Balancing Algorithm

1. **Remove `findOptimalTeamBalance()`** from `teamBalanceUtils.ts`
2. **Update `OptimalTeamGenerator`** to use the main `balanceTeams()` function
3. **Convert between data structures** as needed:
```typescript
// In OptimalTeamGenerator.tsx
const generateOptimalTeams = () => {
  // Convert TeamAssignment[] to PlayerRating[]
  const playerRatings = allPlayers.map(p => ({
    player_id: p.player_id,
    attack_rating: p.attack_rating,
    defense_rating: p.defense_rating,
    win_rate: p.win_rate,
    goal_differential: p.goal_differential,
    total_games: p.total_games
  }));

  // Use the same balanceTeams function
  const optimal = balanceTeams(playerRatings);
  
  // Convert back to TeamAssignment format for UI
  // ...
};
```

### Phase 3: Remove Caching Behavior

1. **Always fetch fresh data** when "Generate Optimal Teams" is clicked
2. **Remove dependency** on `balanced_team_assignments` table for current data
3. **Only use saved assignments** for displaying current state, not for calculations

### Phase 4: Update useTeamBalancing Hook

```typescript
// In useTeamBalancing.ts
const fetchData = async () => {
  // ... existing game fetching logic ...

  // Always use fresh data, same as automatic announcement
  const playerRatings = await convertSelectedPlayersToRatings(selectedPlayers);
  
  // Don't rely on balanced_team_assignments for player data
  // Only use it to restore previous team assignments (blue/orange)
};
```

## Implementation Steps

1. **Create shared utility functions**:
   - Move `convertSelectedPlayersToRatings` to a shared location
   - Ensure it's accessible to both admin and automatic systems

2. **Update OptimalTeamGenerator**:
   - Import `balanceTeams` from `/src/utils/teamBalancing.ts`
   - Remove import of `findOptimalTeamBalance`
   - Update generation logic to use shared function

3. **Update useTeamBalancing**:
   - Use `get_player_recent_win_rates` instead of `get_player_game_stats`
   - Use `get_player_recent_goal_differentials` for goal diff data
   - Remove caps-based 10-game threshold check

4. **Test thoroughly**:
   - Generate teams via admin interface
   - Compare with automatic announcement results
   - Verify identical teams are produced

## Testing Plan

1. **Create test scenario**:
   - Set up a game with known players
   - Note their current ratings and stats
   - Generate teams via admin interface
   - Save the result

2. **Trigger automatic announcement**:
   - Let the same game reach announcement time
   - Compare the automatically generated teams
   - They should be identical to admin-generated teams

3. **Edge cases to test**:
   - Players with exactly 10 games
   - Players with no games
   - Players with null ratings
   - Odd number of players

## Files to Modify

1. `/src/utils/teamBalancing.ts` - Export `convertSelectedPlayersToRatings`
2. `/src/components/admin/team-balancing/OptimalTeamGenerator.tsx` - Use shared balancing
3. `/src/components/admin/team-balancing/useTeamBalancing.ts` - Update data fetching
4. `/src/components/admin/team-balancing/teamBalanceUtils.ts` - Remove duplicate logic
5. `/src/hooks/useTeamAnnouncement.ts` - No changes needed (reference implementation)

## Potential Risks

1. **Breaking changes** to admin interface
2. **Performance impact** from always fetching fresh data
3. **Backward compatibility** with saved team assignments

## Mitigation Strategies

1. **Gradual rollout**: Test extensively in development first
2. **Feature flag**: Add toggle to use old vs new algorithm during transition
3. **Logging**: Add detailed logging to compare old vs new results
4. **Backup**: Keep old functions available but deprecated

## Success Criteria

- Admin "Generate Optimal Teams" produces identical results to automatic announcement
- No performance degradation in admin interface
- All existing functionality continues to work
- Clear audit trail of which algorithm was used for each game

## Timeline Estimate

- Phase 1 (Data Fetching): 2-3 hours
- Phase 2 (Algorithm Unification): 2-3 hours  
- Phase 3 (Remove Caching): 1-2 hours
- Phase 4 (Update Hook): 2-3 hours
- Testing: 3-4 hours
- **Total: 10-15 hours**

## Notes for Implementation

When implementing this fix:
1. Start with Phase 1 to ensure consistent data
2. Add extensive logging during development
3. Keep the old functions temporarily for comparison
4. Consider adding a "debug mode" to show which algorithm was used
5. Document any behavioral changes for users

This fix will ensure that team generation is consistent regardless of whether it's done manually by an admin or automatically by the system.