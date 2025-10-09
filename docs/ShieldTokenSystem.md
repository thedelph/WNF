# Shield Token System Documentation

## Overview
The Shield Token system provides streak protection for players who need to miss games due to legitimate reasons (holidays, illness, injury). Players earn shield tokens by playing games and can use them to "protect" their XP streak when they can't play, preventing streak decay.

**Key Philosophy**: Shield tokens are for **occasional absences**, not for avoiding games regularly. The system is designed to help committed players maintain their progress during temporary unavailability.

## Core Mechanics

### Token Accrual
- **Earn Rate**: 1 shield token per **10 games played** (cumulative, not consecutive)
- **Max Capacity**: 4 shield tokens maximum
- **Tracking**: System tracks `games_played_since_shield_launch` starting from implementation date
- **Automatic Issuance**: Tokens automatically issued when milestone reached (10, 20, 30, 40+ games)

### Token Usage
- **Pre-emptive**: Must be used **instead of registering** for a game
- **Manual Activation**: Player actively chooses to use shield during registration window
- **No Retroactive Usage**: Cannot be applied after missing a game
- **Cancels Registration**: If already registered, using shield automatically cancels registration
- **Cancellable**: Players can cancel shield usage and get their token back (similar to unregistering)
  - Click "Cancel Shield" button to reverse the decision
  - Token is returned immediately
  - Can toggle between using/cancelling during the registration window
  - Once registration closes, shield usage is final

### Frozen Streak Mechanics
When a shield token is used:
1. Current streak value is **frozen** (e.g., 10-game streak)
2. XP modifier is **frozen** at current percentage (e.g., +100%)
3. Frozen streak remains active until **naturally reached again**
4. Player must play consecutive games to rebuild their natural streak
5. Once natural streak reaches frozen value, shield is automatically removed

## Usage Examples

### Example 1: Single Week Holiday
```
Starting State:
- 8-game streak (+80% XP)
- 2 shield tokens available

Action: Going on holiday for 1 week
- Week 1: Use 1 shield token
  → Streak frozen at 8 games (+80%)
  → 1 shield token remaining

After Holiday:
- Play 8 consecutive games
- Natural streak reaches 8 games
- Shield removed automatically
- Continue building streak normally (9, 10, 11...)
```

### Example 2: Four-Week Holiday with Tokens
```
Starting State:
- 15-game streak (+150% XP)
- 4 shield tokens available

Action: Going on 4-week holiday
- Week 1: Use shield → 3 tokens left, streak frozen at 15
- Week 2: Use shield → 2 tokens left, streak still frozen at 15
- Week 3: Use shield → 1 token left, streak still frozen at 15
- Week 4: Use shield → 0 tokens left, streak still frozen at 15

Result: All 4 weeks protected, return with 15-game streak still frozen
```

### Example 3: Running Out of Tokens
```
Starting State:
- 12-game streak (+120% XP)
- 2 shield tokens available

Action: Going on 4-week holiday
- Week 1: Use shield → 1 token left, streak frozen at 12
- Week 2: Use shield → 0 tokens left, streak still frozen at 12
- Week 3: No shield, don't play
  → Shield protection removed
  → Streak resets to 0
  → XP modifier drops to +0%
- Week 4: Still no streak

Result: Lost streak after tokens ran out
```

### Example 4: Missing Game with Active Shield
```
Starting State:
- 10-game streak frozen (+100%)
- Currently at 7 natural games played
- Shield active protecting the frozen streak

Action: Miss another game WITHOUT using a shield
Result:
- Shield protection immediately removed
- Streak resets to 0
- XP modifier drops to +0%
- Lost all progress

Lesson: If you have an active shield, you MUST use another shield token if you need to miss another game before reaching your frozen streak naturally.
```

### Example 5: Cancelling Shield Usage
```
Starting State:
- 8-game streak (+80% XP)
- 2 shield tokens available
- Registered for upcoming game

Action: Change of plans during registration window
1. Monday: Register interest for Saturday's game
2. Wednesday: Plans change, can't play anymore
   → Click "Unregister Interest"
   → Click "Use Shield Token"
   → Streak frozen at 8 games, 1 token remaining
3. Friday: Plans change again, can play!
   → Click "Cancel Shield"
   → Token returned, 2 tokens available again
   → Click "Register Interest"
   → Back to normal registration

Result: Full flexibility during registration window - can toggle between playing/protected as plans change
```

