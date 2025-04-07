# Token System Documentation

## Overview
The token system provides players with a guaranteed slot option for games. Each player can have exactly one active token at any time, which they can use to secure a spot in any game, bypassing the normal XP-based selection process. Tokens are issued to players who have missed multiple consecutive games, ensuring they have an opportunity to rejoin the player pool.

## Token Distribution and Lifecycle
- Each player can have **exactly one active token** at any time
- Tokens are issued automatically when a player meets **all** of these criteria:
  1. Has played (been selected) in at least one of the last 10 games
  2. Has not been selected in any of the 3 most recently completed games
     - For example, if games #32, #31, and #30 are the most recent games:
       - Player must not have been selected in any of these games
       - It doesn't matter if they registered and weren't selected
       - It doesn't matter if they didn't register at all
       - Being selected in even one of these games makes them ineligible
  3. Has no outstanding payments (unpaid games)
     - Players with any unpaid games are ineligible for tokens
     - This encourages timely payment for games
     - Payment status is checked in real-time during eligibility determination
- Tokens expire 7 days after issuance if unused
- After a token is used:
  - Player must meet the eligibility criteria again to receive a new token
  - No fixed cooldown period, based purely on game participation
- System enforces the single-token rule via database triggers

### Related Database Functions
- `check_token_eligibility(player_uuid UUID)`: Checks if a player meets both eligibility criteria
- `issue_priority_tokens()`: Issues tokens to all eligible players who don't have an active token
- `enforce_single_active_token()`: Trigger function that prevents multiple active tokens per player
- `handle_game_token(player_id UUID, game_id UUID, action TEXT)`: Handles token consumption and returns
- `use_player_token(player_id UUID, game_id UUID)`: Marks a token as used for a specific game
- `get_token_history(player_id UUID, game_id UUID, start_date TIMESTAMP, end_date TIMESTAMP)`: Retrieves token action history

## Implementation Details

### Unpaid Games Check
The system checks for unpaid games in real-time during token eligibility determination:

1. **Client-side Implementation**:
   - In the `useTokenStatus` hook, we directly query the `game_registrations` table with filters:
     - `player_id` = current player
     - `status` = 'selected'
     - `paid` = false
   - The count of unpaid games is calculated from the query results
   - If the count is greater than 0, the player is marked as ineligible for tokens

2. **Admin Interface**:
   - The `TokenManagement` component also directly queries the `game_registrations` table
   - Creates a map of player IDs to their unpaid games count
   - This approach avoids SQL errors and provides consistent results

3. **Benefits**:
   - Real-time payment status check
   - No dependency on database views
   - Consistent implementation across components
   - Improved error handling

### Token Issuance Implementation
The system uses a secure approach for issuing tokens through the admin interface:

1. **Database Function**:
   - Uses a `SECURITY DEFINER` SQL function called `issue_player_token`
   - Takes a player UUID as input and handles token creation
   - Properly logs token issuance in the token_history table
   - Refreshes the materialized view with elevated permissions
   - See [TokenSystemIssuanceFix.md](./TokenSystemIssuanceFix.md) for details

2. **Frontend Implementation**:
   - The `TokenManagement` component uses an RPC call to the database function
   - This bypasses permission issues with materialized views
   - Provides better error handling and user feedback

3. **Benefits**:
   - Secure token issuance with proper permissions
   - Consistent token history logging
   - Improved reliability of the admin interface

## Token Usage and Forgiveness
When a player has an available token:
1. They can see a priority token toggle with a coin icon during game registration
2. Using a token guarantees them a slot in that game
3. Token slots are deducted from XP slots (not random slots)
4. The token is only consumed when the game is marked as completed
5. If a player drops out or game is cancelled, the token is returned

### Token Forgiveness
The system includes a token forgiveness mechanism:
1. When a player uses a token, the system checks if they would have been selected by XP anyway
2. If their XP would have qualified them for merit selection:
   - Their token is automatically returned
   - They are marked for merit selection instead
   - The token slot becomes available for another player
3. This prevents unnecessary token usage by high-XP players
4. Token forgiveness is calculated after all token effects are considered
5. The merit cutoff is based on the remaining slots after token usage

### Token Cooldown Effect
Using a token has a balancing effect on the next game:
1. After using a token, the player is pushed to the bottom of the selection list for the next sequential game
2. This applies to both merit selection and reserve list ordering
3. They will be placed below ALL other players, including non-WhatsApp members
4. If multiple players used tokens, they are sorted among themselves by the usual criteria (XP, WhatsApp status, etc.)
5. This only affects the immediate next game in sequence, not any games after that
6. This prevents token usage from snowballing into streaks and makes tokens more strategic for occasional use

## Token States

1. **Available**
   - Token can be used for any game
   - Reissued based on eligibility criteria
   - Remains valid until used

2. **Reserved**
   - Token is tied to a specific game registration
   - Still not consumed
   - Can be returned if player drops out

