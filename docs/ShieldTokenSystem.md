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

### Protected Streak with Gradual Decay
When a shield token is used:
1. Current streak value is **protected** (e.g., 10-game streak)
2. When player returns and plays, the protected bonus **gradually decays**:
   - Protected bonus = `protected_streak_value - current_streak`
   - Effective XP bonus = `MAX(current_streak, protected_bonus) * 10%`
3. The two values **converge at the midpoint** (e.g., 5 games for a 10-game streak)
4. Once converged, shield is automatically removed and natural streak continues
5. This means players recover their streak in **half the games** compared to a full reset

**Example: 10-game streak protected**
```
Game 1: Natural 1, Protected 9  → Effective +90% XP
Game 2: Natural 2, Protected 8  → Effective +80% XP
Game 3: Natural 3, Protected 7  → Effective +70% XP
Game 4: Natural 4, Protected 6  → Effective +60% XP
Game 5: Natural 5, Protected 5  → Effective +50% XP (converged!)
Game 6: Natural 6              → +60% XP (continues normally)
```

## Usage Examples

### Example 1: Single Week Holiday
```
Starting State:
- 8-game streak (+80% XP)
- 2 shield tokens available

Action: Going on holiday for 1 week
- Week 1: Use 1 shield token
  → Streak protected at 8 games
  → 1 shield token remaining

After Holiday (gradual decay):
- Game 1: Natural 1, Protected 7 → +70% XP
- Game 2: Natural 2, Protected 6 → +60% XP
- Game 3: Natural 3, Protected 5 → +50% XP
- Game 4: Natural 4, Protected 4 → +40% XP (converged!)
- Shield removed automatically after 4 games (half of original streak)
- Game 5: Natural 5 → +50% XP (continues normally)
```

### Example 2: Four-Week Holiday with Tokens
```
Starting State:
- 15-game streak (+150% XP)
- 4 shield tokens available

Action: Going on 4-week holiday
- Week 1: Use shield → 3 tokens left, streak protected at 15
- Week 2: Use shield → 2 tokens left, streak still protected at 15
- Week 3: Use shield → 1 token left, streak still protected at 15
- Week 4: Use shield → 0 tokens left, streak still protected at 15

Return (decay only starts when you play):
- Game 1: Natural 1, Protected 14 → +140% XP
- Game 2: Natural 2, Protected 13 → +130% XP
- ...
- Game 8 (midpoint): Natural 8, Protected 7 → +80% XP (converged!)
- Shield removed after 8 games (half of 15)
- Game 9: Natural 9 → +90% XP (continues normally)

Key: Decay is PAUSED while using shields. Each shield keeps streak frozen until you return and play.
```

### Example 3: Running Out of Tokens
```
Starting State:
- 12-game streak (+120% XP)
- 2 shield tokens available

Action: Going on 4-week holiday
- Week 1: Use shield → 1 token left, streak protected at 12
- Week 2: Use shield → 0 tokens left, streak still protected at 12
- Week 3: No shield, don't play
  → Shield protection removed
  → Streak resets to 0
  → XP modifier drops to +0%
- Week 4: Still no streak

Result: Lost streak after tokens ran out. You need enough shields to cover your ENTIRE absence.
```

### Example 4: Missing Game During Decay Period
```
Starting State:
- 10-game streak protected (original value)
- Currently at natural streak 3 (in decay period)
- Protected bonus = 10 - 3 = 7
- Effective XP = +70%
- Shield active, protecting the streak

Action: Miss another game WITHOUT using a shield
Result:
- Shield protection immediately removed
- Streak resets to 0
- XP modifier drops to +0%
- Lost all progress

Lesson: If you have an active shield in decay, you MUST use another shield token if you need to miss another game before convergence.
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
   → Streak protected at 8 games, 1 token remaining
3. Friday: Plans change again, can play!
   → Click "Cancel Shield"
   → Token returned, 2 tokens available again
   → Click "Register Interest"
   → Back to normal registration

Result: Full flexibility during registration window - can toggle between playing/protected as plans change
```