## Technical Implementation

### Database Schema

#### Players Table (New Columns)
```sql
shield_tokens_available     INTEGER (0-4)
games_played_since_shield_launch  INTEGER
shield_active              BOOLEAN
frozen_streak_value        INTEGER (nullable)
frozen_streak_modifier     DECIMAL(5,2) (nullable)
```

#### Shield Token Usage Table
Tracks when and where shields are used:
```sql
CREATE TABLE shield_token_usage (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    game_id UUID REFERENCES games(id),
    used_at TIMESTAMP,
    is_active BOOLEAN,
    frozen_streak_value INTEGER,
    frozen_streak_modifier DECIMAL(5,2),
    removed_at TIMESTAMP,
    removal_reason VARCHAR(100)
);
```

#### Shield Token History Table
Complete audit trail of all shield operations:
```sql
CREATE TABLE shield_token_history (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    action_type VARCHAR(50), -- 'issued', 'used', 'removed', 'returned', 'admin_override'
    game_id UUID REFERENCES games(id),
    tokens_before INTEGER,
    tokens_after INTEGER,
    frozen_streak_value INTEGER,
    frozen_streak_modifier DECIMAL(5,2),
    notes TEXT,
    initiated_by VARCHAR(100), -- 'system', 'player', or admin user_id
    created_at TIMESTAMP
);
```

### Core Database Functions

#### 1. `check_shield_eligibility(player_id, game_id)`
Validates if a player can use a shield token:
- Checks token availability (> 0)
- Verifies not already used for this game
- Allows cancellation of existing registration
- Returns: `{eligible: boolean, reason: text, tokens_available: int}`

#### 2. `use_shield_token(player_id, game_id, user_id)`
Activates shield protection:
- Checks for and deletes any inactive shield_token_usage records for this player/game (prevents duplicate key constraint)
- Decrements `shield_tokens_available`
- Sets `shield_active = true`
- Stores `frozen_streak_value` and `frozen_streak_modifier`
- Cancels registration if player was registered
- Creates new usage record in `shield_token_usage` with `is_active = true`
- Logs action in `shield_token_history`
- Returns: `{success: boolean, message: text, tokens_remaining: int}`

#### 3. `issue_shield_token(player_id, reason, admin_id)`
Issues a new shield token:
- Checks current count < 4
- Increments `shield_tokens_available`
- Logs issuance in history
- Used by: milestone trigger OR admin override
- Returns: `{success: boolean, message: text, tokens_now: int}`

#### 4. `remove_shield_protection(player_id, reason, admin_id)`
Removes active shield:
- Clears `shield_active`, `frozen_streak_value`, `frozen_streak_modifier`
- Marks all active usages as inactive
- Logs removal in history
- Reasons: "Natural streak reached", "Missed game without shield", "Admin override"
- Returns: `{success: boolean, message: text}`

#### 5. `return_shield_token(player_id, game_id, reason)`
Returns a used shield token:
- Called when:
  - Player cancels shield usage (during registration window)
  - Game cancelled by admin
  - Player manually selected after using shield
- Increments `shield_tokens_available` (if < 4)
- Marks usage record as `is_active = false`
- Clears shield protection if this was the only active shield
- Logs return in history with reason
- Returns: `{success: boolean, message: text, tokens_now: int}`

#### 6. `process_shield_streak_protection(game_id)`
Core processing function called after player selection:
- **For players with active shields:**
  - Checks if natural streak >= frozen streak
  - If yes: removes shield protection (goal achieved!)
  - If no: maintains frozen streak
- **For players who missed game without shield:**
  - If had active shield: removes protection, resets streak
  - If no shield: normal streak decay
- Returns: Array of `{player_id, action_taken, details}`

### Database Triggers

