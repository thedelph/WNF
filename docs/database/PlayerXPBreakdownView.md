# player_xp_breakdown View

## Overview
The `player_xp_breakdown` view provides a comprehensive breakdown of player XP components, including unpaid games penalties and reserve game bonuses. This view is essential for displaying detailed XP information on player profiles.

## Schema

```sql
CREATE OR REPLACE VIEW player_xp_breakdown AS
SELECT 
    player_id,           -- UUID: Player's unique identifier
    friendly_name,       -- TEXT: Player's display name
    unpaid_games_count,  -- INTEGER: Count of unpaid games (selected, not dropped out)
    unpaid_games_modifier, -- DECIMAL: XP penalty modifier (-50% per unpaid game)
    reserve_games,       -- INTEGER: Count of games where player was a reserve
    reserve_xp,          -- INTEGER: Total XP from reserve appearances (5 per game)
    total_xp            -- INTEGER: Current total XP from player_xp table
```

## Column Details

### unpaid_games_count
- Counts games where:
  - Player was selected (`status = 'selected'`)
  - Game is completed (`completed = true`)
  - Player hasn't paid (`paid = false`)
  - Player didn't drop out (`status != 'dropped_out'`)
  - Game date + 24 hours has passed

### unpaid_games_modifier
- Calculated as: `unpaid_games_count * -0.5`
- Represents the XP penalty percentage
- Example: 3 unpaid games = -1.5 (or -150% penalty)

### reserve_games
- Counts games where:
  - Player had reserve status (`status = 'reserve'`)
  - Game is completed (`completed = true`)
  - Game is historical (`is_historical = true`)
  - **Within last 40 games** (`(latest_sequence - sequence_number) < 40`)
  - **Not a late reserve** (`late_reserve = false OR late_reserve IS NULL`)

### reserve_xp
- Calculated as: `reserve_games * 5`
- Each reserve appearance is worth 5 XP
- **Only counts reserve games within the last 40 games** (matching base XP decay)

### total_xp
- Fetched from the `player_xp` table
- Represents the player's current calculated XP

## Dependencies

### Tables Used
- `players` - Player information
- `game_registrations` - Player participation records
- `games` - Game information
- `player_xp` - Current XP values

### Dependent Views
- `lewis_xp_breakdown` - Filtered view for player Lewis
- `zhao_xp_breakdown` - Filtered view for player Zhao
- Any player-specific XP breakdown views

## Usage

### Player Profile XP Breakdown
```typescript
// In PlayerProfile.tsx
const { data } = await supabase
  .from('player_xp_breakdown')
  .select('reserve_games, reserve_xp')
  .eq('friendly_name', playerName)
  .maybeSingle();
```

### Unpaid Games Summary
```typescript
// In usePlayerGrid.ts
const { data } = await supabase
  .from('player_xp_breakdown')
  .select('friendly_name, unpaid_games_count, unpaid_games_modifier');
```

## Important Notes

1. **CASCADE Effects**: When dropping this view, use CASCADE carefully as it will drop all dependent views
2. **Performance**: This view performs multiple aggregations, consider materialized view for large datasets
3. **Reserve XP**: Only counts historical games to ensure accuracy
4. **Unpaid Games**: 24-hour grace period before penalties apply
5. **40-Game Window**: Reserve XP respects the same 40-game decay system as base XP (fixed 2025-10-09, see [Reserve XP 40-Game Limit Fix](../fixes/ReserveXP40GameLimitFix.md))
6. **Late Reserves**: Late reserves (registered after window closes) are excluded from reserve XP calculations

## Maintenance

### Recreating After Modifications
If the view needs to be dropped and recreated:

```sql
-- Drop with CASCADE (will drop dependent views)
DROP VIEW IF EXISTS player_xp_breakdown CASCADE;

-- Recreate the view
CREATE OR REPLACE VIEW player_xp_breakdown AS ...

-- Don't forget to recreate dependent views
CREATE OR REPLACE VIEW lewis_xp_breakdown AS
SELECT * FROM player_xp_breakdown WHERE friendly_name = 'Lewis';
```

## Related Documentation
- [XP System Explained](../XPSystemExplained.md)
- [Player Profile Component](../components/PlayerProfile.md)
- [Database Functions](../DatabaseFunctions.md)
- [Reserve XP 40-Game Limit Fix](../fixes/ReserveXP40GameLimitFix.md)