### Example 6: Intermittent Absences (Miss, Play, Miss)
```
Starting State:
- 10-game streak (+100% XP)
- 3 shield tokens available

Action: Miss Week 1, play 2 weeks, miss Week 4
- Week 1: Use shield → 2 tokens left, streak protected at 10
- Week 2: Play → Natural 1, Protected 9 → +90% XP (decay started)
- Week 3: Play → Natural 2, Protected 8 → +80% XP (decay continues)
- Week 4: Need to miss again
  → Use shield during active decay
  → System preserves EFFECTIVE streak (8), not natural streak (2)
  → 1 token left, streak now protected at 8

After Week 4 (decay continues from 8):
- Game 1: Natural 1, Protected 7 → +70% XP
- Game 2: Natural 2, Protected 6 → +60% XP
- Game 3: Natural 3, Protected 5 → +50% XP
- Game 4: Natural 4, Protected 4 → +40% XP (converged!)
- Shield removed after 4 games (half of 8)

Key: When using a shield DURING decay, the system preserves your
effective streak (higher of natural vs protected bonus), not your
much lower natural streak. This prevents losing progress when you
need to miss another game mid-recovery.
```

## Technical Implementation

### Database Schema

#### Players Table (Shield Columns)
```sql
shield_tokens_available        INTEGER (0-4)
games_played_since_shield_launch  INTEGER
shield_active                  BOOLEAN
protected_streak_value         INTEGER (nullable) -- Original streak when shield activated
protected_streak_base          INTEGER (nullable) -- Same as protected_streak_value (for reference)
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
    protected_streak_value INTEGER,    -- Original streak value when activated
    protected_streak_base INTEGER,     -- Same value, stored for reference
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
    protected_streak_value INTEGER,    -- Original streak value at time of action
    protected_streak_base INTEGER,     -- Same value, stored for reference
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
- Stores `protected_streak_value` (the current streak to protect)
- Stores `protected_streak_base` (same value, for reference)
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
- Clears `shield_active`, `protected_streak_value`, `protected_streak_base`
- Marks all active usages as inactive
- Logs removal in history
- Reasons: "Streak converged", "Missed game without shield", "Admin override"
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
- **For players with active shields who played:**
  - Calculates convergence: `current_streak >= CEIL(protected_streak_value / 2)`
  - If converged: removes shield protection (natural streak now equals or exceeds decaying protected bonus)
  - If not converged: maintains protection (decay continues next game)
- **For players who missed game without shield:**
  - If had active shield: removes protection, resets streak to 0
  - If no shield: normal streak decay
- Returns: Array of `{player_id, action_taken, details}`

#### 7. `remove_shield_tokens(player_id, amount, reason, admin_id)`
Removes shield tokens from a player (admin only):
- Decrements `shield_tokens_available` by specified amount (minimum 0)
- Validates player has tokens to remove
- Logs action in `shield_token_history` with action_type 'admin_remove'
- Used by: admin override for testing corrections or policy violations
- Returns: `{success: boolean, message: text, tokens_now: int}`

#### 8. `reset_shield_progress(player_id, reason, admin_id)`
Resets shield progress tracking (admin only):
- Resets `games_played_since_shield_launch` to 0
- Does NOT affect `shield_tokens_available` (tokens remain)
- Logs action in `shield_token_history` with action_type 'progress_reset'
- Used by: admin override for testing corrections or fresh start
- Returns: `{success: boolean, message: text, games_before: int}`

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
- **Shield Icon**: Displays Shield icon (🛡️) instead of Flame icon when shield is active
- **Protected Streak Display**: Shows "{protectedValue}-game streak" with XP bonus percentage
- **Three Visual States** (v1.1.1):
  1. **Pending State** (natural streak >= protected value - game not yet missed):
     - Yellow pulsing dot indicator
     - Text: "Protection ready"
     - Tooltip: "Protection ready! If you miss this game, your X-game streak bonus will gradually decay instead of resetting to 0."
  2. **Recovering State** (natural streak < convergence point):
     - Progress bar showing convergence progress
     - Labels: "X/Y games" on left, "Z to go" on right
     - Purple gradient progress bar with smooth animation
     - Tooltip: "Recovering X-game streak. Y more games to full recovery."
  3. **Recovered State** (natural streak >= convergence point):
     - Green progress bar at 100%
     - Labels: "✓ Recovered" on left, "Complete!" on right
     - Tooltip: "Fully recovered! Natural streak (X) has caught up."
- **Convergence Point**: `CEIL(protected_streak_value / 2)` games
- **Mobile Tap**: Tapping the streak row on mobile shows expandable tooltip below with state-specific message
- **Visual Styling**:
  - Background: `bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-purple-900/40`
  - Border: `border-2 border-purple-400/60`
  - Shadow: `shadow-lg shadow-purple-500/20`
  - Animated shimmer/glow effects
  - Progress bar: Purple gradient (recovering) or green (recovered)

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

4. **XP Calculation** (updated v1.1.0 - Gradual Decay):
   - If player has `shield_active = true`:
     - Calculate `effective_streak = MAX(current_streak, protected_streak_value - current_streak)`
     - Use `effective_streak * 0.1` as streak modifier
     - This creates gradual decay: protected bonus decreases as natural streak increases
     - Converges at `CEIL(protected_streak_value / 2)` games
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
  - **Issue tokens manually** (+Token button - green)
  - **Remove tokens** (-Token button - red, shows when player has tokens)
  - **Remove active shield protection** (Remove Shield button - red, shows when shield active)
  - **Reset progress tracking** (Reset Progress button - yellow, shows when games > 0)
  - View shield usage history and progress
  - Search/filter players by name
  - All actions require confirmation dialog
  - All actions logged in `shield_token_history` with admin ID
  - Accessible to admins with `MANAGE_PLAYERS` permission

- **Game Registrations Modal** (v1.1.1): Available via "View Registrations" on GameCard
  - **Apply shields on behalf of players**:
    - Shield button (🛡️) appears next to available players who have tokens
    - Validates eligibility via `check_shield_eligibility` RPC
    - Uses `use_shield_token` RPC to activate shield
    - Player automatically moved from "Available" to "Using Shield" section
  - **Remove shields from players**:
    - "Remove" button appears next to each shield user
    - Uses `return_shield_token` RPC to return token
    - Player moves back to "Available Players" list
  - **Separate "Players Using Shield Tokens" section**:
    - Shows player name and protected streak value
    - Maintains mutual exclusivity (shield users not in registered list)
    - Filter excludes shield users from available players

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

### 6. Miss Game During Decay Period Without Shield
**Scenario**: Player has 10-game streak protected, plays 3 games (now at natural 3, protected 7), then misses week 4 without using shield.

**Behavior**:
- `process_shield_streak_protection` detects:
  - Player has `shield_active = true`
  - Player NOT in game_registrations for this game
  - Player did NOT use shield for this game
- Action: `remove_shield_protection` called
- Result:
  - `shield_active = false`
  - `protected_streak_value = NULL`
  - `protected_streak_base = NULL`
  - Normal streak decay applies (resets to 0)

### 7. Natural Streak Converges with Protected Value
**Scenario**: Player has 10-game streak protected, plays games until convergence.

**Behavior**:
- Convergence point = CEIL(10 / 2) = 5 games
- After 5th game selection, `process_shield_streak_protection` runs
- Detects: `current_streak (5) >= CEIL(protected_streak_value / 2)`
- At this point: Natural 5, Protected 5 → both equal
- Action: `remove_shield_protection` called with reason "Streak converged"
- Result:
  - Shield removed
  - Player now has natural 5-game streak
  - Can continue building (6, 7, 8...)
  - Shield token(s) remain available for future use

### 8. Using Shield During Active Decay (Intermittent Absences)
**Scenario**: Player has 10-game protected, played 2 games (natural=2, protected bonus=8), needs to miss again.

**Behavior**:
- `use_shield_token` detects existing `shield_active = true`
- Calculates effective streak: `MAX(2, 10-2) = 8`
- Stores `protected_streak_value = 8` (not 2!)
- Player now protected at 8 instead of losing progress

**Why This Matters**:
- Without this behavior, using shield during decay would reset protection to natural streak (2)
- This would effectively waste all recovery progress made so far
- The system preserves the effective streak, giving fair treatment to intermittent absences
- Players can confidently use shields whether missing consecutively or with gaps

**Key Difference from Consecutive Absences**:
- **Consecutive**: Miss → Miss → Miss → Play (shields pause time, decay starts on return)
- **Intermittent**: Miss → Play → Play → Miss (decay already started, shield preserves effective value)

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
SELECT remove_shield_tokens(
    '<player_id>',
    1,  -- amount to remove
    'Admin removed for testing correction',
    '<admin_user_id>'
);
```
- Removes specified number of tokens
- Prevents going below 0
- Logs removal with admin ID
- Use cases: testing cleanup, policy violations, corrections

