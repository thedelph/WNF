# Player Selection Process Explained

This document explains how the automatic player selection process works in the WNF system, specifically focusing on two main components: the `useRegistrationClose` hook and the `handlePlayerSelection` function.

## Overview

The player selection process is automatically triggered when a game's registration window closes. It combines token-based priority, merit-based (XP), random selection, and WhatsApp group membership priority to ensure a fair and balanced player selection.

## Important Selection Rules

1. **Token Priority**
   - Players using their monthly token are guaranteed a slot
   - Token slots are deducted from the available merit slots
   - Each player can only use one token per game
   - Token usage is processed before any other selection method
   - Token users are always displayed first in player lists, sorted by XP
   - Visual indicators (coin icon, background) clearly show token usage

2. **XP Priority**
   - After token slots are allocated, XP becomes the primary sorting mechanism
   - Tiebreakers (WhatsApp, Streak, Caps, Registration Time) only apply when XP values are exactly equal
   - A lower XP player can never be selected over a higher XP player in merit selection, regardless of other factors
   - Non-token users are displayed after token users, sorted by XP

3. **WhatsApp Status Equivalence**
   - "Proxy" status is treated exactly the same as "Yes" for all purposes
   - Both statuses receive equal priority in both merit tiebreakers and random selection
   - Only "No" and NULL are treated as non-WhatsApp members

4. **Random Selection Priority**
   - **WhatsApp Status Priority**
     - If exact number of WhatsApp members as random slots: all are selected
     - If more WhatsApp members than slots: random selection among WhatsApp members only
     - If fewer WhatsApp members than slots: all WhatsApp members selected, remaining slots filled randomly from non-WhatsApp members

   - **Weighted Random Selection**
     - Each player's chance of being randomly selected is weighted based on their reserve history
     - Base weight: 1 point for every player
     - Additional points: +1 for each consecutive game as a reserve (bench_warmer_streak)
     - Selection probability = Player's total points / Sum of all eligible players' points

     Example:
     ```
     3 players competing for 2 slots:
     Player A: 2 games as reserve = 3 points (1 base + 2 streak)
     Player B: 5 games as reserve = 6 points (1 base + 5 streak)
     Player C: 0 games as reserve = 1 point (1 base + 0 streak)

     Total points = 10
     Selection chances:
     - Player A: 30% (3/10)
     - Player B: 60% (6/10)
     - Player C: 10% (1/10)
     ```

   - **Combined Priority System**
     - WhatsApp status is still the primary grouping factor
     - Within each group (WhatsApp/non-WhatsApp), weighted random selection is applied
     - This ensures WhatsApp members are prioritized while maintaining fairness within groups

## Weighted Random Selection Process

### Base Weight System
Each player's chance of being selected is weighted based on their history as a reserve:
- Base points: 1 point (everyone starts with this)
- Reserve bonus: +1 point per game as reserve
- Total points = Base points + Reserve streak points

For example:
```
Player A (3 games as reserve):  1 + 3 = 4 points
Player B (0 games as reserve):  1 + 0 = 1 point
Player C (5 games as reserve):  1 + 5 = 6 points
```

### Selection Probability
The probability of being selected is calculated as:
```
Player's probability = (Player's total points / Sum of all players' points) × 100%
```

Example calculation with the above players:
```
Total pool points = 11 (4 + 1 + 6)

Player A: (4/11) × 100 = 36.36%
Player B: (1/11) × 100 = 9.09%
Player C: (6/11) × 100 = 54.55%
```

### WhatsApp Priority System
The selection process first separates players into two groups:
1. WhatsApp Members
2. Non-WhatsApp Members

For random selection slots:
- If there are enough WhatsApp members for all slots:
  - Only WhatsApp members are considered
  - Weighted selection applies within WhatsApp group
- If there are fewer WhatsApp members than slots:
  - All WhatsApp members are automatically selected
  - Remaining slots filled from non-WhatsApp members using weighted selection
- If no WhatsApp members:
  - All players are considered in a single pool
  - Weighted selection applies to everyone

### Selection Process Example
Given:
- 2 random slots to fill
- 3 WhatsApp members (A, B, C) with reserve streaks [2, 0, 1]
- 2 non-WhatsApp members (D, E) with reserve streaks [4, 0]

