# Game Completion Form Documentation

## Overview
The Game Completion Form is used to record the final details of a completed game, including scores, teams, player statuses, and payment information. It provides a comprehensive interface for managing all aspects of game completion.

## Components

### Main Form (`GameCompletionForm.tsx`)
- Handles the overall game completion process
- Manages scores, team assignments, and player statuses
- Provides interfaces for payment tracking
- Allows last-minute player additions and changes
- Tracks status changes (dropouts and reserve responses)

#### Key Features
1. **Score Management**
   - Blue Team Score input
   - Orange Team Score input
   - Automatic game outcome determination based on scores

2. **Team Management**
   - Split view showing Blue and Orange teams
   - Player assignment to teams
   - Player status tracking (Selected, Available, Reserve)
   - Payment status tracking per player

3. **Player Search and Addition**
   - Real-time search across all registered players
   - Ability to add players who weren't originally registered
   - Immediate team/status assignment for new additions

4. **Reserve System**
   - Two reserve statuses:
     - "Reserve - No Slot Offer": Default status for reserve players
     - "Reserve - Declined Slot": For players who declined an offered slot
   - Automatic team removal when marked as reserve

5. **Status Change Tracking**
   - Tracks player status transitions including dropouts and reserve responses
   - Prevents duplicate status changes for the same player and status

### Team Section (`TeamSection.tsx`)
- Displays team-specific information
- Handles player status changes
- Manages payment status updates

#### Features
1. **Player Display**
   - Selected Players: Currently on the team
   - Available Players: Not assigned to any team
   - Reserve Players: In reserve pool

2. **Status Management**
   - Team assignment dropdown
   - Reserve status options
   - Payment status tracking

### Player Search (`PlayerSearch.tsx`)
- Enables adding new players to the game
- Provides real-time search functionality
- Allows immediate team/status assignment
- Prevents duplicate status changes for the same player and status
- Shows whether changes occurred on game day or pre-game

#### Features
1. **Search Functionality**
   - Real-time player search
   - Filters out already added players
   - Shows player friendly names

2. **Addition Options**
   - Team assignment (Blue/Orange)
   - Status selection
   - Initial payment status setting

### Status Change History (`StatusChangeHistory.tsx`)
- Displays a chronological history of player status changes, including:
  - Player dropouts (with game day vs pre-game indicators)
  - Reserve slot responses (accepted/declined with timing indicators)
  - Visual indicators for game day vs pre-game changes

### Status Management (`StatusChangeForm.tsx`)
- Handles player status transitions including:
  - Dropouts: When selected players drop out of the game
  - Reserve Responses: When reserve players accept or decline slot offers
  - Status History: Tracks all status changes with timestamps and game day information

#### Key Features
1. **Status Change Types**
   - Dropout: Selected players who can't make the game
   - Slot Offer: When a reserve player is offered a slot
   - Slot Response: When a reserve player accepts or declines a slot

2. **Game Day Tracking**
   - Automatically detects if changes occur on game day
   - Important for analytics and player reliability tracking

3. **Status Change History**
   - Records all status changes in the `player_status_changes` table
   - Tracks previous and new status
   - Maintains audit trail of all changes

4. **UI Components**
   - Context-aware status change buttons
   - Tooltips explaining each action
   - Clear status display and history

## Data Flow

### Player Data Structure
```typescript
interface PlayerWithTeam {
  id: string
  friendly_name: string
  team: 'blue' | 'orange' | null
  status: 'selected' | 'registered' | 'reserve_no_offer' | 'reserve_declined'
  payment_status: 'unpaid' | 'marked_paid' | 'admin_verified'
}
```

### Database Interactions
1. **Fetching Players**
   - Gets game registrations for specific game
   - Retrieves player details in separate query
   - Combines data with proper status mapping

2. **Updating Players**
   - Updates team assignments
   - Manages reserve status changes
   - Tracks payment status updates

3. **Adding Players**
   - Creates new game registration
   - Sets initial team and status
   - Establishes payment tracking

## Database Constraints
The `player_status_changes` table includes:
- Unique constraint on (player_id, game_id, to_status, change_type) to prevent duplicate entries
- Foreign key constraints to players and games tables
- Timestamps for tracking when changes occur

## Visual Indicators
Status changes use color-coded badges:
- Game Day changes: Red background
- Pre-Game changes: Yellow background
- Accepted slots: Green background
- Declined slots: Red background

## Usage Guidelines

### Completing a Game
1. Enter final scores for both teams
2. Verify player assignments are correct
3. Update payment statuses as needed
4. Add any last-minute player changes
5. Submit the completed game

### Managing Reserves
1. Players can be marked as reserve through the dropdown
2. Reserve players are automatically removed from teams
3. Two reserve statuses available:
   - "No Slot Offer": Default reserve status
   - "Declined Slot": For tracking declined offers

### Last-Minute Changes
1. Use the player search to find any registered player
2. Add them to either team or as reserve
3. Adjust their status and payment information as needed
4. Changes are saved automatically

### Payment Tracking
1. Each player has three possible payment statuses:
   - Unpaid: Default status
   - Marked Paid: Player claims payment made
   - Admin Verified: Payment confirmed by admin

## Error Handling
- Validates score inputs
- Prevents duplicate player assignments
- Handles network errors gracefully
- Provides feedback through toast notifications
- Prevents duplicate status changes both in UI and database
- Validates game scores match outcome
- Ensures all required fields are filled
- Maintains data consistency with database constraints

## Future Enhancements
- Enhanced payment tracking features
- More detailed reserve management
- Additional player statistics
- Improved error reporting
