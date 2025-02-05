# Token System Documentation

## Overview
The token system provides players with a guaranteed slot option for games. Each player can have exactly one active token at any time, which they can use to secure a spot in any game, bypassing the normal XP-based selection process. Tokens remain valid until used, ensuring players never lose their token due to inactivity.

## Token Distribution and Lifecycle
- Each player can have **exactly one active token** at any time
- Tokens remain valid indefinitely until used
- After a token is used:
  - 22-day cooldown period begins
  - New token is issued after cooldown ends
- The 22-day cooldown ensures tokens are ready for the next game in the 4-week rotation:
  - Day 1: Use token for current game
  - Days 1-22: Cooldown period
  - Day 23+: New token available for next game
- System enforces the single-token rule via database triggers

## Token Usage
When a player has an available token:
1. They can see a priority token toggle with a coin icon during game registration
2. Using a priority token guarantees them a slot in that game
3. Token slots are deducted from XP slots (not random slots)
4. The token is only consumed when the game is marked as completed
5. If a player drops out or the game is cancelled, the token is automatically returned
6. New tokens are reissued every 4 weeks

## Token States

1. **Available**
   - Token can be used for any game
   - Reissued every 4 weeks
   - Remains valid until used

2. **Reserved**
   - Token is tied to a specific game registration
   - Still not consumed
   - Can be returned if player drops out

3. **Consumed**
   - Token has been used for a completed game
   - 22-day cooldown begins
   - New token will be issued after cooldown

4. **Cooldown**
   - Period after token consumption
   - Lasts 22 days
   - Prevents token usage for next few weeks

## Token Lifecycle Example

1. **Initial State**
   - Player receives token
   - Token remains valid indefinitely
   - Can be used at any time

2. **Game Registration**
   - Player registers for a game using their token
   - Token is reserved but not consumed
   - Player is guaranteed a slot

3. **Game Completion**
   - Game is marked as completed
   - Token is consumed
   - 22-day cooldown begins

4. **Next Token**
   - After 22-day cooldown
   - New token automatically issued
   - Ready for next game cycle

5. **Special Cases**
   - If player drops out: Token is immediately returned to available state
   - If game is cancelled: Token is immediately returned to available state
   - If token isn't used: Stays valid indefinitely

## Common Scenarios

### Regular Usage Pattern
```
Week 1, Day 1:  Use token for Game A
              → Token consumed
              → Cooldown begins
Week 4, Day 23: Cooldown ends
              → New token issued
Week 4, Day 28: Next game available
```

### Token Preservation
```
Week 1: Receive token
Week 2: Don't use token
Week 3: Don't use token
Week 4: Don't use token
Result: Token stays valid, ready to use anytime
```

### Token Return Scenarios
1. Player drops out of game
   - Token immediately returns to available state
   - No cooldown period
   - Can be used for another game immediately

2. Game cancelled
   - All tokens automatically return to available state
   - No cooldown period
   - Can be used for other games immediately

## Database Schema

### player_tokens Table
```sql
CREATE TABLE player_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    used_game_id UUID REFERENCES games(id),
    CONSTRAINT one_active_token_per_player UNIQUE (player_id, issued_at)
);
```

### Single Token Enforcement
```sql
-- Trigger to ensure only one active token per player
CREATE TRIGGER enforce_single_active_token
    BEFORE INSERT OR UPDATE ON player_tokens
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_active_token();
```

## Token History and Auditing

The system maintains a complete history of all token operations:
- Token issuance
- Token reservations
- Token consumption
- Token returns
- Admin actions
- Additional context (game status, registration status, etc.)

### Common History Queries

1. View player's token history:
```sql
SELECT * FROM get_token_history(p_player_id := 'player_uuid');
```

2. View game's token usage:
```sql
SELECT * FROM get_token_history(p_game_id := 'game_uuid');
```

3. View recent token activity:
```sql
SELECT * FROM get_token_history(
    p_start_date := NOW() - INTERVAL '30 days'
);
```

## Player Selection Process

1. Token Selection (First)
   - Players using tokens are guaranteed slots
   - Token slots are deducted from XP slots

2. XP Selection (Second)
   - Remaining slots (minus random slots) filled by XP
   - Normal tiebreaker rules apply:
     1. WhatsApp status
     2. Current streak
     3. Caps
     4. Registration time

3. Random Selection (Last)
   - WhatsApp priority maintained
   - Weighted by bench warmer streak
   - 2 slots reserved for random selection

## Frontend Components

### TokenToggle
Located in: `src/components/game/TokenToggle.tsx`
- Shows token availability with a coin icon
- Icon changes color when token is selected (yellow when active, gray when inactive)
- Provides usage tooltip explaining:
  - "Using a token guarantees you a slot in this game"
  - "Tokens are reissued every 4 weeks"
- Uses React Icons (PiCoinDuotone) for consistent icon styling

### Token Indicator
Located in: `src/components/player-card/PlayerCardFront.tsx`
- Shows a yellow coin icon at the top of the player card
- Indicates when a player is using their priority token for the current game
- Includes a tooltip explaining "Using Priority Token"
- Animated entrance effect using Framer Motion

### Player Display Order
The system displays players in a consistent order across all views:
1. Token users first, sorted by XP (descending)
2. Non-token users second, sorted by XP (descending)

This ordering appears in:
- List View (`src/components/game/RegisteredPlayerListView.tsx`)
- Card View (`src/components/game/RegisteredPlayerGrid.tsx`)

### Game Stats Display
Located in: `src/components/game/GameHeader.tsx`
- Shows "Priority Tokens Used" stat only when tokens are in use
- Displays token count with coin icon for visual consistency
- Deducts token slots from available XP slots in display

### Visual Indicators
1. Card View:
   - Yellow coin icon at top of card
   - Tooltip on hover
2. List View:
   - Yellow coin icon next to name
   - Lighter background for token users
   - Tooltip on hover
3. Game Stats:
   - Coin icon next to "Priority Tokens Used"
   - Only shown when tokens are in use

### GameRegistration
Located in: `src/components/game/GameRegistration.tsx`
- Integrates token toggle
- Handles token usage during registration

### Admin Interface
Located in: `src/components/admin/games/GameRegistrations.tsx`
- Allows admins to view token usage
- Enables manual token usage setting

## Common Issues and Troubleshooting

### Token Not Available
1. Check token consumption in `player_tokens` table
2. Verify no active tokens exist for the player
3. Check if token is in cooldown period

### Token Used But Registration Failed
1. Check `player_tokens.used_at` and `used_game_id`
2. Verify `game_registrations.using_token` status
3. Contact support for manual intervention

### Token Count Mismatch
1. Compare `game_selections.token_slots_used`
2. Count `game_registrations` with `using_token = true`
3. Verify player selection process completed successfully