Step 1: WhatsApp Members Pool
```
Total pool points = 7 (3 + 1 + 2)
A (2 games): (3/7) × 100 = 42.86%
B (0 games): (1/7) × 100 = 14.28%
C (1 game):  (2/7) × 100 = 28.57%
```

Step 2: Non-WhatsApp Members Pool (only used if needed)
```
Total pool points = 6 (5 + 1)
D (4 games): (5/6) × 100 = 83.33%
E (0 games): (1/6) × 100 = 16.67%
```

### Dynamic Probability Adjustment
After each selection:
1. Selected player is removed from the pool
2. Total points are recalculated
3. Probabilities are updated for remaining players

Example: If player A is selected first:
```
Remaining WhatsApp members:
Total points = 3 (1 + 2)
B (0 games): (1/3) × 100 = 33.33%
C (1 game):  (2/3) × 100 = 66.67%
```

This system ensures:
- Players who have been reserves more often have better chances
- WhatsApp members are prioritized
- Probabilities remain fair and balanced
- No player can be selected twice

## useRegistrationClose Hook

The `useRegistrationClose` hook is responsible for:

1. **Monitoring Registration Window**
   - Polls every 10 seconds to check if the registration window has ended
   - Triggers the selection process when current time passes `registration_window_end`

2. **Process Management**
   - Maintains state for:
     - `isProcessingClose`: Tracks if selection is in progress
     - `hasPassedWindowEnd`: Prevents multiple selections

3. **Game Status Updates**
   - Updates game status to 'players_announced' when selection starts
   - Stores selection results in the database

4. **Selection Process Flow**
   1. Checks if selection should run (time passed, game open, not processing)
   2. Updates game status
   3. Calls `handlePlayerSelection` with configured slots
   4. Stores results in `game_selections` table
   5. Notifies UI of completion

## handlePlayerSelection Function

This function performs the actual player selection using the following process:

1. **Data Gathering**
   - Fetches all registered players from `game_registrations`
   - Retrieves player XP data from `player_stats`
   - Gets WhatsApp group membership status (`whatsapp_group_member`) from `players` table
     - Possible values: "Yes", "Proxy", "No", or NULL (treated same as "No")
   - Gets token usage status from `game_registrations.using_token`
   - Combines data into unified player list

2. **Token-based Selection**
   - Identifies all players who are using their monthly token
   - Automatically selects these players for guaranteed slots
   - Marks selected players with `selection_method: 'token'`
   - Deducts token slots from available merit slots

3. **Merit-based Selection**
   - Uses remaining slots after token allocation
   - Sorts players by XP (highest to lowest)
   - In case of XP ties:
     1. First checks WhatsApp group membership status
        - WhatsApp group members are prioritized over non-members
        - If all tied players are either all members or all non-members, proceeds to next tiebreaker
     2. Current Streak (highest wins)
     3. Caps (highest wins)
     4. Registration Time (earliest wins)
   - Selects top players for remaining merit slots
   - Marks selected players with `selection_method: 'merit'`

4. **Random Selection**
   - Always reserves 2 slots for random selection
   - Excludes players already selected by token or merit
   - Applies WhatsApp priority and weighted selection as described above
   - Marks selected players with `selection_method: 'random'`

### Selection Examples

**Scenario 1 - Mixed Selection Methods:**
```
18-player game (9v9):
- 3 players using tokens
- 13 players selected by XP (merit)
- 2 players selected randomly

Selection order:
1. Token users get first priority (3 slots)
2. Highest XP players fill remaining merit slots (13 slots)
3. Random selection fills final slots (2 slots)
```

**Scenario 2 - Token and XP Tie:**
```
Players:
- Player A: Using token, 80 XP
- Player B: No token, 100 XP
- Player C: Using token, 60 XP
Result: 
1. Players A and C are selected first (token priority)
2. Player B is considered for remaining merit slots
```

## Data Storage and Access

### Database Structure

The player selection process involves several key tables:

1. **game_registrations**
   - Primary table for player-game relationships
   - Stores:
     - `player_id`: Reference to players table
     - `game_id`: Reference to games table
     - `status`: Selected/Reserve/Registered
     - `team`: Team assignment (for selected players)
     - Registration metadata (timestamps, etc.)
     - `using_token`: Token usage status

2. **game_selections**
   - Stores selection process metadata
   - Contains:
     - `game_id`: Reference to games table
     - `selection_metadata`: JSON with:
       - startTime
       - endTime
       - meritSlots
       - randomSlots
       - selectionNotes

