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
- **Emoji Detection**: Identifies token users (🪙), random selections (🎲), and payment penalties (💰)
- **Section Recognition**: Handles both new format with counts and legacy format

### 3. Token Tracking
When importing players:
- Players with 🪙 emoji are marked with `using_token: true` in the database
- This ensures token usage is properly tracked for the token cooldown system
- Multiple emojis are handled (e.g., 🪙💰 for token user with unpaid games)

### 4. CreateGameForm Integration
The form displays parsed information:
- Shows count of each player category
- Visual feedback with emoji indicators
- Responsive grid layout (2 columns mobile, 3 columns desktop)

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
- Pitch cost (defaults to £50)
- Registration window times (auto-set to past for Player Selection phase)

## Technical Implementation

### Data Flow
1. **Paste Event** → `GameDetailsPaste.handleFullTextPaste()`
2. **Parse Content** → Extract date, time, and player lists
3. **Identify Players** → Match names to database records
4. **Track Status** → Note token usage, random selection
5. **Update State** → Pass data to parent CreateGameForm
6. **Database Save** → Create game_registrations with proper flags

### Key Functions
- `parseSelectedPlayers()`: Extracts players and identifies token/random status
- `parsePlayerNamesFromSection()`: Cleans player names from list sections
- `handlePlayerListsExtracted()`: Maps player names to database IDs

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