# XP System Documentation

## Overview
The XP (Experience Points) system is designed to reward player participation and consistency in games. It uses a sophisticated weighted calculation that emphasizes recent game participation while maintaining a historical record of player engagement.

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

##### Final XP Calculation
```sql
final_xp = ROUND((base_xp + reserve_xp) * streak_multiplier * bench_warmer_multiplier)
```
Where:
- `base_xp`: Sum of weighted XP from selected games
- `reserve_xp`: Sum of reserve bonuses (+5) and penalties (-10)
- `streak_multiplier`: Based on consecutive selected games (1 + (current_streak * 0.1))
- `bench_warmer_multiplier`: Based on bench warmer streak (1 + (bench_warmer_streak * 0.05))
- Result is rounded to the nearest integer

Important Notes:
- Reserve XP is added to base XP before any multipliers are applied
- Both streak and bench warmer multipliers apply to the combined (base + reserve) XP
- Example calculation:
  ```
  Base XP: 146
  Reserve XP: +5
  Combined Base: 151
  Streak Multiplier: 1.0 (no streak)
  Bench Warmer Multiplier: 1.05 (5% from streak of 1)
  Final: 151 * 1.0 * 1.05 = 158.55 (rounded to 159)
  ```

### Troubleshooting XP Calculations
When verifying XP calculations:
1. Check player's game history for base XP weighting
2. Verify reserve transactions in reserve_xp_transactions table
3. Confirm both streak and bench warmer streak values
4. Remember that all XP (including reserve XP) gets multiplied by both streak multipliers
5. Use the calculate_player_xp() function to recalculate if needed

### 3. Reserve XP System

#### Reserve Rewards
- Players who remain in the reserve list receive +5 XP
- This applies even if they never received a slot offer
- The reward is stored in the `reserve_xp_transactions` table

#### Slot Decline Penalties
- If a reserve player declines a slot offer, they receive a -10 XP penalty
- Exception: No penalty if the slot offer is made on the same day as the game
- Penalties are tracked in `reserve_xp_transactions` with negative values

## Reserve XP System

Players can earn or lose XP based on their reserve status in games:

- **Reserve Bonus**: +5 XP for being a reserve player in a game
- **Reserve Penalty**: -10 XP for declining a slot after being selected from reserves

The XP Breakdown section in a player's profile shows:
- Total Reserve XP accumulated
- Number of times they have been a reserve
- Color-coded display (green for bonuses, red for penalties)

This system encourages players to participate as reserves and helps maintain a healthy player pool for games.

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
2. Use nullish coalescing (`??`) instead of OR (`||`) for XP values to handle zero values correctly
3. Check for undefined before applying multipliers
4. Round down final XP values using `Math.floor()`

## Component Display Guidelines
1. Show streaks as percentages rather than XP values
2. Display the full XP calculation formula
3. Clearly indicate which streak type is active
4. Use consistent terminology:
   - "Bench Warmer" for reserve streak UI
   - "Reserve XP" for base reserve points
   - "Attendance Streak" for consecutive games