### Manual Shield Protection Removal
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

### Reset Shield Progress
```sql
SELECT reset_shield_progress(
    '<player_id>',
    'Admin reset for testing',
    '<admin_user_id>'
);
```
- Resets `games_played_since_shield_launch` to 0
- Does NOT affect existing tokens
- Logs reset with admin ID
- Use cases: testing cleanup, fresh start, data corrections

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

### Need to remove test tokens or reset progress
**Cause**: Testing or data correction needed.

**Solution**:
- Go to `/admin/shields` (Shield Token Management page)
- Find the player using search
- Use **-Token button** to remove tokens one at a time
- Use **Reset Progress button** to reset `games_played_since_shield_launch` to 0
- Both actions require confirmation and are logged in history
- Alternatively, use SQL functions directly:
  - `SELECT remove_shield_tokens('<player_id>', 1, 'Testing cleanup', '<admin_id>')`
  - `SELECT reset_shield_progress('<player_id>', 'Testing cleanup', '<admin_id>')`

## Support and Feedback

For issues or questions:
1. Check this documentation first
2. Review database logs for errors
3. Check Supabase dashboard for RLS policy issues
4. Contact admin team for manual intervention if needed

## Changelog

**v1.1.1** - Admin Shield Management & Visual Convergence Display (2025-12-12)
- **Admin Shield Token Management in Game Registrations Modal**:
  - Admins can now apply/remove shield tokens on behalf of players via "View Registrations" modal
  - New "Players Using Shield Tokens" section in GameRegistrations.tsx
  - Shield button (🛡️) appears next to available players who have tokens
  - Remove button for existing shield users
  - Maintains mutual exclusivity (shield users not in registered list)
  - Uses existing RPC functions: `check_shield_eligibility`, `use_shield_token`, `return_shield_token`