#### Trigger 1: Automatic Token Issuance
```sql
TRIGGER trigger_issue_shield_tokens_on_completion
AFTER UPDATE OF completed ON games
```
When `games.completed = true`:
- For each selected player:
  - Increments `games_played_since_shield_launch`
  - Checks if reached milestone (% 10 == 0)
  - Issues token if milestone reached AND tokens < 4

#### Trigger 2: Token Return on Game Deletion
```sql
TRIGGER trigger_return_shields_on_game_delete
BEFORE DELETE ON games
```
When game is deleted:
- Finds all active shield usages for that game
- Calls `return_shield_token` for each
- Prevents lost tokens from deleted games

#### Trigger 3: Shield Processing on Selection
```sql
TRIGGER trigger_process_shields_on_selection
AFTER UPDATE OF status ON games
```
When `games.status` changes to `'players_announced'`:
- Automatically calls `process_shield_streak_protection`
- Maintains/removes shields based on game participation
- Ensures shield logic runs after every selection

### Frontend Components

#### 1. `useShieldStatus(playerId)` Hook
Custom React hook providing:
- `shieldStatus`: Complete shield data object
- `loading`: Loading state
- `error`: Error state
- `refreshShieldStatus()`: Manual refresh function
- Real-time subscriptions to: players table, shield_token_usage, shield_token_history

#### 2. `useShieldEligibility(playerId, gameId)` Hook
Checks if player can use shield for specific game:
- `eligibility`: `{eligible, reason, tokensAvailable}`
- `loading`: Loading state
- `recheckEligibility()`: Manual recheck

#### 3. `useShieldToken(playerId, gameId)` Hook
Handles shield token usage and cancellation:
- `useShield()`: Async function to use shield token
- `returnShield()`: Async function to cancel/return shield token
- `isUsing`: Loading state (shared between use and return operations)
- `error`: Error state

#### 4. `ShieldTokenStatus` Component (v1.0.5)
Located in: `src/components/profile/ShieldTokenStatus.tsx`

Comprehensive shield token status display for player profile pages:
- Shows token count with shield emoji (X/4 max)
- Displays active shield badge when protecting a streak (shows frozen streak value)
- Progress toward next token:
  - Visual progress bar (0-100%)
  - Games counter (X/10 games)
  - Games remaining until next token
  - Special handling when at max capacity (4/4):
    - Shows warning alert instead of progress bar
    - Message: "Maximum tokens reached - Use a token to start earning your next one"
