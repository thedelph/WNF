# Player Selection Process Explained

This document explains how the automatic player selection process works in the WNF system, specifically focusing on two main components: the `useRegistrationClose` hook and the `handlePlayerSelection` function.

## Overview

The player selection process is automatically triggered when a game's registration window closes. It combines merit-based (XP), random selection, and WhatsApp membership priority to ensure a fair and balanced player selection.

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
   - Gets WhatsApp membership status from `players` table
   - Combines data into unified player list

2. **Merit-based Selection**
   - Sorts players by XP (highest to lowest)
   - Selects top players for merit slots
   - Marks selected players with `selection_method: 'merit'`

3. **Random Selection with WhatsApp Priority**
   - Identifies WhatsApp members (status = 'Yes' or 'Proxy') in remaining players
   - If WhatsApp members exist:
     - Prioritizes them for random slots
     - If enough WhatsApp members: selects randomly from only WhatsApp members
     - If not enough: fills remaining slots from non-WhatsApp members
   - If no WhatsApp members: performs regular random selection
   - Marks selected players with `selection_method: 'random'`

### WhatsApp Priority Examples

Given 18 max players (16 merit, 2 random) and 21 registered:

**Scenario 1 - All Non-WhatsApp:**
```
Bottom 5 by XP (all non-WhatsApp):
- Regular random selection applies
- Any 2 randomly selected
- 3 to reserves
```

**Scenario 2 - Mixed with WhatsApp Priority:**
```
Bottom 5 by XP:
- 2 WhatsApp members
- 3 non-WhatsApp members
- WhatsApp members automatically get the 2 slots
- Others to reserves
```

**Scenario 3 - One WhatsApp Member:**
```
Bottom 5 by XP:
- 1 WhatsApp member
- 4 non-WhatsApp members
- WhatsApp member gets 1 slot
- 1 randomly selected from others
- 3 to reserves
```

## Selection Results

The process produces:
- List of selected players (both merit and random)
- List of reserve players
- Selection metadata (timestamps, selection methods)
- Player status updates in the database

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