- **Fixed `return_shield_token` Database Function**:
  - Fixed incorrect column names (`frozen_streak_value` → `protected_streak_value`, `frozen_streak_modifier` → `protected_streak_base`)
  - Migration: `fix_return_shield_token_column_names`
- **Fixed RPC Function Array Access**:
  - TABLE-returning functions now correctly accessed via `result[0]` instead of `result`
  - Affected: `check_shield_eligibility`, `use_shield_token`, `return_shield_token`
- **Visual Shield Status with Three States**:
  - **Pending State**: Yellow pulsing dot with "Protection ready" when shield applied but game not yet missed
    - Tooltip: "Protection ready! If you miss this game, your X-game streak bonus will gradually decay instead of resetting to 0."
  - **Recovering State**: Progress bar showing convergence progress (X/Y games, Z to go)
    - Purple gradient progress bar
    - Shows natural streak progress toward convergence point
  - **Recovered State**: Green progress bar with "✓ Recovered | Complete!"
    - Tooltip: "Fully recovered! Natural streak has caught up."
  - Convergence point = `CEIL(protected_streak_value / 2)` games
- **Updated ShieldTokenPlayers List View**:
  - Renamed columns for clarity:
    - "Current Streak" → "Natural Streak"
    - "Protected Value" → "Protected Streak" (now shows X games, not +X%)
    - "Effective Bonus" → "Total XP Bonus"
