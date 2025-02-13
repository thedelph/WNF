# Status Change History

The Status Change History component displays a chronological record of player status changes during a game, including dropouts and reserve responses.

## Features

### Status Change Types

#### Dropouts
- Records when a selected player drops out
- Shows whether dropout occurred on game day or pre-game
- Displays:
  - Player name
  - Dropout date
  - Visual indicator for game day vs pre-game dropout
  - Tooltips for additional context

#### Reserve Responses
- Tracks reserve player responses to slot offers
- Shows whether response was on game day or pre-game
- Displays:
  - Player name
  - Response date
  - Response type (Accepted/Declined)
  - Visual indicator for game day vs pre-game response
  - Tooltips for additional context

### Visual Indicators

#### Timing Badges
- **Game Day Changes**: Red background with darker text
  - Indicates changes that occurred on the day of the game
  - Higher impact on game organization
- **Pre-Game Changes**: Yellow background with darker text
  - Indicates changes that occurred before game day
  - Allows for better planning and adjustment

#### Response Type Badges
- **Accepted**: Green background
  - Indicates a reserve player accepted a slot
- **Declined**: Red background
  - Indicates a reserve player declined a slot

### Data Management
- Prevents duplicate status changes through:
  - UI validation in PlayerSearch component
  - Database unique constraint on player_id, game_id, to_status, and change_type
- Automatically refreshes when new changes occur
- Groups changes by type for better organization

## Usage

### Viewing Status Changes
1. Changes are automatically displayed in chronological order
2. Grouped into "Dropouts" and "Reserve Responses" sections
3. Each entry shows:
   - Player name
   - Date of change
   - Type of change
   - Timing indicator (game day vs pre-game)

### Tooltips
- Hover over timing badges for additional context
- Provides clear explanation of when the change occurred
- Helps distinguish between game day and pre-game changes

## Implementation Details

### Component Structure
```typescript
interface StatusChange {
  id: string
  player_id: string
  game_id: string
  from_status: string
  to_status: string
  change_type: 'dropout' | 'slot_response'
  is_game_day: boolean
  created_at: string
  player: {
    id: string
    friendly_name: string
  }
}
```

### Database Integration
- Uses Supabase for data storage and retrieval
- Maintains referential integrity with players and games tables
- Prevents duplicate entries through database constraints

## Best Practices
1. Always check for existing status changes before creating new ones
2. Use the visual indicators to quickly identify critical changes
3. Review the history before making game completion decisions
4. Consider the timing of changes when planning replacements
