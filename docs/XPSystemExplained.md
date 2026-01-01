# XP System Documentation (v1 - Legacy)

> **Status**: This documents the **legacy v1 system** used until January 2026. The current production system is **XP v2**.
>
> - [View XP System v2 Documentation (Current)](./features/XPSystemv2.md)
> - [View Migration Runbook](./migrations/XPv1ToV2Migration.md)
>
> This document is preserved for historical reference.

---

## Overview
The XP (Experience Points) system is designed to reward player participation and consistency in games. It uses a sophisticated weighted calculation that emphasizes recent game participation while maintaining a historical record of player engagement.

## Rarity Tiers

Players are classified into tiers based on their XP relative to other players:

| Tier | Percentile | Description |
|------|------------|-------------|
| **Legendary** | Top 2% | Elite players at the very top of the leaderboard |
| **World Class** | Top 7% | Exceptional players with consistent high performance |
| **Professional** | Top 20% | Accomplished players with significant experience |
| **Semi Pro** | Top 40% | Established players with moderate experience |
| **Amateur** | Above 0 XP | Players still building their experience (with any XP > 0) |
| **Retired** | 0 XP | Inactive players with no current XP |

Players with 0 XP are classified as "Retired" and displayed with a black card design. These players do not show rank shields, as they no longer have an active ranking in the system.

## Core Components

### 1. Database Tables
- `player_xp`: Stores current XP values for each player
- `players`: Contains player statistics including current_streak and other metrics
- `games`: Stores game information, sequence numbers, and completion status
- `game_registrations`: Tracks player participation and status in games
- `reserve_xp_transactions`: Records all reserve-related XP changes

### 2. Key Functions

#### calculate_player_xp(player_id UUID)
The primary XP calculation function that determines a player's current XP based on their game history.

##### Base XP Weighting System
Games are weighted based on how many games ago they occurred globally (not per-player):
| Games Ago    | XP Value |
|--------------|----------|
| Current game | 20 XP    |
| 1-2 games    | 18 XP    |
| 3-4 games    | 16 XP    |
| 5-9 games    | 14 XP    |
| 10-19 games  | 12 XP    |
| 20-29 games  | 10 XP    |
| 30-39 games  | 5 XP     |
| 40+ games    | 0 XP     |

##### Streak System
A player's streak is calculated based on their consecutive participation in past games only. Future game registrations or selections do not affect the streak calculation.

