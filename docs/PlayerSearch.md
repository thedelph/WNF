# Player Search Component

The PlayerSearch component provides functionality for searching and adding players to a game, with special handling for status changes and duplicate prevention.

## Features

### Player Search
- Real-time search as you type
- Minimum 2 characters required
- Shows player friendly name and current status
- Filters out already added players

### Status Assignment
- Set player's initial status:
  - Selected
  - Reserve
  - Reserve - Declined Slot
- Team assignment (Blue/Orange)
- Special handling for reserve declines

### Status Change Tracking
- Automatically records status changes for reserves
- Prevents duplicate status changes
- Shows whether changes occur on game day or pre-game
- Visual indicators for timing of changes

## Implementation

### Props Interface
```typescript
interface PlayerSearchProps {
  onPlayerAdd: (player: Player, team: 'blue' | 'orange' | null, status: string) => void
  existingPlayerIds: string[]
  gameDate: Date | string
  gameId: string
}
```

### Status Change Prevention
1. Checks for existing status changes before creating new ones
2. Uses database unique constraints as a backup
3. Maintains data consistency across the application

### Date Handling
- Compares selected date against game date
- Determines if change is on game day
- Shows appropriate visual indicators

## Usage

### Adding a Player
1. Search for player by name
2. Select from search results
3. Choose team and status
4. For reserve declines:
   - Select date of decline
   - See whether it's a game day or pre-game decline
5. Confirm addition

### Reserve Decline Flow
1. Select "Reserve - Declined Slot" status
2. Date picker appears
3. Select when they declined
4. Visual indicator shows if it's game day
5. System prevents duplicate decline records

## Error Handling
- Validates all required fields
- Prevents duplicate status changes
- Shows clear error messages
- Maintains database consistency

## Best Practices
1. Always check if player is already in game
2. Use date picker for accurate decline timing
3. Review visual indicators before confirming
4. Consider timing when adding reserves