- **Updated PlayerCardModifiers Component**:
  - Shows "{protectedValue}-game streak" with XP bonus
  - Conditional display based on shield state (pending/recovering/recovered)
  - Mobile-friendly tap interaction for detailed shield info

**v1.1.0** - Gradual Decay System (2025-12-04)
- **Major Architecture Change: Gradual Decay Instead of Full Freeze**
  - Shield protection now uses gradual decay instead of full freeze
  - Protected bonus = `protected_streak_value - current_streak`
  - Effective streak = `MAX(current_streak, protected_bonus)`
  - Convergence point at `CEIL(protected_streak_value / 2)` games (half the original)
  - Example: 10-game streak now recovers in 5 games instead of 10
- **Database Column Renames**:
  - `frozen_streak_value` → `protected_streak_value`
  - `frozen_streak_modifier` → `protected_streak_base`
  - Updated in: `players`, `shield_token_usage`, `shield_token_history` tables
- **Updated Database Functions**:
  - `calculate_player_xp()` - Now uses gradual decay formula for XP calculation
  - `use_shield_token()` - Stores `protected_streak_value` and `protected_streak_base`
  - `process_shield_streak_protection()` - Checks convergence at midpoint instead of full streak
  - `remove_shield_protection()` - Uses new column names
- **Frontend Updates**:
  - All components now display both natural streak AND protected bonus
  - Player cards show: "Streak: X | Protected: Y → +Z%"
  - Updated hooks with backwards compatibility for legacy column names
  - Updated explainer text throughout to describe gradual decay
  - Updated confirmation modals with convergence point information
- **Multi-Shield Behavior**: Decay is PAUSED while using shields (decay only starts when player returns and plays)
- **Terminology Change**: "Frozen" → "Protected" throughout codebase and documentation
- Migration: `20251204_shield_token_gradual_decay.sql`

**v1.0.6** - Admin Token Removal & Progress Reset (2025-10-09)
- **New Admin Functions**:
  - Created `remove_shield_tokens()` database function for removing tokens from players
  - Created `reset_shield_progress()` database function for resetting games played tracking
  - Both functions include validation, history logging, and admin tracking
- **Admin UI Enhancements**:
  - Added "-Token" button (red) to remove tokens one at a time
  - Added "Reset Progress" button (yellow) to reset games played counter
  - Buttons conditionally show based on player state (tokens > 0, games > 0)
  - All actions require confirmation dialogs
  - Actions column now uses `flex-wrap` for better mobile layout
- **Documentation Updates**:
  - Added new functions to Core Database Functions section
  - Expanded Admin Override Capabilities with examples
  - Updated Managing Shields section with detailed button descriptions
  - Added troubleshooting guide for removing test data
- **Use Cases**: Testing cleanup, data corrections, policy violations, fresh starts
- Migration: `add_admin_shield_token_controls.sql`

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
  - Shows protected streak value, XP modifier, and time of shield usage
  - Appears below registered players during registration window
  - Provides visibility into who is protecting their streak each week
  - **List view columns** (updated v1.1.1):
    - Natural Streak: Player's current actual streak
    - Protected Streak: The streak being protected (X games)
    - Total XP Bonus: Effective XP bonus percentage
    - Used At: Timestamp of shield activation

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