A streak is broken when any of these conditions occur in past games:
- They miss a game (not selected or didn't register)
- There's a gap between their games (missed games)
- They miss any of the most recent completed games

The streak only counts consecutive selected games with no gaps in past games. For example:
- If the latest completed game is #29, and a player's last game was #27, their streak is 0
- If a player was selected for completed games #29, #28, #27, their streak is 3
- If a player was selected for completed games #29, #28, but not #27, their streak is 2

Important notes:
- Only games that have already taken place are considered for streak calculation
- Being selected or registered for future games does not affect the streak
- The streak is updated after each game completion
- Team selection and announcement phases do not affect streak calculations

##### Streak Multiplier
- Players receive a 10% bonus for each streak level
- Formula: `1 + (current_streak * 0.1)`
- Example: A streak of 3 results in a 1.3x multiplier

##### Bench Warmer Streak
A bench warmer streak is calculated based on consecutive games where a player:
- Was registered but not selected for the game
- Remained in the reserves list until the game was completed
- Did not decline any slot offers during this period

The bench warmer streak is used to provide a bonus to players who consistently show up as reserves:
- Players receive a 5% bonus for each bench warmer streak level
- Formula: `1 + (bench_warmer_streak * 0.05)`
- Example: A streak of 2 results in a 1.10x multiplier

The bench warmer streak is broken when:
- The player is selected for a game
- The player declines a slot offer
- The player fails to register for a game
- There's a gap between their reserve appearances

IMPORTANT: The bench warmer streak multiplier is applied to ALL XP, not just reserve XP. This means:
- It multiplies both base XP from selected games AND reserve XP
- A player with base XP of 82 and reserve XP of 5, with a bench warmer streak of 1, would get:
  (82 + 5) * 1.05 = 91.35, rounded to 91

##### Registration Streak Bonus
The registration streak bonus is designed to help reserve players who consistently register but don't get selected. It provides a temporary XP boost that may help them reach the threshold for random selection vs XP merit selection.

- Tracks consecutive games where a player has registered (not dropped out)
- Provides a 2.5% XP bonus per streak level
- **Key feature**: The bonus applies to ANY reserve player with a registration streak
- Players don't need to be reserves for their entire streak - just in the current game
- Previous selections don't break the streak or affect eligibility

Example:
- Player registers for 8 consecutive games (selected in games 1-7, reserve in game 8)
- They get an 8-game registration streak with 20% bonus (8 × 2.5%)
- This helps boost their XP while they're in reserves

##### Unpaid Games Penalty
- Each unpaid game older than 24 hours incurs a -50% XP penalty
- Penalties stack linearly (e.g., 3 unpaid games = -150% penalty)
- XP will be clamped to 0 if penalties would make it negative
- Only applies to completed, historical games
- Does not apply to reserve players

Example:
```
Base XP: 100
Unpaid Games: 2
Penalty: -100% (2 × -50%)
Raw XP: 100 × (1 - 1.0) = 0
Final XP: 0
```

##### Final XP Calculation
1. Calculate Base XP from weighted game history
2. Add Reserve XP (if any)
3. Calculate and combine all modifiers:
   - Streak bonus: +10% per game
   - Bench warmer bonus: +5% per game
   - Registration streak bonus: +2.5% per game (reserves only)
   - Unpaid games penalty: -50% per game
4. Apply total modifier to (Base XP + Reserve XP)
5. Round to nearest integer
6. Clamp to 0 if negative

Example with all modifiers:
```
Base XP: 100
Reserve XP: +5
Total Base: 105

Modifiers:
- Streak (2 games): +20%
- Bench warmer (1 game): +5%
- Unpaid games (3): -150%

Total modifier = 1 + 0.2 + 0.05 - 1.5 = -0.25
Raw XP = 105 × -0.25 = -26.25
Final XP = max(0, round(-26.25)) = 0
```

### Common Mistakes to Avoid
1. ❌ Don't apply modifiers to individual games
2. ❌ Don't apply unpaid games penalty before other modifiers
3. ❌ Don't forget to add Reserve XP before applying modifiers
4. ❌ Don't round XP values before final calculation

### Historical Games
Only games marked as `is_historical = true` are counted in XP calculations. This ensures that:
- Only completed games that have actually taken place count towards XP
- Test games or placeholder games don't affect player XP
- Games in setup or selection phase don't affect XP calculations

### Troubleshooting XP Calculations
When verifying XP calculations:
1. Check player's game history for base XP weighting
2. Verify reserve transactions in reserve_xp_transactions table
3. Confirm both streak and bench warmer streak values
4. Remember that all XP (including reserve XP) gets multiplied by both streak multipliers
5. Use the calculate_player_xp() function to recalculate if needed

Example Investigation:
```sql
-- Example query to debug a player's XP calculation
WITH player_games AS (
    SELECT 
        g.sequence_number,
        g.is_historical,
        gr.status,
        g.completed
    FROM game_registrations gr
    JOIN games g ON g.id = gr.game_id
    WHERE gr.player_id = '[player_id]'
    AND g.completed = true
    ORDER BY g.sequence_number DESC
)
SELECT * FROM player_games;

-- This will show:
-- 1. Which games count (is_historical = true)
-- 2. Player's status in each game (selected/reserve)
-- 3. Game completion status
```

Real Example:
A player had 82 base XP from selected games, +5 XP from being a reserve, and a bench warmer streak of 1.
The calculation was:
1. Base XP from games: 82
2. Reserve XP: +5
3. Total before multipliers: 87
4. Streak multiplier: 1.0 (no streak)
5. Bench warmer multiplier: 1.05 (streak of 1)
6. Final calculation: 87 * 1.0 * 1.05 = 91.35, rounded to 91

### Status Changes and XP System

#### Player Status Lifecycle
1. **Initial Registration**
   - Players can register as 'selected' or 'reserve'
   - Initial registration has no XP impact

2. **Status Changes**
   - Selected → dropped_out (dropout)
   - Reserve → selected (slot acceptance)
   - Reserve → dropped_out (slot decline)
   - All status changes are tracked in `player_status_changes` table

3. **Game Registration States**
   - 'registered': Initial state
   - 'selected': Chosen to play
   - 'reserve': On reserve list
   - 'dropped_out': No longer participating

#### XP Rules for Status Changes

##### Selected Players
1. **Dropping Out Before Game Day**
   - No XP penalty
   - Status changes to 'dropped_out'
   - Game day is determined by calendar date

2. **Dropping Out On Game Day**
   - -10 XP penalty
   - Status changes to 'dropped_out'
   - Penalty recorded in `reserve_xp_transactions`

##### Reserve Players
1. **Slot Offers Before Game Day**
   - Accepting: Status changes to 'selected'
   - Declining: 
     - -10 XP penalty
     - Status changes to 'dropped_out'
     - Breaks bench warmer streak
     - Cannot receive further slot offers for this game

2. **Slot Offers On Game Day**
   - Accepting:
     - +10 XP bonus
     - Status changes to 'selected'
   - Declining:
     - No XP penalty
     - Status changes to 'dropped_out'
     - Maintains bench warmer streak
     - Cannot receive further slot offers for this game

#### Implementation Details
- All status changes trigger automatic XP calculations
- Only one penalty of each type per player per game
- Status changes are permanent within a game
- Game day is determined by comparing calendar dates:
  ```
  Game Date: 2025-02-14 21:00:00
  Action at: 2025-02-14 09:00:00 → On game day
  Action at: 2025-02-13 23:59:59 → Before game day
  ```

#### Database Implementation
1. **Tables**
   - `game_registrations`: Current player status
   - `player_status_changes`: History of all changes
   - `reserve_xp_transactions`: XP penalties and rewards

2. **Constraints**
   - One XP transaction type per player per game
   - Valid statuses: ['registered', 'selected', 'reserve', 'dropped_out']

3. **Triggers**
   - Automatically update XP on status changes
   - Maintain data consistency across tables
   - Handle game day calculations

### 3. Reserve XP System

#### Player Status Changes and Penalties

##### Selected Player Rules
- **Dropping Out Before Game Day**: No XP penalty
- **Dropping Out On Game Day**: -10 XP penalty
- Game day is determined by comparing the calendar date of the dropout with the game date
- Penalties are tracked in `reserve_xp_transactions` table with type 'SLOT_DECLINE_PENALTY'

##### Reserve Player Rules
1. **Slot Offers Before Game Day**:
   - Accepting: No XP bonus
   - Declining: -10 XP penalty and breaks bench warmer streak
   - This encourages reserves to only sign up if they're genuinely available

2. **Slot Offers On Game Day**:
   - Accepting: +10 XP bonus (rewards last-minute availability)
   - Declining: No penalty (understanding that plans may be made)
   - Bench warmer streak continues if declined on game day
   - "Game day" is determined by comparing the calendar date of the response with the game date

3. **Late Reserves**:
   - Players who register after the registration window closes are marked as 'late_reserve'
   - Do not receive the standard +5 XP reserve bonus
   - Do not contribute to the reserve streak modifier
   - Can still be selected to play if needed
   - All other rules (slot offers, penalties) apply normally

##### Implementation Details
- All status changes are tracked in the `player_status_changes` table
- XP transactions are automatically created by database triggers
- The system uses UTC dates for all comparisons
- A change is considered "on game day" if it occurs on the same calendar date as the game
- Late reserve status is stored in `game_registrations.late_reserve` boolean field

Example:
```
Game Date: 2025-02-14 21:00:00
Dropout at: 2025-02-14 09:00:00 → On game day (-10 XP)
Dropout at: 2025-02-13 23:59:59 → Before game day (no penalty)
```

### 4. Database Implementation

#### Tables Schema
```sql
-- Key columns in relevant tables
CREATE TABLE players (
    id UUID PRIMARY KEY,
    current_streak INTEGER DEFAULT 0
);

CREATE TABLE player_xp (
    player_id UUID PRIMARY KEY REFERENCES players(id),
    xp INTEGER DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE
);

CREATE TABLE reserve_xp_transactions (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    game_id UUID REFERENCES games(id),
    xp_amount INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Trigger System
The XP system automatically updates through these triggers:
1. `on_game_registration_change`: Fires when players register/update registration
2. `on_game_completion`: Fires when a game is marked as completed
3. `on_reserve_xp_change`: Fires when reserve XP transactions are added
4. `on_game_deletion`: Fires when a game is deleted, cleaning up reserve XP and recalculating affected players' XP

### 5. Cross References
- For game creation process: See `GameCreationGuide.md`
- For player selection logic: See `PlayerSelectionExplained.md`
- For slot offer system: See `SlotOfferFunctionLogic.md`

## Technical Notes

### Performance Considerations
- All XP calculations happen in the database using PL/pgSQL
- Queries are optimized with appropriate indexes
- The system uses window functions for efficient streak calculation
- Calculations are triggered only when necessary

### Data Integrity
- All XP updates are atomic through database transactions
- The system maintains timestamps for audit trails
- Reserve XP transactions are immutable once created
- Negative XP values are impossible due to the GREATEST(0, value) check

### Future Considerations
- The weighting system can be adjusted by modifying the function
- Streak calculations can be modified by updating break conditions
- Reserve XP values (+5/-10) can be changed if needed

## Lessons Learned

### Reserve XP Calculation
Reserve XP should be calculated from:
1. `game_registrations` table with status = 'reserve'
2. Each reserve appearance = +5 XP
3. Count only historical games (is_historical = true)

### Streak Calculation
A player's streak is calculated based on their consecutive participation in past games only. Future game registrations or selections do not affect the streak calculation.

### Common Issues and Troubleshooting

#### XP Discrepancies
If XP values differ between components:
1. Check if using `player_xp` table vs calculating XP manually
2. Verify reserve appearances in `game_registrations` table
3. Ensure only one type of streak (attendance or reserve) is being applied

#### Reserve XP Calculation
Reserve XP should be calculated from:
1. `game_registrations` table with status = 'reserve'
2. Each reserve appearance = +5 XP
3. Count only historical games (is_historical = true)

#### Database Schema Dependencies
The XP system relies on these tables:
- `player_xp`: Current XP totals
- `game_registrations`: Game participation and reserve status
- `reserve_xp_transactions`: Historical record of reserve XP changes

## Implementation Notes
1. Always fetch reserve status from `game_registrations` rather than transactions
2. Check `late_reserve` flag when calculating reserve XP and modifiers
3. Use nullish coalescing (`??`) instead of OR (`||`) for XP values to handle zero values correctly
4. Check for undefined before applying multipliers
5. Round down final XP values using `Math.floor()`

## Component Display Guidelines
1. Show streaks as percentages rather than XP values
2. Display the full XP calculation formula
3. Clearly indicate which streak type is active
4. Indicate late reserve status in the UI when applicable
5. Use consistent terminology:
   - "Bench Warmer" for reserve streak UI
   - "Reserve XP" for base reserve points
   - "Late Reserve" for players who joined after registration closed
   - "Attendance Streak" for consecutive games