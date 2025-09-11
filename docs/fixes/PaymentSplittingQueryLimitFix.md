# Payment Splitting Query Limit Fix

**Date**: 2025-09-11  
**Author**: Claude Code  
**Issue**: Game #63 showing incorrect cost per player (£56.70 instead of £3.15) with 0 players displayed

## Problem

The payment dashboard was failing to display players and calculating incorrect cost per player for certain games, particularly game #63. The issue manifested as:

1. Game #63 showed £56.70 cost per player instead of £3.15 (£56.70/18 players)
2. 0 players were displayed despite 18 players being registered
3. Other games showed varying incorrect player counts (e.g., 11 players instead of 18)

## Root Causes

### 1. Supabase Query Limit
- The payment dashboard was attempting to fetch registrations for 63+ games in a single `IN` query
- Supabase was silently limiting the results to 1000 registrations
- Game #63's registrations were not included in this 1000 record limit
- Console showed: "Raw registrations fetched: 1000" despite more existing

### 2. CORS Configuration Mismatch
- Supabase was configured to accept requests from `localhost:5175`
- The development server was running on `localhost:5176`
- This caused CORS errors preventing data fetching

### 3. Complex Foreign Key Joins
- Initial attempts to fix used complex foreign key constraint names
- Error: "Could not embed because more than one relationship was found for 'game_registrations' and 'players'"
- Multiple foreign keys between tables (player_id, paid_by_player_id, payment_recipient_id, payment_verified_by) caused ambiguity

## Solution

### 1. Limited Games Query (PaymentDashboard.tsx:35)
```typescript
const { data: gamesData, error: gamesError } = await supabase
  .from('games')
  .select(`
    *,
    venue:venues (*)
  `)
  .order('date', { ascending: false })
  .lte('date', new Date().toISOString())
  .limit(30); // Limit to recent games to avoid query size issues
```

### 2. Batch Fetching Registrations (PaymentDashboard.tsx:43-60)
```typescript
// Fetch registrations in smaller batches to avoid query limits
let allRegistrations = [];
const batchSize = 10;

for (let i = 0; i < gameIds.length; i += batchSize) {
  const batch = gameIds.slice(i, i + batchSize);
  const { data: batchData, error: batchError } = await supabase
    .from('game_registrations')
    .select('*')
    .in('game_id', batch);
    
  if (batchError) {
    console.error('Error fetching registration batch:', batchError);
    throw batchError;
  }
  
  allRegistrations = [...allRegistrations, ...(batchData || [])];
}
```

### 3. Separated Player Data Fetching (PaymentDashboard.tsx:73-86)
```typescript
// Fetch player details separately to avoid join issues
const playerIds = [...new Set(registrationsData?.map(r => r.player_id).filter(Boolean) || [])];
const { data: playersData, error: playersError } = await supabase
  .from('players')
  .select('id, friendly_name')
  .in('id', playerIds);

// Create a map and combine data in JavaScript
const playerMap = new Map(playersData?.map(p => [p.id, p]) || []);
const registrationsWithPlayers = registrationsData?.map(reg => ({
  ...reg,
  player: playerMap.get(reg.player_id) || null
})) || [];
```

### 4. Fixed Port Configuration (vite.config.ts:20)
```typescript
server: {
  port: 5175, // Required for Supabase CORS configuration
  strictPort: true,
  hmr: {
    overlay: true
  }
}
```

## Files Modified

1. **src/components/admin/payments/PaymentDashboard.tsx**
   - Limited games query to 30 most recent
   - Implemented batch fetching for registrations
   - Separated player data fetching from registration query

2. **src/components/admin/payments/GamePaymentStats.tsx**
   - Fixed cost per player calculation to handle edge cases
   - Added player count display

3. **src/components/admin/payments/GamePaymentList.tsx**
   - Added error message when no players found
   - Improved null handling

4. **vite.config.ts**
   - Changed port from 5173 to 5175 for CORS compatibility

## Prevention

1. **Query Limits**: Always be aware of Supabase query limits when using `IN` operators with large arrays
2. **Batch Processing**: Implement batch processing for large datasets
3. **CORS Configuration**: Ensure development server port matches Supabase allowed origins
4. **Foreign Key Ambiguity**: When multiple foreign keys exist, fetch data separately and join in JavaScript

## Testing

After implementation:
- Game #63 correctly shows 18 players with £3.15 per player
- All games display correct player counts
- Console logs show proper registration fetching without hitting limits
- No CORS errors in browser console