3. **players**
   - Contains player information
   - Relevant fields:
     - `id`
     - `friendly_name`
     - `avatar_svg`
     - `whatsapp_group_member`

### Data Access Patterns

#### Fetching Selected Players
```typescript
// Correct pattern using game_registrations relationship
const { data: registrations } = await supabase
  .from('game_registrations')
  .select(`
    id,
    game_id,
    status,
    team,
    players:player_id (
      id,
      friendly_name,
      avatar_svg,
      whatsapp_group_member
    )
  `)
  .eq('game_id', gameId)
  .eq('status', 'selected');
```

#### Fetching Reserve Players
```typescript
// Similar pattern for reserve players
const { data: reserves } = await supabase
  .from('game_registrations')
  .select(`
    id,
    game_id,
    status,
    players:player_id (
      id,
      friendly_name,
      avatar_svg,
      whatsapp_group_member
    )
  `)
  .eq('game_id', gameId)
  .eq('status', 'reserve');
```

#### Getting Selection Metadata
```typescript
// Separate query for selection metadata
const { data: metadata } = await supabase
  .from('game_selections')
  .select('selection_metadata')
  .eq('game_id', gameId)
  .single();
```

### Component Data Flow

1. **PlayerSelectionResults.tsx**
   - Displays initial selection results
   - Uses game_registrations to show:
     - Selected players (merit + random)
     - Reserve list
   - Fetches selection metadata from game_selections

2. **TeamSelectionResults.tsx**
   - Shows final team assignments
   - Queries through game_registrations for:
     - Player details
     - Team assignments
   - Gets additional metadata from game_selections

## Selection Results

The process produces:
- List of selected players (both merit and random)
- List of reserve players (ordered by WhatsApp status first, then XP)
- Selection metadata (timestamps, selection methods)
- Player status and team updates in game_registrations

### Reserve List Ordering

The reserve list is ordered with the following priority:
1. **WhatsApp Status** (Primary Sort)
   - WhatsApp members (Yes/Proxy) appear first
   - Non-WhatsApp members (No/NULL) appear second

2. **Within Each WhatsApp Group** (Secondary Sort)
   - Players are sorted by XP (highest to lowest)
   - In case of equal XP:
     1. Current Streak (highest wins)
     2. Caps (highest wins)
     3. Registration Time (earliest wins)

### Reserve List Examples

**Example 1 - Mixed WhatsApp Status:**
```
Reserve Players:
WhatsApp Members:
- Player A: WhatsApp = Yes, XP = 150
- Player B: WhatsApp = Yes, XP = 120
- Player C: WhatsApp = Proxy, XP = 180

Non-WhatsApp Members:
- Player D: WhatsApp = No, XP = 200
- Player E: WhatsApp = No, XP = 160
- Player F: WhatsApp = NULL, XP = 140

Final Order:
1. Player C (WhatsApp = Proxy, XP = 180)
2. Player A (WhatsApp = Yes, XP = 150)
3. Player B (WhatsApp = Yes, XP = 120)
4. Player D (WhatsApp = No, XP = 200)
5. Player E (WhatsApp = No, XP = 160)
6. Player F (WhatsApp = NULL, XP = 140)
```

**Example 2 - Equal XP with Tiebreakers:**
```
Reserve Players:
WhatsApp Members with 150 XP:
- Player A: Streak = 3, Caps = 10
- Player B: Streak = 5, Caps = 8

Non-WhatsApp Members with 150 XP:
- Player C: Streak = 6, Caps = 12
- Player D: Streak = 6, Caps = 10

Final Order:
1. Player B (WhatsApp, higher streak)
2. Player A (WhatsApp, lower streak)
3. Player C (Non-WhatsApp, higher caps)
4. Player D (Non-WhatsApp, lower caps)
```

This ordering ensures that WhatsApp members have priority in the reserve list, making it easier to find replacements from the WhatsApp group when needed, while still maintaining a fair XP-based order within each WhatsApp status group.

## Error Handling

Both components include comprehensive error handling:
- Database operation failures
- Missing player data
- Process interruptions
- Invalid configurations

## Success Indicators

The system provides feedback through:
- Toast notifications for success/failure
- Database status updates
- UI state updates
- Detailed error messages when issues occur
