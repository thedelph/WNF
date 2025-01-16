# Player Selection Process Explained

This document explains how the automatic player selection process works in the WNF system, specifically focusing on two main components: the `useRegistrationClose` hook and the `handlePlayerSelection` function.

## Overview

The player selection process is automatically triggered when a game's registration window closes. It combines merit-based (XP), random selection, and WhatsApp group membership priority to ensure a fair and balanced player selection.

## Important Selection Rules

1. **XP Priority**
   - XP is always the primary sorting mechanism
   - Tiebreakers (WhatsApp, Streak, Caps, Registration Time) only apply when XP values are exactly equal
   - A lower XP player can never be selected over a higher XP player in merit selection, regardless of other factors

2. **WhatsApp Status Equivalence**
   - "Proxy" status is treated exactly the same as "Yes" for all purposes
   - Both statuses receive equal priority in both merit tiebreakers and random selection
   - Only "No" and NULL are treated as non-WhatsApp members

3. **Random Selection Priority**
   - If exact number of WhatsApp members as random slots: all are selected
   - If more WhatsApp members than slots: random selection among WhatsApp members only
   - If fewer WhatsApp members than slots: all WhatsApp members selected, remaining slots filled randomly from non-WhatsApp members

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
   - Combines data into unified player list

2. **Merit-based Selection**
   - Sorts players by XP (highest to lowest)
   - In case of XP ties:
     1. First checks WhatsApp group membership status
        - WhatsApp group members are prioritized over non-members
        - If all tied players are either all members or all non-members, proceeds to next tiebreaker
     2. Current Streak (highest wins)
     3. Caps (highest wins)
     4. Registration Time (earliest wins)
   - Selects top players for merit slots
   - Marks selected players with `selection_method: 'merit'`

### XP Tiebreak Examples

Given 3 merit slots and the following players:

**Scenario 1 - Mixed WhatsApp Status:**
```
Players tied at 100 XP:
- Player A: WhatsApp = Yes
- Player B: WhatsApp = No
Result: Player A wins the tie (WhatsApp member priority)
```

**Scenario 2 - Same WhatsApp Status, Different Streaks:**
```
Players tied at 100 XP (both WhatsApp = Yes):
- Player A: Streak = 3, Caps = 10, Registered: 9:00 AM
- Player B: Streak = 5, Caps = 8, Registered: 8:00 AM
Result: Player B wins the tie (higher streak)
```

**Scenario 3 - Same WhatsApp & Streak, Different Caps:**
```
Players tied at 100 XP (both WhatsApp = No):
- Player A: Streak = 3, Caps = 15, Registered: 9:00 AM
- Player B: Streak = 3, Caps = 10, Registered: 8:00 AM
Result: Player A wins the tie (more caps)
```

**Scenario 4 - Only Registration Time Differs:**
```
Players tied at 100 XP (both WhatsApp = Yes):
- Player A: Streak = 3, Caps = 10, Registered: 9:00 AM
- Player B: Streak = 3, Caps = 10, Registered: 8:00 AM
Result: Player B wins the tie (earlier registration)
```

3. **Random Selection with WhatsApp Priority**
   - Identifies WhatsApp group members (`whatsapp_group_member` = 'Yes' or 'Proxy') in remaining players
   - If WhatsApp group members exist:
     - Prioritizes them for random slots
     - If enough WhatsApp group members: selects randomly from only WhatsApp group members
     - If not enough: fills remaining slots from non-WhatsApp members (where `whatsapp_group_member` is 'No' or NULL)
   - If no WhatsApp group members: performs regular random selection
   - Marks selected players with `selection_method: 'random'`

### WhatsApp Priority Examples

Given 18 max players (16 merit, 2 random) and 21 registered:

**Scenario 1 - All Non-WhatsApp:**
```
Bottom 5 by XP (all have whatsapp_group_member = 'No' or NULL):
- Regular random selection applies
- Any 2 randomly selected
- 3 to reserves
```

**Scenario 2 - Mixed with WhatsApp Priority:**
```
Bottom 5 by XP:
- 2 WhatsApp group members (whatsapp_group_member = 'Yes' or 'Proxy')
- 3 non-WhatsApp members (whatsapp_group_member = 'No' or NULL)
- WhatsApp group members automatically get the 2 slots
- Others to reserves
```

**Scenario 3 - One WhatsApp Member:**
```
Bottom 5 by XP:
- 1 WhatsApp group member (whatsapp_group_member = 'Yes' or 'Proxy')
- 4 non-WhatsApp members (whatsapp_group_member = 'No' or NULL)
- WhatsApp group member gets 1 slot
- 1 randomly selected from others
- 3 to reserves
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