3. **Consumed**
   - Token has been used for a completed game
   - Player must meet eligibility criteria again to receive a new token

4. **Cooldown**
   - No fixed cooldown period, based purely on game participation

## Token Lifecycle Example

1. **Initial State**
   - Player receives token based on eligibility criteria
   - Token remains valid indefinitely
   - Can be used at any time

2. **Game Registration**
   - Player registers for a game using their token
   - Token is reserved but not consumed
   - Player is guaranteed a slot

3. **Game Completion**
   - Game is marked as completed
   - Token is consumed
   - Player must meet eligibility criteria again to receive a new token

4. **Next Token**
   - Player meets eligibility criteria again
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
              → Player must meet eligibility criteria again
Week 4, Day 28: Player meets eligibility criteria again
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

3. Game deleted by admin
   - All tokens used in the game are marked as returned in history
   - Token usage record is cleared (used_game_id AND used_at set to NULL)
   - System automatically checks affected players for token eligibility
   - If a player is eligible and has no active token, a new token is issued
   - Token history is maintained for audit purposes
   - No cooldown period for newly issued tokens

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
   - Token forgiveness is calculated after all token effects are considered

2. XP Selection (Second)
   - Remaining slots (minus random slots) filled by XP
   - Normal tiebreaker rules apply:
     1. WhatsApp status
     2. Current streak
     3. Caps
     4. Registration time

3. Random Selection (Last)
   - Random slots are filled in two phases:
     1. WhatsApp members are selected first
     2. Non-WhatsApp members are only selected if slots remain
   - Within each phase, selection is weighted by bench_warmer_streak
   - This maintains WhatsApp priority while ensuring fair random distribution

## Frontend Components

### TokenToggle
Located in: `src/components/game/TokenToggle.tsx`
- Shows token availability with a coin icon
- Icon changes color when token is selected (yellow when active, gray when inactive)
- Provides usage tooltip explaining:
  - "Using a token guarantees you a slot in this game"
  - "Tokens are reissued based on eligibility criteria"
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
3. Check if player meets eligibility criteria

### Token Used But Registration Failed
1. Check `player_tokens.used_at` and `used_game_id`
2. Verify `game_registrations.using_token` status
3. Contact support for manual intervention

### Token Count Mismatch
1. Compare `game_selections.token_slots_used`
2. Count `game_registrations` with `using_token = true`
3. Verify player selection process completed successfully

## Token System

The token system is designed for casual players who want to join a game every now and then, while still maintaining priority for regular players through the XP system.

## Eligibility

Token eligibility is determined by the `check_token_eligibility(player_uuid)` function, which checks:
1. Player has played in at least 1 of the last 5 games
2. Player has not been selected in any of the last 3 games
3. Player has no outstanding payments (unpaid games)

## Token Lifecycle

### Issuance
- Tokens are issued via the `issue_player_tokens()` function
- Only eligible players receive tokens
- Each token expires 7 days after issuance
- Players can only have one active token at a time (enforced by `enforce_single_active_token()` trigger)

### Usage
- When registering for a game, players can use their token via `handle_game_token(p_player_id, p_game_id, p_action)`
- Using a token guarantees a spot in that game

### Effects
- After using a token, players are de-prioritized in the next game's merit selection
- This is checked via `check_previous_game_token_usage(current_game_id)` during player selection
- Players who used a token in the previous game are moved to the bottom of the merit selection list

## Token Status

Token status is tracked in the `public_player_token_status` materialized view, which shows:
- AVAILABLE: Player has an unused token and is currently eligible
- INELIGIBLE: Player either has no token or is not currently eligible
- USED: Token has been used in a game

The view is automatically refreshed by the `refresh_player_token_status()` trigger.

## Database Functions

### Core Functions
- `check_token_eligibility(player_uuid)`: Checks if a player is eligible for a token
- `issue_player_tokens()`: Issues tokens to eligible players
- `check_player_token(p_player_id)`: Checks if a player has a valid token
- `handle_game_token(p_player_id, p_game_id, p_action)`: Handles token usage in games

### Support Functions
- `enforce_single_active_token()`: Trigger to prevent multiple active tokens
- `refresh_player_token_status()`: Trigger to refresh token status view
- `check_previous_game_token_usage(current_game_id)`: Checks token usage in previous game

## Implementation Details

### Token Expiry
Tokens expire in two ways:
1. Automatically after 7 days from issuance
2. When a player becomes ineligible (checked via materialized view)

### Merit Selection Impact
The selection process (implemented in `playerSelection.ts`) follows this order:
1. Token users get guaranteed slots
2. Remaining slots filled by XP, with token cooldown as first tiebreaker:
   - Players who used a token in previous game moved to bottom
   - WhatsApp membership as second tiebreaker
   - Current streak as third tiebreaker
   - Caps as fourth tiebreaker
   - Registration time as final tiebreaker