- **Expandable Explainer Section**:
  - Button: "What are Shield Tokens?" toggles explanation panel
  - Comprehensive coverage of shield system:
    - What shield tokens are (streak protection for absences)
    - How to earn them (1 per 10 games, max 4)
    - How to use them (game page or WhatsApp 🛡️ emoji before registration closes)
    - **Registration vs Shield mutual exclusivity** (EITHER register OR shield, not both)
    - **Registration deadline enforcement** (all actions final after registration closes, no retroactive usage)
    - Important rules (1 shield per game, can cancel before registration closes)
    - **Strategy tip for multi-week absences** (need enough shields to cover entire absence, or don't use any)
  - Uses Framer Motion for smooth expand/collapse animation
  - Consistent styling with Priority Token explainer (bg-base-300 panel)
- Loading state with spinner
- Handles missing data gracefully (shows 0 tokens and reset progress)
- Optional `playerName` prop for viewing other players' profiles

Props:
```typescript
{
  tokensAvailable: number (0-4)
  gamesTowardNextToken: number (0-9)
  gamesUntilNextToken: number (1-10)
  shieldActive: boolean
  frozenStreakValue: number | null
  isLoading: boolean
  playerName?: string  // For viewing other players
}
```

Integrated into:
- `Profile.tsx` - Own profile page at `/profile`
- `PlayerProfile.tsx` - Other players' profiles at `/players/:id` or `/player/:friendlyName`
- Positioned after Priority Token Status section for consistent UX
- Real-time updates via `useShieldStatus` hook subscriptions

#### 5. `ShieldTokenDisplay` Component
Visual display showing:
- 0-4 shield emoji icons (filled/grayed based on availability)
- Active shield indicator with checkmark
- Progress bar to next token (X/10 games)
- Frozen streak badge if shield active
- Tooltip with detailed info

Props:
```typescript
{
  tokensAvailable: number (0-4)
  gamesTowardNextToken: number (0-9)
  gamesUntilNextToken: number (1-10)
  shieldActive: boolean
  frozenStreakValue: number | null
  size: 'sm' | 'md' | 'lg'
  showProgress: boolean
  showTooltip: boolean
}
```

#### 6. `ShieldTokenButton` Component
Full button with confirmation modal and cancellation support:
- **Use Mode** (when no active shield):
  - Warning button (🛡️) with token count badge
  - Confirmation modal explaining consequences
  - Shows what will be frozen (streak value, XP modifier)
  - Lists important rules (can't miss again without shield)
  - Cancel registration warning if applicable
  - Confirmation required before activation
- **Cancel Mode** (when shield active for this game):
  - Error button (❌) to cancel shield
  - Click to immediately return token
  - No confirmation required (instant cancel)
  - Updates to Use Mode after cancellation

Props:
```typescript
{
  gameId: string
  playerId: string
  tokensAvailable: number
  currentStreak: number
  isRegistered: boolean
  onShieldUsed?: () => void  // Called for both use and cancel
  disabled?: boolean
  size: 'sm' | 'md' | 'lg'
}
```

#### 7. `ShieldTokenBadge` Component
Compact badge for player cards:
- Shows token count OR "Active" if shield active
- Color: warning (yellow) for available, success (green) for active
- Size options: xs, sm, md
- Returns null if no tokens and no active shield

#### 8. Updated `GameRegistration` Component
Enhanced registration flow with mutual exclusivity:
- **Register Interest button**:
  - Normal flow when no shield active and not registered
  - **Disabled when shield is active** with blue info alert: "You're using a shield token for this game. Cancel the shield to register interest instead."
  - Enabled again when shield is cancelled
- **OR divider** if tokens available or shield active
- **Shield Section** (below divider):
  - "Can't play this week? Protect your streak" message (if no active shield)
  - "🛡️ Your streak is protected for this game" message (if shield active)
  - `ShieldTokenButton` (toggles between Use/Cancel based on state)
  - **Disabled when registered to play** with blue info alert: "You're registered to play. Unregister first to use a shield token instead."
  - Enabled again when unregistered
  - `ShieldTokenDisplay` showing progress and token count (moved here from top)
- **Real-time UI updates** when shield used/cancelled via `onShieldUsed` callback
- **Bidirectional mutual exclusivity enforcement**:
  - Cannot register interest while shield is active
  - Cannot use shield while registered to play
  - Clear visual feedback and instructions for both states

#### 9. Updated `PlayerCard` Components
Player cards now show shield protection visually:

**PlayerCardModifiers Component** (Streak row):
- **Dynamic Label**: "Streak Bonus" normally, changes to "Streak Frozen" when shield is active
- **Shield Icon**: Displays Shield icon (🛡️) instead of Flame icon when shield is active
- **Frozen Effect**: Purple/indigo gradient background with animated shimmer orbs on the streak row
- **Frozen Percentage**: Shows frozen streak value (e.g., +100% for 10-game frozen streak)
- **Desktop Tooltip**: Hover shows contextual message:
  - "Your X-game streak is frozen at +Y% XP for this week" (if it's your card)
  - "Their X-game streak is frozen at +Y% XP for this week" (if it's someone else's card)
- **Mobile Tap**: Tapping the streak row on mobile shows expandable tooltip below with same message
- **Visual Styling**:
  - Background: `bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-purple-900/40`
  - Border: `border-2 border-purple-400/60`
  - Shadow: `shadow-lg shadow-purple-500/20`
  - Text color: Purple-tinted for better contrast

**PlayerCardFront Component**:
- Passes `shieldActive` and `frozenStreakValue` props to `PlayerCardModifiers`
- Passes `playerId` for contextual pronoun determination ("Your" vs "Their")

**All Player Card Displays**:
- Shield styling appears on:
  - Game registration page (ShieldTokenPlayers component)
  - Player list page (/players - PlayerCardGrid component)
  - Any other location where PlayerCard is used
- Consistent visual treatment across all card instances

### Player Selection Integration

The shield system integrates with existing player selection:

1. **Registration Phase** (useRegistrationClose):
   - Players can use shields INSTEAD of registering
   - Shield usage recorded in `shield_token_usage` table
   - Registration cancelled if player was already registered

2. **Selection Phase** (process_registration_close):
   - Normal selection runs (token users, merit, random)
   - Trigger automatically fires: `trigger_process_shields_on_selection`
   - Calls `process_shield_streak_protection(game_id)`

3. **Shield Processing Phase** (process_shield_streak_protection):
   - For players with active shields:
     - Maintains frozen streak if natural streak < frozen
     - Removes shield if natural streak >= frozen
   - For players who missed without shield:
     - Removes shield protection if they had one
     - Resets streak to 0

4. **XP Calculation** (integrated v1.0.4):
   - If player has `shield_active = true`:
     - Use `frozen_streak_modifier` instead of `current_streak * 0.1`
     - Ensures consistent XP even when not playing
     - Implemented in `calculate_player_xp()` function

### RLS Policies

Shield tables have Row Level Security:

**shield_token_history**:
- Players can view their own history
- Admins can view all history

**shield_token_usage**:
- Players can view their own usage
- Admins can view all usage

All modifications go through SECURITY DEFINER functions.

## User Flow

### Using a Shield Token

1. **Navigate to Game Page** during registration window
2. **See Shield Status** - Display shows:
   - Current token count (0-4 shields)
   - Progress to next token (e.g., "7/10 games")
   - Active shield indicator if applicable
3. **Decide Not to Play** - Instead of registering:
   - Scroll to "Can't play this week?" section
   - Click "Use Shield Token" button (🛡️ warning button)
4. **Review Confirmation Modal**:
   - Warning alert
   - Explanation of consequences
   - Current streak will be frozen
   - XP modifier will be maintained
   - Token count will decrease
   - Rules about missing another game
5. **Confirm Usage**:
   - Click "Confirm - Use Shield Token"
   - Toast notification: "Shield token used! X shields remaining"
   - Game data refreshes
   - Shield status updates
   - Button changes to "Cancel Shield" (❌ red button)
   - **"Register Interest" button becomes disabled** with info alert explaining mutual exclusivity

### Cancelling a Shield Token

If you change your mind after using a shield (during registration window):

1. **Find the Shield Section** - Same location where you used it
2. **See Active Shield Status**:
   - Message: "🛡️ Your streak is protected for this game"
   - Red "Cancel Shield" button (❌) replaces "Use Shield Token"
   - "Register Interest" button is disabled with blue info alert
3. **Click "Cancel Shield"**:
   - Token is immediately returned
   - Toast notification: "Shield cancelled! X shields available"
   - Shield protection removed for this game
   - Button changes back to "Use Shield Token" (🛡️)
   - **"Register Interest" button becomes enabled again**
   - Info alert disappears
4. **Deadline**: Can only cancel during registration window
   - Once registration closes, shield usage is final
   - Can toggle between use/cancel as many times as needed before deadline

### Managing Shields

Players can view their shield status:
- **Game Page**: During registration, shield display shows current status
- **Player Profile**: (future) Dedicated shield token section
- **Player Cards**: Shield emoji indicator if active

Admins can manage shields:
- **Admin Panel > Shield Token Management**: Available at `/admin/shields`
  - View all players' shield status with statistics dashboard
  - Issue tokens manually (admin override)
  - Remove active shield protection
  - View shield usage history and progress
  - Search/filter players by name
  - Accessible to admins with `MANAGE_PLAYERS` permission

## Edge Cases and Rules

### 1. Game Cancellation
**Scenario**: Player used shield, then game is cancelled by admin.

**Behavior**:
- Trigger: `trigger_return_shields_on_game_delete`
- Shield token is **returned** to player
- No penalty applied
- Shield usage marked as inactive in history

### 2. Multiple Shields for Same Player
**Scenario**: Player tries to use shield twice for same game.

**Behavior**:
- `check_shield_eligibility` returns `eligible: false`
- Reason: "Shield already used for this game"
- Button disabled, cannot proceed

### 3. Shield + Priority Token
**Scenario**: Player wants to use both shield token AND priority token for same game.

**Behavior**:
- **Not allowed** - mutually exclusive
- Shield token = NOT playing (protecting streak)
- Priority token = Playing (guaranteed slot)
- Cannot do both simultaneously

### 4. Admin Manual Selection After Shield
**Scenario**: Player used shield, then admin manually adds them to selected players.

**Behavior**: (future enhancement needed)
- Should return shield token automatically
- Should treat as normal game played
- Should count toward `games_played_since_shield_launch`

### 5. Max Tokens Reached
**Scenario**: Player has 4 tokens, plays 10 more games (reaches 10-game milestone).

**Behavior**:
- `issue_shield_token` checks: `tokens_available >= 4`
- Returns: `{success: false, message: "Already has maximum tokens (4)"}`
- No token issued, no error thrown
- Player must use some tokens before earning more

### 6. Streak Frozen, Miss Game Without Shield
**Scenario**: Player has 10-game streak frozen, plays 5 games, then misses week 6 without using shield.

**Behavior**:
- `process_shield_streak_protection` detects:
  - Player has `shield_active = true`
  - Player NOT in game_registrations for this game
  - Player did NOT use shield for this game
- Action: `remove_shield_protection` called
- Result:
  - `shield_active = false`
  - `frozen_streak_value = NULL`
  - `frozen_streak_modifier = NULL`
  - Normal streak decay applies (resets to 0)

### 7. Natural Streak Reaches Frozen Value
**Scenario**: Player has 10-game streak frozen, plays 10 consecutive games without missing.

**Behavior**:
- After 10th game selection, `process_shield_streak_protection` runs
- Detects: `current_streak (10) >= frozen_streak_value (10)`
- Action: `remove_shield_protection` called with reason "Natural streak reached"
- Result:
  - Shield removed
  - Player now has natural 10-game streak
  - Can continue building (11, 12, 13...)
  - Shield token(s) remain available for future use

## Admin Override Capabilities

Admins have special powers:

### Manual Token Issuance
```sql
SELECT issue_shield_token(
    '<player_id>',
    'Admin granted due to extenuating circumstances',
    '<admin_user_id>'
);
```
- Reason logged in history
- Action type: 'admin_override'
- initiated_by: admin's user_id

### Manual Token Removal
```sql
SELECT remove_shield_protection(
    '<player_id>',
    'Admin removed due to policy violation',
    '<admin_user_id>'
);
```
- Clears active shield
- Logs removal with admin ID

### Force Token Return
```sql
SELECT return_shield_token(
    '<player_id>',
    '<game_id>',
    'Admin correction'
);
```
- Returns used token
- Updates history

## Monitoring and Analytics

### Key Metrics to Track
1. **Token Distribution**:
   - How many players have 0, 1, 2, 3, 4 tokens?
   - Average tokens per player

2. **Token Usage Patterns**:
   - How often are shields used?
   - What percentage of players use shields?
   - Average time between shield uses

3. **Shield Success Rate**:
   - % of shields that successfully protect streaks
   - % of shields that get "broken" (miss game without shield)
   - % of shields that get naturally achieved

4. **Token Earning Rate**:
   - Average games played to first token
   - Distribution of players by games_played_since_launch

### Queries for Monitoring

**Active Shields Count**:
```sql
SELECT COUNT(*) FROM players WHERE shield_active = true;
```

**Token Distribution**:
```sql
SELECT
    shield_tokens_available,
    COUNT(*) as player_count
FROM players
GROUP BY shield_tokens_available
ORDER BY shield_tokens_available;
```

**Shield Usage This Month**:
```sql
SELECT COUNT(*)
FROM shield_token_history
WHERE action_type = 'used'
AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
```

**Top Token Users**:
```sql
SELECT
    p.friendly_name,
    COUNT(*) as tokens_used
FROM shield_token_history sth
JOIN players p ON p.id = sth.player_id
WHERE sth.action_type = 'used'
GROUP BY p.friendly_name
ORDER BY tokens_used DESC
LIMIT 10;
```

## Future Enhancements

### Phase 2 Features
1. **Player Dashboard**:
   - Dedicated shield token section
   - Usage history visualization
   - Next milestone countdown

2. **Shield Statistics**:
   - Personal stats: tokens earned, tokens used, success rate
   - League stats: average tokens, most protected player

3. **Notifications**:
   - Email/push when token earned
   - Warning when shield at risk (active shield + missed game)

4. **Admin Analytics**:
   - Dashboard showing system-wide shield metrics
   - Export shield usage reports
   - Identify abuse patterns

### Phase 3 Features
1. **Variable Token Earn Rates**:
   - Different rates for different player tiers
   - Bonus tokens for loyalty milestones

2. **Token Trading**:
   - Transfer tokens between players (with admin approval)
   - Gift tokens to friends

3. **Shield Combos**:
   - Use multiple shields at once for longer protection
   - "Shield packages" for extended holidays

## Troubleshooting

### "No shield tokens available"
**Cause**: Player hasn't reached 10-game milestone OR already at max tokens.

**Solution**:
- Check `games_played_since_shield_launch`
- Check `shield_tokens_available`
- If at max (4), must use some before earning more

### "Shield already used for this game"
**Cause**: Player already used shield for this specific game.

**Solution**:
- Cannot use multiple shields for same game
- Check `shield_token_usage` table for active record

### "Shield removed unexpectedly"
**Cause**: Player likely missed a game without using shield while shield was active.

**Solution**:
- Check `shield_token_history` for removal reason
- Look for action_type = 'removed' with notes
- Common reasons: "Missed game without using shield"

### Shield not showing on player card
**Cause**: Props not passed correctly OR shield not actually active.

**Solution**:
- Verify `shield_active = true` in database
- Check component receives `shieldActive` and `frozenStreakValue` props
- Check console for prop errors

### Token not issued after 10 games
**Cause**: Trigger might have failed OR player already at max tokens.

**Solution**:
- Check `games_played_since_shield_launch` value
- Check `shield_tokens_available` (if = 4, can't earn more)
- Check database logs for trigger errors
- Manually issue if needed: `SELECT issue_shield_token(...)`

## Support and Feedback

For issues or questions:
1. Check this documentation first
2. Review database logs for errors
3. Check Supabase dashboard for RLS policy issues
4. Contact admin team for manual intervention if needed

## Changelog

**v1.0.5** - Profile Page Integration & Max Token Fix (2025-10-10)
- **Shield Token Status on Profile Pages**:
  - Created `ShieldTokenStatus` component for comprehensive shield token information display
  - Integrated into both `Profile.tsx` (own profile) and `PlayerProfile.tsx` (viewing other players)
  - Component displays:
    - Token count with shield emoji (X/4 max)
    - Active shield badge when protecting a streak
    - Progress bar toward next token (X/10 games) with visual progress indicator
    - Expandable explanation section covering:
      - What shield tokens are and how they work
      - How to earn them (1 per 10 games)
      - How to use them (game page or WhatsApp 🛡️ emoji)
      - Registration vs shield token mutual exclusivity rules
      - Registration deadline enforcement (all actions final after registration closes)
      - Multi-week absence strategy tips
      - Important usage notes and restrictions
  - Positioned after Priority Token Status section for consistent user experience
  - Real-time updates via `useShieldStatus` hook subscriptions
- **Max Token Progress Fix**:
  - Fixed frontend display to show warning alert when at max tokens (4/4) instead of misleading progress
  - Alert message: "Maximum tokens reached (4/4) - Use a token to start earning your next one"
  - Progress bar and games counter hidden when at maximum capacity
  - **Backend Fix**: Updated `trigger_issue_shield_tokens()` to only increment `games_played_since_shield_launch` when player has < 4 tokens
  - This prevents progress from accumulating while at max capacity
  - Progress resumes automatically when a token is used (drops to 3/4)
  - Migration: `20251010_fix_shield_token_progress_at_max.sql`
- **Documentation Improvements**:
  - Added clarification that players must choose EITHER register OR use shield - not both
  - Emphasized that registration close is the final deadline for all actions
  - Clarified that forgetting to react before registration closes means no retroactive shield usage
  - Added strategy guidance for multi-week absences (need enough shields to cover entire absence)
  - Updated timing information: shields can only be cancelled before registration closes (not "before teams are announced")
  - All user-facing text now accurately reflects the registration window as the action deadline

**v1.0.4** - XP Integration & Admin Portal Fixes (2025-10-09)
- **XP Calculation Integration**:
  - Fixed `calculate_player_xp()` function to use `frozen_streak_modifier` when shield is active
  - Players with active shields now maintain their frozen XP bonus correctly
  - XP calculations now check `shield_active` flag and use frozen modifier instead of calculating from current_streak
  - Migration: `20251009_fix_xp_calculation_shield_integration.sql`
- **Admin Portal Integration**:
  - Added Shield Token Management route at `/admin/shields`
  - Created `ShieldTokenManagementCard` component for admin portal
  - Shield management now accessible to admins with `MANAGE_PLAYERS` permission
  - Admin portal displays shield management card alongside other admin tools
- **System Verification**:
  - Confirmed `trigger_process_shields_on_selection` fires correctly on `games.status = 'players_announced'`
  - Verified shield processing integration with player selection workflow
  - All core database functions tested and working correctly

**v1.0.3** - Player Card Visual Enhancements (2025-10-02)
- **Enhanced Player Card Shield Indicators**:
  - Removed shield icon from top-left corner (was too subtle)
  - Added frozen visual effect directly to streak row in PlayerCardModifiers
  - Dynamic label: "Streak Bonus" changes to "Streak Frozen" when shield is active
  - Shield icon (🛡️) replaces Flame icon when shield is active
  - Purple/indigo gradient background with animated shimmer effect on streak row
  - Shows frozen streak percentage instead of current streak when protected
  - Desktop hover tooltip with contextual messaging ("Your" vs "Their")
  - Mobile tap interaction to show/hide protection details
  - Applied to all player card instances (game registration, player list, etc.)
- **Technical Improvements**:
  - Updated `usePlayerGrid` hook to fetch `shield_active` and `frozen_streak_value`
  - Added `playerId` prop to PlayerCardModifiers for personalized tooltips
  - Integrated `useUser` hook for current user detection
  - Shield props now passed through PlayerCardGrid → PlayerGridLayout → PlayerCard chain

**v1.0.2** - Bug Fixes & UX Improvements (2025-10-02)
- Fixed `return_shield_token` to properly clear shield protection flags when no active shields remain
- Fixed materialized view refresh permissions with `SECURITY DEFINER` on trigger function
- Added automatic materialized view refresh triggers on shield-related table changes
- Added visibility change listener to refetch shield status when page becomes visible
- **Bidirectional mutual exclusivity UI**:
  - Register Interest button disabled when shield is active (with info alert)
  - Use Shield Token button disabled when registered to play (with info alert)
  - Clear visual feedback and instructions for both states
- **Shield Token Players Display**:
  - Added `ShieldTokenPlayers` component showing all players using shields for a game
  - Displays in both grid (player cards with shield indicator) and list views
  - Shows frozen streak value, XP modifier, and time of shield usage
  - Appears below registered players during registration window
  - Provides visibility into who is protecting their streak each week

**v1.0.1** - Cancellation Feature (2025-10-02)
- Added ability to cancel shield usage during registration window
- `ShieldTokenButton` now toggles between Use (🛡️) and Cancel (❌) modes
- `return_shield_token` function exposed via `useShieldToken` hook
- `use_shield_token` function updated to delete inactive records (prevents duplicate key constraint)
- UI reorganized: Shield progress display moved underneath OR divider in shield section
- Real-time UI updates when shield state changes

**v1.0.0** - Initial Implementation (2025-10-02)
- Core database schema
- Token accrual system (1 per 10 games)
- Shield usage and protection mechanics
- Frontend components (display, button, badges)
- GameRegistration integration
- PlayerCard indicators
- Automatic processing triggers
- Admin override capabilities
