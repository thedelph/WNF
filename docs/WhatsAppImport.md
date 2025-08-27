# WhatsApp Import Feature

## Overview
The WhatsApp Import feature allows admins to quickly create games by pasting WhatsApp messages from the `players_announced` phase. This dramatically speeds up the game creation process by automatically extracting player information, token usage, and game details.

## How It Works

### 1. Message Format Support
The system supports the updated WhatsApp message format that includes:
- Token indicators (🪙)
- Random selection markers (🎲)
- Unpaid games penalties (💰)
- Player counts in section headers

Example message format:
```
📅 Friday 6th December
⏰ 9:00pm - 10:00pm
🎮 WNF #123
📍 PowerLeague Shepherd's Bush
📍 https://maps.google.com/...
🔗 Game Details: https://wnf.app/games
⚽ 18 players / 9-a-side

✅ Selected Players (18):
🪙PlayerName1 (500 XP)
🎲PlayerName2 (400 XP)
🪙💰PlayerName3 (300 XP)
...

🔄 Reserves in XP order (3):
💰PlayerName4 (250 XP)
PlayerName5 (200 XP)
...

❌ Dropped Out:
PlayerName6 (150 XP)
```

### 2. GameDetailsPaste Component
Located in `/src/components/admin/games/form-components/GameDetailsPaste.tsx`

Key features:
- **Date/Time Extraction**: Parses UK date formats (e.g., "Friday 6th December")
- **Player Parsing**: Extracts player names and removes XP information
- **Emoji Detection**: Identifies token users (🪙), random selections (🎲), payment penalties (💰), and replacement players (🔄)
- **Section Recognition**: Handles both new format with counts and legacy format
- **Empty Line Detection**: Parser stops at empty lines, which naturally separate player lists from additional notes
- **Player Name Validation**: Rejects non-player text containing phrases like "drop out", "let me know", "anyone", etc.
- **Smart Text Filtering**: Validates player names by word count (max 4 words) and character length (max 30 chars)

### 3. Token Tracking
When importing players:
- Players with 🪙 emoji are marked with `using_token: true` in the database
- This ensures token usage is properly tracked for the token cooldown system
- Multiple emojis are handled (e.g., 🪙💰 for token user with unpaid games)

### 4. Database Matching
When players are extracted from the pasted text:
- Each player name is matched against the database `friendly_name` field
- Successfully matched players are automatically selected in the form
- Unmatched players are highlighted with a warning alert
- The form shows:
  - Total parsed count (e.g., "✅ Selected Players: 18")
  - Database matched count (e.g., "✅ Matched Selected: 17/18")
  - List of unmatched player names that need manual selection
- Color-coded alerts: green when all players matched, yellow warning when some unmatched

### 5. CreateGameForm Integration
The form displays parsed information:
- Shows count of each player category
- Visual feedback with emoji indicators
- Responsive grid layout (2 columns mobile, 3 columns desktop)
- Player counts in multi-select labels (e.g., "Selected Players (18)")
- Database matching status with detailed breakdown

## Usage Instructions

### For Admins
1. Navigate to **Admin Portal → Games → Create Game**
2. Select **"Player Selection Phase"** from the Game Phase dropdown
3. Copy the WhatsApp message from the group chat
4. Paste into the **"Paste Full Game Details"** textarea
5. Verify the parsed counts display shows correct numbers:
   - ✅ Selected Players
   - 🪙 Token Users
   - 🎲 Random Picks
   - 🔄 Reserve Players
   - ❌ Dropped Out
6. Adjust any other settings (venue, pitch cost, etc.)
7. Click **"Create Game"** to save

### What Gets Imported
- **Game Details**:
  - Date and time
  - Max players count
- **Player Registrations**:
  - Selected players with their selection method (merit/random)
  - Token usage status
  - Reserve players
  - Dropped out players

### What Needs Manual Entry
- Venue selection (defaults to last used)
- Pitch cost (defaults to £56.70 for 18 players at £3.15 each)
- Registration window times (auto-set to past for Player Selection phase)
- Unmatched player names (must be manually selected from dropdowns)

## Technical Implementation

### Data Flow
1. **Paste Event** → `GameDetailsPaste.handleFullTextPaste()`
2. **Parse Content** → Extract date, time, and player lists
3. **Identify Players** → Match names to database records
4. **Track Status** → Note token usage, random selection
5. **Update State** → Pass data to parent CreateGameForm
6. **Database Save** → Create game_registrations with proper flags

### Key Functions
- `parseSelectedPlayers()`: Extracts players and identifies token/random status, stops at empty lines
- `parsePlayerNamesFromSection()`: Cleans player names from list sections
- `isLikelyPlayerName()`: Validates if text is a player name (rejects non-player phrases)
- `handlePlayerListsExtracted()`: Maps player names to database IDs and tracks unmatched players

## Benefits
- **Time Saving**: Reduces game creation from 10+ minutes to under 1 minute
- **Accuracy**: Eliminates manual entry errors
- **Token Tracking**: Automatically preserves token usage information
- **Consistency**: Ensures database matches WhatsApp announcements

## Future Enhancements
- Support for team announcement phase messages
- Auto-detection of game phase from message content
- Bulk import of multiple games
- Historical game import capabilities