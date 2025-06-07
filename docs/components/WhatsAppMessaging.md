# WhatsApp Messaging Feature

## Overview
The WhatsApp messaging feature in `GameCard.tsx` automatically generates contextual messages for different game phases, including detailed selection reasoning and player status indicators.

## Message Generation

### Base Message Format
All messages start with consistent game information:
```
📅 [Day Date]
⏰ [Start Time] - [End Time]
🎮 WNF #[Game Number]
📍 [Venue Name]
📍 [Google Maps URL]
🔗 Game Details: https://wnf.app/games
⚽ [Max Players] players / [Team Size]-a-side
```

### Game Status-Specific Messages

#### OPEN/UPCOMING Status
- Registration call-to-action with thumbs up emoji
- Token eligibility list with coin emoji (🪙)
- Registration deadline information
- Reserve outside group invitation

#### PLAYERS_ANNOUNCED Status
Enhanced with selection reasoning summary:

**Selection Summary Indicators:**
- `🪙 X Guaranteed token(s) used this week` - Shows token usage count
- `✅ First X players chosen by XP` - Shows merit selection count  
- `🎲 Remaining X players chosen at random` - Shows random selection count
- `💰 XP penalty due to missing payments` - Appears if any players (selected or reserves) have unpaid games

**Player Lists with Counts:**
- `✅ Selected Players (X):` - Shows total selected player count
- `🔄 Reserves in XP order (X):` - Shows reserve player count

**Player Sorting and Display:**
- Token users (🪙) always displayed first in selected players list
- Remaining selected players sorted by XP descending
- Reserve players sorted by XP only

**Player List Visual Indicators:**
- `🪙` Token users (guaranteed slot)
- `🎲` Randomly selected players
- `💰` Players with unpaid games
- Combined indicators possible (e.g., `🪙💰` for token + unpaid, `🎲💰` for random + unpaid)

**Message Ordering:**
1. Selection summary with indicators
2. Selected players list with count
3. Reserves list with count
4. Dropped out players (if any)
5. Reserve boost explanation (if reserves exist)
6. Drop-out request message

**Reserve System Explanation:**
- `📈 Players not selected this week get boosted chances for random selection next week`
- Only appears when there are reserve players
- Positioned before the drop-out request message
- `Anyone needs to drop out (inc reserves) please let me know 👍` follows after

#### TEAMS_ANNOUNCED Status
- Team composition with player names
- Orange team (🟠) and Blue team (🔵) sections
- Alphabetically sorted player names within teams

## Technical Implementation

### Data Sources
The message generation fetches data from multiple sources:
- `players` table for WhatsApp membership and unpaid games
- `player_xp` view for current XP values
- `public_player_token_status` view for token eligibility
- `game_registrations` table for player status and selection methods

### Selection Method Detection
- `using_token` field identifies token users
- `selection_method` field distinguishes merit vs random selection
- `unpaid_games` count determines payment penalty indicators

### Smart Display Logic
- Summary indicators only appear when relevant to the specific game
- Player prefixes combine appropriately (token + unpaid, random + unpaid, etc.)
- Reserve bonus explanation only shows when there are reserve players

## User Experience Benefits

### For Players
- Clear understanding of selection process
- Visual indicators for different selection methods
- Motivation through reserve streak explanation
- Payment penalty visibility encourages timely payments

### For Administrators
- One-click message generation
- Consistent formatting across all games
- Automatic clipboard copying
- No manual message composition needed

### For WhatsApp Group
- Comprehensive game information
- Selection transparency
- Fair play understanding
- Reduced confusion about selection criteria

## Payment Penalty Integration
The WhatsApp messaging fully integrates with the unpaid games penalty system:
- Shows when payment penalties affected selection
- Identifies specific players with unpaid games
- Reinforces payment importance through visual indicators
- Maintains transparency about penalty application

## Future Considerations
- Message templates could be customizable per admin preference
- Additional emoji indicators for other player statuses
- Language localization support
- Enhanced reserve explanation with specific player examples